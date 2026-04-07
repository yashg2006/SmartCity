# 🏛️ UrbanPulse — Smart City Infrastructure Portal

A real-time IoT-powered Smart City monitoring platform for **Water Drainage Management**, **Garbage Detection**, and **AI-Powered Mosquito Swarm Detection**, built with React + Express + MongoDB + AI (YOLOv8).

> 🇮🇳 Digital India Initiative — Department of Urban Planning

---

## 🌟 Features

### 🦟 Mosquito Swarm Detection & AI-Fusion Risk Scoring [NEW]
- **DHT11 Sensor** — monitors temperature and humidity (key factors for breeding)
- **Sound Sensor** — detects high-frequency mosquito buzzing sounds
- **PIR Motion Sensor** — detects biological activity in potential breeding hotspots
- **AI-Fusion Risk Scoring** — combines real-time hardware sensor data with YOLOv8 ML model vision input to calculate a precise breeding risk score (0-100)
- **Hardware Alerts** — Live risk results and sensor readings displayed on local ESP32 LCD
- **Interactive Heatmap** — Visualize mosquito hotspots across the city sectors

### 💧 Water Drainage Monitoring
- **Water Sensor** (inside pipeline) — detects if water is actively flowing through the pipe
- **Ultrasonic Sensor** (top of pipe, facing down) — measures distance to water surface to calculate water level
- **Combined Flow Diagnosis** — determines flow speed (fast/normal/slow/no flow) by combining both sensor readings
- **Pipeline SVG Visualization** — live cross-section diagram showing water level, sensor positions, and flow direction

### 🗑️ Garbage Detection & Citizen Reporting
- **Ultrasonic Sensor on Bin Lid** — measures distance to garbage surface; short distance = bin filling up
- **Overflow Alerts** — critical alert when bin fill exceeds 85%
- **Citizen Image Reporting** — citizens can capture/upload photos of garbage and submit reports directly to the Municipal Corporation
- **Report Tracking** — all citizen reports are stored with status (Pending → Acknowledged → Resolved)

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite |
| **Backend** | Node.js + Express |
| **ML Server** | Python + Flask + YOLOv8 + OpenCV |
| **Database** | MongoDB + Mongoose |
| **Real-time** | Socket.IO |
| **Hardware** | ESP32 (R4 WiFi) + Sound Sensor + PIR + DHT11 + HC-SR04 + LCD I2C |

---

## 📂 Project Structure

```
Smart_City project/
├── backend/
│   ├── server.js                # Express + Socket.IO server
│   ├── routes/
│   │   ├── sensors.js           # Main sensor data handler
│   │   └── mosquito.js          # Mosquito risk reports & analytics
├── ml_server/
│   ├── main.py                  # YOLOv8 analysis & risk fusion engine
│   └── requirements.txt         # ML dependencies (ultralytics, flask)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── MosquitoDetection.jsx # 🦟 Mosquito risk dashboard
│   │   │   ├── WaterDrainage.jsx    # 💧 Water drainage monitoring
│   │   │   ├── GarbageDetection.jsx # 🗑️ Garbage detection + reporting
│   │   │   └── Dashboard.jsx        # 📊 Overview dashboard
├── esp32_smartcity/
│   └── esp32_smartcity.ino      # ESP32 Firmware for all sensors
└── README.md
```

---

## 📡 ESP32 / Arduino Integration

### 1. Pushing Sensor Data
Your ESP32 should POST sensor data to the backend:
`POST http://<SERVER_IP>:3000/api/sensors/data`

#### Payload Format
```json
{
  "nodeId": "MOSQUITO-NODE-01",
  "zone": "Sector 4A",
  "temp": 28.5,
  "humid": 65.0,
  "sound": 450,
  "motion": true
}
```

### 2. Polling for AI Risk Reports
The ESP32 polls the server to display the hardware/AI fusion result on the LCD:
`GET http://<SERVER_IP>:3000/api/mosquito/latest-report?zone=Sector%204A`

#### Response Format
```json
{
  "mlResult": "CRITICAL SWARM",
  "riskScore": 92
}
```

---

## 🔑 Key API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sensors/data` | Receive multi-sensor data from hardware |
| `GET` | `/api/mosquito/latest-report` | Fetch latest AI+Hardware fusion risk report |
| `GET` | `/api/sensors/nodes` | Get latest reading per node |
| `POST` | `/api/sensors/report` | Submit citizen garbage report |
| `POST` | `/api/auth/login` | Authentication |

---

## 🧠 Smart City Logic

### 🦟 Mosquito Breeding Risk (Fusion)
- **High Temp/Humidity** (DHT11) + **Buzzing Sound** (Analog) = Baseline Risk 📈
- **Motion Detected** (PIR) + **AI Vision Match** (YOLOv8) = Swarm Confirmed 🔥
- **Result**: Visual Risk Indicator + Hardware Alert + Municipal Dispatch

### 💧 Water Drainage System
- `Water Sensor (WET)` + `Low drainDistance` → **HIGH FLOW** ⚡

### 🗑️ Garbage Bin System
- `FillPercent > 85%` → **CRITICAL OVERFLOW** 🔴

---

## 📄 License

This project is built for the Smart City Hackathon — Digital India Initiative.
