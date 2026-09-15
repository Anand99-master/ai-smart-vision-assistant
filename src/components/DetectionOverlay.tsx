import React from 'react';
import { DetectedItem, PathGuidanceResult } from '../types';
import { ArrowLeft, ArrowRight, ArrowUp, OctagonX } from 'lucide-react';

interface DetectionOverlayProps {
  detections: DetectedItem[];
  videoDimensions: { width: number; height: number };
  containerDimensions: { width: number; height: number };
  isHighContrast: boolean;
  pathGuidance?: PathGuidanceResult | null;
  ocrResult?: { status: string; spokenText: string; detectedBlocks: Array<{ text: string; bbox?: [number, number, number, number] }> } | null;
}

export const DetectionOverlay: React.FC<DetectionOverlayProps> = ({
  detections,
  videoDimensions,
  containerDimensions,
  isHighContrast,
  pathGuidance,
  ocrResult,
}) => {
  const { width: vidW, height: vidH } = videoDimensions;
  const { width: contW, height: contH } = containerDimensions;

  if (vidW <= 0 || vidH <= 0 || contW <= 0 || contH <= 0) {
    return null;
  }

  // Calculate scale and letterboxing/pillarboxing offsets
  const videoAspect = vidW / vidH;
  const containerAspect = contW / contH;

  let renderW = contW;
  let renderH = contH;
  let offsetX = 0;
  let offsetY = 0;

  if (containerAspect > videoAspect) {
    // Height constrained
    renderH = contH;
    renderW = contH * videoAspect;
    offsetX = (contW - renderW) / 2;
  } else {
    // Width constrained
    renderW = contW;
    renderH = contW / videoAspect;
    offsetY = (contH - renderH) / 2;
  }

  const scaleX = renderW / vidW;
  const scaleY = renderH / vidH;

  const isLeftRecommended = pathGuidance?.recommendedZone === 'Left';
  const isRightRecommended = pathGuidance?.recommendedZone === 'Right';
  const isCenterClear = pathGuidance?.recommendedZone === 'Center' && pathGuidance?.status === 'PATH CLEAR';
  const isStop = pathGuidance?.status === 'STOP';

  return (
    <div
      id="detection-overlay-container"
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {/* 3-Column Spatial Navigation Zones (Requirements 1 & 9) */}
      <div
        className="absolute"
        style={{
          left: `${offsetX}px`,
          top: `${offsetY}px`,
          width: `${renderW}px`,
          height: `${renderH}px`,
        }}
      >
        {/* Left Navigation Zone Highlight */}
        <div
          className={`absolute top-0 bottom-0 left-0 w-[38%] transition-all ${
            isLeftRecommended
              ? isHighContrast
                ? 'bg-yellow-400/20 border-r-4 border-yellow-400 ring-2 ring-yellow-400/50'
                : 'bg-blue-500/20 border-r-4 border-blue-400 ring-2 ring-blue-400/50'
              : 'border-r-2 border-dashed border-white/20'
          }`}
        >
          {isLeftRecommended && (
            <div className="absolute top-12 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm shadow-xl bg-yellow-400 text-black border-2 border-white animate-pulse">
              <ArrowLeft className="w-4 h-4 stroke-[3]" />
              <span>RECOMMENDED: MOVE LEFT</span>
            </div>
          )}
        </div>

        {/* Center Navigation Zone Highlight */}
        <div
          className={`absolute top-0 bottom-0 left-[38%] w-[24%] transition-all ${
            isCenterClear
              ? isHighContrast
                ? 'bg-yellow-400/20 ring-2 ring-yellow-400/50'
                : 'bg-emerald-500/20 ring-2 ring-emerald-400/50'
              : isStop
              ? 'bg-red-600/25 ring-2 ring-red-500'
              : ''
          }`}
        >
          {isCenterClear && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm shadow-xl bg-emerald-500 text-black border-2 border-white animate-pulse whitespace-nowrap">
              <ArrowUp className="w-4 h-4 stroke-[3]" />
              <span>PATH CLEAR</span>
            </div>
          )}
          {isStop && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm shadow-xl bg-red-600 text-white border-2 border-white animate-bounce whitespace-nowrap">
              <OctagonX className="w-4 h-4 stroke-[3]" />
              <span>STOP: PATH BLOCKED</span>
            </div>
          )}
        </div>

        {/* Right Navigation Zone Highlight */}
        <div
          className={`absolute top-0 bottom-0 left-[62%] right-0 transition-all ${
            isRightRecommended
              ? isHighContrast
                ? 'bg-yellow-400/20 border-l-4 border-yellow-400 ring-2 ring-yellow-400/50'
                : 'bg-blue-500/20 border-l-4 border-blue-400 ring-2 ring-blue-400/50'
              : 'border-l-2 border-dashed border-white/20'
          }`}
        >
          {isRightRecommended && (
            <div className="absolute top-12 right-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-black text-xs sm:text-sm shadow-xl bg-yellow-400 text-black border-2 border-white animate-pulse">
              <span>RECOMMENDED: MOVE RIGHT</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </div>
          )}
        </div>

        {/* Spatial Zone Header Labels */}
        <div className="absolute top-2 left-0 right-0 flex justify-between px-3 text-xs sm:text-sm font-black uppercase tracking-widest pointer-events-none">
          <div
            className={`px-2.5 py-0.5 rounded border transition-colors ${
              isLeftRecommended
                ? isHighContrast
                  ? 'bg-yellow-400 text-black border-white'
                  : 'bg-blue-500 text-neutral-950 border-blue-300'
                : isHighContrast
                ? 'bg-black/90 border-yellow-400 text-yellow-300'
                : 'bg-black/75 border-neutral-700 text-neutral-300'
            }`}
          >
            ← Left Zone
          </div>
          <div
            className={`px-3 py-0.5 rounded border transition-colors ${
              isCenterClear
                ? isHighContrast
                  ? 'bg-yellow-400 text-black border-white'
                  : 'bg-emerald-500 text-neutral-950 border-emerald-300'
                : isStop
                ? 'bg-red-600 text-white border-white'
                : isHighContrast
                ? 'bg-black/90 border-yellow-400 text-yellow-300'
                : 'bg-black/75 border-neutral-700 text-neutral-300'
            }`}
          >
            • Center Zone •
          </div>
          <div
            className={`px-2.5 py-0.5 rounded border transition-colors ${
              isRightRecommended
                ? isHighContrast
                  ? 'bg-yellow-400 text-black border-white'
                  : 'bg-blue-500 text-neutral-950 border-blue-300'
                : isHighContrast
                ? 'bg-black/90 border-yellow-400 text-yellow-300'
                : 'bg-black/75 border-neutral-700 text-neutral-300'
            }`}
          >
            Right Zone →
          </div>
        </div>

        {/* Render Bounding Boxes for Each Detected Object */}
        {detections.map((item) => {
          const [origX, origY, origW, origH] = item.bbox;

          const boxX = origX * scaleX;
          const boxY = origY * scaleY;
          const boxW = origW * scaleX;
          const boxH = origH * scaleY;

          // Color coding based on high contrast or position/proximity
          const isWarning = item.proximity === 'Close';
          const isTrusted = item.recognizedPerson?.isRegistered && !!item.recognizedPerson.name;

          let borderColor = isTrusted
            ? isHighContrast
              ? 'border-yellow-300 ring-2 ring-yellow-400'
              : 'border-indigo-400 ring-2 ring-indigo-500'
            : isHighContrast
            ? isWarning
              ? 'border-red-500'
              : 'border-yellow-400'
            : isWarning
            ? 'border-amber-400'
            : 'border-emerald-400';

          let badgeBg = isTrusted
            ? isHighContrast
              ? 'bg-yellow-400 text-black border border-white'
              : 'bg-indigo-600 text-white border border-indigo-400'
            : isHighContrast
            ? isWarning
              ? 'bg-red-600 text-white'
              : 'bg-yellow-400 text-black'
            : isWarning
            ? 'bg-amber-500 text-neutral-950'
            : 'bg-emerald-500 text-neutral-950';

          const displayLabel = isTrusted
            ? `${item.recognizedPerson!.name} (Trusted)`
            : item.label;

          return (
            <div
              key={item.id}
              className={`absolute transition-all duration-75 border-3 rounded-md ${borderColor} shadow-lg`}
              style={{
                left: `${boxX}px`,
                top: `${boxY}px`,
                width: `${boxW}px`,
                height: `${boxH}px`,
              }}
            >
              {/* Corner accent reticles for assistive vision focus */}
              <div
                className={`absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 ${
                  isHighContrast ? 'border-white' : 'border-neutral-100'
                }`}
              />
              <div
                className={`absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 ${
                  isHighContrast ? 'border-white' : 'border-neutral-100'
                }`}
              />
              <div
                className={`absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 ${
                  isHighContrast ? 'border-white' : 'border-neutral-100'
                }`}
              />
              <div
                className={`absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 ${
                  isHighContrast ? 'border-white' : 'border-neutral-100'
                }`}
              />

              {/* Top Tag: Name, Position, Confidence */}
              <div
                className="absolute -top-8 left-0 flex items-center gap-1.5 whitespace-nowrap"
                style={{
                  transform: boxY < 32 ? 'translateY(36px)' : 'none',
                }}
              >
                {/* Main Label Pill */}
                <div
                  className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded font-black text-xs sm:text-sm tracking-wide shadow-md ${badgeBg}`}
                >
                  <span>{displayLabel}</span>
                  <span className="opacity-90">({item.confidence}%)</span>
                </div>

                {/* Spatial Badge Pill */}
                <div
                  className={`px-2 py-0.5 rounded font-bold text-xs shadow-md border ${
                    isHighContrast
                      ? 'bg-black text-yellow-300 border-yellow-400'
                      : 'bg-neutral-900/90 text-white border-neutral-700'
                  }`}
                >
                  {item.position}
                </div>

                {/* Obstacle Proximity Warning Tag if close */}
                {isWarning && (
                  <div className="px-1.5 py-0.5 rounded font-black text-xs bg-red-600 text-white animate-pulse">
                    OBSTACLE NEAR
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Real-Time OCR Detected Text Boxes and Tag */}
        {ocrResult && ocrResult.status === 'success' && (
          <>
            {ocrResult.detectedBlocks.map((blk, bIdx) => {
              if (!blk.bbox) return null;
              const [bX, bY, bW, bH] = blk.bbox;
              const boxX = bX * scaleX;
              const boxY = bY * scaleY;
              const boxW = bW * scaleX;
              const boxH = bH * scaleY;

              return (
                <div
                  key={`ocr-box-${bIdx}`}
                  className="absolute border-2 border-dashed border-amber-400 bg-amber-400/10 rounded pointer-events-none"
                  style={{
                    left: `${boxX}px`,
                    top: `${boxY}px`,
                    width: `${boxW}px`,
                    height: `${boxH}px`,
                  }}
                >
                  <div className="absolute -top-6 left-0 px-2 py-0.5 rounded text-[11px] font-black bg-amber-500 text-neutral-950 whitespace-nowrap shadow-md">
                    TEXT: &ldquo;{blk.text}&rdquo;
                  </div>
                </div>
              );
            })}

            {/* Top Viewport Prominent Text Banner */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 max-w-[90%] px-4 py-2 rounded-xl border-2 shadow-2xl flex items-center gap-2 bg-neutral-950/95 border-amber-400 text-amber-300 font-black text-sm sm:text-base pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              <span>READING: &ldquo;{ocrResult.spokenText}&rdquo;</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
