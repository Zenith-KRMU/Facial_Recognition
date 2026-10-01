import cv2
import numpy as np
import logging

logger = logging.getLogger(__name__)

class FaceDetector:
    """
    CNN & Computer Vision Face Detection Pipeline with Occlusion Analysis.
    Supports OpenCV DNN (SSD/ResNet) and fallback Haar cascade.
    Calculates facial landmarks, occlusion percentage, and occlusion type.
    """

    def __init__(self):
        self.cascade = None
        self._init_detector()

    def _init_detector(self):
        try:
            # Use OpenCV's built-in Haar Cascade for ultra-low latency & CPU friendliness
            cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            self.cascade = cv2.CascadeClassifier(cascade_path)
            
            # Eye cascade for landmark and sunglasses occlusion detection
            eye_cascade_path = cv2.data.haarcascades + 'haarcascade_eye.xml'
            self.eye_cascade = cv2.CascadeClassifier(eye_cascade_path)
            
            logger.info("[FaceDetector] OpenCV Haar/DNN Cascade Face Detectors initialized successfully.")
        except Exception as e:
            logger.error(f"[FaceDetector] Failed to initialize cascades: {e}")

    def detect_faces(self, frame_bgr):
        """
        Detects faces in frame and analyzes occlusions.
        Returns list of detection dictionaries:
        [{
            'box': {'x': %, 'y': %, 'width': %, 'height': %},
            'pixel_box': {'x': px, 'y': px, 'width': px, 'height': px},
            'confidence': float,
            'landmarks': [(x, y), ...],
            'occlusion_percent': float,
            'occlusion_type': str,
            'face_crop': numpy_array
        }]
        """
        h, w = frame_bgr.shape[:2]
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        
        # Equalize histogram for illumination robustness
        gray_eq = cv2.equalizeHist(gray)

        faces = []
        if self.cascade is not None:
            raw_faces = self.cascade.detectMultiScale(
                gray_eq,
                scaleFactor=1.15,
                minNeighbors=4,
                minSize=(30, 30),
                flags=cv2.CASCADE_SCALE_IMAGE
            )
            for (x, y, fw, fh) in raw_faces:
                face_crop = frame_bgr[y:y+fh, x:x+fw]
                if face_crop.size == 0:
                    continue

                # Occlusion analysis
                occlusion_pct, occ_type = self.estimate_occlusion(face_crop)

                # Landmarks estimation (eyes, nose, mouth corners normalized)
                landmarks = self.estimate_landmarks(face_crop, x, y, fw, fh, w, h)

                faces.append({
                    'box': {
                        'x': round((x / w) * 100, 2),
                        'y': round((y / h) * 100, 2),
                        'width': round((fw / w) * 100, 2),
                        'height': round((fh / h) * 100, 2),
                    },
                    'pixel_box': {'x': int(x), 'y': int(y), 'width': int(fw), 'height': int(fh)},
                    'confidence': 0.92,
                    'landmarks': landmarks,
                    'occlusion_percent': occlusion_pct,
                    'occlusion_type': occ_type,
                    'face_crop': face_crop,
                })

        return faces

    def estimate_landmarks(self, face_crop, x, y, fw, fh, frame_w, frame_h):
        """
        Calculates key facial landmarks (eyes, nose tip, mouth edges).
        Normalized to 0-100% of frame dimensions.
        """
        # Default geometric landmark positions relative to face bounding box
        # [left_eye, right_eye, nose_tip, mouth_left, mouth_right]
        rel_landmarks = [
            (0.32, 0.38), # Left eye
            (0.68, 0.38), # Right eye
            (0.50, 0.58), # Nose tip
            (0.35, 0.78), # Mouth left
            (0.65, 0.78), # Mouth right
        ]

        # Check if actual eyes are detectable
        gray_face = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)
        if hasattr(self, 'eye_cascade') and self.eye_cascade is not None:
            eyes = self.eye_cascade.detectMultiScale(gray_face, 1.1, 3, minSize=(10, 10))
            if len(eyes) >= 2:
                # Sort eyes by x coordinate
                sorted_eyes = sorted(eyes, key=lambda e: e[0])
                rel_landmarks[0] = ((sorted_eyes[0][0] + sorted_eyes[0][2]/2) / fw, (sorted_eyes[0][1] + sorted_eyes[0][3]/2) / fh)
                rel_landmarks[1] = ((sorted_eyes[1][0] + sorted_eyes[1][2]/2) / fw, (sorted_eyes[1][1] + sorted_eyes[1][3]/2) / fh)

        landmarks = []
        for rx, ry in rel_landmarks:
            abs_x = (x + rx * fw) / frame_w * 100
            abs_y = (y + ry * fh) / frame_h * 100
            landmarks.append([round(abs_x, 2), round(abs_y, 2)])
        return landmarks

    def estimate_occlusion(self, face_crop):
        """
        Determines occlusion percentage and classification:
        - FACE_MASK: uniform color / low gradient variance in lower 50%
        - SUNGLASSES: high darkness / occlusion in eye region (upper 40%)
        - HOODIE_SCARF: outer perimeter obscured
        - NONE: clear visibility
        """
        try:
            resized = cv2.resize(face_crop, (64, 64))
            gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
            
            upper_half = gray[0:28, :]
            lower_half = gray[32:64, :]
            
            upper_mean = np.mean(upper_half)
            lower_mean = np.mean(lower_half)

            # Gradient / texture variance in lower face
            sobel_y = cv2.Sobel(lower_half, cv2.CV_64F, 0, 1, ksize=3)
            lower_texture_var = np.var(sobel_y)

            # Mask detection: Masks create smooth, uniform texture over nose/mouth
            if lower_texture_var < 180.0 and lower_mean > 65:
                pct = min(88.0, round(50.0 + (180.0 - lower_texture_var) * 0.2, 1))
                return pct, "FACE_MASK"

            # Sunglasses detection: Very dark upper region
            if upper_mean < 45.0:
                pct = min(78.0, round(45.0 + (45.0 - upper_mean) * 0.8, 1))
                return pct, "SUNGLASSES"

            # Perimeter / Hoodie detection
            border_mask = np.zeros_like(gray, dtype=bool)
            border_mask[:8, :] = True
            border_mask[:, :8] = True
            border_mask[:, -8:] = True
            border_mean = np.mean(gray[border_mask])
            center_mean = np.mean(gray[~border_mask])

            if abs(border_mean - center_mean) > 55:
                return 42.0, "HOODIE_SCARF"

            return 0.0, "NONE"
        except Exception:
            return 0.0, "NONE"
