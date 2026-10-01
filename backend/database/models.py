from datetime import datetime
import json
from sqlalchemy import (
    Column,
    String,
    Float,
    Integer,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Camera(Base):
    __tablename__ = "cameras"

    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    rtsp_url = Column(String(256), nullable=True)
    zone = Column(String(128), default="Concourse Main")
    resolution = Column(String(32), default="1280x720")
    fps = Column(Float, default=30.0)
    status = Column(String(32), default="ONLINE")
    tripwire_enabled = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    tracked_persons = relationship("TrackedPersonRecord", back_populates="camera")
    alerts = relationship("SecurityAlertRecord", back_populates="camera")
    crowd_metrics = relationship("CrowdMetricRecord", back_populates="camera")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "rtspUrl": self.rtsp_url,
            "zone": self.zone,
            "resolution": self.resolution,
            "fps": self.fps,
            "status": self.status,
            "tripwireActive": self.tripwire_enabled,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }

class EnrolledFace(Base):
    __tablename__ = "enrolled_faces"

    id = Column(String(64), primary_key=True)
    name = Column(String(128), nullable=False)
    role = Column(String(64), default="Staff")
    status = Column(String(32), default="REGISTERED") # 'REGISTERED' | 'WATCHLIST_FLAG'
    embedding_json = Column(Text, nullable=False) # JSON array of 128 floats
    face_crop_url = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    enrolled_at = Column(DateTime, default=datetime.utcnow)

    def get_embedding(self):
        try:
            return json.loads(self.embedding_json)
        except Exception:
            return []

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "role": self.role,
            "status": self.status,
            "embedding": self.get_embedding(),
            "faceCropUrl": self.face_crop_url,
            "notes": self.notes,
            "enrolledAt": self.enrolled_at.isoformat() if self.enrolled_at else None,
        }

class TrackedPersonRecord(Base):
    __tablename__ = "tracked_persons"

    id = Column(String(64), primary_key=True)
    cluster_id = Column(String(32), index=True, nullable=False) # e.g. "C-104"
    label = Column(String(128), nullable=False)
    match_confidence = Column(Float, default=0.0)
    status = Column(String(32), default="UNREGISTERED") # 'REGISTERED' | 'WATCHLIST_FLAG' | 'UNREGISTERED'
    camera_id = Column(String(64), ForeignKey("cameras.id"), nullable=False)
    x = Column(Float, default=50.0)
    y = Column(Float, default=50.0)
    vx = Column(Float, default=0.0)
    vy = Column(Float, default=0.0)
    speed = Column(Float, default=0.0)
    direction_deg = Column(Float, default=0.0)
    occlusion_percent = Column(Float, default=0.0)
    occlusion_type = Column(String(32), default="NONE")
    risk_score = Column(Float, default=0.0)
    is_flagged_suspicious = Column(Boolean, default=False)
    flag_reason = Column(String(256), nullable=True)
    first_seen = Column(DateTime, default=datetime.utcnow)
    last_seen = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    camera = relationship("Camera", back_populates="tracked_persons")

    def to_dict(self):
        return {
            "id": self.id,
            "clusterId": self.cluster_id,
            "label": self.label,
            "matchConfidence": self.match_confidence,
            "status": self.status,
            "camera": self.camera_id,
            "x": self.x,
            "y": self.y,
            "vx": self.vx,
            "vy": self.vy,
            "speed": self.speed,
            "directionDeg": self.direction_deg,
            "occlusionPercent": self.occlusion_percent,
            "occlusionType": self.occlusion_type,
            "riskScore": self.risk_score,
            "isFlaggedSuspicious": self.is_flagged_suspicious,
            "flagReason": self.flag_reason,
            "firstSeen": self.first_seen.isoformat() if self.first_seen else None,
            "lastSeen": self.last_seen.isoformat() if self.last_seen else None,
        }

class CrossCameraHandoverRecord(Base):
    __tablename__ = "cross_camera_handovers"

    id = Column(Integer, primary_key=True, autoincrement=True)
    person_cluster_id = Column(String(32), index=True, nullable=False)
    from_camera_id = Column(String(64), nullable=False)
    to_camera_id = Column(String(64), nullable=False)
    confidence = Column(Float, default=0.85)
    handover_time = Column(DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "personClusterId": self.person_cluster_id,
            "fromCameraId": self.from_camera_id,
            "toCameraId": self.to_camera_id,
            "confidence": self.confidence,
            "handoverTime": self.handover_time.isoformat() if self.handover_time else None,
        }

class SecurityAlertRecord(Base):
    __tablename__ = "security_alerts"

    id = Column(String(64), primary_key=True)
    camera_id = Column(String(64), ForeignKey("cameras.id"), nullable=False)
    camera_name = Column(String(128), default="Terminal Cam")
    type = Column(String(64), nullable=False)
    severity = Column(String(16), default="WARNING") # 'CRITICAL' | 'WARNING' | 'ADVISORY'
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=False)
    person_cluster_id = Column(String(32), nullable=True)
    confidence = Column(Float, default=0.90)
    status = Column(String(32), default="ACTIVE") # 'ACTIVE' | 'ACKNOWLEDGED' | 'DISPATCHED' | 'RESOLVED'
    metrics_json = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    camera = relationship("Camera", back_populates="alerts")

    def to_dict(self):
        metrics = {}
        if self.metrics_json:
            try:
                metrics = json.loads(self.metrics_json)
            except Exception:
                pass
        return {
            "id": self.id,
            "cameraId": self.camera_id,
            "cameraName": self.camera_name,
            "type": self.type,
            "severity": self.severity,
            "title": self.title,
            "description": self.description,
            "personClusterId": self.person_cluster_id,
            "confidence": round(self.confidence * 100, 1) if self.confidence <= 1.0 else self.confidence,
            "status": self.status,
            "metrics": metrics,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
        }

class CrowdMetricRecord(Base):
    __tablename__ = "crowd_metrics"

    id = Column(Integer, primary_key=True, autoincrement=True)
    camera_id = Column(String(64), ForeignKey("cameras.id"), nullable=False)
    headcount = Column(Integer, default=0)
    density_index = Column(Float, default=0.0)
    turbulence_index = Column(Float, default=0.0)
    flow_angle_deg = Column(Float, default=0.0)
    recorded_at = Column(DateTime, default=datetime.utcnow)

    camera = relationship("Camera", back_populates="crowd_metrics")

    def to_dict(self):
        return {
            "id": self.id,
            "cameraId": self.camera_id,
            "headcount": self.headcount,
            "densityIndex": self.density_index,
            "turbulenceIndex": self.turbulence_index,
            "flowAngleDeg": self.flow_angle_deg,
            "recordedAt": self.recorded_at.isoformat() if self.recorded_at else None,
        }
