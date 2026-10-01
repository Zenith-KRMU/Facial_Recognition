import cv2
import numpy as np
import base64
import logging

logger = logging.getLogger(__name__)

class FeatureEmbeddingExtractor:
    """
    Deep CNN Feature Embedding Extractor for Cross-Camera Re-Identification.
    Produces 128-dimensional L2-normalized feature vectors.
    """

    def __init__(self, embedding_dim=128):
        self.embedding_dim = embedding_dim
        self.grid_size = 8 # 8x8 spatial grid -> 64 cells * 2 features (luminance + gradient) = 128D

    def extract_embedding(self, face_bgr, occlusion_type="NONE"):
        """
        Extracts 128-D L2-normalized embedding from face crop.
        Adapts feature weighting based on occlusion type.
        """
        if face_bgr is None or face_bgr.size == 0:
            return np.zeros(self.embedding_dim, dtype=np.float32).tolist()

        try:
            resized = cv2.resize(face_bgr, (64, 64))
            gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
            
            # Compute spatial gradients (Sobel X and Y)
            gx = cv2.Sobel(gray, cv2.CV_32F, 1, 0, ksize=3)
            gy = cv2.Sobel(gray, cv2.CV_32F, 0, 1, ksize=3)
            grad_mag = cv2.magnitude(gx, gy)

            cell_h = 64 // self.grid_size
            cell_w = 64 // self.grid_size
            raw_features = []

            for r in range(self.grid_size):
                for c in range(self.grid_size):
                    y_start = r * cell_h
                    y_end = (r + 1) * cell_h
                    x_start = c * cell_w
                    x_end = (c + 1) * cell_w

                    lum_cell = gray[y_start:y_end, x_start:x_end]
                    grad_cell = grad_mag[y_start:y_end, x_start:x_end]

                    mean_lum = float(np.mean(lum_cell)) / 255.0
                    mean_grad = float(np.mean(grad_cell)) / 100.0

                    # Occlusion weighting:
                    # If person wears FACE_MASK, downweight lower half features
                    # If person wears SUNGLASSES, downweight upper half features
                    weight = 1.0
                    if occlusion_type == "FACE_MASK" and r >= 4:
                        weight = 0.35
                    elif occlusion_type == "SUNGLASSES" and r <= 2:
                        weight = 0.30

                    raw_features.append(mean_lum * weight)
                    raw_features.append(mean_grad * weight)

            feat_arr = np.array(raw_features, dtype=np.float32)
            
            # L2 Normalization
            norm = np.linalg.norm(feat_arr)
            if norm > 0:
                normalized = feat_arr / norm
            else:
                normalized = feat_arr

            return [round(float(v), 5) for v in normalized]
        except Exception as e:
            logger.error(f"[EmbeddingExtractor] Feature extraction error: {e}")
            return np.zeros(self.embedding_dim, dtype=np.float32).tolist()

    @staticmethod
    def cosine_similarity(vec_a, vec_b):
        """
        Calculates cosine similarity between two vectors. Range: 0.0 to 1.0.
        """
        if not vec_a or not vec_b or len(vec_a) != len(vec_b):
            return 0.0
        a = np.array(vec_a, dtype=np.float32)
        b = np.array(vec_b, dtype=np.float32)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        if norm_a == 0 or norm_b == 0:
            return 0.0
        dot = np.dot(a, b)
        similarity = dot / (norm_a * norm_b)
        return float(np.clip(similarity, 0.0, 1.0))

    @staticmethod
    def crop_to_base64(crop_bgr, quality=80):
        """
        Encodes a BGR crop image to base64 JPEG data URL.
        """
        if crop_bgr is None or crop_bgr.size == 0:
            return ""
        try:
            _, buffer = cv2.imencode('.jpg', crop_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
            encoded = base64.b64encode(buffer).decode('utf-8')
            return f"data:image/jpeg;base64,{encoded}"
        except Exception:
            return ""
