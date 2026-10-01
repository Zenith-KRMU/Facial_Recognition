import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # Server configuration
    PORT = int(os.getenv("FLASK_PORT", 5000))
    HOST = os.getenv("FLASK_HOST", "0.0.0.0")
    DEBUG = os.getenv("FLASK_DEBUG", "True").lower() in ("true", "1", "yes")

    # PostgreSQL Database URL with SQLite fallback
    # Example: postgresql://postgres:postgres@localhost:5432/crowd_dynamics
    DATABASE_URL = os.getenv(
        "DATABASE_URL", 
        "sqlite:///crowd_vision.db"
    )

    # Computer Vision & Deep Learning Parameters
    OPENCV_INFERENCE_WIDTH = int(os.getenv("OPENCV_INFERENCE_WIDTH", 640))
    OPENCV_INFERENCE_HEIGHT = int(os.getenv("OPENCV_INFERENCE_HEIGHT", 360))
    
    # DBSCAN Re-Identification Parameters (inspired by SharpAI/DeepCamera)
    DBSCAN_EPS = float(os.getenv("DBSCAN_EPS", 0.38))
    DBSCAN_MIN_SAMPLES = int(os.getenv("DBSCAN_MIN_SAMPLES", 1))
    REID_COSINE_THRESHOLD = float(os.getenv("REID_COSINE_THRESHOLD", 0.65))
    
    # Suspicious Activity Thresholds
    LOITERING_THRESHOLD_SEC = int(os.getenv("LOITERING_THRESHOLD_SEC", 180)) # 3 minutes
    STAMPEDE_TURBULENCE_THRESHOLD = float(os.getenv("STAMPEDE_TURBULENCE_THRESHOLD", 0.68))
    COUNTER_FLOW_ANGLE_TOLERANCE_DEG = float(os.getenv("COUNTER_FLOW_ANGLE_TOLERANCE_DEG", 120.0))
    
    # Secret Key for sessions/tokens
    SECRET_KEY = os.getenv("SECRET_KEY", "facial-recognition-crowd-dynamics-secret-key-2026")
