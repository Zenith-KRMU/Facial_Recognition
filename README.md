# Real-time Facial Recognition System for Crowd Dynamics in Public Spaces

[![Project Status](https://img.shields.io/badge/Status-Approved-brightgreen)](#)
[![Stack](https://img.shields.io/badge/Stack-TensorFlow_2.x_%7C_OpenCV_4.x_%7C_Flask_%7C_PostgreSQL_%7C_Docker-blue)](#)
[![Category](https://img.shields.io/badge/Problem_Type-Community_SDG-purple)](#)
[![DeepCamera](https://img.shields.io/badge/Inspired_By-SharpAI%2FDeepCamera-orange)](https://github.com/SharpAI/DeepCamera)

---

## 📌 Problem Description
Develop a low-latency, real-time facial recognition system for identification of crowd dynamics in public spaces. This system should accurately track individuals across cameras, distinguishing between different people and handling partial occlusions. Additionally, it should identify suspicious activity and alert authorities.

## 🎯 Objectives
- **Identify individuals in crowds:** Low-latency detection and extraction of deep biometric facial embeddings.
- **Track across cameras (Re-ID):** Link identity clusters across camera handovers without identity loss.
- **Handle partial occlusions:** Accurate recognition under masks, sunglasses, scarves, and variable illumination.
- **Detect suspicious behavior:** Real-time flagging of prolonged loitering (>180s), counter-flow bottlenecks, stampede divergence, restricted zone breaches, and dangerous items.
- **Alert authorities:** Command-and-control dashboard with tactical dispatch workflows and automated AI incident summaries.
- **Secure data transmission & storage:** Relational PostgreSQL 16 schema with isolated Docker container networking.

---

## 🚀 Proposed Solution & 4 Key Pillars

```
 ┌──────────────────────┐      ┌───────────────────────────┐      ┌─────────────────────────┐
 │ CCTV RTSP / Webcams  │ ───► │  OpenCV 4.x & TF 2.x CNN  │ ───► │  Optical Flow Dynamics  │
 │ (Multi-Camera Grid)  │      │  (Detection & Occlusions) │      │  (Lucas-Kanade/Farneb.) │
 └──────────────────────┘      └─────────────┬─────────────┘      └────────────┬────────────┘
                                             │                                 │
                                             ▼                                 ▼
 ┌──────────────────────┐      ┌───────────────────────────┐      ┌─────────────────────────┐
 │ Authority Dashboard  │ ◄─── │  Flask REST & MJPEG API   │ ◄─── │   ML DBSCAN Re-ID &     │
 │ (Tactical Dispatch)  │      │  & PostgreSQL 16 Storage  │      │   Handover Clustering   │
 └──────────────────────┘      └───────────────────────────┘      └─────────────────────────┘
```

1. **Convolutional Neural Networks (CNNs) for Face Detection & Recognition**
   - TensorFlow 2.x & OpenCV CNN pipeline.
   - 68-landmark facial alignment.
   - Occlusion estimation engine detecting masks, sunglasses, and scarves with adaptive feature weighting.
   - 128D/512D L2-normalized biometric embeddings.

2. **Optical Flow Techniques for Crowd Dynamics & Tracking**
   - **Lucas-Kanade Sparse Optical Flow (`cv2.calcOpticalFlowPyrLK`):** Low-latency tracking of individual pedestrian keypoints.
   - **Gunnar Farneback Dense Optical Flow (`cv2.calcOpticalFlowFarneback`):** Full-field crowd velocity vector fields $(dx, dy)$, dominant trajectory angle, crowd turbulence index, and counter-flow collision detection.
   - Stampede / rapid abnormal dispersal alerts when velocity and turbulence exceed critical thresholds.

3. **Machine Learning Clustering Algorithm (DBSCAN & Cosine Distance)**
   - Unsupervised **DBSCAN** clustering on pairwise cosine distance matrices (adapted from [SharpAI/DeepCamera](https://github.com/SharpAI/DeepCamera)).
   - Distinguishes individuals without pre-specifying crowd count.
   - Persistent cluster IDs (`C-101`, `C-102`) maintained across temporal frames.
   - Cross-camera Re-ID handovers tracked and logged in PostgreSQL.

4. **Web-Based Authority Interface & Secure Transmission**
   - Real-time CCTV surveillance grid with PTZ controls, landmark overlays, and optical flow vectors.
   - Interactive Suspicious Alerts stream with 1-click tactical dispatch.
   - Person Dossier forensic audit trail with camera transition timelines.
   - AI Incident Analysis powered by Google Gemini 3.8 Flash.

---

## 🛠️ Technology Stack

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Deep Learning** | **TensorFlow 2.x** / MobileNetV2 / ArcFace | Real-time CNN inference & robust embeddings |
| **Computer Vision** | **OpenCV 4.x** (C++ backend with Python bindings) | High-speed Lucas-Kanade and Farneback optical flow |
| **ML Clustering** | **scikit-learn DBSCAN** (Metric: Cosine) | Unsupervised person clustering & Re-ID without cluster presets |
| **API Layer** | **Flask 3.0** REST & MJPEG Stream API | Low-latency telemetry transmission & camera worker threads |
| **Database** | **PostgreSQL 16** (with SQLite fallback) | ACID compliance, indexing, handover history, and alert logs |
| **Containerization**| **Docker & Docker Compose** | Multi-service orchestration and reproducible environment |
| **Web Dashboard** | **React 19, TypeScript, Tailwind CSS, Vite** | Responsive command-and-control interface with sub-10ms UI updates |

---

## 💡 SharpAI/DeepCamera Inspiration

In reviewing the [SharpAI/DeepCamera](https://github.com/SharpAI/DeepCamera) repository, we adopted several architectural best practices:
1. **Edge Stream Worker Topology:** Decoupled camera ingestion threads (`CameraStreamWorker`) preventing slow I/O from blocking video decode.
2. **DBSCAN on Cosine Distance Matrix:** Following DeepCamera's `cluster.py`, we construct pairwise distance matrices $D_{ij} = 1 - \frac{u \cdot v}{\|u\|_2 \|v\|_2}$ and apply DBSCAN clustering to partition distinct individuals across feeds.
3. **Occlusion-Resilient Embeddings:** Weighting spatial grid blocks based on detected occlusions (e.g. downweighting lower face during mask detection), mirroring DeepCamera's face preprocessing filters.
4. **Microservices Container Layout:** Clean separation of database, vision worker, and web dashboard via Docker Compose.

---

## 📁 Repository Structure

```
Facial_Recognition/
├── backend/
│   ├── app.py                      # Flask REST & MJPEG streaming API server
│   ├── config.py                   # Environment configuration & CV thresholds
│   ├── requirements.txt            # Python dependencies (OpenCV, TF, Flask, etc.)
│   ├── database/
│   │   ├── db.py                   # SQLAlchemy engine with PostgreSQL & SQLite fallback
│   │   ├── models.py               # ORM Models (Cameras, Persons, Alerts, Handovers)
│   │   └── schema.sql              # Native PostgreSQL 16 DDL schema & seed data
│   ├── vision/
│   │   ├── face_detector.py        # CNN face detection & occlusion analyzer
│   │   ├── embedding_extractor.py  # 128D/512D deep feature embedding network
│   │   ├── optical_flow.py         # Lucas-Kanade & Farneback dense optical flow
│   │   ├── reid_clusterer.py       # DBSCAN Re-ID clustering across camera feeds
│   │   ├── suspicious_activity.py  # Loitering, stampede & counter-flow rule engine
│   │   └── video_streamer.py       # Multi-camera worker & annotated MJPEG pipeline
│   └── tests/
│       ├── test_vision.py          # Unit tests for CV & DBSCAN algorithms
│       └── test_api.py             # Unit tests for Flask API & PostgreSQL
├── docker/
│   ├── Dockerfile.backend          # Container build for Flask + OpenCV + TensorFlow
│   └── Dockerfile.frontend         # Container build for React + Vite + Express
├── docker-compose.yml              # 3-tier multi-container orchestration
├── src/                            # React 19 Authority Web Dashboard
├── server.ts                       # Gateway server proxying /api/v1 to Flask
├── run_backend.sh                  # One-click startup script for Python backend
└── README.md                       # Comprehensive system documentation
```

---

## ⚡ Quick Start Guide

### Option A: Complete Multi-Container Deployment (Recommended)

Run the full system (PostgreSQL 16, Flask OpenCV/TF Worker, and React Web Dashboard) with Docker Compose:

```bash
# 1. Clone repository
cd Facial_Recognition

# 2. Build and launch all containers
docker-compose up -d --build

# 3. View status
docker-compose ps
```

- **Authority Web Dashboard:** `http://localhost:3000`
- **Flask Vision API:** `http://localhost:5000/api/v1/health`
- **PostgreSQL Database:** `localhost:5432` (db: `crowd_dynamics`, user: `postgres`)

---

### Option B: Local Development Setup

#### 1. Start Python Flask Vision Backend (Port 5000)
```bash
./run_backend.sh
```
*Note: If PostgreSQL is not running locally, the system automatically uses SQLite3 (`sqlite:///crowd_vision.db`) with zero manual setup required.*

#### 2. Start Web Dashboard (Port 3000)
In another terminal:
```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

---

## 🧪 Running Unit Tests

Verify the computer vision pipeline and API endpoints:

```bash
# Test Computer Vision & DBSCAN Clustering
python3 -m unittest backend/tests/test_vision.py

# Test Flask REST Endpoints & Database CRUD
python3 -m unittest backend/tests/test_api.py
```

---

## 📡 Core API Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/v1/health` | `GET` | System health check (TensorFlow, OpenCV, PostgreSQL status) |
| `/api/v1/detect` | `POST` | CNN face detection, occlusion estimation, and 128D embedding extraction |
| `/api/v1/optical-flow` | `POST` | Lucas-Kanade and Farneback dense optical flow vector computation |
| `/api/v1/clustering/reid` | `POST` | DBSCAN Re-ID clustering and cross-camera handover tracking |
| `/api/v1/cameras` | `GET / POST` | Query or register CCTV camera streams |
| `/api/v1/analytics/crowd-metrics` | `GET` | Aggregated crowd headcount, density, and turbulence |
| `/api/v1/alerts` | `GET / POST` | Fetch recent alerts or log suspicious incidents |
| `/api/v1/alerts/<id>/dispatch` | `POST` | Authority tactical dispatch action (Acknowledge / Dispatch / Resolve) |
| `/api/v1/faces/enrolled` | `GET / POST` | Biometric face enrollment into PostgreSQL registry |
| `/api/v1/stream/<camera_id>` | `GET` | Live annotated MJPEG video stream with HUD overlays |
