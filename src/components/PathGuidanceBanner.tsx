import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  OctagonX,
  AlertTriangle,
  Compass,
  ShieldCheck,
  ShieldAlert,
  HelpCircle,
} from 'lucide-react';
import { PathGuidanceResult } from '../types';

interface PathGuidanceBannerProps {
  guidance: PathGuidanceResult | null;
  isCameraRunning: boolean;
  isHighContrast: boolean;
}

export const PathGuidanceBanner: React.FC<PathGuidanceBannerProps> = ({
  guidance,
  isCameraRunning,
  isHighContrast,
}) => {
  if (!isCameraRunning || !guidance) {
    return (
      <div
        id="path-guidance-inactive-banner"
        className={`w-full max-w-7xl mx-auto px-4 sm:px-6 mb-4 ${
          isHighContrast ? 'text-yellow-400/70' : 'text-neutral-400'
        }`}
      >
        <div
          className={`p-3.5 rounded-xl border-2 text-center text-sm font-bold flex items-center justify-center gap-2 ${
            isHighContrast
              ? 'bg-neutral-950 border-neutral-800'
              : 'bg-neutral-900/60 border-neutral-800'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Path Guidance: Inactive (Start camera to enable real-time direction analysis)</span>
        </div>
      </div>
    );
  }

  const { status, recommendedZone, leftZone, centerZone, rightZone, reason } = guidance;

  // Determine styling based on status
  let statusTheme = {
    bg: 'bg-emerald-950/70',
    border: 'border-emerald-400',
    text: 'text-emerald-300',
    badgeBg: 'bg-emerald-500 text-neutral-950',
    icon: <ArrowUp className="w-8 h-8 sm:w-10 sm:h-10 stroke-[3]" />,
  };

  if (isHighContrast) {
    statusTheme = {
      bg: 'bg-black',
      border: 'border-yellow-400',
      text: 'text-yellow-300',
      badgeBg: 'bg-yellow-400 text-black',
      icon: <ArrowUp className="w-8 h-8 sm:w-10 sm:h-10 stroke-[3]" />,
    };
  }

  if (status === 'STOP') {
    statusTheme = {
      bg: isHighContrast ? 'bg-red-950' : 'bg-red-950/80',
      border: isHighContrast ? 'border-white' : 'border-red-500',
      text: 'text-white',
      badgeBg: 'bg-red-600 text-white',
      icon: <OctagonX className="w-8 h-8 sm:w-10 sm:h-10 stroke-[3] animate-pulse" />,
    };
  } else if (status === 'MOVE LEFT') {
    statusTheme = {
      bg: isHighContrast ? 'bg-black' : 'bg-blue-950/70',
      border: isHighContrast ? 'border-yellow-400' : 'border-blue-400',
      text: isHighContrast ? 'text-yellow-300' : 'text-blue-300',
      badgeBg: isHighContrast ? 'bg-yellow-400 text-black' : 'bg-blue-500 text-neutral-950',
      icon: <ArrowLeft className="w-8 h-8 sm:w-10 sm:h-10 stroke-[3] animate-bounce" />,
    };
  } else if (status === 'MOVE RIGHT') {
    statusTheme = {
      bg: isHighContrast ? 'bg-black' : 'bg-blue-950/70',
      border: isHighContrast ? 'border-yellow-400' : 'border-blue-400',
      text: isHighContrast ? 'text-yellow-300' : 'text-blue-300',
      badgeBg: isHighContrast ? 'bg-yellow-400 text-black' : 'bg-blue-500 text-neutral-950',
      icon: <ArrowRight className="w-8 h-8 sm:w-10 sm:h-10 stroke-[3] animate-bounce" />,
    };
  } else if (status === 'PROCEED CAREFULLY') {
    statusTheme = {
      bg: isHighContrast ? 'bg-black' : 'bg-amber-950/70',
      border: isHighContrast ? 'border-yellow-400' : 'border-amber-400',
      text: isHighContrast ? 'text-yellow-300' : 'text-amber-300',
      badgeBg: isHighContrast ? 'bg-yellow-400 text-black' : 'bg-amber-500 text-neutral-950',
      icon: <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 stroke-[3]" />,
    };
  }

  return (
    <section
      id="path-guidance-display-panel"
      role="region"
      aria-label="Intelligent Path Guidance Status"
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 mb-4"
    >
      <div
        className={`p-4 sm:p-5 rounded-2xl border-4 shadow-2xl transition-all ${statusTheme.bg} ${statusTheme.border} ${statusTheme.text}`}
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Main Primary Guidance Direction (Requirements 8, 9) */}
          <div className="flex items-center gap-4">
            <div
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border-2 ${
                isHighContrast
                  ? status === 'STOP'
                    ? 'bg-red-600 text-white border-white'
                    : 'bg-yellow-400 text-black border-white'
                  : statusTheme.badgeBg
              }`}
            >
              {statusTheme.icon}
            </div>

            <div>
              <div className="text-xs uppercase font-extrabold tracking-widest opacity-80 flex items-center gap-1.5 mb-0.5">
                <Compass className="w-4 h-4" />
                <span>Intelligent Path Guidance</span>
              </div>
              <div
                id="guidance-status-heading"
                className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight flex items-center gap-3"
              >
                <span>{status}</span>
              </div>
              <div className="text-sm sm:text-base font-medium opacity-90 mt-1">
                {reason}
              </div>
            </div>
          </div>

          {/* 3 Navigation Zones Quick Status Bar */}
          <div className="flex items-center gap-2 self-start md:self-center">
            {/* Left Zone Pill */}
            <div
              className={`px-3 py-2 rounded-xl text-center border-2 transition-all ${
                recommendedZone === 'Left'
                  ? isHighContrast
                    ? 'bg-yellow-400 text-black border-white ring-2 ring-yellow-300'
                    : 'bg-emerald-500 text-neutral-950 border-white ring-2 ring-emerald-400'
                  : leftZone.isObstructed
                  ? 'bg-red-950/60 border-red-500 text-red-300'
                  : isHighContrast
                  ? 'bg-neutral-900 border-yellow-400/60 text-yellow-200'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-300'
              }`}
            >
              <div className="text-xs font-black uppercase">Left Zone</div>
              <div className="text-xs font-bold">
                {leftZone.isObstructed ? 'Blocked' : 'Clear'}
              </div>
            </div>

            {/* Center Zone Pill */}
            <div
              className={`px-3 py-2 rounded-xl text-center border-2 transition-all ${
                recommendedZone === 'Center' && status === 'PATH CLEAR'
                  ? isHighContrast
                    ? 'bg-yellow-400 text-black border-white ring-2 ring-yellow-300'
                    : 'bg-emerald-500 text-neutral-950 border-white ring-2 ring-emerald-400'
                  : centerZone.isObstructed
                  ? 'bg-red-950/60 border-red-500 text-red-300'
                  : isHighContrast
                  ? 'bg-neutral-900 border-yellow-400/60 text-yellow-200'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-300'
              }`}
            >
              <div className="text-xs font-black uppercase">Center Zone</div>
              <div className="text-xs font-bold">
                {centerZone.isObstructed ? 'Blocked' : 'Clear'}
              </div>
            </div>

            {/* Right Zone Pill */}
            <div
              className={`px-3 py-2 rounded-xl text-center border-2 transition-all ${
                recommendedZone === 'Right'
                  ? isHighContrast
                    ? 'bg-yellow-400 text-black border-white ring-2 ring-yellow-300'
                    : 'bg-emerald-500 text-neutral-950 border-white ring-2 ring-emerald-400'
                  : rightZone.isObstructed
                  ? 'bg-red-950/60 border-red-500 text-red-300'
                  : isHighContrast
                  ? 'bg-neutral-900 border-yellow-400/60 text-yellow-200'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-300'
              }`}
            >
              <div className="text-xs font-black uppercase">Right Zone</div>
              <div className="text-xs font-bold">
                {rightZone.isObstructed ? 'Blocked' : 'Clear'}
              </div>
            </div>
          </div>
        </div>

        {/* Prototype Safety Notice (Requirement 11) */}
        <div className="mt-3 pt-3 border-t border-inherit/30 flex items-center justify-between gap-3 text-xs opacity-75 font-semibold">
          <div className="flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              Computer-vision guidance prototype estimating relative unobstructed camera field of view.
              Not a guarantee of physical path clearance. Always use primary mobility aids.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
