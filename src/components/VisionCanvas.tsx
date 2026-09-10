import { useEffect, useRef, useState, type MouseEvent, type ChangeEvent } from 'react';
import { CameraFeedInfo, CameraId, TrackedPerson, IdentifiedObject, SuspiciousAlert } from '../types';
import {
  initVisionModels,
  getVisionModels,
  getInferenceCanvas,
  INFERENCE_WIDTH,
  INFERENCE_HEIGHT,
} from '../utils/visionModels';
import {
  extractFaceEmbedding,
  matchAgainstEnrolled,
  getEnrolledFaces,
} from '../utils/faceRecognition';
import {
  normalizeObjectClass,
  isDangerousObject,
  classifyObjectCategory,
  getObjectIcon,
  detectSlenderPenCandidate,
} from '../utils/objectClassifier';
import { playSecuritySiren, stopSecuritySiren } from '../utils/audioAlert';
import {
  Camera,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ShieldAlert,
  Upload,
  Package,
  Eye,
  Crosshair,
  Loader2,
  RefreshCw,
  Video,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface VisionCanvasProps {
  camera: CameraFeedInfo;
  people: TrackedPerson[];
  selectedPersonId: string | null;
  onSelectPerson: (person: TrackedPerson) => void;
  selectedObjectId?: string | null;
  onSelectObject?: (obj: IdentifiedObject) => void;
  showLandmarks: boolean;
  showOpticalFlow: boolean;
  showDensityHeatmap: boolean;
  showBoundingBoxes: boolean;
  showObjects: boolean;
  showTripwire: boolean;
  onDetectionsUpdate: (people: TrackedPerson[], objects: IdentifiedObject[]) => void;
  onTriggerAlert: (alert: SuspiciousAlert) => void;
  onCameraStatusChange?: (status: 'ONLINE' | 'ACTIVE_RECORDING' | 'PERMISSION_REQUIRED' | 'OFFLINE') => void;
}

export function VisionCanvas({
  camera,
  people,
  selectedPersonId,
  onSelectPerson,
  selectedObjectId,
  onSelectObject,
  showLandmarks,
  showOpticalFlow,
  showDensityHeatmap,
  showBoundingBoxes,
  showObjects,
  showTripwire,
  onDetectionsUpdate,
  onTriggerAlert,
  onCameraStatusChange,
}: VisionCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Model loading state
  const [modelsReady, setModelsReady] = useState(false);
  const [modelLoadingText, setModelLoadingText] = useState('Initializing Computer Vision Models...');

  // Real Hardware Camera Stream States
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [customMediaActive, setCustomMediaActive] = useState<'NONE' | 'VIDEO' | 'IMAGE'>('NONE');
  const [customMediaName, setCustomMediaName] = useState<string>('');

  // PTZ & Canvas Controls
  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Local detection results (synced to React state at throttled rate for sidebars)
  const [localTrackedPeople, setLocalTrackedPeople] = useState<TrackedPerson[]>([]);
  const [localDetectedObjects, setLocalDetectedObjects] = useState<IdentifiedObject[]>([]);
  const [inferenceFps, setInferenceFps] = useState<number>(0);
  const [activeDangerousThreat, setActiveDangerousThreat] = useState<string | null>(null);
  const [isSirenPlaying, setIsSirenPlaying] = useState<boolean>(false);

  // Optical flow / motion history tracking
  const previousPositionsRef = useRef<Map<string, { x: number; y: number; time: number }>>(new Map());
  const unattendedTimersRef = useRef<Map<string, number>>(new Map());
  const alertCooldownsRef = useRef<Map<string, number>>(new Map());

  // High-performance decoupled references (read synchronously by 60fps render loop)
  const displayOptionsRef = useRef({
    showLandmarks,
    showOpticalFlow,
    showBoundingBoxes,
    showObjects,
    showTripwire,
    selectedPersonId,
    selectedObjectId,
    zoomLevel,
    panOffset,
  });

  useEffect(() => {
    displayOptionsRef.current = {
      showLandmarks,
      showOpticalFlow,
      showBoundingBoxes,
      showObjects,
      showTripwire,
      selectedPersonId,
      selectedObjectId,
      zoomLevel,
      panOffset,
    };
  }, [
    showLandmarks,
    showOpticalFlow,
    showBoundingBoxes,
    showObjects,
    showTripwire,
    selectedPersonId,
    selectedObjectId,
    zoomLevel,
    panOffset,
  ]);

  const latestDetectionsRef = useRef<{
    people: TrackedPerson[];
    objects: IdentifiedObject[];
  }>({
    people: [],
    objects: [],
  });

  const isInferringRef = useRef(false);
  const inferenceCycleRef = useRef(0);
  const inferenceFpsRef = useRef(0);
  const frameCountSinceInferenceRef = useRef(0);
  const inferenceFpsTimerRef = useRef(performance.now());
  const lastStateUpdateRef = useRef(0);

  // 1. Initialize Neural Models (BlazeFace + COCO-SSD)
  useEffect(() => {
    let isMounted = true;
    setModelLoadingText('Loading BlazeFace & COCO-SSD Neural Models...');
    initVisionModels()
      .then((status) => {
        if (isMounted) {
          if (status.blazefaceLoaded && status.cocoLoaded) {
            setModelsReady(true);
            setModelLoadingText('Neural Models Ready');
          } else {
            setModelLoadingText('Vision Engine initialized (partial)');
            setModelsReady(true);
          }
        }
      })
      .catch((err) => {
        console.error('Model load error:', err);
        if (isMounted) setModelLoadingText('Error loading models, retrying...');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Setup Real Hardware Camera Stream
  const startCameraStream = async () => {
    setIsRequestingPermission(true);
    setCameraError(null);

    if (customMediaActive !== 'NONE') {
      setCustomMediaActive('NONE');
    }

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: camera.deviceId && camera.deviceId !== 'default' && camera.deviceId !== 'system-default-cam'
          ? {
              deviceId: { exact: camera.deviceId },
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30, max: 30 },
            }
          : {
              facingMode: 'user',
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30, max: 30 },
            },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(console.warn);
        setCameraActive(true);
        setCameraError(null);
        if (onCameraStatusChange) onCameraStatusChange('ACTIVE_RECORDING');
      }
    } catch (err: any) {
      console.warn('Real camera stream initialization error:', err);
      setCameraActive(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera access was blocked by the browser. Please click the camera icon in your browser URL bar and allow access.');
        if (onCameraStatusChange) onCameraStatusChange('PERMISSION_REQUIRED');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No physical camera detected. Please connect a USB camera or ensure your built-in webcam is connected.');
        if (onCameraStatusChange) onCameraStatusChange('OFFLINE');
      } else {
        setCameraError(`Camera connection error: ${err.message || 'Device in use or unavailable'}.`);
        if (onCameraStatusChange) onCameraStatusChange('OFFLINE');
      }
    } finally {
      setIsRequestingPermission(false);
    }
  };

  // Automatically attempt to start camera stream on component mount or camera deviceId change
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let isMounted = true;

    if (customMediaActive !== 'NONE') return;

    const initStream = async () => {
      try {
        setCameraError(null);
        const constraints: MediaStreamConstraints = {
          audio: false,
          video: camera.deviceId && camera.deviceId !== 'default' && camera.deviceId !== 'system-default-cam'
            ? {
                deviceId: { exact: camera.deviceId },
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30, max: 30 },
              }
            : {
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 },
                frameRate: { ideal: 30, max: 30 },
              },
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (!isMounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        activeStream = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.warn);
          setCameraActive(true);
          setCameraError(null);
          if (onCameraStatusChange) onCameraStatusChange('ACTIVE_RECORDING');
        }
      } catch (err: any) {
        if (!isMounted) return;
        console.warn('Initial camera auto-connect:', err);
        setCameraActive(false);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError('Camera permission required. Click "Start Camera Stream" below to allow access.');
          if (onCameraStatusChange) onCameraStatusChange('PERMISSION_REQUIRED');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setCameraError('No physical webcam hardware detected. Connect a camera to start recognition.');
          if (onCameraStatusChange) onCameraStatusChange('OFFLINE');
        } else {
          setCameraError('Camera standing by. Click "Start Camera Stream" to connect.');
        }
      }
    };

    initStream();

    return () => {
      isMounted = false;
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
      if (videoRef.current && videoRef.current.srcObject) {
        const s = videoRef.current.srcObject as MediaStream;
        s.getTracks().forEach((t) => t.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [camera.deviceId]);

  // 3. Handle File Upload (Video or Image) for testing custom footage
  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    setCustomMediaName(file.name);

    if (file.type.startsWith('video/')) {
      if (videoRef.current) {
        if (videoRef.current.srcObject) {
          const s = videoRef.current.srcObject as MediaStream;
          s.getTracks().forEach((t) => t.stop());
          videoRef.current.srcObject = null;
        }
        videoRef.current.src = fileUrl;
        videoRef.current.loop = true;
        videoRef.current.muted = true;
        videoRef.current.play().catch(console.warn);
        setCustomMediaActive('VIDEO');
        setCameraActive(false);
      }
    } else if (file.type.startsWith('image/')) {
      const img = new Image();
      img.onload = () => {
        imageRef.current = img;
        setCustomMediaActive('IMAGE');
        setCameraActive(false);
      };
      img.src = fileUrl;
    }
  };

  // Helper to retrieve the current active media frame source
  const getActiveSource = (): HTMLVideoElement | HTMLImageElement | null => {
    if (cameraActive && videoRef.current && videoRef.current.readyState >= 2) {
      return videoRef.current;
    } else if (customMediaActive === 'VIDEO' && videoRef.current && videoRef.current.readyState >= 2) {
      return videoRef.current;
    } else if (customMediaActive === 'IMAGE' && imageRef.current && imageRef.current.complete) {
      return imageRef.current;
    }
    return null;
  };

  // 4. Asynchronous High-Speed Inference Worker Loop (Decoupled from 60 FPS Canvas)
  useEffect(() => {
    let isCancelled = false;
    let timerId: any = null;

    const runInferenceCycle = async () => {
      if (isCancelled) return;

      const activeSource = getActiveSource();
      if (!modelsReady || !activeSource || isInferringRef.current) {
        timerId = setTimeout(runInferenceCycle, 40);
        return;
      }

      isInferringRef.current = true;
      const now = performance.now();

      try {
        const inferContext = getInferenceCanvas();
        if (inferContext) {
          const { canvas: inferCanvas, ctx: inferCtx } = inferContext;
          // Render to 480x270 offscreen buffer
          inferCtx.drawImage(activeSource, 0, 0, INFERENCE_WIDTH, INFERENCE_HEIGHT);

          const { blazeFaceModel, cocoModel } = getVisionModels();
          const enrolledFaces = getEnrolledFaces();
          const cycle = inferenceCycleRef.current++;

          // 1. Run BlazeFace CNN on downscaled 480x270 canvas
          let facePredictions: any[] = [];
          if (blazeFaceModel) {
            facePredictions = await blazeFaceModel.estimateFaces(inferCanvas, false);
          }

          // 2. Run COCO-SSD on downscaled 480x270 canvas (interleaved for optimal GPU performance)
          let objectPredictions: any[] = [];
          const shouldRunObjects = displayOptionsRef.current.showObjects && cocoModel;
          if (shouldRunObjects && cycle % 2 === 0) {
            objectPredictions = await cocoModel.detect(inferCanvas, 25, 0.30);
          }

          // Process detected faces
          const detectedPeopleList: TrackedPerson[] = facePredictions.map((pred, idx) => {
            const topLeft = pred.topLeft as [number, number];
            const bottomRight = pred.bottomRight as [number, number];
            const pxW = Math.max(10, bottomRight[0] - topLeft[0]);
            const pxH = Math.max(10, bottomRight[1] - topLeft[1]);

            // Normalized coordinates (0-100%)
            const normX = ((topLeft[0] + pxW / 2) / INFERENCE_WIDTH) * 100;
            const normY = ((topLeft[1] + pxH / 2) / INFERENCE_HEIGHT) * 100;
            const normW = (pxW / INFERENCE_WIDTH) * 100;
            const normH = (pxH / INFERENCE_HEIGHT) * 100;

            const rawLandmarks = (pred.landmarks || []) as Array<[number, number]>;
            const normLandmarks: Array<[number, number]> = rawLandmarks.map((lm) => [
              (lm[0] / INFERENCE_WIDTH) * 100,
              (lm[1] / INFERENCE_HEIGHT) * 100,
            ]);

            // High-speed embedding without toDataURL overhead
            const { embedding, faceCropUrl, occlusionPercent, occlusionType } = extractFaceEmbedding(
              inferCanvas,
              { x: topLeft[0], y: topLeft[1], width: pxW, height: pxH },
              false
            );

            const { match, confidence } = matchAgainstEnrolled(embedding, enrolledFaces);
            const personId = match ? match.id : `FACE_${idx + 1}_${camera.id}`;
            const clusterId = match ? match.name : `Cluster C-${String(idx + 1).padStart(2, '0')}`;
            const status = match ? match.status : 'UNREGISTERED';
            const label = match ? `${match.name} (${match.role})` : `Unregistered Face #${idx + 1}`;
            const matchConfidence = match ? confidence : 0;
            const modelConfidence = Array.isArray(pred.probability) ? pred.probability[0] : pred.probability || 0.9;

            // Optical flow / motion vectors
            const prev = previousPositionsRef.current.get(personId);
            let vx = 0;
            let vy = 0;
            let speed = 0;
            let heading = 0;
            let timeInFrame = 1;

            if (prev) {
              const dt = Math.max(0.05, (now - prev.time) / 1000);
              vx = (normX - prev.x) / dt;
              vy = (normY - prev.y) / dt;
              speed = Math.hypot(vx, vy);
              heading = Math.round((Math.atan2(vy, vx) * 180) / Math.PI + 360) % 360;
            }
            previousPositionsRef.current.set(personId, { x: normX, y: normY, time: now });

            // Anomaly Check 1: Security Tripwire Boundary Breach
            if (displayOptionsRef.current.showTripwire && prev && prev.y < 52 && normY >= 52) {
              const alertKey = `TRIPWIRE_${personId}`;
              const lastAlert = alertCooldownsRef.current.get(alertKey) || 0;
              if (now - lastAlert > 8000) {
                alertCooldownsRef.current.set(alertKey, now);
                onTriggerAlert({
                  id: `ALT_${Date.now().toString().slice(-5)}`,
                  timestamp: new Date().toTimeString().split(' ')[0],
                  cameraId: camera.id,
                  cameraName: camera.name,
                  type: 'RESTRICTED_ZONE_BREACH',
                  title: 'Infrared CV Tripwire Boundary Breach',
                  severity: 'CRITICAL',
                  description: `Subject [${clusterId}] crossed virtual security tripwire boundary into restricted zone.`,
                  personClusterId: clusterId,
                  personLabel: label,
                  confidence: 94.5,
                  status: 'ACTIVE',
                  metrics: { velocity: Number(speed.toFixed(1)) },
                });
              }
            }

            // Anomaly Check 2: High Occlusion with Sudden Rapid Movement
            if (occlusionPercent > 45 && speed > 35) {
              const alertKey = `OCCLUSION_BURST_${personId}`;
              const lastAlert = alertCooldownsRef.current.get(alertKey) || 0;
              if (now - lastAlert > 10000) {
                alertCooldownsRef.current.set(alertKey, now);
                onTriggerAlert({
                  id: `ALT_${Date.now().toString().slice(-5)}`,
                  timestamp: new Date().toTimeString().split(' ')[0],
                  cameraId: camera.id,
                  cameraName: camera.name,
                  type: 'OCCLUDED_RAPID_MOVEMENT',
                  title: 'High Face Occlusion with Rapid Transit',
                  severity: 'WARNING',
                  description: `Subject [${clusterId}] exhibiting ${occlusionPercent}% face occlusion with anomalous acceleration (${speed.toFixed(1)} m/s).`,
                  personClusterId: clusterId,
                  personLabel: label,
                  confidence: 89.2,
                  status: 'ACTIVE',
                  metrics: { velocity: Number(speed.toFixed(1)) },
                });
              }
            }

            // Anomaly Check 3: Watchlist Match Detected
            if (match && match.status === 'WATCHLIST_FLAG') {
              const alertKey = `WATCHLIST_${match.id}`;
              const lastAlert = alertCooldownsRef.current.get(alertKey) || 0;
              if (now - lastAlert > 15000) {
                alertCooldownsRef.current.set(alertKey, now);
                onTriggerAlert({
                  id: `ALT_${Date.now().toString().slice(-5)}`,
                  timestamp: new Date().toTimeString().split(' ')[0],
                  cameraId: camera.id,
                  cameraName: camera.name,
                  type: 'RESTRICTED_ZONE_BREACH',
                  title: `Watchlist Match: ${match.name}`,
                  severity: 'CRITICAL',
                  description: `Individual enrolled on active security watchlist identified with ${confidence}% biometric confidence.`,
                  personClusterId: match.name,
                  personLabel: `${match.name} (${match.role})`,
                  confidence,
                  status: 'ACTIVE',
                });
              }
            }

            return {
              id: personId,
              clusterId,
              label,
              matchConfidence,
              status,
              camera: camera.id,
              x: normX,
              y: normY,
              boxWidth: normW,
              boxHeight: normH,
              vx,
              vy,
              speed,
              directionDeg: heading,
              occlusionPercent,
              occlusionType,
              facialLandmarksDetected: normLandmarks.length > 0,
              landmarks: normLandmarks,
              embeddingSample: embedding,
              timeInFrameSec: timeInFrame,
              crossCameraTimeline: [
                {
                  camera: camera.id,
                  enteredAt: new Date().toLocaleTimeString(),
                  durationSec: timeInFrame,
                },
              ],
              riskScore: match?.status === 'WATCHLIST_FLAG' ? 95 : occlusionPercent > 40 ? 65 : 12,
              faceCropUrl,
            };
          });

          // Process detected objects (preserve previous objects on odd cycle if not run)
          let detectedObjectsList = latestDetectionsRef.current.objects;
          if (shouldRunObjects && cycle % 2 === 0) {
            const mappedObjects: IdentifiedObject[] = objectPredictions.map((pred, idx) => {
              const [bx, by, bw, bh] = pred.bbox;
              const normX = ((bx + bw / 2) / INFERENCE_WIDTH) * 100;
              const normY = ((by + bh / 2) / INFERENCE_HEIGHT) * 100;
              const normW = (bw / INFERENCE_WIDTH) * 100;
              const normH = (bh / INFERENCE_HEIGHT) * 100;

              const normalizedClass = normalizeObjectClass(pred.class, pred.bbox);
              const isDangerous = isDangerousObject(normalizedClass);
              const category = classifyObjectCategory(normalizedClass);

              const objectId = `OBJ_${camera.id}_${idx + 1}_${normalizedClass.replace(/\s+/g, '_')}`;
              const isLuggage = category === 'LUGGAGE';

              // Public Safety Threat: Knife, Weapon, Hazard Detected
              if (isDangerous) {
                const alertKey = `WEAPON_THREAT_${normalizedClass}_${camera.id}`;
                const lastAlert = alertCooldownsRef.current.get(alertKey) || 0;
                if (now - lastAlert > 7000) {
                  alertCooldownsRef.current.set(alertKey, now);
                  // Sound immediate security siren alarm
                  playSecuritySiren(3500);
                  setIsSirenPlaying(true);
                  onTriggerAlert({
                    id: `ALT_WEAPON_${Date.now().toString().slice(-5)}`,
                    timestamp: new Date().toTimeString().split(' ')[0],
                    cameraId: camera.id,
                    cameraName: camera.name,
                    type: 'DANGEROUS_OBJECT',
                    title: `🚨 SECURITY THREAT: ${normalizedClass.toUpperCase()} DETECTED IN PUBLIC ZONE`,
                    severity: 'CRITICAL',
                    description: `Dangerous object (${normalizedClass.toUpperCase()}) identified with ${Math.round(
                      pred.score * 100
                    )}% confidence. Emergency security siren activated.`,
                    confidence: Math.round(pred.score * 100),
                    status: 'ACTIVE',
                  });
                }
              }

              let isUnattended = false;
              let unattendedDuration = 0;

              if (isLuggage) {
                const hasNearbyPerson = detectedPeopleList.some((p) => {
                  const dist = Math.hypot(p.x - normX, p.y - normY);
                  return dist < 18;
                });

                if (!hasNearbyPerson) {
                  const startTime = unattendedTimersRef.current.get(objectId) || now;
                  unattendedTimersRef.current.set(objectId, startTime);
                  unattendedDuration = Math.round((now - startTime) / 1000);

                  if (unattendedDuration >= 6) {
                    isUnattended = true;
                    const alertKey = `UNATTENDED_${objectId}`;
                    const lastAlert = alertCooldownsRef.current.get(alertKey) || 0;
                    if (now - lastAlert > 12000) {
                      alertCooldownsRef.current.set(alertKey, now);
                      onTriggerAlert({
                        id: `ALT_${Date.now().toString().slice(-5)}`,
                        timestamp: new Date().toTimeString().split(' ')[0],
                        cameraId: camera.id,
                        cameraName: camera.name,
                        type: 'UNATTENDED_OBJECT',
                        title: `Unattended ${normalizedClass.toUpperCase()} Left in Public Zone`,
                        severity: 'WARNING',
                        description: `Stationary ${normalizedClass} detected with no attendant nearby for >${unattendedDuration}s.`,
                        confidence: Math.round(pred.score * 100),
                        status: 'ACTIVE',
                      });
                    }
                  }
                } else {
                  unattendedTimersRef.current.delete(objectId);
                }
              }

              return {
                id: objectId,
                class: normalizedClass,
                category,
                isDangerous,
                score: Math.round(pred.score * 100),
                camera: camera.id,
                x: normX,
                y: normY,
                width: normW,
                height: normH,
                isUnattended,
                unattendedDurationSec: unattendedDuration,
                detectedAt: new Date().toLocaleTimeString(),
              };
            });

            // Slender pen detector: check if a user is holding a pen or stylus in camera view
            const hasPenAlready = mappedObjects.some((o) => o.class === 'pen');
            if (!hasPenAlready && inferCtx) {
              const existingBoxes = mappedObjects.map((o) => ({
                x: o.x,
                y: o.y,
                width: o.width,
                height: o.height,
              }));
              const penCandidate = detectSlenderPenCandidate(
                inferCtx,
                INFERENCE_WIDTH,
                INFERENCE_HEIGHT,
                existingBoxes
              );
              if (penCandidate) {
                const [px, py, pw, ph] = penCandidate.bbox;
                mappedObjects.push({
                  id: `OBJ_${camera.id}_pen_${cycle}`,
                  class: 'pen',
                  category: 'STATIONERY',
                  isDangerous: false,
                  score: Math.round(penCandidate.score * 100),
                  camera: camera.id,
                  x: ((px + pw / 2) / INFERENCE_WIDTH) * 100,
                  y: ((py + ph / 2) / INFERENCE_HEIGHT) * 100,
                  width: (pw / INFERENCE_WIDTH) * 100,
                  height: (ph / INFERENCE_HEIGHT) * 100,
                  detectedAt: new Date().toLocaleTimeString(),
                });
              }
            }

            detectedObjectsList = mappedObjects;

            // Sync active danger state
            const dangerItem = detectedObjectsList.find((o) => o.isDangerous);
            if (dangerItem) {
              setActiveDangerousThreat(dangerItem.class);
            } else {
              setActiveDangerousThreat(null);
            }
          } else if (!shouldRunObjects) {
            detectedObjectsList = [];
            setActiveDangerousThreat(null);
          }

          // Immediately update detections ref for the 60fps canvas render loop
          latestDetectionsRef.current = {
            people: detectedPeopleList,
            objects: detectedObjectsList,
          };

          // Update inference FPS tracker
          frameCountSinceInferenceRef.current++;
          if (now - inferenceFpsTimerRef.current > 1000) {
            const calculatedFps = Math.round(
              (frameCountSinceInferenceRef.current * 1000) / (now - inferenceFpsTimerRef.current)
            );
            inferenceFpsRef.current = calculatedFps;
            setInferenceFps(calculatedFps);
            frameCountSinceInferenceRef.current = 0;
            inferenceFpsTimerRef.current = now;
          }

          // Throttle React state propagation to eliminate React re-render lag
          if (now - lastStateUpdateRef.current > 280) {
            lastStateUpdateRef.current = now;
            setLocalTrackedPeople(detectedPeopleList);
            setLocalDetectedObjects(detectedObjectsList);
            onDetectionsUpdate(detectedPeopleList, detectedObjectsList);
          }
        }
      } catch (inferErr) {
        console.warn('Inference error:', inferErr);
      } finally {
        isInferringRef.current = false;
        if (!isCancelled) {
          // Schedule next tick (interval ~70ms = ~14 FPS inference)
          timerId = setTimeout(runInferenceCycle, 70);
        }
      }
    };

    timerId = setTimeout(runInferenceCycle, 80);

    return () => {
      isCancelled = true;
      if (timerId) clearTimeout(timerId);
    };
  }, [modelsReady, cameraActive, customMediaActive, camera.id]);

  // 5. Dedicated 60 FPS Synchronous Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let tick = 0;

    const render = () => {
      tick++;
      const width = canvas.width;
      const height = canvas.height;

      // Clear Canvas
      ctx.clearRect(0, 0, width, height);
      ctx.save();

      const activeSource = getActiveSource();
      const opts = displayOptionsRef.current;
      const curZoom = opts.zoomLevel;
      const curPan = opts.panOffset;

      // Apply PTZ (Pan / Zoom) Transform
      if (curZoom > 1.0) {
        ctx.translate(width / 2, height / 2);
        ctx.scale(curZoom, curZoom);
        ctx.translate(-width / 2 + curPan.x, -height / 2 + curPan.y);
      }

      // Draw Media Frame (Live Camera Video or Image)
      if (activeSource) {
        ctx.drawImage(activeSource, 0, 0, width, height);

        // Subtle dark cyber vignette overlay for tactical surveillance feel
        const vignette = ctx.createRadialGradient(
          width / 2,
          height / 2,
          Math.min(width, height) * 0.35,
          width / 2,
          height / 2,
          Math.max(width, height) * 0.75
        );
        vignette.addColorStop(0, 'rgba(0,0,0,0)');
        vignette.addColorStop(1, 'rgba(2, 2, 5, 0.45)');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, width, height);
      } else {
        // Standby Screen (No camera connected or pending user permission)
        drawStandbyBackground(ctx, width, height, tick, camera, isRequestingPermission, cameraError, modelsReady);
      }

      const currentPeople = latestDetectionsRef.current.people;
      const currentObjects = latestDetectionsRef.current.objects;

      // Draw Virtual Security Tripwire
      if (opts.showTripwire) {
        drawSecurityTripwire(ctx, width, height, tick);
      }

      // Draw Optical Flow Motion Vectors
      if (opts.showOpticalFlow && currentPeople.length > 0) {
        drawRealOpticalFlow(ctx, width, height, currentPeople);
      }

      // Draw Identified Objects (COCO-SSD)
      if (opts.showObjects && currentObjects.length > 0) {
        currentObjects.forEach((obj) => {
          const isSelected = opts.selectedObjectId === obj.id;
          drawIdentifiedObject(ctx, width, height, obj, isSelected);
        });
      }

      // Draw Tracked Faces (BlazeFace)
      currentPeople.forEach((person) => {
        const isSelected = opts.selectedPersonId === person.id;
        drawTrackedFace(ctx, width, height, person, isSelected, opts.showBoundingBoxes, opts.showLandmarks, tick);
      });

      // Restore PTZ Transform
      ctx.restore();

      // Format OSD time directly at 60 FPS
      const now = new Date();
      const timeStr = `${now.toTimeString().split(' ')[0]}.${String(now.getMilliseconds()).padStart(3, '0')}`;

      // Draw Tactical CCTV HUD Overlay (always unscaled)
      drawCctvHud(
        ctx,
        width,
        height,
        camera,
        timeStr,
        activeSource !== null,
        curZoom,
        currentPeople.length,
        currentObjects.length,
        inferenceFpsRef.current,
        modelsReady
      );

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [camera.id, camera.name, cameraActive, customMediaActive, modelsReady, cameraError, isRequestingPermission]);

  // Click on canvas to select face or object (instant response from ref or state)
  const handleCanvasClick = (e: MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const peopleList = latestDetectionsRef.current.people.length > 0 ? latestDetectionsRef.current.people : localTrackedPeople;
    const objectsList = latestDetectionsRef.current.objects.length > 0 ? latestDetectionsRef.current.objects : localDetectedObjects;

    // Check if clicked inside a face
    const clickedPerson = peopleList.find((p) => {
      const hw = (p.boxWidth || 14) / 2;
      const hh = (p.boxHeight || 16) / 2;
      return clickX >= p.x - hw && clickX <= p.x + hw && clickY >= p.y - hh && clickY <= p.y + hh;
    });

    if (clickedPerson) {
      // If faceCropUrl was deferred for zero-lag streaming, capture high-res snapshot now
      if (!clickedPerson.faceCropUrl) {
        const activeSource = getActiveSource();
        if (activeSource) {
          const sw = activeSource instanceof HTMLVideoElement ? activeSource.videoWidth : activeSource.width;
          const sh = activeSource instanceof HTMLVideoElement ? activeSource.videoHeight : activeSource.height;
          if (sw && sh) {
            const sx = Math.max(0, ((clickedPerson.x - (clickedPerson.boxWidth || 14) / 2) / 100) * sw);
            const sy = Math.max(0, ((clickedPerson.y - (clickedPerson.boxHeight || 16) / 2) / 100) * sh);
            const pw = Math.max(10, ((clickedPerson.boxWidth || 14) / 100) * sw);
            const ph = Math.max(10, ((clickedPerson.boxHeight || 16) / 100) * sh);
            const snap = extractFaceEmbedding(activeSource, { x: sx, y: sy, width: pw, height: ph }, true);
            clickedPerson.faceCropUrl = snap.faceCropUrl;
          }
        }
      }
      onSelectPerson(clickedPerson);
      return;
    }

    // Check if clicked inside an object
    if (onSelectObject) {
      const clickedObject = objectsList.find((o) => {
        const hw = (o.width || 12) / 2;
        const hh = (o.height || 12) / 2;
        return clickX >= o.x - hw && clickX <= o.x + hw && clickY >= o.y - hh && clickY <= o.y + hh;
      });

      if (clickedObject) {
        onSelectObject(clickedObject);
        return;
      }
    }
  };

  // PTZ Mouse Dragging
  const handleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
    if (zoomLevel > 1.0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && zoomLevel > 1.0) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      const maxPan = 180 * (zoomLevel - 1);
      setPanOffset({
        x: Math.max(-maxPan, Math.min(maxPan, newX)),
        y: Math.max(-maxPan, Math.min(maxPan, newY)),
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="relative w-full h-full bg-[#020205] overflow-hidden select-none">
      {/* Hidden processing video & image elements */}
      <video ref={videoRef} playsInline muted autoPlay className="hidden" crossOrigin="anonymous" />
      <img ref={imageRef} className="hidden" alt="Source" crossOrigin="anonymous" />
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*,image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Primary Video Canvas */}
      <canvas
        ref={canvasRef}
        width={1280}
        height={720}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`w-full h-full object-contain ${
          zoomLevel > 1.0 ? 'cursor-grab active:cursor-grabbing' : 'cursor-crosshair'
        }`}
      />

      {/* Prominent Real Camera Connect Prompt when Camera is Inactive or Needs Permission */}
      {!cameraActive && customMediaActive === 'NONE' && (
        <div className="absolute inset-0 flex items-center justify-center p-4 z-20 pointer-events-none">
          <div className="glass-card bg-[#050712]/90 border border-violet-500/40 p-6 rounded-2xl max-w-md w-full shadow-[0_0_50px_rgba(139,92,246,0.25)] text-center pointer-events-auto backdrop-blur-2xl">
            <div className="w-12 h-12 rounded-xl bg-violet-600/20 border border-violet-400/40 text-violet-300 flex items-center justify-center mx-auto mb-3 shadow-[0_0_20px_rgba(139,92,246,0.3)]">
              <Camera className="w-6 h-6" />
            </div>

            <h3 className="text-sm font-bold text-white font-mono tracking-tight glow-text mb-1">
              Live Hardware Camera Feed
            </h3>
            <p className="text-xs text-slate-300 mb-4 font-sans">
              System is configured to run <span className="text-violet-300 font-semibold">100% on real hardware cameras</span>. Connect your webcam or USB camera to begin real-time facial recognition and object sentry.
            </p>

            {cameraError && (
              <div className="mb-4 p-2.5 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs text-left flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                onClick={startCameraStream}
                disabled={isRequestingPermission}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(139,92,246,0.4)] transition-all"
              >
                {isRequestingPermission ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting Camera...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-3.5 h-3.5" />
                    <span>Start Camera Stream</span>
                  </>
                )}
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-2 rounded-xl glass hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.1] text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all"
                title="Upload recorded video file or image for computer vision testing"
              >
                <Upload className="w-3.5 h-3.5 text-cyan-400" />
                <span>Upload Media</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Danger / Weapon Alert Banner */}
      {activeDangerousThreat && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 rounded-xl bg-red-950/90 border border-red-500 text-red-200 shadow-[0_0_30px_rgba(239,68,68,0.6)] backdrop-blur-2xl animate-pulse font-mono text-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span className="font-bold tracking-wide">
            🚨 SECURITY SIREN ACTIVE: DANGEROUS OBJECT ({activeDangerousThreat.toUpperCase()}) DETECTED
          </span>
          <button
            onClick={() => {
              stopSecuritySiren();
              setIsSirenPlaying(false);
            }}
            className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[10px] ml-2 transition-colors flex items-center gap-1 shadow-md"
            title="Silence emergency siren"
          >
            <VolumeX className="w-3 h-3" />
            <span>Silence Siren</span>
          </button>
        </div>
      )}

      {/* Top Floating Controls */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
        {/* Security Siren Audio Manual Test / Alarm Button */}
        <button
          onClick={() => {
            if (isSirenPlaying) {
              stopSecuritySiren();
              setIsSirenPlaying(false);
            } else {
              playSecuritySiren(3500);
              setIsSirenPlaying(true);
            }
          }}
          className={`px-3 py-1.5 text-xs font-mono font-medium rounded-xl border transition-all flex items-center gap-1.5 backdrop-blur-xl shadow-lg ${
            isSirenPlaying
              ? 'bg-red-600 border-red-400 text-white animate-pulse shadow-[0_0_20px_rgba(239,68,68,0.5)]'
              : 'glass hover:bg-red-950/30 border-red-500/40 text-red-300 hover:text-white'
          }`}
          title="Toggle emergency security audio siren (650Hz-1350Hz sweep)"
        >
          {isSirenPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-red-400" />}
          <span>{isSirenPlaying ? 'Silence Siren' : 'Test Siren'}</span>
        </button>

        {/* Real Camera Stream Toggle */}
        <button
          onClick={startCameraStream}
          className={`px-3 py-1.5 text-xs font-mono font-medium rounded-xl border transition-all flex items-center gap-1.5 backdrop-blur-xl shadow-lg ${
            cameraActive
              ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
              : 'glass hover:bg-white/[0.08] border-white/[0.1] text-slate-300 hover:text-white'
          }`}
          title="Connect or refresh real device camera stream"
        >
          {cameraActive ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Camera Active</span>
            </>
          ) : (
            <>
              <Camera className="w-3.5 h-3.5 text-violet-400" />
              <span>Connect Cam</span>
            </>
          )}
        </button>

        {/* Upload Custom Video/Image Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-3 py-1.5 text-xs font-mono font-medium rounded-xl glass hover:bg-white/[0.08] border border-white/[0.1] text-slate-300 hover:text-white transition-all flex items-center gap-1.5 backdrop-blur-xl shadow-lg"
          title="Upload recorded footage or crowd photos for object & face analysis"
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span>{customMediaActive !== 'NONE' ? customMediaName.slice(0, 12) + '...' : 'Upload File'}</span>
        </button>

        {/* PTZ Zoom Controls */}
        <div className="flex items-center glass border border-white/[0.1] rounded-xl p-0.5 backdrop-blur-xl shadow-lg">
          <button
            onClick={() => setZoomLevel((z) => Math.min(3.5, Number((z + 0.25).toFixed(2))))}
            className="p-1.5 hover:bg-white/[0.08] text-slate-400 hover:text-violet-300 rounded-lg transition-colors"
            title="Optical PTZ Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <span className="text-[10px] font-mono text-violet-300 px-1.5 font-bold">{zoomLevel.toFixed(1)}x</span>
          <button
            onClick={() => {
              setZoomLevel((z) => Math.max(1.0, Number((z - 0.25).toFixed(2))));
              if (zoomLevel <= 1.25) setPanOffset({ x: 0, y: 0 });
            }}
            className="p-1.5 hover:bg-white/[0.08] text-slate-400 hover:text-violet-300 rounded-lg transition-colors"
            title="Optical PTZ Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          {zoomLevel > 1.0 && (
            <button
              onClick={() => {
                setZoomLevel(1.0);
                setPanOffset({ x: 0, y: 0 });
              }}
              className="p-1.5 hover:bg-white/[0.08] text-slate-400 hover:text-amber-300 rounded-lg transition-colors border-l border-white/[0.08]"
              title="Reset PTZ Pan/Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Bottom Floating Legend Bar */}
      <div className="absolute bottom-3 left-3 flex items-center gap-3 z-20 pointer-events-none text-[11px] font-mono glass border border-white/[0.1] px-3.5 py-1.5 rounded-xl backdrop-blur-xl shadow-lg flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
          <span className="text-slate-300">Registered Face</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_6px_#a78bfa]" />
          <span className="text-slate-300">Unregistered Face</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_6px_#22d3ee]" />
          <span className="text-slate-300">Public Object</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_6px_#38bdf8]" />
          <span className="text-slate-300">🚗 Vehicles</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_6px_#c084fc]" />
          <span className="text-slate-300">🖊️ Pens & Stationery</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_6px_#ef4444]" />
          <span className="text-red-400 font-bold">🔪 Dangerous Weapons (Siren)</span>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------------
// CANVAS DRAWING HELPERS
// ----------------------------------------------------------------------------

function drawStandbyBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tick: number,
  camera: CameraFeedInfo,
  isRequesting: boolean,
  cameraError: string | null,
  modelsReady: boolean
) {
  ctx.save();
  ctx.fillStyle = '#020205';
  ctx.fillRect(0, 0, w, h);

  // Subtle grid
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < w; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y < h; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Scanning radar line
  const scanY = (tick * 2) % h;
  const scanGrad = ctx.createLinearGradient(0, scanY - 20, 0, scanY + 20);
  scanGrad.addColorStop(0, 'rgba(139, 92, 246, 0)');
  scanGrad.addColorStop(0.5, 'rgba(139, 92, 246, 0.06)');
  scanGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
  ctx.fillStyle = scanGrad;
  ctx.fillRect(0, scanY - 20, w, 40);

  ctx.restore();
}

function drawTrackedFace(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  p: TrackedPerson,
  isSelected: boolean,
  showBoundingBoxes: boolean,
  showLandmarks: boolean,
  tick: number
) {
  const normW = p.boxWidth || 12;
  const normH = p.boxHeight || 14;
  const boxW = Math.max(48, (normW / 100) * w);
  const boxH = Math.max(54, (normH / 100) * h);
  const x = (p.x / 100) * w - boxW / 2;
  const y = (p.y / 100) * h - boxH / 2;

  let color = '#a78bfa'; // Violet for unregistered
  let tagBg = 'rgba(139, 92, 246, 0.9)';

  if (p.status === 'REGISTERED') {
    color = '#10b981'; // Emerald for registered
    tagBg = 'rgba(16, 185, 129, 0.92)';
  } else if (p.status === 'WATCHLIST_FLAG' || p.isFlaggedSuspicious) {
    color = '#ef4444'; // Red for flagged
    tagBg = 'rgba(239, 68, 68, 0.95)';
  }

  // Draw Face Bounding Box
  if (showBoundingBoxes) {
    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? 2.5 : 1.5;

    // Corner brackets
    const bracketLen = Math.min(16, boxW * 0.28);
    ctx.beginPath();
    // Top-left
    ctx.moveTo(x, y + bracketLen);
    ctx.lineTo(x, y);
    ctx.lineTo(x + bracketLen, y);
    // Top-right
    ctx.moveTo(x + boxW - bracketLen, y);
    ctx.lineTo(x + boxW, y);
    ctx.lineTo(x + boxW, y + bracketLen);
    // Bottom-left
    ctx.moveTo(x, y + boxH - bracketLen);
    ctx.lineTo(x, y + boxH);
    ctx.lineTo(x + bracketLen, y + boxH);
    // Bottom-right
    ctx.moveTo(x + boxW - bracketLen, y + boxH);
    ctx.lineTo(x + boxW, y + boxH);
    ctx.lineTo(x + boxW, y + boxH - bracketLen);
    ctx.stroke();

    // Box subtle fill
    ctx.fillStyle = isSelected
      ? 'rgba(139, 92, 246, 0.18)'
      : p.isFlaggedSuspicious
      ? 'rgba(239, 68, 68, 0.12)'
      : 'rgba(16, 185, 129, 0.04)';
    ctx.fillRect(x, y, boxW, boxH);

    // Top Header Badge: Registered/Cluster name & match confidence
    ctx.fillStyle = tagBg;
    let badgeText = '';
    if (p.status === 'REGISTERED') {
      badgeText = `✓ IDENTIFIED: ${p.label} [${p.matchConfidence.toFixed(0)}% MATCH]`;
    } else if (p.status === 'WATCHLIST_FLAG' || p.isFlaggedSuspicious) {
      badgeText = `⚠ WATCHLIST: ${p.label} [${p.matchConfidence.toFixed(0)}% MATCH]`;
    } else {
      badgeText = `[?] UNREGISTERED (Click to Enroll)`;
    }
    const textWidth = ctx.measureText(badgeText).width || 90;
    ctx.fillRect(x, y - 22, Math.max(boxW, textWidth + 14), 22);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText(badgeText, x + 5, y - 7);

    // Bottom Occlusion Badge
    ctx.fillStyle = 'rgba(2, 2, 5, 0.9)';
    ctx.fillRect(x, y + boxH + 2, boxW, 16);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y + boxH + 2, boxW, 16);

    ctx.fillStyle = p.occlusionPercent > 35 ? '#f87171' : '#c4b5fd';
    ctx.font = '9px "JetBrains Mono", monospace';
    const occlText = p.occlusionPercent > 0 ? `OCCL: ${p.occlusionPercent}%` : 'NO OCCL';
    ctx.fillText(occlText, x + 4, y + boxH + 13);
  }

  // Draw Real Facial Landmarks (6-point mesh)
  if (showLandmarks && p.landmarks && p.landmarks.length > 0) {
    ctx.save();
    ctx.fillStyle = '#34d399';
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)';
    ctx.lineWidth = 1;

    const pts = p.landmarks.map((lm) => ({
      x: (lm[0] / 100) * w,
      y: (lm[1] / 100) * h,
    }));

    // Draw landmark dots
    pts.forEach((pt) => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw connecting facial triangulation
    if (pts.length >= 6) {
      // Connect eyes
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      ctx.lineTo(pts[1].x, pts[1].y);
      // Connect eyes to nose
      ctx.lineTo(pts[2].x, pts[2].y);
      ctx.lineTo(pts[0].x, pts[0].y);
      // Connect nose to mouth
      ctx.moveTo(pts[2].x, pts[2].y);
      ctx.lineTo(pts[3].x, pts[3].y);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawIdentifiedObject(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  obj: IdentifiedObject,
  isSelected: boolean
) {
  const normW = Math.max(5, obj.width);
  const normH = Math.max(5, obj.height);
  const boxW = (normW / 100) * w;
  const boxH = (normH / 100) * h;
  const x = (obj.x / 100) * w - boxW / 2;
  const y = (obj.y / 100) * h - boxH / 2;

  const isUnattended = obj.isUnattended;
  const isDangerous = obj.isDangerous || isDangerousObject(obj.class);
  const category = obj.category || classifyObjectCategory(obj.class);
  const icon = getObjectIcon(obj.class);

  let color = '#22d3ee'; // Cyan for standard objects
  let tagBg = 'rgba(6, 182, 212, 0.95)';
  let fillBg = 'rgba(34, 211, 238, 0.08)';

  if (isDangerous) {
    color = '#ef4444'; // Red threat
    tagBg = 'rgba(220, 38, 38, 0.98)';
    fillBg = 'rgba(239, 68, 68, 0.22)';
  } else if (isUnattended) {
    color = '#f97316'; // Amber-Red for unattended
    tagBg = 'rgba(234, 88, 12, 0.95)';
    fillBg = 'rgba(249, 115, 22, 0.18)';
  } else if (category === 'VEHICLE') {
    color = '#38bdf8'; // Sky blue for cars, buses, bikes
    tagBg = 'rgba(2, 132, 199, 0.95)';
    fillBg = 'rgba(56, 189, 248, 0.12)';
  } else if (category === 'STATIONERY') {
    color = '#c084fc'; // Purple for pens, books, stationery
    tagBg = 'rgba(147, 51, 234, 0.95)';
    fillBg = 'rgba(192, 132, 252, 0.14)';
  } else if (category === 'ELECTRONIC') {
    color = '#818cf8'; // Indigo for electronics
    tagBg = 'rgba(99, 102, 241, 0.95)';
    fillBg = 'rgba(129, 140, 248, 0.1)';
  } else if (category === 'LUGGAGE') {
    color = '#fbbf24'; // Amber for luggage
    tagBg = 'rgba(217, 119, 6, 0.95)';
    fillBg = 'rgba(251, 191, 36, 0.1)';
  } else if (category === 'INFRASTRUCTURE') {
    color = '#34d399'; // Emerald for facilities
    tagBg = 'rgba(5, 150, 105, 0.95)';
    fillBg = 'rgba(52, 211, 153, 0.1)';
  }

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = isDangerous ? 2.8 : isSelected ? 2.5 : 1.5;

  if (isDangerous) {
    ctx.shadowColor = 'rgba(239, 68, 68, 0.85)';
    ctx.shadowBlur = 14;
  }

  // Draw object bounding box with dashed style
  ctx.setLineDash(isDangerous ? [] : [5, 3]);
  ctx.strokeRect(x, y, boxW, boxH);
  ctx.setLineDash([]);

  // Semi-transparent fill
  ctx.fillStyle = fillBg;
  ctx.fillRect(x, y, boxW, boxH);

  // If dangerous weapon / hazard, draw bold corner reticles and hazard markings
  if (isDangerous) {
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 3;
    const cornerSize = Math.min(18, Math.min(boxW, boxH) * 0.35);

    // Top-left
    ctx.beginPath();
    ctx.moveTo(x, y + cornerSize);
    ctx.lineTo(x, y);
    ctx.lineTo(x + cornerSize, y);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(x + boxW - cornerSize, y);
    ctx.lineTo(x + boxW, y);
    ctx.lineTo(x + boxW, y + cornerSize);
    ctx.stroke();

    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(x, y + boxH - cornerSize);
    ctx.lineTo(x, y + boxH);
    ctx.lineTo(x + cornerSize, y + boxH);
    ctx.stroke();

    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(x + boxW - cornerSize, y + boxH);
    ctx.lineTo(x + boxW, y + boxH);
    ctx.lineTo(x + boxW, y + boxH - cornerSize);
    ctx.stroke();
  }

  // Object Tag Badge
  let labelText = `${icon} ${obj.class.toUpperCase()} ${obj.score}%`;
  if (isDangerous) {
    labelText = `🚨 WEAPON / THREAT: ${obj.class.toUpperCase()} ${obj.score}% [ALARM ACTIVE]`;
  } else if (isUnattended) {
    labelText = `⚠️ UNATTENDED: ${obj.class.toUpperCase()} (${obj.unattendedDurationSec || 0}s)`;
  }

  ctx.font = 'bold 10px "JetBrains Mono", monospace';
  const tagWidth = ctx.measureText(labelText).width + 14;

  ctx.fillStyle = tagBg;
  ctx.fillRect(x, y - 20, Math.max(tagWidth, boxW * 0.7), 20);

  ctx.fillStyle = '#ffffff';
  ctx.fillText(labelText, x + 6, y - 6);

  ctx.restore();
}

function drawRealOpticalFlow(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  people: TrackedPerson[]
) {
  ctx.save();
  people.forEach((p) => {
    if (Math.abs(p.vx) > 0.1 || Math.abs(p.vy) > 0.1) {
      const px = (p.x / 100) * w;
      const py = (p.y / 100) * h;
      const endX = px + p.vx * 18;
      const endY = py + p.vy * 18;

      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Arrow head
      ctx.fillStyle = '#c4b5fd';
      ctx.beginPath();
      ctx.arc(endX, endY, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  ctx.restore();
}

function drawSecurityTripwire(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  tick: number
) {
  ctx.save();
  const tripY = h * 0.52;
  const pulse = Math.sin(tick * 0.08) * 0.25 + 0.75;

  ctx.strokeStyle = `rgba(239, 68, 68, ${pulse * 0.75})`;
  ctx.lineWidth = 1.8;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(0, tripY);
  ctx.lineTo(w, tripY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Tag
  ctx.fillStyle = 'rgba(239, 68, 68, 0.9)';
  ctx.fillRect(16, tripY - 14, 160, 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 8px "JetBrains Mono", monospace';
  ctx.fillText('INFRARED CV TRIPWIRE ACTIVE', 22, tripY - 3);
  ctx.restore();
}

function drawCctvHud(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  camera: CameraFeedInfo,
  timeStr: string,
  hasLiveMedia: boolean,
  zoomLevel: number,
  faceCount: number,
  objectCount: number,
  inferenceFps: number,
  modelsReady: boolean
) {
  ctx.save();

  // Top OSD Header Bar
  ctx.fillStyle = 'rgba(2, 2, 5, 0.88)';
  ctx.fillRect(0, 0, w, 38);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 38);
  ctx.lineTo(w, 38);
  ctx.stroke();

  // Blinking REC / LIVE Indicator
  const isBlink = Math.floor(Date.now() / 600) % 2 === 0;
  ctx.fillStyle = hasLiveMedia ? (isBlink ? '#ef4444' : '#7f1d1d') : '#64748b';
  ctx.beginPath();
  ctx.arc(18, 19, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  ctx.fillText(hasLiveMedia ? 'REC • REAL CAMERA' : 'CAMERA STANDBY', 30, 23);

  // Camera Identity
  ctx.fillStyle = '#c4b5fd';
  ctx.fillText(camera.name, 180, 23);

  // Resolution & Optical PTZ
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillText(`${camera.resolution} | PTZ ${zoomLevel.toFixed(1)}x`, w - 300, 23);

  // Time
  ctx.fillStyle = '#34d399';
  ctx.font = 'bold 11px "JetBrains Mono", monospace';
  ctx.fillText(timeStr, w - 130, 23);

  // Bottom Telemetry Bar
  ctx.fillStyle = 'rgba(2, 2, 5, 0.88)';
  ctx.fillRect(0, h - 34, w, 34);
  ctx.beginPath();
  ctx.moveTo(0, h - 34);
  ctx.lineTo(w, h - 34);
  ctx.stroke();

  // Real Detection Counts
  ctx.fillStyle = '#34d399';
  ctx.font = '11px "JetBrains Mono", monospace';
  ctx.fillText(`FACES DETECTED: ${faceCount}`, 20, h - 13);

  ctx.fillStyle = '#22d3ee';
  ctx.fillText(`OBJECTS IDENTIFIED: ${objectCount}`, 190, h - 13);

  ctx.fillStyle = '#a78bfa';
  ctx.fillText(`MODEL: ${modelsReady ? 'BlazeFace + COCO-SSD' : 'Loading...'}`, 390, h - 13);

  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`INFERENCE: ${inferenceFps} FPS`, w - 160, h - 13);

  // PTZ Crosshair
  const chX = w / 2;
  const chY = h / 2;
  ctx.strokeStyle = 'rgba(139, 92, 246, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(chX - 14, chY);
  ctx.lineTo(chX + 14, chY);
  ctx.moveTo(chX, chY - 14);
  ctx.lineTo(chX, chY + 14);
  ctx.stroke();

  ctx.restore();
}
