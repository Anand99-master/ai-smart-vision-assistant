import React from 'react';
import {
  Volume2,
  VolumeX,
  Volume1,
  Radio,
  Play,
  Info,
  Compass,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  OctagonX,
} from 'lucide-react';
import { VoiceState } from '../services/speechService';

interface VoiceControlPanelProps {
  isVoiceActive: boolean;
  onToggleVoice: () => void;
  volume: number;
  onVolumeChange: (volume: number) => void;
  voiceState: VoiceState;
  onTestVoice: () => void;
  onTestGuidanceVoice?: (text: string) => void;
  isHighContrast: boolean;
}

export const VoiceControlPanel: React.FC<VoiceControlPanelProps> = ({
  isVoiceActive,
  onToggleVoice,
  volume,
  onVolumeChange,
  voiceState,
  onTestVoice,
  onTestGuidanceVoice,
  isHighContrast,
}) => {
  const volumePercentage = Math.round(volume * 100);

  return (
    <section
      id="voice-warning-control-panel"
      aria-label="Voice Warning and Path Guidance System Controls"
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 mb-4"
    >
      <div
        className={`p-4 sm:p-5 rounded-2xl border-3 shadow-lg transition-colors ${
          isHighContrast
            ? 'bg-black border-yellow-400 text-yellow-300'
            : 'bg-neutral-900 border-neutral-800 text-neutral-100'
        }`}
      >
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5">
          {/* Section 1: Voice ON/OFF & Real-Time Status Indicator */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Primary Big Voice ON/OFF Toggle Button */}
            <button
              id="voice-toggle-main-button"
              type="button"
              onClick={onToggleVoice}
              className={`flex items-center gap-3 px-5 sm:px-6 py-3.5 rounded-xl font-black text-base sm:text-lg border-3 transition-all cursor-pointer shadow-md focus:outline-none focus:ring-4 ${
                isVoiceActive
                  ? isHighContrast
                    ? 'bg-yellow-400 text-black border-white hover:bg-yellow-300'
                    : 'bg-emerald-500 text-neutral-950 border-emerald-400 hover:bg-emerald-400'
                  : isHighContrast
                  ? 'bg-neutral-900 text-yellow-300 border-yellow-400 hover:bg-neutral-800'
                  : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
              }`}
              aria-label={isVoiceActive ? 'Voice warnings are ON. Click to mute.' : 'Voice warnings are OFF. Click to activate.'}
            >
              {isVoiceActive ? (
                <>
                  <Volume2 className="w-6 h-6 stroke-[2.5]" />
                  <span>VOICE GUIDANCE: ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-6 h-6 stroke-[2.5]" />
                  <span>VOICE GUIDANCE: MUTED</span>
                </>
              )}
            </button>

            {/* Clear Voice Status Indicator */}
            <div
              id="voice-status-indicator"
              role="status"
              aria-live="polite"
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border-2 ${
                !isVoiceActive
                  ? isHighContrast
                    ? 'bg-neutral-950 border-neutral-700 text-neutral-400'
                    : 'bg-neutral-800/60 border-neutral-700 text-neutral-400'
                  : voiceState.isSpeaking
                  ? isHighContrast
                    ? 'bg-yellow-950/80 border-yellow-300 text-yellow-200 animate-pulse'
                    : 'bg-emerald-950/60 border-emerald-400 text-emerald-300 animate-pulse'
                  : isHighContrast
                  ? 'bg-black border-yellow-400/80 text-yellow-300'
                  : 'bg-neutral-800/80 border-neutral-700 text-neutral-200'
              }`}
            >
              <div
                className={`w-3.5 h-3.5 rounded-full ${
                  !isVoiceActive
                    ? 'bg-neutral-600'
                    : voiceState.isSpeaking
                    ? 'bg-yellow-400 animate-ping'
                    : 'bg-emerald-400'
                }`}
              />
              <div className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                <span>
                  {!isVoiceActive
                    ? 'Voice Inactive'
                    : voiceState.isSpeaking
                    ? 'Speaking Voice Warning...'
                    : 'Voice Ready (Standby)'}
                </span>
                {voiceState.isSpeaking && (
                  <Radio className="w-4 h-4 animate-spin text-yellow-300" />
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Volume Control & Accessibility Presets */}
          <div
            id="volume-control-group"
            className="flex flex-col sm:flex-row items-start sm:items-center gap-3 lg:gap-5"
          >
            {/* Slider & Label */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label
                htmlFor="voice-volume-slider"
                className="text-sm sm:text-base font-bold flex items-center gap-1.5 whitespace-nowrap"
              >
                {volume === 0 ? (
                  <VolumeX className="w-5 h-5 text-red-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-5 h-5" />
                ) : (
                  <Volume2 className="w-5 h-5" />
                )}
                <span>Volume:</span>
                <span className="font-mono text-base font-black px-1.5 py-0.5 rounded bg-black/40 border border-inherit">
                  {volumePercentage}%
                </span>
              </label>

              <input
                id="voice-volume-slider"
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                aria-label="Voice Warning Volume Slider"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={volumePercentage}
                className="w-28 sm:w-36 h-3 accent-yellow-400 cursor-pointer rounded-lg bg-neutral-700"
              />
            </div>

            {/* Quick Test Voice Button */}
            <button
              id="test-voice-warning-button"
              type="button"
              onClick={onTestVoice}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold border-2 transition-all cursor-pointer ${
                isHighContrast
                  ? 'bg-black text-yellow-300 border-yellow-400 hover:bg-yellow-950/60'
                  : 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700'
              }`}
              title="Speak a sample warning to test audio output"
              aria-label="Test speech warning audio"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Test Audio</span>
            </button>
          </div>
        </div>

        {/* Section 3: Path Guidance Audition Shortcuts & Recent Voice Alert */}
        <div className="mt-3 pt-3 border-t border-inherit/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs sm:text-sm">
          {/* Quick Audition for Part 2 Path Guidance Commands */}
          {onTestGuidanceVoice && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold opacity-80 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5" />
                <span>Audition Voice:</span>
              </span>
              <button
                type="button"
                onClick={() => onTestGuidanceVoice('Path clear.')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs border transition-colors flex items-center gap-1 cursor-pointer ${
                  isHighContrast
                    ? 'bg-neutral-900 border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black'
                    : 'bg-emerald-950 border-emerald-500 text-emerald-300 hover:bg-emerald-900'
                }`}
              >
                <ArrowUp className="w-3 h-3" />
                <span>&ldquo;Path clear.&rdquo;</span>
              </button>
              <button
                type="button"
                onClick={() => onTestGuidanceVoice('Path blocked. Move left.')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs border transition-colors flex items-center gap-1 cursor-pointer ${
                  isHighContrast
                    ? 'bg-neutral-900 border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black'
                    : 'bg-blue-950 border-blue-500 text-blue-300 hover:bg-blue-900'
                }`}
              >
                <ArrowLeft className="w-3 h-3" />
                <span>&ldquo;Move left.&rdquo;</span>
              </button>
              <button
                type="button"
                onClick={() => onTestGuidanceVoice('Path blocked. Move right.')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs border transition-colors flex items-center gap-1 cursor-pointer ${
                  isHighContrast
                    ? 'bg-neutral-900 border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black'
                    : 'bg-blue-950 border-blue-500 text-blue-300 hover:bg-blue-900'
                }`}
              >
                <ArrowRight className="w-3 h-3" />
                <span>&ldquo;Move right.&rdquo;</span>
              </button>
              <button
                type="button"
                onClick={() => onTestGuidanceVoice('Path blocked. Stop.')}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs border transition-colors flex items-center gap-1 cursor-pointer ${
                  isHighContrast
                    ? 'bg-red-950 border-red-500 text-white hover:bg-red-900'
                    : 'bg-red-950 border-red-500 text-red-300 hover:bg-red-900'
                }`}
              >
                <OctagonX className="w-3 h-3" />
                <span>&ldquo;Stop.&rdquo;</span>
              </button>
            </div>
          )}

          {/* Last Spoken Status */}
          <div className="flex items-center gap-2 font-medium">
            <span className="font-bold opacity-75">Recent Voice Alert:</span>
            {voiceState.lastSpokenText ? (
              <span className="font-extrabold px-2 py-0.5 rounded bg-black/50 border border-inherit">
                &ldquo;{voiceState.lastSpokenText}&rdquo;
              </span>
            ) : (
              <span className="italic opacity-60">None yet. Waiting for object detection.</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
