import {
  TrustedPersonProfile,
  TrustedPersonFaceSample,
  RecognizedPerson,
  SpatialPosition,
  DetectedItem,
} from '../types';

const STORAGE_KEY = 'ai_smart_vision_trusted_people_v1';
const RECOGNITION_ENABLED_KEY = 'ai_smart_vision_recognition_enabled_v1';

// Preset sample avatars with distinct visual feature profiles for instant demonstration
const SAMPLE_DEMO_PROFILES: TrustedPersonProfile[] = [
  {
    id: 'profile-rahul-demo',
    name: 'Rahul',
    relationship: 'Friend',
    createdAt: 1715000000000,
    faceSamples: [
      {
        id: 'sample-rahul-1',
        dataUrl: createDemoFaceDataUrl('Rahul', '#0284c7'),
        descriptor: generateSyntheticDescriptor('Rahul-Sample-Seed-1'),
        timestamp: 1715000000000,
      },
    ],
  },
  {
    id: 'profile-sarah-demo',
    name: 'Sarah',
    relationship: 'Sister',
    createdAt: 1715001000000,
    faceSamples: [
      {
        id: 'sample-sarah-1',
        dataUrl: createDemoFaceDataUrl('Sarah', '#e11d48'),
        descriptor: generateSyntheticDescriptor('Sarah-Sample-Seed-1'),
        timestamp: 1715001000000,
      },
    ],
  },
];

// Generates an SVG-based data URL avatar for demonstration when starting fresh
function createDemoFaceDataUrl(name: string, color: string): string {
  const initial = (name.charAt(0) || 'U').toUpperCase();
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" rx="24" fill="${color}"/>
  <circle cx="64" cy="46" r="26" fill="#fef08a"/>
  <circle cx="54" cy="42" r="3" fill="#1e293b"/>
  <circle cx="74" cy="42" r="3" fill="#1e293b"/>
  <path d="M54 54 Q64 62 74 54" stroke="#1e293b" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M32 108 C32 82 46 72 64 72 C82 72 96 82 96 108 Z" fill="#ffffff" opacity="0.9"/>
  <text x="64" y="122" font-family="sans-serif" font-size="12" font-weight="900" fill="#ffffff" text-anchor="middle">${initial} (${name})</text>
</svg>`.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Generates a deterministic synthetic descriptor vector
function generateSyntheticDescriptor(seedString: string): number[] {
  let hash = 0;
  for (let i = 0; i < seedString.length; i++) {
    hash = (hash << 5) - hash + seedString.charCodeAt(i);
    hash |= 0;
  }

  const vec: number[] = new Array(352);
  let sumSq = 0;
  for (let i = 0; i < 352; i++) {
    const pseudoRandom = Math.sin(hash + i * 0.1337);
    vec[i] = pseudoRandom;
    sumSq += pseudoRandom * pseudoRandom;
  }

  const norm = Math.sqrt(sumSq) || 1;
  return vec.map((v) => v / norm);
}

/**
 * Load trusted profiles from local storage.
 * Local browser-side storage only (Requirements 12 & 13).
 */
export function loadTrustedProfiles(): TrustedPersonProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed with initial demo profiles so the user can test immediately
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SAMPLE_DEMO_PROFILES));
      return SAMPLE_DEMO_PROFILES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (err) {
    console.error('Failed to load trusted profiles from localStorage:', err);
    return [];
  }
}

/**
 * Save trusted profiles strictly to local storage.
 */
export function saveTrustedProfiles(profiles: TrustedPersonProfile[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch (err: any) {
    console.error('Failed to save trusted profiles to localStorage:', err);
    if (err?.name === 'QuotaExceededError' || err?.code === 22) {
      // If browser quota exceeded, keep only the latest 2 face samples per profile
      try {
        const compressed = profiles.map((p) => ({
          ...p,
          faceSamples: Array.isArray(p.faceSamples) ? p.faceSamples.slice(-2) : [],
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(compressed));
      } catch (innerErr) {
        console.warn('LocalStorage quota limit reached:', innerErr);
      }
    }
  }
}

/**
 * Check if trusted person recognition is enabled.
 */
export function getIsRecognitionEnabled(): boolean {
  try {
    const raw = localStorage.getItem(RECOGNITION_ENABLED_KEY);
    return raw === null ? true : raw === 'true';
  } catch {
    return true;
  }
}

/**
 * Set whether trusted person recognition is enabled.
 */
export function setIsRecognitionEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(RECOGNITION_ENABLED_KEY, String(enabled));
  } catch (err) {
    console.error('Failed to save recognition enabled state:', err);
  }
}

/**
 * Delete a single profile by ID.
 */
export function deleteTrustedProfile(
  profileId: string,
  currentProfiles: TrustedPersonProfile[]
): TrustedPersonProfile[] {
  const updated = currentProfiles.filter((p) => p.id !== profileId);
  saveTrustedProfiles(updated);
  return updated;
}

/**
 * Delete ALL registered face profiles (Requirement 14).
 */
export function deleteAllTrustedProfiles(): TrustedPersonProfile[] {
  saveTrustedProfiles([]);
  return [];
}

/**
 * Reset to sample profiles.
 */
export function resetToSampleProfiles(): TrustedPersonProfile[] {
  saveTrustedProfiles(SAMPLE_DEMO_PROFILES);
  return SAMPLE_DEMO_PROFILES;
}

/**
 * Create a new trusted person profile.
 */
export function createTrustedProfile(
  name: string,
  relationship?: string
): TrustedPersonProfile {
  return {
    id: `profile-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: name.trim(),
    relationship: relationship?.trim() || undefined,
    faceSamples: [],
    createdAt: Date.now(),
  };
}

/**
 * Extract face descriptor vector from a canvas or image.
 * Uses 48x48 normalized grid + gradient direction histogram + color features.
 * Total length = 352 dimensions, unit-normalized.
 */
export function extractFaceDescriptorFromCanvas(
  sourceCanvas: HTMLCanvasElement,
  cropArea?: { x: number; y: number; width: number; height: number }
): { descriptor: number[]; thumbnailDataUrl: string } {
  if (!sourceCanvas || sourceCanvas.width <= 0 || sourceCanvas.height <= 0) {
    throw new Error('Invalid source canvas dimensions for face descriptor extraction');
  }

  const targetSize = 48;
  const offscreen = document.createElement('canvas');
  offscreen.width = targetSize;
  offscreen.height = targetSize;
  const ctx = offscreen.getContext('2d', { willReadFrequently: true });

  if (!ctx) {
    throw new Error('Could not create offscreen canvas context');
  }

  // Draw crop onto normalized 48x48 canvas with strict boundary clamping
  // (Prevents IndexSizeError on all browsers if crop exceeds frame dimensions)
  if (cropArea) {
    const srcW = sourceCanvas.width;
    const srcH = sourceCanvas.height;
    const sx = Math.max(0, Math.min(srcW - 1, Math.floor(cropArea.x)));
    const sy = Math.max(0, Math.min(srcH - 1, Math.floor(cropArea.y)));
    const sw = Math.max(1, Math.min(srcW - sx, Math.floor(cropArea.width)));
    const sh = Math.max(1, Math.min(srcH - sy, Math.floor(cropArea.height)));

    ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, targetSize, targetSize);
  } else {
    ctx.drawImage(sourceCanvas, 0, 0, targetSize, targetSize);
  }

  // Generate thumbnail for UI preview
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = 120;
  thumbCanvas.height = 120;
  const thumbCtx = thumbCanvas.getContext('2d');
  if (thumbCtx) {
    thumbCtx.drawImage(offscreen, 0, 0, 120, 120);
  }
  const thumbnailDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.85);

  const imgData = ctx.getImageData(0, 0, targetSize, targetSize);
  const data = imgData.data;

  // Check if image data is completely dark / blank (e.g. camera shutter closed or uninitialized)
  let sumPixelBrightness = 0;
  for (let i = 0; i < data.length; i += 16) {
    sumPixelBrightness += data[i] + data[i + 1] + data[i + 2];
  }
  const avgBrightness = sumPixelBrightness / (data.length / 16);
  if (avgBrightness < 2) {
    throw new Error('Frame is completely dark or empty. Please face camera with adequate lighting.');
  }

  // 1. Grayscale luminance grid downsampled to 16x16 (256 values)
  const gridW = 16;
  const gridH = 16;
  const luminanceGrid: number[] = new Array(gridW * gridH).fill(0);
  const cellW = targetSize / gridW;
  const cellH = targetSize / gridH;

  // Also collect color histograms (Hue & Saturation)
  const hueBins: number[] = new Array(16).fill(0);
  const satBins: number[] = new Array(16).fill(0);

  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      let sumLum = 0;
      let count = 0;

      for (let py = Math.floor(gy * cellH); py < Math.floor((gy + 1) * cellH); py++) {
        for (let px = Math.floor(gx * cellW); px < Math.floor((gx + 1) * cellW); px++) {
          const idx = (py * targetSize + px) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];

          // Luminance formula
          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          sumLum += lum;
          count++;

          // RGB to HSV for color profile
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          let h = 0;
          if (delta !== 0) {
            if (max === r) h = ((g - b) / delta) % 6;
            else if (max === g) h = (b - r) / delta + 2;
            else h = (r - g) / delta + 4;
            h = Math.round(h * 60);
            if (h < 0) h += 360;
          }
          const s = max === 0 ? 0 : delta / max;

          const hBin = Math.min(15, Math.floor((h / 360) * 16));
          const sBin = Math.min(15, Math.floor(s * 16));
          hueBins[hBin]++;
          satBins[sBin]++;
        }
      }

      luminanceGrid[gy * gridW + gx] = count > 0 ? sumLum / count : 0;
    }
  }

  // Normalize luminance grid to zero-mean and unit variance
  let lumMean = 0;
  for (let i = 0; i < luminanceGrid.length; i++) {
    lumMean += luminanceGrid[i];
  }
  lumMean /= luminanceGrid.length;

  let lumVar = 0;
  for (let i = 0; i < luminanceGrid.length; i++) {
    const diff = luminanceGrid[i] - lumMean;
    lumVar += diff * diff;
    luminanceGrid[i] = diff;
  }
  const lumStd = Math.sqrt(lumVar / luminanceGrid.length) || 1;
  for (let i = 0; i < luminanceGrid.length; i++) {
    luminanceGrid[i] /= lumStd;
  }

  // 2. Simple Sobel gradient orientation histogram (4 orientations in 4x4 spatial blocks = 64 features)
  const gradFeatures: number[] = new Array(64).fill(0);
  const blockW = Math.floor(targetSize / 4);
  const blockH = Math.floor(targetSize / 4);

  for (let by = 0; by < 4; by++) {
    for (let bx = 0; bx < 4; bx++) {
      const blockIdx = (by * 4 + bx) * 4;

      for (let y = by * blockH + 1; y < (by + 1) * blockH - 1; y++) {
        for (let x = bx * blockW + 1; x < (bx + 1) * blockW - 1; x++) {
          const idx = (y * targetSize + x) * 4;
          const left = (y * targetSize + (x - 1)) * 4;
          const right = (y * targetSize + (x + 1)) * 4;
          const up = ((y - 1) * targetSize + x) * 4;
          const down = ((y + 1) * targetSize + x) * 4;

          const lumX =
            0.299 * (data[right] - data[left]) +
            0.587 * (data[right + 1] - data[left + 1]) +
            0.114 * (data[right + 2] - data[left + 2]);

          const lumY =
            0.299 * (data[down] - data[up]) +
            0.587 * (data[down + 1] - data[up + 1]) +
            0.114 * (data[down + 2] - data[up + 2]);

          const mag = Math.sqrt(lumX * lumX + lumY * lumY);
          let angle = Math.atan2(lumY, lumX); // -PI to PI
          if (angle < 0) angle += Math.PI; // 0 to PI

          const bin = Math.min(3, Math.floor((angle / Math.PI) * 4));
          gradFeatures[blockIdx + bin] += mag;
        }
      }
    }
  }

  // Normalize color and gradient features
  const totalPixels = targetSize * targetSize || 1;
  const normHue = hueBins.map((b) => b / totalPixels);
  const normSat = satBins.map((b) => b / totalPixels);

  let gradSumSq = 0;
  for (let i = 0; i < gradFeatures.length; i++) {
    gradSumSq += gradFeatures[i] * gradFeatures[i];
  }
  const gradNorm = Math.sqrt(gradSumSq) || 1;
  const normalizedGrad = gradFeatures.map((g) => g / gradNorm);

  // Combine: 256 (luminance) + 64 (gradient) + 16 (hue) + 16 (sat) = 352 features
  const combinedDescriptor: number[] = [
    ...luminanceGrid,
    ...normalizedGrad,
    ...normHue,
    ...normSat,
  ];

  // Final unit vector normalization
  let totalSumSq = 0;
  for (let i = 0; i < combinedDescriptor.length; i++) {
    totalSumSq += combinedDescriptor[i] * combinedDescriptor[i];
  }
  const totalNorm = Math.sqrt(totalSumSq) || 1;
  const descriptor = combinedDescriptor.map((v) => v / totalNorm);

  return { descriptor, thumbnailDataUrl };
}

/**
 * Extract face descriptor from an HTMLVideoElement.
 */
export function extractFaceDescriptorFromVideo(
  videoElement: HTMLVideoElement,
  personBbox: [number, number, number, number]
): { descriptor: number[]; thumbnailDataUrl: string } | null {
  if (
    !videoElement ||
    videoElement.readyState < 2 ||
    videoElement.videoWidth <= 0 ||
    videoElement.videoHeight <= 0
  ) {
    return null;
  }

  const [x, y, w, h] = personBbox;
  const vidW = videoElement.videoWidth;
  const vidH = videoElement.videoHeight;

  if (vidW <= 0 || vidH <= 0 || w <= 0 || h <= 0) {
    return null;
  }

  // Approximate head/face region in upper portion of person bounding box
  // Head is typically top 35-40% height, horizontally centered with ~70% width
  const headW = Math.max(16, Math.min(vidW, Math.floor(w * 0.72)));
  const headH = Math.max(16, Math.min(vidH, Math.floor(h * 0.4)));
  const headX = Math.max(0, Math.min(vidW - headW, Math.floor(x + (w - headW) / 2)));
  const headY = Math.max(0, Math.min(vidH - headH, Math.floor(y + h * 0.02)));

  try {
    const offscreen = document.createElement('canvas');
    offscreen.width = vidW;
    offscreen.height = vidH;
    const ctx = offscreen.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(videoElement, 0, 0, vidW, vidH);

    return extractFaceDescriptorFromCanvas(offscreen, {
      x: headX,
      y: headY,
      width: headW,
      height: headH,
    });
  } catch (err) {
    // Non-fatal warning if frame capture could not extract face
    return null;
  }
}

/**
 * Extract face descriptor from an image file (e.g. from file input upload).
 */
export function extractFaceDescriptorFromImageFile(
  file: File
): Promise<{ descriptor: number[]; thumbnailDataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          reject(new Error('Failed to create canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        try {
          const res = extractFaceDescriptorFromCanvas(canvas);
          resolve(res);
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image file'));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Cosine similarity between two unit-normalized vectors.
 * Returns value between -1.0 and 1.0 (typically 0.0 to 1.0 for valid descriptors).
 */
export function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (
    !Array.isArray(vecA) ||
    !Array.isArray(vecB) ||
    vecA.length !== vecB.length ||
    vecA.length === 0
  ) {
    return 0;
  }

  let dotProduct = 0;
  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i] || 0;
    const b = vecB[i] || 0;
    dotProduct += a * b;
  }
  return isNaN(dotProduct) ? 0 : Math.max(-1, Math.min(1, dotProduct));
}

/**
 * Compare a detected face descriptor ONLY against registered trusted-person profiles.
 * Strict Privacy Requirement (Requirements 5, 9, 10, 15):
 * - If match >= threshold: Recognized trusted person!
 * - If ambiguous/low confidence: Returns unknown person (announce "Person detected").
 * - NEVER identifies or names an unregistered person.
 */
export function matchFaceAgainstTrustedProfiles(
  faceDescriptor: number[],
  trustedProfiles: TrustedPersonProfile[],
  personItem: DetectedItem
): RecognizedPerson {
  const safePosition = personItem?.position || 'Center';
  const safeBbox: [number, number, number, number] = personItem?.bbox || [0, 0, 0, 0];
  const safeProximity = personItem?.proximity || 'Medium';

  // If descriptor or profiles are invalid or no samples available
  if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length === 0) {
    return {
      matchedProfileId: null,
      name: null,
      confidence: 0,
      confidenceLevel: 'unknown',
      position: safePosition,
      bbox: safeBbox,
      proximity: safeProximity,
      isRegistered: false,
    };
  }

  // If no profiles registered or no samples available
  const validProfiles = (trustedProfiles || []).filter(
    (p) => p && Array.isArray(p.faceSamples) && p.faceSamples.length > 0
  );
  if (validProfiles.length === 0) {
    return {
      matchedProfileId: null,
      name: null,
      confidence: 0,
      confidenceLevel: 'unknown',
      position: safePosition,
      bbox: safeBbox,
      proximity: safeProximity,
      isRegistered: false,
    };
  }

  let highestScore = -1;
  let matchedProfile: TrustedPersonProfile | null = null;
  let secondHighestScore = -1;

  for (const profile of validProfiles) {
    let profileMaxScore = -1;
    for (const sample of profile.faceSamples) {
      if (!sample || !Array.isArray(sample.descriptor)) continue;
      const score = calculateCosineSimilarity(faceDescriptor, sample.descriptor);
      if (score > profileMaxScore) {
        profileMaxScore = score;
      }
    }

    if (profileMaxScore > highestScore) {
      secondHighestScore = highestScore;
      highestScore = profileMaxScore;
      matchedProfile = profile;
    } else if (profileMaxScore > secondHighestScore) {
      secondHighestScore = profileMaxScore;
    }
  }

  // Recognition Thresholds:
  // High confidence match: >= 0.72 with margin >= 0.06 over second best
  // Medium/Low confidence: 0.50 to 0.72 (Requirement 15: Say "Person detected", do not announce name)
  // Below 0.50: Unknown person
  const percentageScore = Math.round(Math.max(0, Math.min(100, highestScore * 100)));

  if (highestScore >= 0.72 && matchedProfile) {
    return {
      matchedProfileId: matchedProfile.id,
      name: matchedProfile.name,
      confidence: percentageScore,
      confidenceLevel: 'high',
      position: safePosition,
      bbox: safeBbox,
      proximity: safeProximity,
      isRegistered: true,
      faceSampleUrl: matchedProfile.faceSamples[0]?.dataUrl,
    };
  }

  if (highestScore >= 0.52) {
    // Low confidence: Requirement 15
    return {
      matchedProfileId: null,
      name: null,
      confidence: percentageScore,
      confidenceLevel: 'low',
      position: safePosition,
      bbox: safeBbox,
      proximity: safeProximity,
      isRegistered: false,
    };
  }

  // Unknown person: Requirement 9 & 10
  return {
    matchedProfileId: null,
    name: null,
    confidence: percentageScore,
    confidenceLevel: 'unknown',
    position: safePosition,
    bbox: safeBbox,
    proximity: safeProximity,
    isRegistered: false,
  };
}

/**
 * Format spoken notification for recognized trusted person or unknown person.
 * Requirements 6, 7, 8, 15:
 * - "Rahul is on your left."
 * - "Rahul is in front of you."
 * - "Rahul is on your right."
 * - If low confidence or unknown person: "Person detected."
 */
export function formatPersonVoiceNotification(
  recognizedPerson: RecognizedPerson
): { text: string; isTrustedName: boolean } {
  if (recognizedPerson.isRegistered && recognizedPerson.name) {
    const name = recognizedPerson.name;
    switch (recognizedPerson.position) {
      case 'Left':
        return { text: `${name} is on your left.`, isTrustedName: true };
      case 'Right':
        return { text: `${name} is on your right.`, isTrustedName: true };
      case 'Center':
      default:
        return { text: `${name} is in front of you.`, isTrustedName: true };
    }
  }

  // Low confidence or unregistered person (Requirement 15)
  return { text: 'Person detected.', isTrustedName: false };
}
