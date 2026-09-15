import React from 'react';
import { DetectedItem, PathStatus } from '../types';
import { AlertTriangle, Compass, Eye, ShieldAlert, ArrowLeft, ArrowRight, ArrowUp, OctagonX, FileText, Navigation } from 'lucide-react';

interface LiveStatusBarProps {
  detections: DetectedItem[];
  isCameraRunning: boolean;
  isHighContrast: boolean;
  currentVoiceWarning?: string | null;
  isSpeaking?: boolean;
  pathStatus?: PathStatus | null;
  lastOcrText?: string | null;
  isReadingText?: boolean;
  isNavigating?: boolean;
  destination?: string | null;
  nextInstruction?: string | null;
}

export const LiveStatusBar: React.FC<LiveStatusBarProps> = ({
  detections,
  isCameraRunning,
  isHighContrast,
  currentVoiceWarning,
  isSpeaking = false,
  pathStatus,
  lastOcrText,
  isReadingText,
  isNavigating,
  destination,
  nextInstruction,
}) => {
  // Sort detections by significance (closest/largest first)
  const sorted = [...detections].sort((a, b) => b.relativeArea - a.relativeArea);
  const primaryItem = sorted[0];
  const secondaryItem = sorted[1];

  const hasCloseObstacle = detections.some(
    (d) => d.proximity === 'Close' && (d.position === 'Center' || d.position === 'Left' || d.position === 'Right')
  );

  const trustedPerson = detections.find(
    (d) => d.recognizedPerson?.isRegistered && !!d.recognizedPerson.name
  );

  return (
    <footer
      id="live-status-bar"
      aria-live="polite"
      role="region"
      aria-label="Real-time Vision Status"
      className={`border-t-4 transition-colors ${
        isHighContrast
          ? 'bg-black border-yellow-400 text-yellow-300'
          : 'bg-neutral-900 border-neutral-800 text-neutral-100'
      } px-4 sm:px-8 py-5 shadow-2xl`}
    >
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Main Status Display Required by User Prompt */}
        <div className="flex-1">
          <div className="text-xs uppercase font-extrabold tracking-wider mb-1 flex items-center gap-2 opacity-80">
            <Eye className="w-4 h-4" />
            <span>Real-time Vision Status</span>
          </div>

          {!isCameraRunning ? (
            <div
              id="status-camera-inactive"
              className="text-xl sm:text-2xl md:text-3xl font-black text-neutral-400"
            >
              Camera stopped. Press &ldquo;Start Camera&rdquo; to begin detection.
            </div>
          ) : primaryItem ? (
            <div className="space-y-1">
              {/* Primary Prompt Format: "Person detected — Center" */}
              <div
                id="status-primary-detection"
                className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight flex flex-wrap items-center gap-2 sm:gap-3 ${
                  isHighContrast ? 'text-yellow-300' : 'text-emerald-400'
                }`}
              >
                <span>{primaryItem.label} detected</span>
                <span className="opacity-60">—</span>
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-lg border-2 ${
                    isHighContrast
                      ? 'bg-yellow-400 text-black border-yellow-300'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                  }`}
                >
                  <Compass className="w-6 h-6" />
                  {primaryItem.position}
                </span>
                <span
                  className={`text-base sm:text-lg font-bold px-2 py-0.5 rounded ${
                    isHighContrast
                      ? 'bg-neutral-900 text-yellow-200 border border-yellow-400/50'
                      : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                  }`}
                >
                  {primaryItem.confidence}% confidence
                </span>
              </div>

              {/* Secondary item if present (e.g. "Car detected — Left") */}
              {secondaryItem && (
                <div
                  id="status-secondary-detection"
                  className={`text-lg sm:text-xl font-bold flex items-center gap-2 ${
                    isHighContrast ? 'text-yellow-100/90' : 'text-neutral-300'
                  }`}
                >
                  <span className="opacity-70">Also:</span>
                  <span>{secondaryItem.label} detected</span>
                  <span className="opacity-60">—</span>
                  <span className="underline decoration-2">{secondaryItem.position}</span>
                  <span className="text-sm opacity-80">({secondaryItem.confidence}%)</span>
                </div>
              )}
            </div>
          ) : (
            <div
              id="status-scanning-active"
              className={`text-xl sm:text-2xl md:text-3xl font-black flex items-center gap-3 ${
                isHighContrast ? 'text-yellow-400/80' : 'text-neutral-300'
              }`}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Scanning area... No objects in view</span>
            </div>
          )}
        </div>

        {/* Obstacle Warning Channel (Prioritized Voice & Visual Warning) */}
        {isCameraRunning && hasCloseObstacle && (
          <div
            id="obstacle-warning-banner"
            role="alert"
            className={`flex items-center gap-3 px-5 py-3 rounded-xl border-3 shadow-xl ${
              isHighContrast
                ? 'bg-red-600 text-white border-white animate-pulse'
                : 'bg-red-600/90 text-white border-red-400 animate-pulse'
            }`}
          >
            <ShieldAlert className="w-8 h-8 flex-shrink-0 text-white" />
            <div>
              <div className="font-black text-lg sm:text-xl uppercase tracking-wide">
                Obstacle very close.
              </div>
              <div className="text-xs sm:text-sm font-semibold opacity-90">
                High-priority voice warning active
              </div>
            </div>
          </div>
        )}

        {/* Current Voice Warning Pill */}
        {isCameraRunning && currentVoiceWarning && !hasCloseObstacle && (
          <div
            id="active-voice-warning-pill"
            className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 ${
              isSpeaking
                ? isHighContrast
                  ? 'bg-yellow-400 text-black border-white animate-pulse'
                  : 'bg-cyan-500 text-neutral-950 border-cyan-300 animate-pulse'
                : isHighContrast
                ? 'bg-neutral-900 border-yellow-400 text-yellow-300'
                : 'bg-neutral-800 border-neutral-700 text-neutral-200'
            }`}
          >
            <div className="text-xs font-bold uppercase opacity-80">Voice Alert:</div>
            <div className="text-base sm:text-lg font-black">&ldquo;{currentVoiceWarning}&rdquo;</div>
          </div>
        )}

        {/* Recognized Trusted Person Pill */}
        {isCameraRunning && trustedPerson && trustedPerson.recognizedPerson && (
          <div
            id="status-trusted-person-pill"
            className={`self-start md:self-center flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 font-black text-sm sm:text-base ${
              isHighContrast
                ? 'bg-yellow-400 text-black border-white'
                : 'bg-indigo-600 text-white border-indigo-400'
            }`}
          >
            <span className="opacity-80 text-xs uppercase font-extrabold">Trusted:</span>
            <span>
              {trustedPerson.recognizedPerson.name} ({trustedPerson.position})
            </span>
          </div>
        )}

        {/* Path Status Pill */}
        {isCameraRunning && pathStatus && (
          <div
            id="status-path-guidance-pill"
            className={`self-start md:self-center flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 font-black text-sm sm:text-base ${
              pathStatus === 'STOP'
                ? 'bg-red-600 text-white border-white animate-pulse'
                : pathStatus === 'MOVE LEFT' || pathStatus === 'MOVE RIGHT'
                ? isHighContrast
                  ? 'bg-yellow-400 text-black border-yellow-300'
                  : 'bg-blue-600 text-white border-blue-400'
                : isHighContrast
                ? 'bg-neutral-900 border-yellow-400 text-yellow-300'
                : 'bg-emerald-950/70 border-emerald-500 text-emerald-300'
            }`}
          >
            <span className="opacity-75 text-xs uppercase font-extrabold">Path:</span>
            <span>{pathStatus}</span>
          </div>
        )}

        {/* Navigation Status Pill (Part 5) */}
        {isNavigating && (
          <div
            id="status-nav-pill"
            className={`self-start md:self-center flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 font-black text-xs sm:text-sm ${
              isHighContrast
                ? 'bg-yellow-400 text-black border-white animate-pulse'
                : 'bg-sky-500 text-neutral-950 border-sky-300 animate-pulse'
            }`}
          >
            <Navigation className="w-4 h-4 fill-current" />
            <span>
              Nav: {destination ? destination : 'Active'} &rarr; &ldquo;{nextInstruction || 'Proceed'}&rdquo;
            </span>
          </div>
        )}

        {/* OCR Text Reading Pill */}
        {isCameraRunning && (isReadingText || lastOcrText) && (
          <div
            id="status-ocr-pill"
            className={`self-start md:self-center flex items-center gap-2 px-3.5 py-2 rounded-xl border-2 font-black text-xs sm:text-sm ${
              isReadingText
                ? isHighContrast
                  ? 'bg-yellow-400 text-black border-white animate-pulse'
                  : 'bg-amber-500 text-neutral-950 border-amber-300 animate-pulse'
                : isHighContrast
                ? 'bg-neutral-900 border-amber-400 text-amber-300'
                : 'bg-amber-950/70 border-amber-500 text-amber-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>
              {isReadingText ? 'Reading Text...' : `Sign: "${lastOcrText}"`}
            </span>
          </div>
        )}

        {/* Summary Counter Pill */}
        {isCameraRunning && (
          <div
            id="detections-counter-pill"
            className={`self-start md:self-center px-4 py-2 rounded-xl border-2 text-center ${
              isHighContrast
                ? 'bg-neutral-900 border-yellow-400 text-yellow-300'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-200'
            }`}
          >
            <div className="text-2xl sm:text-3xl font-black">{detections.length}</div>
            <div className="text-xs font-bold uppercase tracking-wider opacity-80">
              {detections.length === 1 ? 'Object In View' : 'Objects In View'}
            </div>
          </div>
        )}
      </div>
    </footer>
  );
};
