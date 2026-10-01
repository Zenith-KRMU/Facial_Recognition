import cv2
import numpy as np
import math
import logging

logger = logging.getLogger(__name__)

class OpticalFlowTracker:
    """
    OpenCV 4.x Optical Flow Engine for Individual Tracking and Crowd Dynamics.
    - Lucas-Kanade Sparse Optical Flow (cv2.calcOpticalFlowPyrLK)
    - Gunnar Farneback Dense Optical Flow (cv2.calcOpticalFlowFarneback)
    - Stampede / Dispersal Turbulence Indicator
    - Counter-Flow Bottleneck Detection
    """

    def __init__(self, step_size=24):
        self.step_size = step_size
        self.prev_gray = None
        self.prev_pts = None

        # Lucas-Kanade optical flow parameters
        self.lk_params = dict(
            winSize=(21, 21),
            maxLevel=3,
            criteria=(cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 15, 0.03),
        )

        # Farneback dense optical flow parameters
        self.fb_params = dict(
            pyr_scale=0.5,
            levels=3,
            winsize=15,
            iterations=3,
            poly_n=5,
            poly_sigma=1.2,
            flags=0,
        )

    def process_frame(self, frame_bgr):
        """
        Processes new frame, computes optical flow vectors and crowd metrics.
        Returns:
        {
            'vectors': [{'x': %, 'y': %, 'dx': px, 'dy': px, 'magnitude': float, 'angle_deg': float, 'is_anomaly': bool}],
            'mean_speed': float,
            'primary_angle_deg': float,
            'turbulence_index': float (0.0 to 1.0),
            'stampede_risk': bool,
            'density_estimate': float
        }
        """
        h, w = frame_bgr.shape[:2]
        gray = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY)
        gray = cv2.GaussianBlur(gray, (5, 5), 0)

        result = {
            "vectors": [],
            "mean_speed": 0.0,
            "primary_angle_deg": 0.0,
            "turbulence_index": 0.0,
            "stampede_risk": False,
            "counter_flow_count": 0,
        }

        if self.prev_gray is None or self.prev_gray.shape != gray.shape:
            self.prev_gray = gray
            return result

        try:
            # 1. Compute Gunnar Farneback Dense Optical Flow
            flow = cv2.calcOpticalFlowFarneback(
                self.prev_gray,
                gray,
                None,
                **self.fb_params
            )

            # Sample vectors on a regular grid
            y_coords, x_coords = np.mgrid[
                self.step_size // 2 : h : self.step_size,
                self.step_size // 2 : w : self.step_size
            ].reshape(2, -1)

            fx = flow[y_coords, x_coords, 0]
            fy = flow[y_coords, x_coords, 1]

            magnitudes = np.sqrt(fx**2 + fy**2)
            angles_rad = np.arctan2(fy, fx)
            angles_deg = (np.degrees(angles_rad) + 360) % 360

            # Filter out camera sensor noise (small jitter < 1.0 px)
            moving_mask = magnitudes > 1.2
            
            if np.sum(moving_mask) > 4:
                valid_mags = magnitudes[moving_mask]
                valid_angles = angles_deg[moving_mask]
                valid_fx = fx[moving_mask]
                valid_fy = fy[moving_mask]
                valid_x = x_coords[moving_mask]
                valid_y = y_coords[moving_mask]

                mean_speed = float(np.mean(valid_mags))
                
                # Dominant crowd flow angle
                mean_fx = np.mean(valid_fx)
                mean_fy = np.mean(valid_fy)
                primary_angle = (math.degrees(math.atan2(mean_fy, mean_fx)) + 360) % 360

                # Turbulence Index: standard deviation of flow angles / 180.0
                angle_diffs = np.abs((valid_angles - primary_angle + 180) % 360 - 180)
                turbulence = float(np.clip(np.std(angle_diffs) / 90.0, 0.0, 1.0))

                # Stampede Risk: sudden high speed (> 6 px/frame) with high divergence/turbulence
                stampede_risk = bool(mean_speed > 5.5 and turbulence > 0.65)

                counter_flows = 0
                sample_vectors = []

                # Subsample up to 40 representative vectors for transmission
                total_moving = len(valid_mags)
                stride = max(1, total_moving // 35)

                for i in range(0, total_moving, stride):
                    ang_diff = abs((valid_angles[i] - primary_angle + 180) % 360 - 180)
                    is_counter = ang_diff > 120.0 and valid_mags[i] > 2.0
                    if is_counter:
                        counter_flows += 1

                    sample_vectors.append({
                        "x": round((float(valid_x[i]) / w) * 100, 1),
                        "y": round((float(valid_y[i]) / h) * 100, 1),
                        "dx": round(float(valid_fx[i]), 2),
                        "dy": round(float(valid_fy[i]), 2),
                        "magnitude": round(float(valid_mags[i]), 2),
                        "angleDeg": round(float(valid_angles[i]), 1),
                        "isAnomaly": bool(is_counter or valid_mags[i] > 7.0),
                    })

                result = {
                    "vectors": sample_vectors,
                    "mean_speed": round(mean_speed, 2),
                    "primary_angle_deg": round(primary_angle, 1),
                    "turbulence_index": round(turbulence, 2),
                    "stampede_risk": stampede_risk,
                    "counter_flow_count": counter_flows,
                }

        except Exception as e:
            logger.error(f"[OpticalFlow] Error computing flow: {e}")

        self.prev_gray = gray
        return result

    def track_sparse_points(self, prev_pts, curr_frame_bgr):
        """
        Lucas-Kanade sparse feature tracking for detected persons across frames.
        prev_pts: numpy array of shape (N, 1, 2)
        """
        if self.prev_gray is None or prev_pts is None or len(prev_pts) == 0:
            return None, None
        
        curr_gray = cv2.cvtColor(curr_frame_bgr, cv2.COLOR_BGR2GRAY)
        next_pts, status, err = cv2.calcOpticalFlowPyrLK(
            self.prev_gray,
            curr_gray,
            prev_pts.astype(np.float32),
            None,
            **self.lk_params
        )
        return next_pts, status
