import unittest
import numpy as np
import cv2
from backend.vision.face_detector import FaceDetector
from backend.vision.embedding_extractor import FeatureEmbeddingExtractor
from backend.vision.optical_flow import OpticalFlowTracker
from backend.vision.reid_clusterer import ReIDClusterer
from backend.vision.suspicious_activity import SuspiciousActivityDetector

class TestComputerVisionPipeline(unittest.TestCase):

    def setUp(self):
        self.detector = FaceDetector()
        self.extractor = FeatureEmbeddingExtractor()
        self.tracker = OpticalFlowTracker(step_size=16)
        self.clusterer = ReIDClusterer(eps=0.35, min_samples=1)
        self.threat_engine = SuspiciousActivityDetector(loiter_threshold_sec=10)

    def test_embedding_normalization_and_similarity(self):
        """Test that feature embeddings are 128D and L2-normalized with correct cosine range."""
        test_crop_1 = np.ones((64, 64, 3), dtype=np.uint8) * 120
        test_crop_2 = np.ones((64, 64, 3), dtype=np.uint8) * 125

        emb1 = self.extractor.extract_embedding(test_crop_1)
        emb2 = self.extractor.extract_embedding(test_crop_2)

        self.assertEqual(len(emb1), 128)
        self.assertEqual(len(emb2), 128)

        # L2 norm check
        norm = np.linalg.norm(np.array(emb1))
        self.assertAlmostEqual(norm, 1.0, places=2)

        # Similarity between identical or near-identical crops should be high
        sim = FeatureEmbeddingExtractor.cosine_similarity(emb1, emb2)
        self.assertGreaterEqual(sim, 0.90)
        self.assertLessEqual(sim, 1.0)

    def test_occlusion_estimation(self):
        """Test occlusion estimation on simulated masked face."""
        # Simulated face with white surgical mask in lower half
        face_img = np.ones((64, 64, 3), dtype=np.uint8) * 140
        face_img[32:64, :] = 240 # uniform white mask

        pct, occ_type = self.detector.estimate_occlusion(face_img)
        self.assertEqual(occ_type, "FACE_MASK")
        self.assertGreater(pct, 40.0)

    def test_optical_flow_calculation(self):
        """Test Gunnar Farneback dense optical flow and motion velocity."""
        frame1 = np.zeros((200, 300, 3), dtype=np.uint8)
        cv2.circle(frame1, (100, 100), 25, (255, 255, 255), -1)

        frame2 = np.zeros((200, 300, 3), dtype=np.uint8)
        cv2.circle(frame2, (120, 100), 25, (255, 255, 255), -1) # moved right by 20 px

        # Process frame 1
        res1 = self.tracker.process_frame(frame1)
        self.assertEqual(len(res1["vectors"]), 0)

        # Process frame 2
        res2 = self.tracker.process_frame(frame2)
        self.assertGreater(len(res2["vectors"]), 0)
        self.assertGreater(res2["mean_speed"], 0.0)

    def test_dbscan_clustering_and_reid(self):
        """Test DBSCAN machine learning clustering differentiating individuals across cameras."""
        # Create 3 synthetic embeddings: 2 similar (same person on Cam 1 and Cam 2), 1 distinct
        emb_person_a = [0.1] * 128
        norm_a = np.linalg.norm(emb_person_a)
        emb_person_a = (np.array(emb_person_a) / norm_a).tolist()

        # Cam 2 sighting of Person A (slight perturbation)
        emb_person_a_cam2 = (np.array(emb_person_a) + np.random.normal(0, 0.01, 128))
        emb_person_a_cam2 = (emb_person_a_cam2 / np.linalg.norm(emb_person_a_cam2)).tolist()

        # Person B (orthogonal/different vector)
        emb_person_b = ([0.5] * 64) + ([-0.5] * 64)
        emb_person_b = (np.array(emb_person_b) / np.linalg.norm(emb_person_b)).tolist()

        detections = [
            {"id": "det-1", "camera": "CAM-01", "embedding": emb_person_a, "x": 30, "y": 40},
            {"id": "det-2", "camera": "CAM-02", "embedding": emb_person_a_cam2, "x": 70, "y": 50},
            {"id": "det-3", "camera": "CAM-01", "embedding": emb_person_b, "x": 50, "y": 80},
        ]

        clustered, handovers = self.clusterer.cluster_detections(detections)
        self.assertEqual(len(clustered), 3)

        # Person A on CAM-01 and CAM-02 should share the same clusterId
        cid_a1 = clustered[0]["clusterId"]
        cid_a2 = clustered[1]["clusterId"]
        cid_b = clustered[2]["clusterId"]

        self.assertEqual(cid_a1, cid_a2)
        self.assertNotEqual(cid_a1, cid_b)
        self.assertGreaterEqual(len(handovers), 1)
        self.assertEqual(handovers[0]["fromCameraId"], "CAM-01")
        self.assertEqual(handovers[0]["toCameraId"], "CAM-02")

if __name__ == "__main__":
    unittest.main()
