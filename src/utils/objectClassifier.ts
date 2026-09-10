import { IdentifiedObject } from '../types';

export type PublicObjectCategory =
  | 'WEAPON'
  | 'VEHICLE'
  | 'STATIONERY'
  | 'LUGGAGE'
  | 'ELECTRONIC'
  | 'INFRASTRUCTURE'
  | 'FOOD'
  | 'OTHER';

const DANGEROUS_CLASSES = new Set([
  'knife',
  'scissors',
  'baseball bat',
  'blade',
  'dagger',
  'weapon',
  'gun',
]);

const VEHICLE_CLASSES = new Set([
  'car',
  'bus',
  'truck',
  'motorcycle',
  'bicycle',
  'train',
  'boat',
  'airplane',
]);

const STATIONERY_CLASSES = new Set([
  'pen',
  'pencil',
  'marker',
  'stylus',
  'book',
  'scissors',
  'notebook',
]);

const LUGGAGE_CLASSES = new Set([
  'backpack',
  'handbag',
  'suitcase',
  'umbrella',
  'bag',
]);

const ELECTRONIC_CLASSES = new Set([
  'cell phone',
  'laptop',
  'mouse',
  'keyboard',
  'remote',
  'tv',
  'clock',
  'microwave',
]);

const INFRASTRUCTURE_CLASSES = new Set([
  'chair',
  'couch',
  'bench',
  'dining table',
  'traffic light',
  'fire hydrant',
  'stop sign',
  'parking meter',
  'toilet',
  'potted plant',
]);

const FOOD_CLASSES = new Set([
  'bottle',
  'cup',
  'wine glass',
  'bowl',
  'banana',
  'apple',
  'sandwich',
  'pizza',
  'fork',
  'spoon',
]);

/**
 * Normalizes COCO-SSD class names for public space surveillance.
 * Maps common misclassifications like 'toothbrush' -> 'pen'.
 */
export function normalizeObjectClass(rawClass: string, bbox?: [number, number, number, number]): string {
  const lower = rawClass.toLowerCase().trim();

  // In webcam/public space tests, 'toothbrush' is the standard COCO-SSD classification for pens, markers, and styluses
  if (lower === 'toothbrush') {
    return 'pen';
  }

  // Slender cutlery held like a pen or stylus
  if ((lower === 'fork' || lower === 'spoon') && bbox) {
    const [, , bw, bh] = bbox;
    const aspect = Math.max(bw / (bh || 1), bh / (bw || 1));
    if (aspect > 3.2) {
      return 'pen';
    }
  }

  return lower;
}

/**
 * Checks whether an identified object is a dangerous hazard or potential weapon.
 */
export function isDangerousObject(className: string): boolean {
  const lower = className.toLowerCase().trim();
  if (DANGEROUS_CLASSES.has(lower)) return true;
  return lower.includes('knife') || lower.includes('blade') || lower.includes('weapon');
}

/**
 * Classifies an object class into one of the public usage categories.
 */
export function classifyObjectCategory(className: string): PublicObjectCategory {
  const lower = className.toLowerCase().trim();

  if (isDangerousObject(lower)) return 'WEAPON';
  if (VEHICLE_CLASSES.has(lower)) return 'VEHICLE';
  if (STATIONERY_CLASSES.has(lower)) return 'STATIONERY';
  if (LUGGAGE_CLASSES.has(lower)) return 'LUGGAGE';
  if (ELECTRONIC_CLASSES.has(lower)) return 'ELECTRONIC';
  if (INFRASTRUCTURE_CLASSES.has(lower)) return 'INFRASTRUCTURE';
  if (FOOD_CLASSES.has(lower)) return 'FOOD';

  return 'OTHER';
}

/**
 * Returns a recognizable Unicode icon for the detected public object.
 */
export function getObjectIcon(className: string): string {
  const lower = className.toLowerCase().trim();

  switch (lower) {
    case 'knife':
      return '🔪';
    case 'scissors':
      return '✂️';
    case 'baseball bat':
      return '🏏';
    case 'car':
      return '🚗';
    case 'bus':
      return '🚌';
    case 'truck':
      return '🚚';
    case 'motorcycle':
      return '🏍️';
    case 'bicycle':
      return '🚲';
    case 'train':
      return '🚆';
    case 'airplane':
      return '✈️';
    case 'pen':
    case 'pencil':
    case 'marker':
    case 'stylus':
      return '🖊️';
    case 'book':
      return '📖';
    case 'backpack':
      return '🎒';
    case 'handbag':
      return '👜';
    case 'suitcase':
      return '🧳';
    case 'umbrella':
      return '☂️';
    case 'cell phone':
      return '📱';
    case 'laptop':
      return '💻';
    case 'keyboard':
      return '⌨️';
    case 'mouse':
      return '🖱️';
    case 'remote':
      return '🕹️';
    case 'tv':
      return '📺';
    case 'bottle':
      return '🧴';
    case 'cup':
      return '☕';
    case 'chair':
      return '🪑';
    case 'couch':
      return '🛋️';
    case 'bench':
      return '🪑';
    case 'traffic light':
      return '🚦';
    case 'fire hydrant':
      return '🧯';
    case 'stop sign':
      return '🛑';
    case 'parking meter':
      return '🅿️';
    case 'person':
      return '🧍';
    default:
      return '📦';
  }
}

/**
 * Fast frame analysis for detecting slender pen-like objects
 * when held in front of the camera (analyzes high aspect-ratio edges).
 */
export function detectSlenderPenCandidate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  existingBoxes: Array<{ x: number; y: number; width: number; height: number }>
): { bbox: [number, number, number, number]; score: number } | null {
  try {
    // Sample inference canvas pixels (fast downsampled scan)
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Scan vertical and horizontal lines in central 70% of frame
    const startX = Math.floor(width * 0.15);
    const endX = Math.floor(width * 0.85);
    const startY = Math.floor(height * 0.15);
    const endY = Math.floor(height * 0.85);

    let maxSlenderContrast = 0;
    let bestBox: [number, number, number, number] | null = null;

    // Scan vertical columns for long slender contrast streaks (characteristic of pen body)
    const stepX = 14;
    const stepY = 10;

    for (let x = startX; x < endX; x += stepX) {
      let streakLen = 0;
      let streakStartY = 0;

      for (let y = startY; y < endY; y += stepY) {
        const idx = (y * width + x) * 4;
        const leftIdx = (y * width + Math.max(0, x - 4)) * 4;
        const rightIdx = (y * width + Math.min(width - 1, x + 4)) * 4;

        const lumCenter = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
        const lumLeft = data[leftIdx] * 0.299 + data[leftIdx + 1] * 0.587 + data[leftIdx + 2] * 0.114;
        const lumRight = data[rightIdx] * 0.299 + data[rightIdx + 1] * 0.587 + data[rightIdx + 2] * 0.114;

        const edgeStrength = Math.abs(lumCenter - lumLeft) + Math.abs(lumCenter - lumRight);

        if (edgeStrength > 65) {
          if (streakLen === 0) streakStartY = y;
          streakLen += stepY;
        } else {
          // Check if previous streak satisfies pen dimensions:
          // length 45px - 140px, slender width ~8-20px (aspect ratio >= 3.2)
          if (streakLen >= 50 && streakLen <= 150) {
            const aspect = streakLen / 14;
            if (aspect >= 3.5) {
              const boxW = 16;
              const boxH = streakLen;
              const boxX = x - 8;
              const boxY = streakStartY;

              // Ensure doesn't overlap heavily with already detected objects
              const overlaps = existingBoxes.some((b) => {
                const centerDist = Math.hypot((b.x / 100) * width - x, (b.y / 100) * height - (boxY + boxH / 2));
                return centerDist < 35;
              });

              if (!overlaps && aspect > maxSlenderContrast) {
                maxSlenderContrast = aspect;
                bestBox = [boxX, boxY, boxW, boxH];
              }
            }
          }
          streakLen = 0;
        }
      }
    }

    if (bestBox && maxSlenderContrast >= 4.0) {
      const score = Math.min(0.88, 0.60 + (maxSlenderContrast / 12) * 0.25);
      return { bbox: bestBox, score };
    }
  } catch {
    // Fail silently without blocking inference
  }

  return null;
}
