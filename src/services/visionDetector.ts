import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';
import { DetectedItem, SpatialPosition } from '../types';

let modelPromise: Promise<cocoSsd.ObjectDetection> | null = null;

export async function loadVisionModel(): Promise<cocoSsd.ObjectDetection> {
  if (!modelPromise) {
    // lite_mobilenet_v2 is ultra fast for real-time webcam frame processing
    modelPromise = cocoSsd.load({ base: 'lite_mobilenet_v2' });
  }
  return modelPromise;
}

export function calculateSpatialPosition(
  x: number,
  width: number,
  frameWidth: number
): SpatialPosition {
  if (frameWidth <= 0) return 'Center';
  const centerX = x + width / 2;
  const ratio = centerX / frameWidth;

  if (ratio < 0.38) return 'Left';
  if (ratio > 0.62) return 'Right';
  return 'Center';
}

export async function detectObjectsInFrame(
  videoElement: HTMLVideoElement,
  model: cocoSsd.ObjectDetection,
  minConfidence: number = 0.5
): Promise<DetectedItem[]> {
  if (
    !videoElement ||
    videoElement.readyState < 2 ||
    videoElement.videoWidth <= 0 ||
    videoElement.videoHeight <= 0
  ) {
    return [];
  }

  try {
    const predictions = await model.detect(videoElement, 10, minConfidence);
    const frameW = videoElement.videoWidth || 640;
    const frameH = videoElement.videoHeight || 480;
    const totalArea = Math.max(1, frameW * frameH);

    return predictions.map((pred, index) => {
      const [x, y, w, h] = pred.bbox;
      const position = calculateSpatialPosition(x, w, frameW);
      const boxArea = w * h;
      const relativeArea = Math.min(100, Math.round((boxArea / totalArea) * 100));

      let proximity: 'Far' | 'Medium' | 'Close' = 'Far';
      if (relativeArea > 25) {
        proximity = 'Close';
      } else if (relativeArea > 8) {
        proximity = 'Medium';
      }

      // Capitalize label nicely (e.g. "person" -> "Person", "cell phone" -> "Cell Phone")
      const formattedLabel = pred.class
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      return {
        id: `${pred.class}-${index}-${Math.round(x)}-${Math.round(y)}`,
        label: formattedLabel,
        confidence: Math.round(pred.score * 100),
        position,
        bbox: [x, y, w, h] as [number, number, number, number],
        relativeArea,
        proximity,
        timestamp: Date.now(),
      };
    });
  } catch (detectErr) {
    return [];
  }
}
