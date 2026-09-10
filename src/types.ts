export type CameraId = string;

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'ADVISORY';

export type AlertType =
  | 'LOITERING_PROLONGED'
  | 'STAMPEDE_DISPERSAL_RISK'
  | 'COUNTER_FLOW_COLLISION'
  | 'RESTRICTED_ZONE_BREACH'
  | 'OCCLUDED_RAPID_MOVEMENT'
  | 'UNATTENDED_OBJECT'
  | 'DANGEROUS_OBJECT';

export interface CameraFeedInfo {
  id: CameraId;
  name: string;
  deviceId?: string;
  zone?: string;
  resolution: string;
  fps: number;
  latencyMs: number;
  status: 'ONLINE' | 'ACTIVE_RECORDING' | 'PERMISSION_REQUIRED' | 'OFFLINE';
  crowdCount: number;
  densityIndex: number; // 0 to 5 pers/m²
  primaryFlowAngleDeg: number;
  opticalFlowTurbulence: number; // 0 to 1
  tripwireActive: boolean;
}

export interface TrackedPerson {
  id: string;
  clusterId: string; // e.g. "C-104"
  label: string; // e.g. "Alex Mercer" or "Unregistered #104"
  matchConfidence: number; // 0 - 100%
  status: 'REGISTERED' | 'WATCHLIST_FLAG' | 'UNREGISTERED';
  camera: CameraId;
  x: number; // % 0-100 in feed (center)
  y: number; // % 0-100 in feed (center)
  boxWidth?: number; // % width of face / person
  boxHeight?: number; // % height of face / person
  vx: number; // motion vector dx
  vy: number; // motion vector dy
  speed: number; // m/s
  directionDeg: number;
  occlusionPercent: number; // 0 - 100%
  occlusionType: 'NONE' | 'FACE_MASK' | 'SUNGLASSES' | 'HOODIE_SCARF' | 'HAND_OCCLUSION';
  facialLandmarksDetected: boolean;
  landmarks: Array<[number, number]>; // 5-10 key landmarks (eyes, nose, mouth corners)
  embeddingSample: number[]; // normalized feature vector
  timeInFrameSec: number;
  crossCameraTimeline: Array<{
    camera: CameraId;
    enteredAt: string;
    durationSec: number;
  }>;
  riskScore: number; // 0 - 100
  flagReason?: string;
  isFlaggedSuspicious?: boolean;
  faceCropUrl?: string;
}

export interface IdentifiedObject {
  id: string;
  class: string; // e.g. 'car', 'bus', 'pen', 'knife', 'backpack', 'cell phone', etc.
  category?: 'WEAPON' | 'VEHICLE' | 'STATIONERY' | 'LUGGAGE' | 'ELECTRONIC' | 'INFRASTRUCTURE' | 'FOOD' | 'OTHER';
  isDangerous?: boolean;
  score: number; // 0 - 100%
  camera: CameraId;
  x: number; // % 0 - 100 center
  y: number; // % 0 - 100 center
  width: number; // % width
  height: number; // % height
  isUnattended?: boolean;
  unattendedDurationSec?: number;
  detectedAt: string;
}

export interface RegisteredFace {
  id: string;
  name: string;
  role: string;
  status: 'REGISTERED' | 'WATCHLIST_FLAG';
  embedding: number[];
  enrolledAt: string;
  faceCropUrl?: string;
  notes?: string;
}

export interface OpticalFlowVector {
  x: number;
  y: number;
  dx: number;
  dy: number;
  magnitude: number;
  angleDeg: number;
  isAnomaly: boolean;
}

export interface SuspiciousAlert {
  id: string;
  timestamp: string;
  cameraId: CameraId;
  cameraName: string;
  type: AlertType;
  title: string;
  severity: AlertSeverity;
  description: string;
  personClusterId?: string;
  personLabel?: string;
  confidence: number;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'DISPATCHED' | 'RESOLVED';
  metrics?: {
    velocity?: number;
    loiterDurationSec?: number;
    density?: number;
  };
}

export interface CrowdDynamicsMetrics {
  totalHeadcount: number;
  averageDensity: number; // pers/m²
  peakDensityZone: string;
  flowRatePerMin: number;
  globalTurbulence: number; // 0 - 1
  occlusionRatioPercent: number;
  activeAlertCount: number;
  reIdHandoverSuccessRate: number; // %
}

export interface ProjectSpecData {
  title: string;
  status: string;
  problemDescription: string;
  objectives: string;
  proposedSolution: string[];
  technologyStack: {
    [key: string]: string;
  };
  problemType: string;
}

export interface GeminiIncidentReport {
  threatLevel: 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  executiveSummary: string;
  anomalyBreakdown: string[];
  tacticalRecommendations: string[];
  opticalFlowInsights: string[];
  containmentConfidence: string;
  generatedAt: string;
}
