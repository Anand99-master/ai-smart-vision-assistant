import React, { useEffect, useState } from 'react';
import { subscribeVoiceState, setQuietMode, VoiceState } from '../services/speechService';
import { ShieldAlert, BellRing, BellOff, History } from 'lucide-react';
import { AlertCategory, SmartAlert } from '../types';

interface SmartAlertPanelProps {
  isHighContrast: boolean;
}

const categoryColors: Record<AlertCategory, string> = {
  CRITICAL: 'bg-red-600 text-white',
  HIGH: 'bg-orange-500 text-white',
  NORMAL: 'bg-blue-600 text-white',
  INFORMATION: 'bg-neutral-600 text-white',
};

export const SmartAlertPanel: React.FC<SmartAlertPanelProps> = ({ isHighContrast }) => {
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isSpeaking: false,
    lastSpokenText: '',
    lastSpokenTime: 0,
    currentAlert: null,
    alertHistory: [],
    isQuietMode: false,
  });

  useEffect(() => {
    const unsubscribe = subscribeVoiceState((state) => {
      setVoiceState(state);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleQuietMode = () => {
    setQuietMode(!voiceState.isQuietMode);
  };

  const bgPanel = isHighContrast ? 'bg-black border-4 border-yellow-500' : 'bg-neutral-900 border border-neutral-800';
  const textPrimary = isHighContrast ? 'text-white' : 'text-neutral-100';

  return (
    <div className={`p-4 mx-4 my-2 rounded-xl flex flex-col gap-4 transition-colors ${bgPanel}`}>
      <div className="flex justify-between items-center mb-2">
        <h3 className={`font-black uppercase tracking-wider flex items-center gap-2 ${textPrimary}`}>
          <ShieldAlert size={20} className="text-yellow-500" />
          Smart Alert Priority Engine
        </h3>
        <button
          onClick={handleToggleQuietMode}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm transition-colors ${
            voiceState.isQuietMode 
              ? 'bg-blue-600 text-white hover:bg-blue-500' 
              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
          } ${isHighContrast ? 'border-2 border-white' : ''}`}
        >
          {voiceState.isQuietMode ? <BellOff size={16} /> : <BellRing size={16} />}
          Quiet Mode {voiceState.isQuietMode ? 'ON' : 'OFF'}
        </button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="text-xs uppercase font-bold text-neutral-400">Current / Latest Alert</div>
        <div className={`min-h-[60px] p-3 rounded-lg flex flex-col justify-center border-l-4 ${
            voiceState.currentAlert 
              ? categoryColors[voiceState.currentAlert.category] 
              : voiceState.alertHistory.length > 0 
                ? categoryColors[voiceState.alertHistory[0].category]
                : 'bg-neutral-800 text-neutral-400 border-neutral-600'
          }`}>
          {voiceState.currentAlert ? (
            <>
              <div className="text-xs font-black uppercase mb-1 opacity-80 flex justify-between">
                <span>{voiceState.currentAlert.category}</span>
                <span>Priority {voiceState.currentAlert.priorityLevel}</span>
              </div>
              <div className="font-bold text-lg leading-tight">
                {voiceState.currentAlert.text}
              </div>
            </>
          ) : voiceState.alertHistory.length > 0 ? (
            <>
              <div className="text-xs font-black uppercase mb-1 opacity-80 flex justify-between">
                <span>{voiceState.alertHistory[0].category}</span>
                <span>Priority {voiceState.alertHistory[0].priorityLevel}</span>
              </div>
              <div className="font-bold text-lg leading-tight">
                {voiceState.alertHistory[0].text}
              </div>
            </>
          ) : (
            <div className="font-bold">Listening to environment...</div>
          )}
        </div>
      </div>

      {voiceState.alertHistory.length > 1 && (
        <div className="mt-2">
          <div className="text-xs uppercase font-bold text-neutral-400 mb-2 flex items-center gap-1.5">
            <History size={14} /> Alert History
          </div>
          <div className="flex flex-col gap-1.5 max-h-[120px] overflow-y-auto pr-2">
            {voiceState.alertHistory.slice(1, 4).map((alert: SmartAlert) => (
              <div key={alert.id} className="flex items-center gap-3 p-2 bg-neutral-800/50 rounded-lg text-sm border border-neutral-700/50">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black w-24 text-center shrink-0 ${categoryColors[alert.category]}`}>
                  {alert.category}
                </span>
                <span className={`truncate flex-1 ${textPrimary}`}>
                  {alert.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
