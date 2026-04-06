import base64
import io
import os
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
from ultralytics import YOLO

app = FastAPI(title="Mosquito Detection ML API")

# Enable CORS for frontend/backend interaction
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load the model
# Model path is relative to the project root or absolute
MODEL_PATH = r"c:\Users\G15\Downloads\Smart_City project\MosquitoFusion-main\weights\best.pt"

if not os.path.exists(MODEL_PATH):
    print(f"ERROR: Model file not found at {MODEL_PATH}")
    model = None
else:
    print(f"Loading YOLOv8 model from {MODEL_PATH}...")
    model = YOLO(MODEL_PATH)

class ImageRequest(BaseModel):
    imageData: str  # Base64 encoded image

@app.get("/")
async def root():
    return {"status": "online", "model": "YOLOv8 Mosquito Detection"}

@app.post("/predict")
async def predict(request: ImageRequest):
    if model is None:
        raise HTTPException(status_code=500, detail="Model not loaded on server")

    try:
        # Decode base64 image
        header, encoded = request.imageData.split(",", 1) if "," in request.imageData else (None, request.imageData)
        image_data = base64.b64decode(encoded)
        image = Image.open(io.BytesIO(image_data))

        # Run inference
        results = model.predict(source=image, conf=0.25)
        
        # Parse results
        detections = []
        is_detected = False
        max_conf = 0.0

        for r in results:
            for box in r.boxes:
                is_detected = True
                conf = float(box.conf[0])
                cls = int(box.cls[0])
                name = r.names[cls]
                detections.append({
                    "class": name,
                    "confidence": conf,
                    "bbox": box.xyxy[0].tolist() # [x1, y1, x2, y2]
                })
                if conf > max_conf:
                    max_conf = conf

        # Determine final status
        ml_result = "DETECTED" if is_detected else "NOT_DETECTED"
        if is_detected and max_conf < 0.4:
            ml_result = "POTENTIAL_RISK"

        return {
            "success": True,
            "mlResult": ml_result,
            "confidence": max_conf if is_detected else 0.85, # Default high confidence for NOT_DETECTED
            "detectionsCount": len(detections),
            "detections": detections
        }

    except Exception as e:
        print(f"Inference error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
