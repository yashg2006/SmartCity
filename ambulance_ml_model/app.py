import streamlit as st
import cv2
import time
import serial
import os
from ultralytics import YOLO

# ---------------- CONFIG ---------------- #

SERIAL_PORT = "/dev/ttyACM0"
BAUD_RATE = 115200
VIDEO_FOLDER = "videos"

# ---------------- PAGE SETUP ---------------- #

st.set_page_config(
    page_title="Traffix-AI",
    layout="wide",
    page_icon="🚦"
)

# Custom futuristic styling
st.markdown("""
<style>
body {background-color: #0e1117;}
.big-title {font-size: 40px; font-weight: bold; color: #00f2ff;}
.status-green {color: #00ff88; font-size: 20px;}
.status-red {color: #ff3c3c; font-size: 20px;}
</style>
""", unsafe_allow_html=True)

st.markdown('<p class="big-title">🚦 Traffix-AI Smart Emergency System</p>', unsafe_allow_html=True)

# ---------------- SIDEBAR ---------------- #

st.sidebar.title("⚙️ Control Panel")

video_files = [f for f in os.listdir(VIDEO_FOLDER) if f.endswith(".mp4")]
selected_video = st.sidebar.selectbox("Select Traffic Video", video_files)

start_button = st.sidebar.button("▶ Start Simulation")
stop_button = st.sidebar.button("⏹ Stop")

# ---------------- INIT SESSION STATE ---------------- #

if "running" not in st.session_state:
    st.session_state.running = False

if start_button:
    st.session_state.running = True

if stop_button:
    st.session_state.running = False

# ---------------- PLACEHOLDERS ---------------- #

col1, col2 = st.columns([3, 1])

video_placeholder = col1.empty()
status_placeholder = col2.empty()
lane_placeholder = col2.empty()

# ---------------- LOAD MODEL ---------------- #

model = YOLO("yolov8s.pt")

# ---------------- SERIAL SETUP ---------------- #

ser = None
try:
    ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
    time.sleep(2)
except:
    st.sidebar.warning("⚠ Arduino not connected")

ambulance_active = False

# ---------------- LANE LOGIC ---------------- #

def get_lane(center_x, width):
    zone = width / 4
    if center_x < zone:
        return 1
    elif center_x < zone * 2:
        return 2
    elif center_x < zone * 3:
        return 3
    else:
        return 4

# ---------------- MAIN VIDEO LOOP ---------------- #

if st.session_state.running:

    video_path = os.path.join(VIDEO_FOLDER, selected_video)
    cap = cv2.VideoCapture(video_path)

    while st.session_state.running and cap.isOpened():

        ret, frame = cap.read()
        if not ret:
            break

        height, width = frame.shape[:2]

        results = model(frame)[0]

        detected_lane = None
        ambulance_detected = False

        if results.boxes is not None:
            for box, cls in zip(results.boxes.xyxy, results.boxes.cls):
                x1, y1, x2, y2 = map(int, box)
                cls = int(cls)
                label = model.names[cls]

                if label.lower() == "ambulance":
                    ambulance_detected = True
                    center_x = (x1 + x2) // 2
                    detected_lane = get_lane(center_x, width)

                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0,0,255), 2)
                    cv2.putText(frame, "AMBULANCE", (x1, y1-10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0,0,255), 2)

        # ----- SERIAL ----- #

        if ser:
            if ambulance_detected and not ambulance_active:
                ser.write(f"AMBULANCE:{detected_lane}\n".encode())
                ambulance_active = True

            if not ambulance_detected and ambulance_active:
                ser.write(b"NORMAL\n")
                ambulance_active = False

        # ----- UI STATUS ----- #

        if ambulance_detected:
            status_placeholder.markdown(
                '<p class="status-red">🚑 Emergency Vehicle Detected</p>',
                unsafe_allow_html=True
            )
            lane_placeholder.metric("Priority Lane", detected_lane)
        else:
            status_placeholder.markdown(
                '<p class="status-green">🟢 Normal Traffic Flow</p>',
                unsafe_allow_html=True
            )
            lane_placeholder.metric("Priority Lane", "None")

        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        video_placeholder.image(frame_rgb, channels="RGB")

        time.sleep(0.03)

    cap.release()