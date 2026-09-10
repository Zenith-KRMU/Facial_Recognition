import { CameraFeedInfo } from '../types';

/**
 * Enumerates real physical cameras and video input devices connected to the system.
 */
export async function getConnectedCameras(): Promise<CameraFeedInfo[]> {
  if (typeof window === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
    return [];
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter((device) => device.kind === 'videoinput');

    if (videoDevices.length === 0) {
      return [];
    }

    return videoDevices.map((device, index) => {
      const label = device.label && device.label.trim().length > 0
        ? device.label
        : `Physical Camera ${index + 1} (${device.deviceId.slice(0, 8)}...)`;

      return {
        id: device.deviceId || `cam-${index + 1}`,
        deviceId: device.deviceId,
        name: label,
        zone: `Hardware Input • Device #${index + 1}`,
        resolution: '1280x720 Live',
        fps: 30.0,
        latencyMs: 7.5,
        status: 'ONLINE',
        crowdCount: 0,
        densityIndex: 0,
        primaryFlowAngleDeg: 0,
        opticalFlowTurbulence: 0,
        tripwireActive: true,
      };
    });
  } catch (err) {
    console.warn('Unable to enumerate camera devices:', err);
    return [];
  }
}

/**
 * Initializes and requests real camera stream for a given deviceId or default.
 */
export async function getCameraStream(deviceId?: string): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Camera API (navigator.mediaDevices.getUserMedia) is not supported in this browser.');
  }

  const constraints: MediaStreamConstraints = {
    audio: false,
    video: deviceId && deviceId !== 'default'
      ? {
          deviceId: { exact: deviceId },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        }
      : {
          facingMode: 'user',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
  };

  return await navigator.mediaDevices.getUserMedia(constraints);
}
