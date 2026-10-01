import unittest
import json
from backend.app import app

class TestFlaskEndpoints(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    def test_health_endpoint(self):
        response = self.app.get("/api/v1/health")
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data["status"], "healthy")
        self.assertIn("openCvVersion", data)
        self.assertIn("deepLearningStack", data)
        self.assertIn("database", data)

    def test_cameras_endpoint(self):
        response = self.app.get("/api/v1/cameras")
        self.assertEqual(response.status_code, 200)
        cams = json.loads(response.data)
        self.assertIsInstance(cams, list)
        self.assertGreaterEqual(len(cams), 1)

    def test_crowd_metrics_endpoint(self):
        response = self.app.get("/api/v1/analytics/crowd-metrics")
        self.assertEqual(response.status_code, 200)
        metrics = json.loads(response.data)
        self.assertIn("totalHeadcount", metrics)
        self.assertIn("averageDensity", metrics)
        self.assertIn("globalTurbulence", metrics)

    def test_face_enrollment_and_retrieval(self):
        # Enroll test face
        test_payload = {
            "id": "test-face-01",
            "name": "Officer Sarah Connor",
            "role": "Security Lead",
            "status": "REGISTERED",
            "embedding": [0.1] * 128,
            "notes": "Authorized Security Lead",
        }
        res_post = self.app.post("/api/v1/faces/enrolled", json=test_payload)
        self.assertEqual(res_post.status_code, 201)

        # Retrieve enrolled faces
        res_get = self.app.get("/api/v1/faces/enrolled")
        self.assertEqual(res_get.status_code, 200)
        faces = json.loads(res_get.data)
        names = [f["name"] for f in faces]
        self.assertIn("Officer Sarah Connor", names)

        # Clean up test face
        res_del = self.app.delete("/api/v1/faces/enrolled/test-face-01")
        self.assertEqual(res_del.status_code, 200)

if __name__ == "__main__":
    unittest.main()
