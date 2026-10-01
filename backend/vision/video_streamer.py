import cv2
import numpy as np
import time
import math
import threading
import logging
from backend.vision.face_detector import FaceDetector
from backend.vision.optical_flow import OpticalFlowTracker
from backend.vision.embedding_extractor import FeatureEmbeddingExtractor
from backend.vision.reid_clusterer import ReIDClusterer
from backend.vision.suspicious_activity import SuspiciousActivityDetector

logger = logging.getLogger(__name__)

class CameraStreamWorker:
    """
    Worker managing real-time video capture, computer vision pipeline,
    and MJPEG streaming for a single camera feed.
    """

    def __init__(self, camera_id, camera_name, source=0, width=640, height=360):
        self.camera_id = camera_id
        self.camera_name = camera_name
        self.source = source
        self.width = width
        self.height = height

        self.cap = None
        self.is_running = False
        self.lock = threading.Lock()
        self.latest_frame = None
        self.latest_annotated_frame = None
        
        # Computer Vision Modules
        self.face_detector = FaceDetector()
        self.optical_flow = OpticalFlowTracker(step_size=28)
        self.embedding_extractor = FeatureEmbeddingExtractor()
        self.reid_clusterer = ReIDClusterer()
        self.threat_detector = SuspiciousActivityDetector()

        # Telemetry Cache
        self.current_people = []
        self.current_flow = {}
        self.current_alerts = []
        self.fps = 30.0

        # Synthetic simulation state when no physical camera is attached
        self.is_synthetic = False
        self.sim_phase = 0.0

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self.thread = threading.Thread(target=self._run_loop, daemon=True)
        self.thread.start()
        logger.info(f"[CameraWorker {self.camera_id}] Pipeline started.")

    def stop(self):
        self.is_running = False
        if self.cap:
            try:
                self.cap.release()
            except Exception:
                pass
        logger.info(f"[CameraWorker {self.camera_id}] Pipeline stopped.")

    def _open_source(self):
        try:
            if isinstance(self.source, int) or (isinstance(self.source, str) and self.source.isdigit()):
                self.cap = cv2.VideoCapture(int(self.source))
            elif isinstance(self.source, str) and (self.source.startswith("rtsp://") or self.source.startswith("http://")):
                self.cap = cv2.VideoCapture(self.source)
            elif isinstance(self.source, str) and self.source.endswith((".mp4", ".avi", ".mkv")):
                self.cap = cv2.VideoCapture(self.source)
            else:
                self.cap = None

            if self.cap and self.cap.isOpened():
                self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
                self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
                self.is_synthetic = False
                logger.info(f"[CameraWorker {self.camera_id}] Successfully opened camera hardware: {self.source}")
            else:
                self.is_synthetic = True
                logger.info(f"[CameraWorker {self.camera_id}] Using dynamic synthetic public concourse feed for {self.camera_id}")
        except Exception as e:
            self.is_synthetic = True
            logger.warning(f"[CameraWorker {self.camera_id}] Falling back to synthetic feed: {e}")

    def _generate_synthetic_frame(self):
        """Generates realistic synthetic crowd scene with animated pedestrians and optical flow."""
        self.sim_phase += 0.05
        frame = np.zeros((self.height, self.width, 3), dtype=np.uint8)
        
        # Concourse floor grid
        frame[:, :] = (35, 38, 44)
        for y in range(0, self.height, 40):
            cv2.line(frame, (0, y), (self.width, y), (48, 52, 60), 1)
        for x in range(0, self.width, 60):
            cv2.line(frame, (x, 0), (x, self.height), (48, 52, 60), 1)

        # Draw 3-4 simulated pedestrians walking across
        ped_count = 3
        for i in range(ped_count):
            base_x = (int((self.sim_phase * 40 + i * 180)) % (self.width + 100)) - 50
            base_y = int(self.height * 0.45 + math.sin(self.sim_phase + i) * 35)

            # Simulated body
            cv2.ellipse(frame, (base_x, base_y + 40), (22, 35), 0, 0, 360, (70 + i*30, 90 + i*20, 140), -1)
            # Simulated face
            face_color = (185, 205, 235)
            cv2.circle(frame, (base_x, base_y), 18, face_color, -1)
            
            # Simulated eyes
            cv2.circle(frame, (base_x - 6, base_y - 2), 3, (20, 20, 20), -1)
            cv2.circle(frame, (base_x + 6, base_y - 2), 3, (20, 20, 20), -1)

            # Occlusion for subject 1: Mask
            if i == 1:
                cv2.rectangle(frame, (base_x - 12, base_y + 2), (base_x + 12, base_y + 14), (220, 220, 220), -1)
            # Occlusion for subject 2: Sunglasses
            elif i == 2:
                cv2.rectangle(frame, (base_x - 12, base_y - 6), (base_x + 12, base_y), (15, 15, 15), -1)

        return frame

    def _run_loop(self):
        self._open_source()
        last_time = time.time()

        while self.is_running:
            loop_start = time.time()

            if not self.is_synthetic and self.cap and self.cap.isOpened():
                ret, frame = self.cap.read()
                if not ret:
                    self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0) # loop if video file
                    ret, frame = self.cap.read()
                if not ret:
                    frame = self._generate_synthetic_frame()
            else:
                frame = self._generate_synthetic_frame()

            if frame is None:
                time.sleep(0.03)
                continue

            frame = cv2.resize(frame, (self.width, self.height))

            # 1. Optical Flow Calculation
            flow_data = self.optical_flow.process_frame(frame)

            # 2. Face Detection & Occlusion Analysis
            detected_faces = self.face_detector.detect_faces(frame)

            # 3. Embedding Extraction & Re-ID
            detections_for_clustering = []
            for face in detected_faces:
                emb = self.embedding_extractor.extract_embedding(face['face_crop'], face['occlusion_type'])
                detections_for_clustering.append({
                    "id": f"P-{face['pixel_box']['x']}_{face['pixel_box']['y']}",
                    "camera": self.camera_id,
                    "embedding": emb,
                    "box": face['box'],
                    "pixelBox": face['pixel_box'],
                    "landmarks": face['landmarks'],
                    "occlusionPercent": face['occlusion_percent'],
                    "occlusionType": face['occlusion_type'],
                    "x": face['box']['x'] + face['box']['width'] / 2,
                    "y": face['box']['y'] + face['box']['height'] / 2,
                    "vx": flow_data.get('mean_speed', 0),
                    "vy": 0.0,
                    "speed": flow_data.get('mean_speed', 1.2),
                    "directionDeg": flow_data.get('primary_angle_deg', 0),
                    "riskScore": 15.0 if face['occlusion_percent'] < 40 else 65.0,
                })

            clustered_people, handovers = self.reid_clusterer.cluster_detections(detections_for_clustering)

            # 4. Threat & Suspicious Activity Detection
            new_alerts = self.threat_detector.analyze(
                self.camera_id,
                self.camera_name,
                clustered_people,
                flow_data,
            )

            # 5. Render HUD Overlay onto frame for MJPEG stream
            annotated = frame.copy()
            self._draw_hud(annotated, clustered_people, flow_data)

            with self.lock:
                self.latest_frame = frame
                self.latest_annotated_frame = annotated
                self.current_people = clustered_people
                self.current_flow = flow_data
                if new_alerts:
                    self.current_alerts = new_alerts + self.current_alerts[:10]

            elapsed = time.time() - loop_start
            self.fps = round(1.0 / max(0.001, time.time() - last_time), 1)
            last_time = time.time()

            # Throttle to ~28-30 FPS
            sleep_time = max(0.005, (1.0 / 30.0) - elapsed)
            time.sleep(sleep_time)

    def _draw_hud(self, frame, people, flow):
        """Renders tactical computer vision HUD onto frame."""
        h, w = frame.shape[:2]

        # Optical Flow Vectors
        for vec in flow.get('vectors', []):
            vx = int((vec['x'] / 100.0) * w)
            vy = int((vec['y'] / 100.0) * h)
            dx = int(vec['dx'] * 4.0)
            dy = int(vec['dy'] * 4.0)
            color = (0, 0, 255) if vec.get('isAnomaly') else (0, 255, 255)
            cv2.arrowedLine(frame, (vx, vy), (vx + dx, vy + dy), color, 1, tipLength=0.3)

        # People Bounding Boxes & Badges
        for p in people:
            pb = p.get('pixelBox')
            if not pb:
                continue
            x, y, bw, bh = pb['x'], pb['y'], pb['width'], pb['height']
            cid = p.get('clusterId', 'C-?')
            label = p.get('label', cid)
            occ_pct = p.get('occlusionPercent', 0)
            occ_type = p.get('occlusionType', 'NONE')

            color = (0, 255, 0)
            if p.get('status') == 'WATCHLIST_FLAG':
                color = (0, 0, 255)
            elif occ_pct > 40:
                color = (0, 165, 255)

            cv2.rectangle(frame, (x, y), (x + bw, y + bh), color, 2)
            cv2.putText(frame, f"{cid}: {label}", (x, max(15, y - 6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1)

            if occ_type != 'NONE':
                cv2.putText(frame, f"OCC: {occ_pct:.0f}% [{occ_type}]", (x, y + bh + 14), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 200, 255), 1)

        # Top Status Banner
        cv2.rectangle(frame, (0, 0), (w, 24), (20, 20, 25), -1)
        hud_text = f"CAM: {self.camera_id} | FPS: {self.fps:.1f} | DENSITY: {len(people)} | TURB: {flow.get('turbulence_index', 0):.2f}"
        cv2.putText(frame, hud_text, (8, 16), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 255, 200), 1)

    def get_latest_jpeg(self):
        with self.lock:
            frame = self.latest_annotated_frame if self.latest_annotated_frame is not None else self.latest_frame
        if frame is None:
            return None
        _, buffer = cv2.imencode('.jpg', frame, [int(cv2.IMWRITE_JPEG_QUALITY), 75])
        return buffer.tobytes()

    def get_telemetry(self):
        with self.lock:
            return {
                "cameraId": self.camera_id,
                "cameraName": self.camera_name,
                "fps": self.fps,
                "people": self.current_people,
                "flow": self.current_flow,
                "alerts": self.current_alerts,
            }
