/**
 * Real-Time Text & Sign Reading Service (Part 4)
 * Uses native Shape Detection TextDetector API when available, with Tesseract.js fallback.
 * Prioritizes largest/most prominent signage, filters noise, and enforces cautiousness.
 */

import { OcrResult, OcrTextBlock } from '../types';

let tesseractWorker: any = null;
let isInitializingWorker = false;

/**
 * Lazily initialize Tesseract worker to avoid loading overhead on startup.
 */
async function getTesseractWorker() {
  if (tesseractWorker) return tesseractWorker;
  if (isInitializingWorker) {
    // Wait for in-progress initialization
    let attempts = 0;
    while (isInitializingWorker && attempts < 20) {
      await new Promise((r) => setTimeout(r, 150));
      attempts++;
    }
    if (tesseractWorker) return tesseractWorker;
  }

  isInitializingWorker = true;
  try {
    const Tesseract = await import('tesseract.js');
    const worker = await Tesseract.createWorker('eng');
    tesseractWorker = worker;
    return worker;
  } catch (err) {
    console.warn('Could not initialize Tesseract.js worker:', err);
    return null;
  } finally {
    isInitializingWorker = false;
  }
}

/**
 * Preprocesses a video frame or canvas to improve OCR recognition on signs and labels.
 */
function captureFrameToCanvas(
  video: HTMLVideoElement,
  roi?: { x: number; y: number; width: number; height: number }
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const srcW = video.videoWidth || 640;
  const srcH = video.videoHeight || 480;

  if (srcW <= 0 || srcH <= 0) {
    canvas.width = 640;
    canvas.height = 480;
    return canvas;
  }

  // Scale down if extremely high-res to keep OCR responsive (target ~1000px max)
  const maxDim = 1024;
  const scale = Math.min(1, maxDim / Math.max(srcW, srcH));
  const targetW = Math.max(1, Math.round(srcW * scale));
  const targetH = Math.max(1, Math.round(srcH * scale));

  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  try {
    if (roi) {
      const rx = Math.max(0, Math.min(srcW - 1, Math.floor(roi.x)));
      const ry = Math.max(0, Math.min(srcH - 1, Math.floor(roi.y)));
      const rw = Math.max(1, Math.min(srcW - rx, Math.floor(roi.width)));
      const rh = Math.max(1, Math.min(srcH - ry, Math.floor(roi.height)));
      ctx.drawImage(video, rx, ry, rw, rh, 0, 0, targetW, targetH);
    } else {
      ctx.drawImage(video, 0, 0, targetW, targetH);
    }
  } catch (err) {
    // Non-fatal fallback
  }

  return canvas;
}

/**
 * Filter out OCR garbage, tiny single-character noise, or random punctuation.
 */
function cleanOcrText(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/[\r\n]+/g, ' ')
    .replace(/[^\w\s.,!?:;'\-\/]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate if text is garbled/unclear.
 */
function isGarbledOrUnclear(text: string, confidence: number): boolean {
  if (!text || text.length < 2) return true;
  if (confidence > 0 && confidence < 35) return true;

  // If text is predominantly non-alphanumeric or gibberish
  const alphanumericCount = (text.match(/[a-zA-Z0-9]/g) || []).length;
  const ratio = alphanumericCount / text.length;
  if (ratio < 0.45 && text.length > 3) return true;

  // Repetitive character artifact (e.g. "||||||||" or "------")
  if (/^(.)\1{3,}$/.test(text)) return true;

  return false;
}

/**
 * Main OCR Reader entrypoint.
 * Captures the current camera video frame and detects visible text.
 */
export async function readTextFromCamera(
  videoElement: HTMLVideoElement | null
): Promise<OcrResult> {
  const now = Date.now();

  if (
    !videoElement ||
    videoElement.readyState < 2 ||
    videoElement.videoWidth <= 0 ||
    videoElement.videoHeight <= 0
  ) {
    return {
      status: 'error',
      spokenText: "I can't find readable text.",
      detectedBlocks: [],
      fullRawText: '',
      timestamp: now,
    };
  }

  const canvas = captureFrameToCanvas(videoElement);

  // 1. Try Native Browser Shape Detection TextDetector if supported (instant & native)
  if (typeof window !== 'undefined' && 'TextDetector' in window) {
    try {
      const TextDetectorClass = (window as any).TextDetector;
      const detector = new TextDetectorClass();
      const nativeResults = await detector.detect(canvas);

      if (nativeResults && nativeResults.length > 0) {
        const blocks: OcrTextBlock[] = nativeResults
          .map((item: any) => {
            const bbox = item.boundingBox
              ? [item.boundingBox.x, item.boundingBox.y, item.boundingBox.width, item.boundingBox.height] as [number, number, number, number]
              : undefined;
            const area = item.boundingBox ? item.boundingBox.width * item.boundingBox.height : 0;
            return {
              text: cleanOcrText(item.rawValue || ''),
              confidence: 90,
              bbox,
              area,
            };
          })
          .filter((b: OcrTextBlock) => b.text.length >= 2);

        if (blocks.length > 0) {
          // Sort by largest area / height (Requirement 7)
          blocks.sort((a, b) => (b.area || 0) - (a.area || 0));

          const primaryText = blocks[0].text;
          const fullText = blocks.map((b) => b.text).join('\n');

          return {
            status: 'success',
            spokenText: `${primaryText}.`,
            detectedBlocks: blocks,
            fullRawText: fullText,
            timestamp: now,
          };
        }
      }
    } catch (nativeErr) {
      console.warn('Native TextDetector failed or not supported, falling back to Tesseract:', nativeErr);
    }
  }

  // 2. Tesseract.js Optical Character Recognition
  try {
    const worker = await getTesseractWorker();

    let recognizedData: any = null;

    if (worker) {
      const res = await worker.recognize(canvas);
      recognizedData = res.data;
    } else {
      // Direct recognition fallback
      const Tesseract = await import('tesseract.js');
      const res = await Tesseract.recognize(canvas, 'eng');
      recognizedData = res.data;
    }

    if (!recognizedData || !recognizedData.text) {
      return {
        status: 'no-text',
        spokenText: "I can't find readable text.",
        detectedBlocks: [],
        fullRawText: '',
        timestamp: now,
      };
    }

    const rawText = recognizedData.text.trim();
    const overallConfidence = recognizedData.confidence || 0;

    // Check lines or paragraphs
    const lines = recognizedData.lines || [];
    const validBlocks: OcrTextBlock[] = [];

    for (const line of lines) {
      const cleaned = cleanOcrText(line.text);
      if (cleaned.length >= 2 && !isGarbledOrUnclear(cleaned, line.confidence)) {
        const bbox = line.bbox
          ? [line.bbox.x0, line.bbox.y0, line.bbox.x1 - line.bbox.x0, line.bbox.y1 - line.bbox.y0] as [number, number, number, number]
          : undefined;
        const area = bbox ? bbox[2] * bbox[3] : cleaned.length * 10;

        validBlocks.push({
          text: cleaned,
          confidence: line.confidence || overallConfidence,
          bbox,
          area,
        });
      }
    }

    if (validBlocks.length === 0) {
      // Check if raw text had something but was low confidence/garbled
      if (rawText.length > 0 && overallConfidence < 40) {
        return {
          status: 'unclear',
          spokenText: 'The text is unclear.',
          detectedBlocks: [],
          fullRawText: rawText,
          timestamp: now,
        };
      }

      return {
        status: 'no-text',
        spokenText: "I can't find readable text.",
        detectedBlocks: [],
        fullRawText: '',
        timestamp: now,
      };
    }

    // Sort blocks: Prioritize largest text or most prominent sign (Requirement 7)
    validBlocks.sort((a, b) => {
      // Prioritize prominent signage keywords if any
      const prominentRegex = /(exit|room|caution|danger|stop|entrance|push|pull|restroom|office|warning)/i;
      const aHasKeyword = prominentRegex.test(a.text);
      const bHasKeyword = prominentRegex.test(b.text);
      if (aHasKeyword && !bHasKeyword) return -1;
      if (!aHasKeyword && bHasKeyword) return 1;

      // Otherwise sort by largest area/size
      return (b.area || 0) - (a.area || 0);
    });

    // Check top block
    const topBlock = validBlocks[0];

    // If top block itself is unclear
    if (isGarbledOrUnclear(topBlock.text, topBlock.confidence)) {
      return {
        status: 'unclear',
        spokenText: 'The text is unclear.',
        detectedBlocks: validBlocks,
        fullRawText: validBlocks.map((b) => b.text).join('\n'),
        timestamp: now,
      };
    }

    // Prepare short, clear spoken announcement (Requirement 8 & 9)
    // E.g. "Emergency Exit." or "Room 204."
    let spokenOutput = topBlock.text;
    if (!spokenOutput.endsWith('.')) {
      spokenOutput += '.';
    }

    // If there's a second large block and the total is very short, include it concisely
    if (validBlocks.length > 1 && spokenOutput.length < 25) {
      const secondBlock = validBlocks[1];
      if (secondBlock.text.length < 30 && !spokenOutput.toLowerCase().includes(secondBlock.text.toLowerCase())) {
        spokenOutput += ` ${secondBlock.text}.`;
      }
    }

    const fullRawText = validBlocks.map((b) => b.text).join('\n');

    return {
      status: 'success',
      spokenText: spokenOutput,
      detectedBlocks: validBlocks,
      fullRawText,
      timestamp: now,
    };
  } catch (ocrError) {
    console.error('OCR processing error:', ocrError);
    return {
      status: 'unclear',
      spokenText: 'The text is unclear.',
      detectedBlocks: [],
      fullRawText: '',
      timestamp: now,
    };
  }
}
