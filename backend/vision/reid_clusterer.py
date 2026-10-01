import numpy as np
from sklearn.cluster import DBSCAN
from datetime import datetime
import logging
from backend.vision.embedding_extractor import FeatureEmbeddingExtractor

logger = logging.getLogger(__name__)

class ReIDClusterer:
    """
    Machine Learning Clustering & Cross-Camera Re-Identification Engine.
    Uses DBSCAN on pairwise cosine distance matrices (inspired by SharpAI/DeepCamera).
    Maintains persistent clusters across multi-camera video streams.
    """

    def __init__(self, eps=0.35, min_samples=1):
        self.eps = eps # Maximum cosine distance for two samples to be in same cluster (similarity >= 0.65)
        self.min_samples = min_samples
        self.active_clusters = {} # cluster_id -> {'label': str, 'center_embedding': list, 'last_seen': datetime, 'camera': str}
        self.cluster_counter = 101

    def cluster_detections(self, detections, enrolled_faces=None):
        """
        Detections: list of dictionaries:
        [{
            'id': str,
            'camera': str,
            'embedding': list of 128 floats,
            'box': dict,
            'occlusion_percent': float,
            'occlusion_type': str
        }]
        
        Enrolled faces: list of EnrolledFace models or dicts with 'name', 'status', 'embedding'
        
        Returns updated detections with:
        - cluster_id (e.g. 'C-104')
        - label (e.g. 'Alex Mercer' or 'Subject #104')
        - match_confidence (0-100)
        - status ('REGISTERED' | 'WATCHLIST_FLAG' | 'UNREGISTERED')
        - handovers: list of detected cross-camera transition events
        """
        if not detections:
            return [], []

        embeddings = np.array([d['embedding'] for d in detections], dtype=np.float32)
        n = len(embeddings)

        handovers = []

        # 1. Match first against active existing clusters (Temporal continuity)
        assigned_cluster_ids = [None] * n

        for i, det in enumerate(detections):
            emb = det['embedding']
            best_cluster_id = None
            best_sim = 0.0

            for cid, cdata in self.active_clusters.items():
                sim = FeatureEmbeddingExtractor.cosine_similarity(emb, cdata['center_embedding'])
                if sim > best_sim:
                    best_sim = sim
                    best_cluster_id = cid

            # Threshold for re-associating with existing active cluster
            if best_sim >= (1.0 - self.eps):
                assigned_cluster_ids[i] = best_cluster_id
                
                # Check for Cross-Camera Handover
                prev_cam = self.active_clusters[best_cluster_id]['camera']
                curr_cam = det['camera']
                if prev_cam != curr_cam:
                    handovers.append({
                        "personClusterId": best_cluster_id,
                        "fromCameraId": prev_cam,
                        "toCameraId": curr_cam,
                        "confidence": round(best_sim, 2),
                        "handoverTime": datetime.utcnow().isoformat(),
                    })
                    logger.info(f"[ReID] Cross-Camera Handover detected: {best_cluster_id} from {prev_cam} -> {curr_cam} (sim: {best_sim:.2f})")

                # Update cluster state
                self.active_clusters[best_cluster_id]['last_seen'] = datetime.utcnow()
                self.active_clusters[best_cluster_id]['camera'] = curr_cam

        # 2. For unassigned detections, run DBSCAN on pairwise cosine distance matrix
        unassigned_indices = [i for i, cid in enumerate(assigned_cluster_ids) if cid is None]
        if unassigned_indices:
            sub_embeddings = embeddings[unassigned_indices]
            sub_n = len(sub_embeddings)

            if sub_n == 1:
                # Single new subject
                new_cid = f"C-{self.cluster_counter}"
                self.cluster_counter += 1
                assigned_cluster_ids[unassigned_indices[0]] = new_cid
                self.active_clusters[new_cid] = {
                    "label": f"Subject #{new_cid.replace('C-', '')}",
                    "center_embedding": sub_embeddings[0].tolist(),
                    "last_seen": datetime.utcnow(),
                    "camera": detections[unassigned_indices[0]]['camera'],
                }
            else:
                # Compute pairwise Cosine Distance Matrix: D = 1.0 - CosineSimilarity
                dist_matrix = np.zeros((sub_n, sub_n), dtype=np.float32)
                for i in range(sub_n):
                    for j in range(sub_n):
                        if i == j:
                            dist_matrix[i, j] = 0.0
                        else:
                            sim = FeatureEmbeddingExtractor.cosine_similarity(
                                sub_embeddings[i].tolist(), sub_embeddings[j].tolist()
                            )
                            dist_matrix[i, j] = max(0.0, 1.0 - sim)

                # DBSCAN clustering
                db = DBSCAN(eps=self.eps, min_samples=self.min_samples, metric='precomputed')
                labels = db.fit_predict(dist_matrix)

                label_to_cid = {}
                for local_idx, cluster_label in enumerate(labels):
                    orig_idx = unassigned_indices[local_idx]
                    if cluster_label not in label_to_cid:
                        new_cid = f"C-{self.cluster_counter}"
                        self.cluster_counter += 1
                        label_to_cid[cluster_label] = new_cid
                        self.active_clusters[new_cid] = {
                            "label": f"Subject #{new_cid.replace('C-', '')}",
                            "center_embedding": sub_embeddings[local_idx].tolist(),
                            "last_seen": datetime.utcnow(),
                            "camera": detections[orig_idx]['camera'],
                        }
                    assigned_cluster_ids[orig_idx] = label_to_cid[cluster_label]

        # 3. Match against Enrolled Database Faces (Watchlist / Authorized Personnel)
        processed_detections = []
        for i, det in enumerate(detections):
            cid = assigned_cluster_ids[i]
            matched_person_name = None
            matched_status = "UNREGISTERED"
            match_confidence = 0.0

            if enrolled_faces:
                for enrolled in enrolled_faces:
                    enrolled_emb = enrolled.get_embedding() if hasattr(enrolled, 'get_embedding') else enrolled.get('embedding', [])
                    sim = FeatureEmbeddingExtractor.cosine_similarity(det['embedding'], enrolled_emb)
                    if sim > 0.65 and sim > (match_confidence / 100.0):
                        match_confidence = round(sim * 100, 1)
                        name = enrolled.name if hasattr(enrolled, 'name') else enrolled.get('name')
                        status = enrolled.status if hasattr(enrolled, 'status') else enrolled.get('status', 'REGISTERED')
                        matched_person_name = name
                        matched_status = status

            label = matched_person_name if matched_person_name else self.active_clusters[cid]['label']

            det_copy = dict(det)
            det_copy['clusterId'] = cid
            det_copy['label'] = label
            det_copy['status'] = matched_status
            det_copy['matchConfidence'] = match_confidence
            processed_detections.append(det_copy)

        return processed_detections, handovers
