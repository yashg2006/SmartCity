import os
import time
import math
import argparse
import serial

import cv2
import torch
from ultralytics import YOLO


# ---------------- SERIAL SETUP ---------------- #

def setup_serial(port="/dev/ttyACM0", baud=115200):
    ser = serial.Serial(port, baud, timeout=1)
    time.sleep(2)  # wait for Arduino reset
    return ser


def send_to_arduino(ser, message):
    ser.write((message + "\n").encode())
    print(f"[SERIAL] Sent -> {message}")


# ---------------- MODEL UTILS ---------------- #

def find_ambulance_model(model_dir="model"):
    if not os.path.isdir(model_dir):
        return None

    for fname in os.listdir(model_dir):
        if fname.startswith("ambulance_best") and fname.endswith(".pt"):
            return os.path.join(model_dir, fname)

    return None


def calculate_speed(obj_id, center, previous_positions, previous_times, pixel_to_meter):
    current_time = time.time()
    speed_kmh = 0

    if obj_id in previous_positions:
        dist = math.hypot(
            center[0] - previous_positions[obj_id][0],
            center[1] - previous_positions[obj_id][1]
        )
        time_diff = current_time - previous_times[obj_id]

        if time_diff > 0:
            speed_kmh = (dist * pixel_to_meter / time_diff) * 3.6

    previous_positions[obj_id] = center
    previous_times[obj_id] = current_time

    return speed_kmh


def get_lane(center_x, frame_width):
    zone_width = frame_width / 4

    if center_x < zone_width:
        return 1
    elif center_x < zone_width * 2:
        return 2
    elif center_x < zone_width * 3:
        return 3
    else:
        return 4


# ---------------- MAIN ---------------- #

def main(args):

    DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[INFO] Using device: {DEVICE}")

    ser = setup_serial()

    base_model = YOLO("yolov8s.pt")

    amb_model_path = args.ambulance_model or find_ambulance_model()
    if amb_model_path is None:
        print("❌ Ambulance model not found.")
        return

    ambulance_model = YOLO(amb_model_path)

    ALL_VEHICLE_CLASSES = [2, 3, 5, 7]
    BIG_VEHICLE_CLASSES = [7]

    cap = cv2.VideoCapture(args.source)
    if not cap.isOpened():
        print("❌ Failed to open video.")
        return

    previous_positions = {}
    previous_times = {}

    ambulance_active = False
    last_detected_lane = None
    stable_frames = 0

    window_name = "Traffix-AI: Emergency Detection"

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_height, frame_width = frame.shape[:2]

        results = base_model.track(
            frame,
            persist=True,
            verbose=False,
            classes=ALL_VEHICLE_CLASSES
        )[0]

        ambulance_detected_this_frame = False
        detected_lane = None

        if results.boxes is not None and getattr(results.boxes, 'id', None) is not None:

            boxes = results.boxes.xyxy.cpu().numpy()
            ids = results.boxes.id.cpu().numpy()
            classes = results.boxes.cls.cpu().numpy()

            for box, obj_id, cls_idx in zip(boxes, ids, classes):

                x1, y1, x2, y2 = map(int, box)
                obj_id = int(obj_id)
                cls_idx = int(cls_idx)

                center = (
                    int((x1 + x2) / 2),
                    int((y1 + y2) / 2)
                )

                speed_kmh = calculate_speed(
                    obj_id,
                    center,
                    previous_positions,
                    previous_times,
                    args.pixel_to_meter
                )

                label = base_model.names.get(cls_idx, str(cls_idx))
                color = (0, 255, 0)

                # ----- Ambulance Detection ----- #

                if cls_idx in BIG_VEHICLE_CLASSES:
                    vehicle_crop = frame[y1:y2, x1:x2]

                    if vehicle_crop.size != 0:
                        amb_results = ambulance_model.predict(
                            vehicle_crop,
                            conf=0.75,
                            verbose=False
                        )[0]

                        if len(getattr(amb_results, 'boxes', [])) > 0:
                            ambulance_detected_this_frame = True
                            detected_lane = get_lane(center[0], frame_width)

                            label = f"AMBULANCE"
                            color = (0, 0, 255)

                # ----- Drawing ----- #

                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(
                    frame,
                    f"{label} | {int(speed_kmh)} km/h",
                    (x1, max(10, y1 - 10)),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.6,
                    color,
                    2
                )

        # ---------------- STABILITY LOGIC ---------------- #

        if ambulance_detected_this_frame:

            if detected_lane == last_detected_lane:
                stable_frames += 1
            else:
                stable_frames = 1
                last_detected_lane = detected_lane

            # require 5 stable frames before triggering
            if stable_frames >= 5 and not ambulance_active:
                send_to_arduino(ser, f"AMBULANCE:{detected_lane}")
                ambulance_active = True

        else:
            stable_frames = 0

            if ambulance_active:
                send_to_arduino(ser, "NORMAL")
                ambulance_active = False
                last_detected_lane = None

        cv2.imshow(window_name, frame)

        if cv2.waitKey(1) & 0xFF == 27:
            break

    cap.release()
    cv2.destroyAllWindows()
    ser.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", default="videos/Ambulance.mp4")
    parser.add_argument("--ambulance-model", default=None)
    parser.add_argument("--pixel-to-meter", type=float, default=0.05)

    args = parser.parse_args()
    main(args)