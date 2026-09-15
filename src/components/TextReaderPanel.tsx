import React from 'react';
import {
  FileText,
  Volume2,
  Square,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  Eye,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { OcrResult, OcrReadingStatus } from '../types';

interface TextReaderPanelProps {
  ocrResult: OcrResult | null;
  ocrStatus: OcrReadingStatus;
  onReadText: () => void;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
  isHighContrast: boolean;
  isCameraRunning: boolean;
  cooldownRemainingSec: number;
}

const SUPPORTED_SIGN_CATEGORIES = [
  'Signboards',
  'Room Numbers',
  'Street Signs',
  'Shop Names',
  'Menus',
  'Documents',
  'Labels',
  'Short Printed Text',
];

export const TextReaderPanel: React.FC<TextReaderPanelProps> = ({
  ocrResult,
  ocrStatus,
  onReadText,
  isSpeaking,
  onStopSpeaking,
  isHighContrast,
  isCameraRunning,
  cooldownRemainingSec,
}) => {
  const isReading = ocrStatus === 'reading';

  return (
    <section
      id="text-reader-section"
      aria-label="Real-Time Text and Sign Reading"
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 mb-4"
    >
      <div
        className={`p-4 sm:p-6 rounded-2xl border-4 shadow-2xl transition-all ${
          isHighContrast
            ? 'bg-black border-yellow-400 text-yellow-300'
            : 'bg-neutral-900 border-neutral-800 text-neutral-100'
        }`}
      >
        {/* Panel Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-inherit/40">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 ${
                isHighContrast
                  ? 'bg-yellow-400 text-black border-white'
                  : 'bg-amber-500 text-neutral-950 border-amber-400'
              }`}
            >
              <FileText className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Text &amp; Sign Reader
                </h2>
                <span
                  className={`text-xs uppercase font-extrabold px-2 py-0.5 rounded-full border ${
                    isHighContrast
                      ? 'bg-neutral-900 border-yellow-400 text-yellow-300'
                      : 'bg-amber-950 border-amber-500 text-amber-300'
                  }`}
                >
                  Part 4 Live OCR
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium opacity-80 mt-0.5">
                Reads signboards, room numbers, labels, street signs, and documents in front of the camera.
              </p>
            </div>
          </div>

          {/* Real-time status indicators */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            {isReading && (
              <div
                id="reading-text-active-badge"
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black border animate-pulse ${
                  isHighContrast
                    ? 'bg-yellow-400 text-black border-white'
                    : 'bg-amber-500 text-neutral-950 border-amber-300'
                }`}
              >
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Reading text...</span>
              </div>
            )}

            {isSpeaking && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-black border ${
                  isHighContrast
                    ? 'bg-emerald-500 text-black border-white'
                    : 'bg-emerald-600 text-white border-emerald-400'
                }`}
              >
                <Volume2 className="w-4 h-4" />
                <span>Speaking Text...</span>
              </div>
            )}
          </div>
        </div>

        {/* Primary Action Row: Read Text Button, Visual Indicator, Stop Speaking (Requirements 3, 11, 12, 14) */}
        <div className="mt-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Primary "Read Text" Button */}
            <button
              id="read-text-button"
              type="button"
              onClick={onReadText}
              disabled={isReading || !isCameraRunning}
              className={`flex items-center justify-center gap-3 px-6 sm:px-8 py-4 rounded-2xl font-black text-lg sm:text-xl border-3 shadow-xl transition-all cursor-pointer focus:outline-none focus:ring-4 ${
                isReading
                  ? 'bg-neutral-800 text-neutral-400 border-neutral-700 cursor-not-allowed'
                  : !isCameraRunning
                  ? isHighContrast
                    ? 'bg-neutral-900 text-neutral-500 border-neutral-700 cursor-not-allowed'
                    : 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed'
                  : isHighContrast
                  ? 'bg-yellow-400 text-black border-white hover:bg-yellow-300 active:scale-95'
                  : 'bg-amber-500 text-neutral-950 border-amber-400 hover:bg-amber-400 active:scale-95'
              }`}
              aria-label="Read text from camera"
            >
              {isReading ? (
                <>
                  <RefreshCw className="w-7 h-7 animate-spin" />
                  <span>READING TEXT...</span>
                </>
              ) : (
                <>
                  <FileText className="w-7 h-7 stroke-[2.5]" />
                  <span>READ TEXT</span>
                </>
              )}
            </button>

            {/* Stop Speaking Button (Requirement 14) */}
            {isSpeaking && (
              <button
                id="text-reader-stop-speaking-button"
                type="button"
                onClick={onStopSpeaking}
                className={`flex items-center gap-2 px-5 py-4 rounded-2xl font-black text-base sm:text-lg border-3 transition-all cursor-pointer shadow-lg animate-bounce ${
                  isHighContrast
                    ? 'bg-red-600 text-white border-white hover:bg-red-500'
                    : 'bg-red-700 text-white border-red-500 hover:bg-red-600'
                }`}
                title="Silence text announcement immediately"
                aria-label="Stop speaking detected text"
              >
                <Square className="w-5 h-5 fill-current" />
                <span>STOP SPEAKING</span>
              </button>
            )}

            {/* Visual Indicator of Status (Requirement 12) */}
            <div
              id="ocr-status-indicator"
              role="status"
              aria-live="polite"
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 ${
                isReading
                  ? isHighContrast
                    ? 'bg-yellow-950 border-yellow-400 text-yellow-200'
                    : 'bg-amber-950/80 border-amber-500 text-amber-100'
                  : ocrResult?.status === 'success'
                  ? isHighContrast
                    ? 'bg-neutral-950 border-emerald-400 text-emerald-300'
                    : 'bg-emerald-950/70 border-emerald-500 text-emerald-200'
                  : ocrResult?.status === 'no-text'
                  ? isHighContrast
                    ? 'bg-neutral-950 border-neutral-700 text-neutral-300'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                  : isHighContrast
                  ? 'bg-neutral-950 border-neutral-800 text-neutral-400'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full ${
                  isReading
                    ? 'bg-yellow-400 animate-ping'
                    : ocrResult?.status === 'success'
                    ? 'bg-emerald-400'
                    : ocrResult?.status === 'unclear'
                    ? 'bg-yellow-500'
                    : 'bg-neutral-600'
                }`}
              />
              <div className="text-sm sm:text-base font-bold">
                {isReading ? (
                  <span className="font-extrabold flex items-center gap-2">
                    Reading text from camera view...
                  </span>
                ) : ocrResult ? (
                  ocrResult.status === 'success' ? (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 inline" />
                      Text identified successfully
                    </span>
                  ) : ocrResult.status === 'unclear' ? (
                    <span className="text-yellow-400">The text is unclear</span>
                  ) : (
                    <span>No readable text found</span>
                  )
                ) : !isCameraRunning ? (
                  <span>Camera is off. Start camera to read signs.</span>
                ) : (
                  <span>Ready. Point camera at any sign and tap &ldquo;Read Text&rdquo;.</span>
                )}
              </div>
            </div>
          </div>

          {/* Cooldown Status Badge (Requirement 13) */}
          {cooldownRemainingSec > 0 && (
            <div
              id="ocr-cooldown-badge"
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border self-start md:self-center ${
                isHighContrast
                  ? 'bg-neutral-900 border-yellow-400/80 text-yellow-300'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-300'
              }`}
            >
              <Clock className="w-4 h-4 text-yellow-400" />
              <span>Cooldown: {cooldownRemainingSec}s (prevents repeat reading)</span>
            </div>
          )}
        </div>

        {/* Detected Text Results Display Card (Requirements 6, 7, 8, 9, 10, 11) */}
        {ocrResult && (
          <div
            id="ocr-result-display-card"
            className={`mt-4 p-4 sm:p-5 rounded-2xl border-3 shadow-lg ${
              ocrResult.status === 'success'
                ? isHighContrast
                  ? 'bg-neutral-950 border-yellow-400 text-yellow-300'
                  : 'bg-neutral-800/90 border-amber-500/70 text-neutral-100'
                : ocrResult.status === 'unclear'
                ? isHighContrast
                  ? 'bg-neutral-950 border-yellow-500 text-yellow-300'
                  : 'bg-neutral-800/90 border-yellow-600/70 text-neutral-100'
                : isHighContrast
                ? 'bg-neutral-950 border-neutral-700 text-neutral-300'
                : 'bg-neutral-800/70 border-neutral-700 text-neutral-300'
            }`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-3 border-b border-inherit/30">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider border ${
                    ocrResult.status === 'success'
                      ? isHighContrast
                        ? 'bg-yellow-400 text-black border-white'
                        : 'bg-amber-500 text-neutral-950 border-amber-300'
                      : ocrResult.status === 'unclear'
                      ? 'bg-yellow-600 text-white border-yellow-400'
                      : 'bg-neutral-700 text-neutral-200 border-neutral-600'
                  }`}
                >
                  {ocrResult.status === 'success'
                    ? 'Text Detected'
                    : ocrResult.status === 'unclear'
                    ? 'Unclear Text'
                    : 'No Text Detected'}
                </span>
                <span className="text-xs font-semibold opacity-70">
                  {new Date(ocrResult.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              </div>

              {/* Hear Again button */}
              <button
                type="button"
                onClick={onReadText}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  isHighContrast
                    ? 'bg-neutral-900 border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black'
                    : 'bg-neutral-700 border-neutral-600 text-neutral-200 hover:bg-neutral-600'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Read Again</span>
              </button>
            </div>

            {/* Primary Spoken Text Display */}
            <div className="pt-3">
              <div className="text-xs uppercase font-extrabold opacity-75 mb-1">
                Assistant Spoke:
              </div>
              <div
                className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-snug ${
                  ocrResult.status === 'success'
                    ? isHighContrast
                      ? 'text-yellow-300'
                      : 'text-amber-400'
                    : ocrResult.status === 'unclear'
                    ? 'text-yellow-400'
                    : 'opacity-80'
                }`}
              >
                &ldquo;{ocrResult.spokenText}&rdquo;
              </div>
            </div>

            {/* Individual blocks breakdown if multiple text segments found (Requirement 7) */}
            {ocrResult.detectedBlocks.length > 1 && (
              <div className="mt-4 pt-3 border-t border-inherit/25">
                <div className="flex items-center gap-1.5 text-xs font-bold opacity-80 mb-2">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Prioritized Visible Text Blocks (Ranked by Prominence):</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ocrResult.detectedBlocks.map((blk, idx) => (
                    <div
                      key={idx}
                      className={`px-3 py-1.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-2 ${
                        idx === 0
                          ? isHighContrast
                            ? 'bg-yellow-400 text-black border-white'
                            : 'bg-amber-500 text-neutral-950 border-amber-300'
                          : isHighContrast
                          ? 'bg-neutral-900 border-yellow-400/60 text-yellow-300'
                          : 'bg-neutral-700/80 border-neutral-600 text-neutral-200'
                      }`}
                    >
                      <span>
                        #{idx + 1}: &ldquo;{blk.text}&rdquo;
                      </span>
                      {blk.confidence > 0 && (
                        <span className="text-[10px] opacity-80 font-mono">
                          {Math.round(blk.confidence)}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full raw detected text if available */}
            {ocrResult.fullRawText && ocrResult.fullRawText !== ocrResult.spokenText && (
              <div className="mt-3 pt-2 text-xs opacity-75 font-mono">
                <span className="font-bold">Raw OCR: </span>
                <span>{ocrResult.fullRawText.replace(/\n/g, ' • ')}</span>
              </div>
            )}
          </div>
        )}

        {/* Supported Text Types (Requirement 2) */}
        <div className="mt-4 pt-3 border-t border-inherit/30">
          <div className="text-xs sm:text-sm font-extrabold opacity-80 flex items-center gap-1.5 mb-2">
            <Eye className="w-4 h-4" />
            <span>Supported Text &amp; Sign Types (Supported by Vision OCR):</span>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
            {SUPPORTED_SIGN_CATEGORIES.map((cat) => (
              <span
                key={cat}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                  isHighContrast
                    ? 'bg-neutral-900 border-yellow-400/50 text-yellow-300'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                }`}
              >
                {cat}
              </span>
            ))}
          </div>
        </div>

        {/* Cautious Guidance Notice (Important Safety Requirement) */}
        <div className="mt-3 pt-2 border-t border-inherit/30 flex items-center gap-1.5 text-xs opacity-75 font-semibold">
          <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            Safety Notice: Text reading relies on optical character recognition from live camera frames. Text may be obscured by motion or lighting; always proceed carefully.
          </span>
        </div>
      </div>
    </section>
  );
};
