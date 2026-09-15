import React from 'react';
import { DetectedItem } from '../types';
import { Layers, ArrowLeft, ArrowRight, Minus } from 'lucide-react';

interface DetectedObjectsListProps {
  detections: DetectedItem[];
  isHighContrast: boolean;
}

export const DetectedObjectsList: React.FC<DetectedObjectsListProps> = ({
  detections,
  isHighContrast,
}) => {
  if (detections.length === 0) {
    return null;
  }

  const getPositionIcon = (pos: string) => {
    switch (pos) {
      case 'Left':
        return <ArrowLeft className="w-4 h-4" />;
      case 'Right':
        return <ArrowRight className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  return (
    <section
      id="detected-objects-section"
      aria-label="List of detected items"
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 pb-6"
    >
      <div
        className={`p-4 sm:p-5 rounded-2xl border-3 shadow-lg transition-colors ${
          isHighContrast
            ? 'bg-black border-yellow-400 text-yellow-300'
            : 'bg-neutral-900 border-neutral-800 text-neutral-100'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-inherit">
          <div className="flex items-center gap-2 text-lg sm:text-xl font-black">
            <Layers className="w-6 h-6" />
            <span>Active Visual Detections ({detections.length})</span>
          </div>
          <div className="text-xs sm:text-sm font-semibold opacity-80">
            Sorted by visual priority
          </div>
        </div>

        {/* Responsive Grid of Detected Items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {detections.map((item) => {
            const isClose = item.proximity === 'Close';

            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border-2 flex items-center justify-between gap-3 ${
                  isHighContrast
                    ? isClose
                      ? 'bg-neutral-900 border-red-500 text-white'
                      : 'bg-neutral-950 border-yellow-400/80 text-yellow-300'
                    : isClose
                    ? 'bg-amber-950/40 border-amber-500/80 text-amber-200'
                    : 'bg-neutral-800/80 border-neutral-700 text-neutral-200'
                }`}
              >
                <div>
                  <div className="text-lg sm:text-xl font-black flex items-center gap-2">
                    <span>{item.label}</span>
                    {isClose && (
                      <span className="text-xs font-black uppercase px-2 py-0.5 rounded bg-red-600 text-white">
                        Near
                      </span>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm font-medium opacity-80 mt-0.5">
                    Confidence: <span className="font-bold">{item.confidence}%</span>
                  </div>
                </div>

                {/* Spatial Direction Badge */}
                <div
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-black border ${
                    isHighContrast
                      ? 'bg-yellow-400 text-black border-yellow-300'
                      : 'bg-neutral-700 text-white border-neutral-600'
                  }`}
                >
                  {getPositionIcon(item.position)}
                  <span>{item.position}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
