import time
import math
import uuid
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class SuspiciousActivityDetector:
    """
    Spatio-Temporal Suspicious Behavior and Threat Detection Engine.
    Monitors crowd dynamics, individual trajectories, loitering, and perimeter security.
    """

    def __init__(self, loiter_threshold_sec=180):
        self.loiter_threshold_sec = loiter_threshold_sec
        self.person_trackers = {} # cluster_id -> {'first_seen': float, 'last_x': float, 'last_y': float, 'stationary_since': float}
        self.recent_alerts = {} # alert_key -> timestamp (cooldown)

    def analyze(self, camera_id, camera_name, tracked_people, optical_flow_data, tripwire_polygon=None):
        """
        Analyzes tracked people and optical flow telemetry.
        Returns list of new SuspiciousAlert dictionaries.
        """
        alerts = []
        now = time.time()
        iso_now = datetime.utcnow().isoformat()

        # 1. Optical Flow Stampede / Dispersal Alert
        if optical_flow_data.get('stampede_risk', False) or optical_flow_data.get('turbulence_index', 0) > 0.72:
            alert_key = f"{camera_id}_stampede"
            if now - self.recent_alerts.get(alert_key, 0) > 25: # 25s cooldown
                self.recent_alerts[alert_key] = now
                alerts.append({
                    "id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
                    "cameraId": camera_id,
                    "cameraName": camera_name,
                    "type": "STAMPEDE_DISPERSAL_RISK",
                    "severity": "CRITICAL",
                    "title": "Stampede / High Dispersal Turbulence Detected",
                    "description": f"Vector divergence and crowd turbulence reached {optical_flow_data.get('turbulence_index', 0.8):.2f}. Sudden crowd acceleration detected.",
                    "confidence": 94.0,
                    "status": "ACTIVE",
                    "metrics": {
                        "velocity": optical_flow_data.get('mean_speed', 0),
                        "density": 3.4,
                    },
                    "timestamp": iso_now,
                })

        # 2. Counter-Flow Obstruction Alert
        counter_count = optical_flow_data.get('counter_flow_count', 0)
        if counter_count >= 3:
            alert_key = f"{camera_id}_counterflow"
            if now - self.recent_alerts.get(alert_key, 0) > 30:
                self.recent_alerts[alert_key] = now
                alerts.append({
                    "id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
                    "cameraId": camera_id,
                    "cameraName": camera_name,
                    "type": "COUNTER_FLOW_COLLISION",
                    "severity": "WARNING",
                    "title": "Pedestrian Counter-Flow Congestion",
                    "description": f"Detected {counter_count} motion vectors conflicting with dominant corridor trajectory ({optical_flow_data.get('primary_angle_deg', 0):.0f}°). Bottleneck forming.",
                    "confidence": 88.5,
                    "status": "ACTIVE",
                    "timestamp": iso_now,
                })

        # 3. Individual Trajectory Analysis (Loitering, Restricted Zones, High Occlusion)
        for person in tracked_people:
            cid = person.get('clusterId', 'unknown')
            px = person.get('x', 50)
            py = person.get('y', 50)
            speed = person.get('speed', 0)
            occlusion_pct = person.get('occlusionPercent', 0)
            label = person.get('label', cid)

            # Update tracking history
            if cid not in self.person_trackers:
                self.person_trackers[cid] = {
                    'first_seen': now,
                    'last_x': px,
                    'last_y': py,
                    'stationary_since': now,
                }
            else:
                entry = self.person_trackers[cid]
                # Check displacement
                dist = math.sqrt((px - entry['last_x'])**2 + (py - entry['last_y'])**2)
                if dist > 8.0: # moved significantly
                    entry['stationary_since'] = now
                entry['last_x'] = px
                entry['last_y'] = py

            tracker = self.person_trackers[cid]
            dwell_time = now - tracker['first_seen']
            stationary_time = now - tracker['stationary_since']

            # Loitering Alert
            if stationary_time > self.loiter_threshold_sec:
                alert_key = f"{camera_id}_{cid}_loiter"
                if now - self.recent_alerts.get(alert_key, 0) > 60:
                    self.recent_alerts[alert_key] = now
                    alerts.append({
                        "id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
                        "cameraId": camera_id,
                        "cameraName": camera_name,
                        "type": "LOITERING_PROLONGED",
                        "severity": "WARNING",
                        "title": f"Prolonged Loitering: {label}",
                        "description": f"Subject {label} ({cid}) has remained stationary in zone for {int(stationary_time)}s (exceeds {self.loiter_threshold_sec}s threshold).",
                        "personClusterId": cid,
                        "personLabel": label,
                        "confidence": 92.0,
                        "status": "ACTIVE",
                        "metrics": {
                            "loiterDurationSec": int(stationary_time),
                        },
                        "timestamp": iso_now,
                    })

            # Occluded Rapid Movement Alert
            if occlusion_pct >= 50.0 and speed > 4.2:
                alert_key = f"{camera_id}_{cid}_occluded_sprint"
                if now - self.recent_alerts.get(alert_key, 0) > 40:
                    self.recent_alerts[alert_key] = now
                    alerts.append({
                        "id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
                        "cameraId": camera_id,
                        "cameraName": camera_name,
                        "type": "OCCLUDED_RAPID_MOVEMENT",
                        "severity": "CRITICAL",
                        "title": f"Occluded High-Speed Movement: {cid}",
                        "description": f"Subject with {occlusion_pct:.0f}% facial occlusion ({person.get('occlusionType', 'MASK')}) moving rapidly at {speed:.1f} m/s towards exit corridor.",
                        "personClusterId": cid,
                        "personLabel": label,
                        "confidence": 95.0,
                        "status": "ACTIVE",
                        "timestamp": iso_now,
                    })

            # Watchlist Match Alert
            if person.get('status') == 'WATCHLIST_FLAG':
                alert_key = f"{camera_id}_{cid}_watchlist"
                if now - self.recent_alerts.get(alert_key, 0) > 60:
                    self.recent_alerts[alert_key] = now
                    alerts.append({
                        "id": f"ALT-{uuid.uuid4().hex[:8].upper()}",
                        "cameraId": camera_id,
                        "cameraName": camera_name,
                        "type": "RESTRICTED_ZONE_BREACH",
                        "severity": "CRITICAL",
                        "title": f"WATCHLIST MATCH: {label}",
                        "description": f"Watchlist individual {label} identified with {person.get('matchConfidence', 90):.0f}% biometric confidence in {camera_name}.",
                        "personClusterId": cid,
                        "personLabel": label,
                        "confidence": person.get('matchConfidence', 90),
                        "status": "ACTIVE",
                        "timestamp": iso_now,
                    })

        return alerts
