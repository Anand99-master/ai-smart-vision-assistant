import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Square,
  Sparkles,
  Volume2,
  VolumeX,
  MessageSquare,
  HelpCircle,
  AlertCircle,
  Radio,
  Send,
} from 'lucide-react';
import { ListeningStatus, VoiceAssistantInteraction } from '../types';

interface VoiceAssistantPanelProps {
  listeningStatus: ListeningStatus;
  onToggleListen: () => void;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
  lastInteraction: VoiceAssistantInteraction | null;
  onAskQuestion: (question: string, source?: 'voice' | 'quick-query' | 'text') => void;
  isHighContrast: boolean;
  isCameraRunning: boolean;
  micErrorMessage?: string | null;
}

const COMMON_VOICE_QUERIES = [
  'What is in front of me?',
  'What is on my left?',
  'What is on my right?',
  'Is there a person nearby?',
  'What objects are around me?',
  'Is the path blocked?',
  'What does the sign say?',
  'Read the text',
  'Take me to the pharmacy',
  'Where is the nearest hospital?',
  'Navigate to the market',
  'What is my next turn?',
];

export const VoiceAssistantPanel: React.FC<VoiceAssistantPanelProps> = ({
  listeningStatus,
  onToggleListen,
  isSpeaking,
  onStopSpeaking,
  lastInteraction,
  onAskQuestion,
  isHighContrast,
  isCameraRunning,
  micErrorMessage,
}) => {
  const [typedQuestion, setTypedQuestion] = useState('');
  const isListening = listeningStatus === 'listening';
  const isProcessing = listeningStatus === 'processing';

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedQuestion.trim()) {
      onAskQuestion(typedQuestion.trim(), 'text');
      setTypedQuestion('');
    }
  };

  return (
    <section
      id="voice-ai-assistant-section"
      aria-label="Hands-free Voice AI Assistant"
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
                  : 'bg-cyan-500 text-neutral-950 border-cyan-400'
              }`}
            >
              <Sparkles className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Voice AI Assistant
                </h2>
                <span
                  className={`text-xs uppercase font-extrabold px-2 py-0.5 rounded-full border ${
                    isHighContrast
                      ? 'bg-neutral-900 border-yellow-400 text-yellow-300'
                      : 'bg-cyan-950 border-cyan-500 text-cyan-300'
                  }`}
                >
                  Hands-Free Voice Context
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium opacity-80 mt-0.5">
                Ask about what lies ahead, obstacles, or people in the camera field of view.
              </p>
            </div>
          </div>

          {/* Quick status badge */}
          <div className="flex items-center gap-2 self-start sm:self-center">
            {isSpeaking && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-black border animate-pulse ${
                  isHighContrast
                    ? 'bg-yellow-400 text-black border-white'
                    : 'bg-cyan-500 text-neutral-950 border-cyan-300'
                }`}
              >
                <Volume2 className="w-4 h-4" />
                <span>Speaking Answer...</span>
              </div>
            )}

            {isListening && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs sm:text-sm font-black border animate-pulse ${
                  isHighContrast
                    ? 'bg-red-600 text-white border-white'
                    : 'bg-red-500 text-white border-red-300'
                }`}
              >
                <Radio className="w-4 h-4 animate-spin" />
                <span>Listening Now</span>
              </div>
            )}
          </div>
        </div>

        {/* Primary Interactive Bar: Microphone Button, Listening Indicator, Stop Speaking (Requirement 1, 11) */}
        <div className="mt-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Primary Microphone / Listen Button */}
            <button
              id="voice-assistant-mic-button"
              type="button"
              onClick={onToggleListen}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl font-black text-lg sm:text-xl border-3 shadow-xl transition-all cursor-pointer focus:outline-none focus:ring-4 ${
                isListening
                  ? isHighContrast
                    ? 'bg-red-600 text-white border-white animate-pulse'
                    : 'bg-red-600 text-white border-red-400 animate-pulse'
                  : isHighContrast
                  ? 'bg-yellow-400 text-black border-white hover:bg-yellow-300 active:scale-95'
                  : 'bg-cyan-500 text-neutral-950 border-cyan-400 hover:bg-cyan-400 active:scale-95'
              }`}
              aria-label={isListening ? 'Listening in progress. Tap to cancel.' : 'Ask a question with your voice. Tap to speak.'}
            >
              {isListening ? (
                <>
                  <MicOff className="w-7 h-7 stroke-[2.5]" />
                  <span>LISTENING... (TAP TO STOP)</span>
                </>
              ) : (
                <>
                  <Mic className="w-7 h-7 stroke-[2.5]" />
                  <span>ASK WITH VOICE (MIC)</span>
                </>
              )}
            </button>

            {/* Stop Speaking Button (Requirement 11) */}
            {isSpeaking && (
              <button
                id="voice-assistant-stop-speaking-button"
                type="button"
                onClick={onStopSpeaking}
                className={`flex items-center gap-2 px-5 py-4 rounded-2xl font-black text-base sm:text-lg border-3 transition-all cursor-pointer shadow-lg animate-bounce ${
                  isHighContrast
                    ? 'bg-red-600 text-white border-white hover:bg-red-500'
                    : 'bg-red-700 text-white border-red-500 hover:bg-red-600'
                }`}
                title="Silence active spoken response immediately"
                aria-label="Stop speaking current response"
              >
                <Square className="w-5 h-5 fill-current" />
                <span>STOP SPEAKING</span>
              </button>
            )}

            {/* Clear Listening Indicator (Requirement 1) */}
            <div
              id="voice-listening-indicator-box"
              role="status"
              aria-live="polite"
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl border-2 ${
                isListening
                  ? isHighContrast
                    ? 'bg-red-950 border-red-500 text-red-200'
                    : 'bg-red-950/80 border-red-500 text-red-100'
                  : isProcessing
                  ? isHighContrast
                    ? 'bg-neutral-900 border-yellow-400 text-yellow-300'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-200'
                  : isHighContrast
                  ? 'bg-neutral-950 border-neutral-800 text-neutral-400'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-400'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full ${
                  isListening
                    ? 'bg-red-500 animate-ping'
                    : isProcessing
                    ? 'bg-yellow-400 animate-pulse'
                    : 'bg-neutral-600'
                }`}
              />
              <div className="text-sm sm:text-base font-bold">
                {isListening ? (
                  <span className="text-red-400 font-extrabold flex items-center gap-2">
                    Listening for question... Speak now
                    <span className="flex gap-0.5">
                      <span className="w-1 h-3 bg-red-400 animate-bounce inline-block" />
                      <span className="w-1 h-4 bg-red-400 animate-bounce delay-100 inline-block" />
                      <span className="w-1 h-2 bg-red-400 animate-bounce delay-200 inline-block" />
                    </span>
                  </span>
                ) : isProcessing ? (
                  <span>Analyzing camera context...</span>
                ) : (
                  <span>Microphone ready. Press button or tap a question below.</span>
                )}
              </div>
            </div>
          </div>

          {/* Camera status hint */}
          {!isCameraRunning && (
            <div
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border ${
                isHighContrast
                  ? 'bg-neutral-950 border-yellow-400/70 text-yellow-300'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-300'
              }`}
            >
              <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              <span>Camera is off. Start camera for live scene answers.</span>
            </div>
          )}
        </div>

        {/* Error message notice if microphone access is blocked */}
        {micErrorMessage && (
          <div
            id="mic-error-banner"
            role="alert"
            className="mt-3 p-3 rounded-xl border-2 border-red-500 bg-red-950/80 text-red-200 text-xs sm:text-sm font-bold flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-400" />
            <span>{micErrorMessage}</span>
          </div>
        )}

        {/* Transcribed User Question & Short AI Response Display (Requirement 11) */}
        {lastInteraction && (
          <div
            id="voice-qa-history-display"
            className={`mt-4 p-4 rounded-xl border-2 ${
              isHighContrast
                ? 'bg-neutral-950 border-yellow-400/80 text-yellow-300'
                : 'bg-neutral-800/80 border-neutral-700 text-neutral-100'
            }`}
          >
            {/* User Question */}
            <div className="flex items-start gap-3 pb-3 border-b border-inherit/30">
              <div
                className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase flex-shrink-0 border ${
                  isHighContrast
                    ? 'bg-yellow-400 text-black border-white'
                    : 'bg-neutral-700 text-neutral-200 border-neutral-600'
                }`}
              >
                You Asked:
              </div>
              <div className="text-lg sm:text-xl font-black tracking-wide">
                &ldquo;{lastInteraction.question}&rdquo;
              </div>
            </div>

            {/* AI Assistant Answer */}
            <div className="flex items-start gap-3 pt-3">
              <div
                className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase flex-shrink-0 border ${
                  isHighContrast
                    ? 'bg-black text-yellow-300 border-yellow-400'
                    : 'bg-cyan-500 text-neutral-950 border-cyan-400'
                }`}
              >
                Assistant:
              </div>
              <div className="flex-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <div className="text-xl sm:text-2xl font-black text-emerald-400 dark:text-emerald-300">
                  &ldquo;{lastInteraction.response}&rdquo;
                </div>
                <button
                  type="button"
                  onClick={() => onAskQuestion(lastInteraction.question, 'quick-query')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    isHighContrast
                      ? 'bg-neutral-900 border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black'
                      : 'bg-neutral-700 border-neutral-600 text-neutral-200 hover:bg-neutral-600'
                  }`}
                  title="Re-ask and hear this answer again"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  <span>Hear Again</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Supported Questions Quick Chips (Requirement 5) */}
        <div className="mt-4 pt-3 border-t border-inherit/40">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="text-xs sm:text-sm font-extrabold opacity-80 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              <span>Supported Voice Questions (Click or Speak Aloud):</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {COMMON_VOICE_QUERIES.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => onAskQuestion(q, 'quick-query')}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs sm:text-sm border-2 transition-all cursor-pointer shadow-sm ${
                  isHighContrast
                    ? 'bg-black text-yellow-300 border-yellow-400 hover:bg-yellow-400 hover:text-black focus:ring-2 focus:ring-yellow-300'
                    : 'bg-neutral-800 text-neutral-200 border-neutral-700 hover:bg-neutral-700 hover:border-neutral-500 focus:ring-2 focus:ring-cyan-400'
                }`}
                title={`Ask: "${q}"`}
              >
                &ldquo;{q}&rdquo;
              </button>
            ))}
          </div>
        </div>

        {/* Optional Typed Question Field for testing or accessibility */}
        <form onSubmit={handleCustomSubmit} className="mt-3 flex items-center gap-2">
          <input
            type="text"
            value={typedQuestion}
            onChange={(e) => setTypedQuestion(e.target.value)}
            placeholder="Type any scene question (e.g. 'What is in front of me?')..."
            aria-label="Type a question for the vision assistant"
            className={`flex-1 px-3.5 py-2 rounded-xl text-sm font-medium border-2 focus:outline-none ${
              isHighContrast
                ? 'bg-neutral-950 border-yellow-400 text-yellow-300 placeholder-yellow-400/50 focus:border-white'
                : 'bg-neutral-800 border-neutral-700 text-neutral-100 placeholder-neutral-400 focus:border-cyan-400'
            }`}
          />
          <button
            type="submit"
            disabled={!typedQuestion.trim()}
            className={`px-4 py-2 rounded-xl text-sm font-bold border-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              isHighContrast
                ? 'bg-yellow-400 text-black border-white hover:bg-yellow-300 disabled:opacity-40'
                : 'bg-cyan-500 text-neutral-950 border-cyan-400 hover:bg-cyan-400 disabled:opacity-40'
            }`}
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Safety Disclaimer (Mandatory Safety Requirement) */}
        <div className="mt-3 pt-2 border-t border-inherit/30 flex items-center gap-1.5 text-xs opacity-75 font-semibold">
          <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            Safety Notice: Spoken answers describe detected camera objects and relative positions. Never assumed to be a guarantee of physical path clearance.
          </span>
        </div>
      </div>
    </section>
  );
};
