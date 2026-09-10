import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export interface FaceDetectionResult {
  box: { x: number; y: number; width: number; height: number }; // normalized 0-100%
  pixelBox: { x: number; y: number; width: number; height: number };
  confidence: number;
  landmarks: Array<[number, number]>; // normalized 0-100%
  pixelLandmarks: Array<[number, number]>;
  occlusionPercent: number;
  occlusionType: 'NONE' | 'FACE_MASK' | 'SUNGLASSES' | 'HOODIE_SCARF' | 'HAND_OCCLUSION';
  embedding: number[];
}

export interface ObjectDetectionResult {
  id: string;
  class: string;
  score: number;
  box: { x: number; y: number; width: number; height: number }; // normalized 0-100%
  pixelBox: { x: number; y: number; width: number; height: number };
  isUnattended?: boolean;
}

// Downscaled resolution for real-time neural network inference
export const INFERENCE_WIDTH = 480;
export const INFERENCE_HEIGHT = 270;

let sharedInferCanvas: HTMLCanvasElement | null = null;
let sharedInferCtx: CanvasRenderingContext2D | null = null;

export function getInferenceCanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null {
  if (typeof document === 'undefined') return null;
  if (!sharedInferCanvas) {
    sharedInferCanvas = document.createElement('canvas');
    sharedInferCanvas.width = INFERENCE_WIDTH;
    sharedInferCanvas.height = INFERENCE_HEIGHT;
    sharedInferCtx = sharedInferCanvas.getContext('2d', { willReadFrequently: true });
  }
  if (!sharedInferCtx) return null;
  return { canvas: sharedInferCanvas, ctx: sharedInferCtx };
}

let blazeFaceModel: blazeface.BlazeFaceModel | null = null;
let cocoModel: cocoSsd.ObjectDetection | null = null;
let isInitializing = false;
let initPromise: Promise<void> | null = null;

export async function initVisionModels(): Promise<{ blazefaceLoaded: boolean; cocoLoaded: boolean }> {
  if (blazeFaceModel && cocoModel) {
    return { blazefaceLoaded: true, cocoLoaded: true };
  }

  if (isInitializing && initPromise) {
    await initPromise;
    return { blazefaceLoaded: !!blazeFaceModel, cocoLoaded: !!cocoModel };
  }

  isInitializing = true;
  initPromise = (async () => {
    try {
      // Prioritize fast WebGL backend with hardware optimizations
      if (tf.findBackend('webgl')) {
        await tf.setBackend('webgl');
        try {
          tf.env().set('WEBGL_PACK', true);
          tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
        } catch {
          // ignore env settings error if browser lacks support
        }
      }
      await tf.ready();
      console.log('[Vision Engine] TensorFlow.js ready, active backend:', tf.getBackend());

      const [faceModel, objectModel] = await Promise.all([
        blazeface.load().catch((err) => {
          console.warn('BlazeFace load error:', err);
          return null;
        }),
        cocoSsd.load({ base: 'lite_mobilenet_v2' }).catch((err) => {
          console.warn('Coco-SSD load error:', err);
          return null;
        }),
      ]);

      blazeFaceModel = faceModel;
      cocoModel = objectModel;
      console.log('[Vision Engine] Vision models loaded successfully:', {
        blazeface: !!blazeFaceModel,
        coco: !!cocoModel,
      });
    } catch (err) {
      console.error('[Vision Engine] Model initialization failed:', err);
    } finally {
      isInitializing = false;
    }
  })();

  await initPromise;
  return { blazefaceLoaded: !!blazeFaceModel, cocoLoaded: !!cocoModel };
}

export function getVisionModels() {
  return { blazeFaceModel, cocoModel };
}
