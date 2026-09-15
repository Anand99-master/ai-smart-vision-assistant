import React, { useState, useEffect } from 'react';
import { SceneUnderstanding, generateEnvironmentSummary, generateImportantSummary } from '../services/environmentalIntelligenceEngine';
import { Info, Volume2, ShieldAlert } from 'lucide-react';

interface EnvironmentalIntelligencePanelProps {
  scene: SceneUnderstanding;
  isHighContrast: boolean;
  onAnnounce: (message: string) => void;
}

export const EnvironmentalIntelligencePanel: React.FC<EnvironmentalIntelligencePanelProps> = ({
  scene,
  isHighContrast,
  onAnnounce,
}) => {
  const [summary, setSummary] = useState<string>('Analyzing scene...');

  useEffect(() => {
    setSummary(generateEnvironmentSummary(scene));
  }, [scene]);

  const handleDescribeSurroundings = () => {
    const desc = generateEnvironmentSummary(scene);
    onAnnounce(desc);
  };

  const handleWhatsImportant = () => {
    const desc = generateImportantSummary(scene);
    onAnnounce(desc);
  };

  const panelBg = isHighContrast ? 'bg-black border-white/20' : 'bg-neutral-900 border-neutral-700';
  const headerText = isHighContrast ? 'text-white' : 'text-neutral-100';
  const bodyText = isHighContrast ? 'text-white' : 'text-neutral-300';
  const buttonBg = isHighContrast ? 'bg-white text-black hover:bg-neutral-200' : 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700';

  return (
    <div className={`p-4 mx-4 my-2 border-2 rounded-xl flex flex-col gap-3 ${panelBg}`}>
      <div className="flex items-center gap-2 mb-1">
        <Info className={headerText} size={20} />
        <h2 className={`text-lg font-black tracking-tight ${headerText}`}>Environmental Intelligence</h2>
      </div>
      
      <div className={`text-sm ${bodyText} py-2 px-3 border border-white/10 rounded-lg bg-white/5`}>
        {summary}
      </div>

      <div className="flex gap-2 mt-2">
        <button
          onClick={handleDescribeSurroundings}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-colors ${buttonBg}`}
        >
          <Volume2 size={18} />
          Describe Surroundings
        </button>
        <button
          onClick={handleWhatsImportant}
          className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-colors ${buttonBg}`}
        >
          <ShieldAlert size={18} />
          What's Important?
        </button>
      </div>
    </div>
  );
};
