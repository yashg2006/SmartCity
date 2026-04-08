# 🚀 Smart City Infrastructure — Setup & Execution Guide

This guide provides step-by-step instructions to get the complete **UrbanPulse** Smart City system running on your local machine.

---

## 📋 Prerequisites

Ensure you have the following installed:
1. **Node.js** (v18 or higher) — [Download](https://nodejs.org/)
2. **Python 3.9+** — [Download](https://www.python.org/)
3. **MongoDB Community Server** — [Download](https://www.mongodb.com/try/download/community)
4. **Arduino IDE 2.x** — [Download](https://www.arduino.cc/en/software)
5. **YOLOv8 Weights** — Ensure `best.pt` is in `MosquitoFusion-main/weights/`

---

## 🛠️ Step 1: ML Server Setup (Python)
The ML server handles vision analysis and risk fusion.

1. Open a terminal in the `ml_server` directory:
   ```bash
   cd ml_server
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Mac/Linux:
   source venv/bin/activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Update the `MODEL_PATH` in `main.py` if necessary to point to your `best.pt` file.
5. Start the ML server:
   ```bash
   python main.py
   ```
   *The ML server will run on **http://localhost:8000***.

---

## 💻 Step 2: Backend Setup (Node.js)
The backend manages sensor data, database storage, and real-time updates.

1. Open a terminal in the `backend` directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Ensure your MongoDB service is running locally (`mongodb://localhost:27017`).
4. (Optional) Check `.env` file for configuration:
   ```env
   MONGO_URI=mongodb://localhost:27017/smartcity
   PORT=3000
   ```
5. Start the backend:
   ```bash
   node server.js
   ```
   *The backend will run on **http://localhost:3000***.

---

## 🎨 Step 3: Frontend Setup (React + Vite)
The dashboard provides a real-time visualization of all smart city systems.

1. Open a terminal in the `frontend` directory:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *The dashboard will typicaly run on **http://localhost:5173***.

---

## 📟 Step 4: ESP32 Hardware Firmware
The ESP32 collects data from DHT11, Sound, PIR, and Ultrasonic sensors.

1. Open `esp32_smartcity/esp32_smartcity.ino` in the **Arduino IDE**.
2. **Install Required Libraries**:
   - `WiFiS3` (for Arduino R4 WiFi)
   - `ArduinoHttpClient`
   - `ArduinoJson`
   - `DHT sensor library`
   - `LiquidCrystal I2C`
   - `TinyGPS++`
3. **Configure Network**:
   - Update `ssid` and `pass` with your WiFi credentials.
   - Update `serverAddress` with your laptop's **current IP** (Find it using `ipconfig` in cmd).
     > [!TIP]
     > Current detected IP: `10.44.53.60`
4. Connect your ESP32 and click **Upload**.
5. Open Serial Monitor (115200 baud) to verify connection.

---

## 🏁 Verification Order
To ensure everything works correctly, start services in this order:
1. **MongoDB** (Database)
2. **ML Server** (Python)
3. **Backend** (Node.js)
4. **Frontend** (React)
5. **ESP32** (Hardware)

The frontend dashboard should now show live data from your hardware nodes! 🚀
