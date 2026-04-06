# Smart Farm AI 🌿 (Stable v2.4-Enterprise)

> **Transforming Agriculture with Intelligent Digital Twins.**

Smart Farm AI is a next-generation enterprise platform designed to revolutionize livestock management and agricultural productivity. By integrating high-fidelity 3D modeling, low-latency IoT telemetry, and state-of-the-art Computer Vision (YOLOv8), the platform converts raw environmental data into actionable operational intelligence.

---

## 🏗️ Core Pillars of Intelligence

### 🔬 [1] IoT Telemetry Network
A low-latency, resilient monitoring pipeline utilizing **MQTT** and **WebSockets** to track vital statistics across decentralized farm locations.
- **Metrics**: Temperature, Humidity, Activity, Heart Rate, and Feed/Water levels.
- **Alerting**: Automated anomaly detection with severity-based triggering.

### 👁️ [2] Computer Vision Hive
High-speed image inference using **YOLOv8** oriented-bounding-box (OBB) models for precise livestock tracking and security.
- **Real-time Detection**: Automatic identification of bees, cows, poultry, sheep, and goats.
- **Diagnostics**: Physical health monitoring through visual gait and behavior analysis.

### 🧠 [3] AI Logic & Predictions
Advanced predictive modeling that forecasts agricultural yields and operational risks.
- **Digital Twin**: Hardware-accelerated 3D representations of livestock entities.
- **Explainable AI**: Integrated recommendation engine providing clear "why" behind automated alerts.

---

## 🗂️ Advanced Livestock Intelligence

The system provides specialized, high-fidelity monitoring dashboards for five core species:

| Species | 3D Design | Key Monitoring Metrics |
|:---:|:---:|:---:|
| **Bee** | 🐝 | Hive Temp, Humidity, Pollen Rate, Acoustic Activity. |
| **Cow** | 🐄 | Body Temp, Milk Yield, Rumination Time, Movement. |
| **Poultry** | 🐔 | Coop Temp, Egg Production, Feed/Water Consumption. |
| **Sheep** | 🐑 | Rectal Temp, Heart Rate, Grazing Time, Flock Analytics. |
| **Goat** | 🐐 | Agility Index, Milk Yield, Herding Behavior, Rumination. |

---

## 🚀 Quick Launch (One Command)

For the fastest way to start the **entire enterprise ecosystem** (Backend, Frontend, and AI Workers) in one go, use the following PowerShell command from the project root:

```powershell
powershell ./scripts/run_app.ps1
```
*This will automatically launch three dedicated terminal windows for the API, the Dashboard, and the AI Simulation layers.*

---

## 🛠️ Step-by-Step Deployment (Manual)

If you prefer to manage each service individually, ensure you have **Python 3.10+**, **PostgreSQL**, and **Node.js 18+** installed.

### 1. Backend Initialization
```powershell
# Install requirements
pip install -r backend/requirements.txt

# External DB Setup (PostgreSQL)
# Ensure .env is configured with DATABASE_URL
python backend/app/utils/seed.py
```

### 2. Frontend Launch
```powershell
cd frontend
npm install
npm run dev
```

### 3. Launch System
The platform consists of three main services:
- **FastAPI Core**: `uvicorn app.main:app --reload` (Port 8000)
- **React Dashboard**: `npm run dev` (Port 5173)
- **AI Workers**: Distributed simulators for CV and IoT telemetry.

---

## 📂 Project Structure

```
smart-farm-ai/
├── backend/               # FastAPI Clean Architecture + YOLOv8 Models
│   ├── app/               # Core Logic, API Routes, Schema
│   └── models/            # Pre-trained .pt and .onnx weights
├── frontend/              # React 18 + Vite + Three.js
│   ├── src/pages/         # 14+ Specialized Intelligence Pages
│   ├── src/components/    # 3D Digital Twin & Chart Components
│   └── public/models/     # Interactive GLB Livestock Assets
├── workers/               # AI & CV Intelligent Simulators
└── scripts/               # PowerShell Setup & Run scripts ($PS1)
```

---

## 🔐 Default Credentials (Demo)

| Username | Password   | Role   |
|----------|------------|--------|
| `admin`  | `admin123`  | Administrator (Full Permissions) |
| `manager` | `admin123`  | Operation Manager (Farm Level) |
| `vet`    | `admin123`  | Veterinary (Health Level) |

---

## 📄 License

**MIT License** — Precision-engineered for academic research and commercial expansion. Designed to be free, open, and scalable.
