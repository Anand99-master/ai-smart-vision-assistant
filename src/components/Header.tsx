import React from 'react';
import { Eye, Volume2, VolumeX, SunMedium, Moon, Sparkles } from 'lucide-react';

interface HeaderProps {
  isVoiceActive: boolean;
  onToggleVoice: () => void;
  isHighContrast: boolean;
  onToggleHighContrast: () => void;
  isModelReady: boolean;
  isSpeaking?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  isVoiceActive,
  onToggleVoice,
  isHighContrast,
  onToggleHighContrast,
  isModelReady,
  isSpeaking = false,
}) => {
  return (
    <header
      id="app-header"
      className={`border-b transition-colors ${
        isHighContrast
          ? 'bg-black border-yellow-400 text-yellow-300'
          : 'bg-neutral-900 border-neutral-800 text-neutral-100'
      } px-4 sm:px-6 py-4`}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Title & Concept */}
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl border-2 ${
              isHighContrast
                ? 'bg-yellow-400 text-black border-yellow-300'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
            aria-hidden="true"
          >
            <Eye className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2">
              AI Smart Vision Assistant
            </h1>
            <p
              className={`text-sm sm:text-base font-medium ${
                isHighContrast ? 'text-yellow-200' : 'text-neutral-400'
              }`}
            >
              Smart-Glasses Vision Prototype for Visually Impaired Users
            </p>
          </div>
        </div>

        {/* Quick Accessibility & Status Badges */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-start sm:justify-end">
          {/* AI Model Status */}
          <div
            id="model-status-badge"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold border ${
              isModelReady
                ? isHighContrast
                  ? 'bg-yellow-950/60 border-yellow-400 text-yellow-300'
                  : 'bg-emerald-950/40 border-emerald-600/40 text-emerald-300'
                : isHighContrast
                ? 'bg-black border-yellow-400 text-yellow-400 animate-pulse'
                : 'bg-neutral-800 border-neutral-700 text-amber-300 animate-pulse'
            }`}
            role="status"
            aria-live="polite"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isModelReady ? 'AI Vision Engine Active' : 'Loading AI Model...'}</span>
          </div>

          {/* Voice Narration Toggle (Text-to-Speech Ready) */}
          <button
            id="toggle-voice-narration-button"
            type="button"
            onClick={onToggleVoice}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-bold border-2 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isVoiceActive
                ? isSpeaking
                  ? isHighContrast
                    ? 'bg-yellow-400 text-black border-white animate-pulse'
                    : 'bg-emerald-400 text-black border-white animate-pulse'
                  : isHighContrast
                  ? 'bg-yellow-400 text-black border-yellow-400'
                  : 'bg-cyan-500 text-neutral-950 border-cyan-400'
                : isHighContrast
                ? 'bg-black text-yellow-300 border-yellow-400 hover:bg-yellow-950/50'
                : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
            }`}
            aria-label={isVoiceActive ? 'Voice announcements enabled' : 'Voice announcements muted'}
            title="Toggle voice warnings (Keyboard shortcut: V)"
          >
            {isVoiceActive ? (
              <>
                <Volume2 className={`w-5 h-5 ${isSpeaking ? 'animate-bounce' : ''}`} />
                <span>{isSpeaking ? 'Speaking...' : 'Voice: ON'}</span>
              </>
            ) : (
              <>
                <VolumeX className="w-5 h-5" />
                <span>Voice: OFF</span>
              </>
            )}
          </button>

          {/* High Contrast Mode Toggle */}
          <button
            id="toggle-contrast-mode-button"
            type="button"
            onClick={onToggleHighContrast}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-bold border-2 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isHighContrast
                ? 'bg-yellow-400 text-black border-yellow-400'
                : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
            }`}
            aria-label={isHighContrast ? 'Disable high contrast mode' : 'Enable high contrast mode'}
            title="Switch between dark mode and ultra high-contrast yellow/black"
          >
            {isHighContrast ? <SunMedium className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span>{isHighContrast ? 'Ultra Contrast' : 'High Contrast'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
