import { RegisteredFace } from '../types';

// Standard dimension for feature extraction
const EMBED_GRID = 8;
const EMBED_DIM = EMBED_GRID * EMBED_GRID * 2; // 128-dimensional embedding

/**
 * Calculates cosine similarity between two normalized feature vectors.
 * Returns value between 0.0 and 1.0.
 */
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;
  const len = Math.min(vecA.length, vecB.length);
  if (len < 8) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return 0;
  return Math.max(0, Math.min(1, dotProduct / denom));
}

// Reusable singleton canvas for feature extraction to avoid GC churn
let sharedCropCanvas: HTMLCanvasElement | null = null;
let sharedCropCtx: CanvasRenderingContext2D | null = null;

function getSharedCropContext(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  if (!sharedCropCanvas) {
    sharedCropCanvas = document.createElement('canvas');
    sharedCropCanvas.width = 64;
    sharedCropCanvas.height = 64;
    sharedCropCtx = sharedCropCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (!sharedCropCtx) return null;
  return { canvas: sharedCropCanvas, ctx: sharedCropCtx };
}

/**
 * Extracts a normalized 128-dimensional embedding from a face canvas or video crop.
 * High-performance: skips toDataURL unless explicitly requested via includeThumbnail.
 */
export function extractFaceEmbedding(
  source: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement,
  pixelBox: { x: number; y: number; width: number; height: number },
  includeThumbnail = false
): { embedding: number[]; faceCropUrl: string; occlusionPercent: number; occlusionType: 'NONE' | 'FACE_MASK' | 'SUNGLASSES' | 'HOODIE_SCARF' | 'HAND_OCCLUSION' } {
  const contextObj = getSharedCropContext();
  if (!contextObj) {
    return {
      embedding: new Array(EMBED_DIM).fill(0),
      faceCropUrl: '',
      occlusionPercent: 0,
      occlusionType: 'NONE',
    };
  }

  const { canvas: cropCanvas, ctx } = contextObj;

  // Draw the face crop into the 64x64 canvas
  const sx = Math.max(0, pixelBox.x);
  const sy = Math.max(0, pixelBox.y);
  const sw = Math.max(1, pixelBox.width);
  const sh = Math.max(1, pixelBox.height);

  try {
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, 64, 64);
  } catch (e) {
    // If source isn't ready or tainted
    console.warn('[FaceRecognition] drawImage failed:', e);
  }

  // Only run costly toDataURL when explicitly requested (e.g. for registration/snapshot)
  const faceCropUrl = includeThumbnail ? cropCanvas.toDataURL('image/jpeg', 0.8) : '';

  const imgData = ctx.getImageData(0, 0, 64, 64);
  const data = imgData.data;

  // 1. Compute 8x8 block average grayscale & gradients
  const blockSize = 64 / EMBED_GRID; // 8x8 pixels per cell
  const rawFeatures: number[] = [];

  let upperLuminanceSum = 0;
  let lowerLuminanceSum = 0;
  let lowerColorVarianceSum = 0;

  for (let gy = 0; gy < EMBED_GRID; gy++) {
    for (let gx = 0; gx < EMBED_GRID; gx++) {
      let cellLum = 0;
      let cellDx = 0;
      let cellDy = 0;
      let count = 0;

      for (let y = gy * blockSize; y < (gy + 1) * blockSize; y++) {
        for (let x = gx * blockSize; x < (gx + 1) * blockSize; x++) {
          const idx = (y * 64 + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          cellLum += lum;

          // Gradients
          const nextX = Math.min(63, x + 1);
          const nextY = Math.min(63, y + 1);
          const lumX = 0.299 * data[(y * 64 + nextX) * 4] + 0.587 * data[(y * 64 + nextX) * 4 + 1] + 0.114 * data[(y * 64 + nextX) * 4 + 2];
          const lumY = 0.299 * data[(nextY * 64 + x) * 4] + 0.587 * data[(nextY * 64 + x) * 4 + 1] + 0.114 * data[(nextY * 64 + x) * 4 + 2];
          cellDx += Math.abs(lumX - lum);
          cellDy += Math.abs(lumY - lum);

          if (gy < 3) upperLuminanceSum += lum;
          if (gy >= 4) {
            lowerLuminanceSum += lum;
            lowerColorVarianceSum += Math.abs(r - g) + Math.abs(g - b);
          }

          count++;
        }
      }

      const avgLum = cellLum / count;
      const avgGrad = (cellDx + cellDy) / (count * 2);
      rawFeatures.push(avgLum / 255);
      rawFeatures.push(avgGrad / 64);
    }
  }

  // 2. L2 normalize embedding
  let sumSq = 0;
  for (let i = 0; i < rawFeatures.length; i++) {
    sumSq += rawFeatures[i] * rawFeatures[i];
  }
  const norm = Math.sqrt(sumSq) || 1;
  const embedding = rawFeatures.map((v) => Number((v / norm).toFixed(4)));

  // 3. Occlusion estimation based on real lower/upper face ratios
  let occlusionPercent = 0;
  let occlusionType: 'NONE' | 'FACE_MASK' | 'SUNGLASSES' | 'HOODIE_SCARF' | 'HAND_OCCLUSION' = 'NONE';

  const avgUpperLum = upperLuminanceSum / (3 * 8 * 64);
  const avgLowerLum = lowerLuminanceSum / (4 * 8 * 64);
  const lowerTextureVariance = lowerColorVarianceSum / (4 * 8 * 64);

  // Masks often have uniform color / low texture contrast in the mouth region
  if (lowerTextureVariance < 6.0 && avgLowerLum > 50) {
    occlusionPercent = Math.min(85, Math.round(50 + (6.0 - lowerTextureVariance) * 6));
    occlusionType = 'FACE_MASK';
  } else if (avgUpperLum < 30) {
    // Very dark upper half indicates sunglasses or low visor
    occlusionPercent = Math.min(75, Math.round(40 + (30 - avgUpperLum) * 1.2));
    occlusionType = 'SUNGLASSES';
  } else {
    occlusionPercent = Math.round(Math.min(15, Math.abs(avgUpperLum - avgLowerLum) * 0.1));
  }

  return { embedding, faceCropUrl, occlusionPercent, occlusionType };
}

// LocalStorage key for user registered faces
const REGISTRY_STORAGE_KEY = 'REALTIME_CV_ENROLLED_FACES';
let cachedEnrolledFaces: RegisteredFace[] | null = null;

export function getEnrolledFaces(): RegisteredFace[] {
  if (cachedEnrolledFaces !== null) {
    return cachedEnrolledFaces;
  }
  try {
    const raw = localStorage.getItem(REGISTRY_STORAGE_KEY);
    if (raw) {
      cachedEnrolledFaces = JSON.parse(raw);
      return cachedEnrolledFaces || [];
    }
  } catch (e) {
    console.warn('Failed to read registered faces from localStorage:', e);
  }
  cachedEnrolledFaces = [];
  return cachedEnrolledFaces;
}

export function saveEnrolledFace(face: RegisteredFace): RegisteredFace[] {
  const current = getEnrolledFaces();
  const existingIdx = current.findIndex((f) => f.id === face.id);
  let updated: RegisteredFace[];
  if (existingIdx >= 0) {
    updated = [...current];
    updated[existingIdx] = face;
  } else {
    updated = [face, ...current];
  }
  cachedEnrolledFaces = updated;
  try {
    localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to save registered face:', e);
  }
  return updated;
}

export function deleteEnrolledFace(id: string): RegisteredFace[] {
  const current = getEnrolledFaces();
  const updated = current.filter((f) => f.id !== id);
  cachedEnrolledFaces = updated;
  try {
    localStorage.setItem(REGISTRY_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn('Failed to delete registered face:', e);
  }
  return updated;
}

/**
 * Match a detected embedding against all enrolled faces in the database.
 * Returns the best match if above confidence threshold.
 */
export function matchAgainstEnrolled(
  embedding: number[],
  enrolledFaces: RegisteredFace[],
  threshold = 0.66
): { match: RegisteredFace | null; confidence: number } {
  if (!enrolledFaces || enrolledFaces.length === 0 || !embedding) {
    return { match: null, confidence: 0 };
  }

  let bestMatch: RegisteredFace | null = null;
  let bestSim = 0;

  for (const face of enrolledFaces) {
    const sim = calculateCosineSimilarity(embedding, face.embedding);
    if (sim > bestSim) {
      bestSim = sim;
      bestMatch = face;
    }
  }

  const confidencePct = Math.round(bestSim * 100);
  if (bestSim >= threshold) {
    return { match: bestMatch, confidence: confidencePct };
  }

  return { match: null, confidence: confidencePct };
}
