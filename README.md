# 🏛️ UrbanPulse — Smart City Infrastructure Portal

A real-time IoT-powered Smart City monitoring platform for **Water Drainage Management** and **Garbage Detection & Reporting**, built with React + Express + MongoDB.

> 🇮🇳 Digital India Initiative — Department of Urban Planning

---

## 🌟 Features

### 💧 Water Drainage Monitoring
- **Water Sensor** (inside pipeline) — detects if water is actively flowing through the pipe
- **Ultrasonic Sensor** (top of pipe, facing down) — measures distance to water surface to calculate water level
- **Combined Flow Diagnosis** — determines flow speed (fast/normal/slow/no flow) by combining both sensor readings
- **Pipeline SVG Visualization** — live cross-section diagram showing water level, sensor positions, and flow direction
- **Blockage Detection** — alerts when water sensor reads DRY (no flow = potential upstream blockage)
- **Sector-based monitoring** — only Sector 4A has real hardware; other sectors are greyed out

### 🗑️ Garbage Detection & Citizen Reporting
- **Ultrasonic Sensor on Bin Lid** — measures distance to garbage surface; short distance = bin filling up
- **Overflow Alerts** — critical alert when bin fill exceeds 85%
- **Citizen Image Reporting** — citizens can capture/upload photos of garbage and submit reports directly to the Municipal Corporation
- **Report Tracking** — all citizen reports are stored with status (Pending → Acknowledged → Resolved)
- **Bin SVG Visualization** — live cross-section of bin showing fill level and sensor position

### 📊 Overview Dashboard
- Summary stats for both Water Drainage and Garbage systems
- Geographic sensor network map
- Real-time hardware node status
- Community awareness blog section

### 🏢 Field Operations (Municipal Portal)
- Node registry with status filtering
- Dispatch crew actions for critical/warning nodes

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + Vite |
| **Backend** | Node.js + Express |
| **Database** | MongoDB + Mongoose |
| **Real-time** | Socket.IO |
| **Hardware** | ESP32 + HC-SR04 Ultrasonic + Water Level Sensor |

---

## 📂 Project Structure

```
Smart_City project/
├── backend/
│   ├── models/
│   │   ├── SensorData.js        # Sensor readings (distance, drainDistance, waterStatus)
│   │   ├── GarbageReport.js     # Citizen garbage reports with images
│   │   ├── Incident.js          # Alert incidents
│   │   └── User.js              # User accounts
│   ├── routes/
│   │   ├── sensors.js           # Sensor data intake, reports, incidents
│   │   ├── auth.js              # Authentication
│   │   └── users.js             # User management
│   ├── server.js                # Express + Socket.IO server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── WaterDrainage.jsx    # 💧 Water drainage monitoring page
│   │   │   ├── GarbageDetection.jsx # 🗑️ Garbage detection + citizen reporting
│   │   │   ├── Dashboard.jsx        # 📊 Overview dashboard
│   │   │   ├── Sidebar.jsx          # Navigation sidebar
│   │   │   ├── MunicipalPortal.jsx  # 🏢 Field operations
│   │   │   ├── SensorMap.jsx        # SVG sensor network map
│   │   │   ├── Login.jsx            # Authentication page
│   │   │   └── ...
│   │   ├── App.jsx              # Main app with routing
│   │   ├── config.js            # API URL config
│   │   └── index.css            # Global styles
│   └── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)
- ESP32 with sensors (for real hardware data)

### 1. Clone the repository
```bash
git clone https://github.com/yashg2006/SmartCity.git
cd SmartCity
```

### 2. Setup Backend
```bash
cd backend
npm install
```

Create a `.env` file:
```env
MONGO_URI=mongodb://localhost:27017/smartcity
PORT=5000
JWT_SECRET=your_secret_key
```

Start the server:
```bash
node server.js
```

### 3. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```

The app will be available at `http://localhost:5173`

---

## 📡 ESP32 / Arduino Integration

Your ESP32 should POST sensor data to the backend:

```
POST http://<SERVER_IP>:5000/api/sensors/data
Content-Type: application/json
```

### Payload Format
```json
{
  "nodeId": "NODE-001",
  "zone": "Sector 4A",
  "distance": 25,
  "drainDistance": 18,
  "waterStatus": "NORMAL",
  "lat": 12.9716,
  "lng": 77.5946,
  "batteryLevel": 95
}
```

### Field Descriptions

| Field | Type | Description |
|-------|------|-------------|
| `distance` | Number (cm) | Ultrasonic on bin lid → garbage surface. Low = bin full |
| `drainDistance` | Number (cm) | Ultrasonic in pipe → water surface. Low = high water |
| `waterStatus` | String | `NORMAL` (flowing), `DRY` (no flow), `OVERFLOW` |
| `nodeId` | String | Unique sensor node ID |
| `zone` | String | Sector/zone name |

### Alert Thresholds
- **Bin Full**: `distance < 8cm`
- **Water Dry (Blockage)**: `waterStatus = "DRY"`
- **Drain High Water**: `drainDistance < 5cm`
- **Water Overflow**: `waterStatus = "OVERFLOW"`

---

## 🔑 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/sensors/data` | Receive sensor data from ESP32 |
| `GET` | `/api/sensors/nodes` | Get latest reading per node |
| `GET` | `/api/sensors/latest` | Get last 50 readings |
| `GET` | `/api/sensors/incidents` | Get active incidents |
| `POST` | `/api/sensors/report` | Submit citizen garbage report |
| `GET` | `/api/sensors/reports` | Get all citizen reports |
| `POST` | `/api/auth/register` | Register user |
| `POST` | `/api/auth/login` | Login |

---

## 🧠 Sensor Logic

### Water Drainage System
```
Water Sensor (WET) + Low drainDistance  → HIGH FLOW  ⚡
Water Sensor (WET) + Mid drainDistance  → NORMAL FLOW ✅
Water Sensor (WET) + High drainDistance → LOW FLOW   💧
Water Sensor (DRY)                      → NO FLOW    🚫 (blockage alert)
```

### Garbage Bin System
```
fillPercent = ((BIN_DEPTH - distance) / BIN_DEPTH) × 100

fillPercent > 85%  → CRITICAL  🔴 (overflow risk alert)
fillPercent > 65%  → WARNING   🟡
fillPercent ≤ 65%  → HEALTHY   🟢
```

---

## 👥 Roles

| Role | Permissions |
|------|------------|
| `admin` | Full access, dispatch crews, manage incidents |
| `municipal` | Field operations, dispatch crews |
| `citizen` | View dashboard, submit garbage reports |

---

## 📄 License

This project is built for the Smart City Hackathon — Digital India Initiative.
