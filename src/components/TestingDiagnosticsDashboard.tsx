import React, { useState, useEffect } from 'react';
import { Activity, Camera, Mic, Volume2, Search, Navigation, UserCheck, ShieldAlert, FileText, Globe, Radio, Play, RefreshCw, XCircle } from 'lucide-react';
import { DiagnosticLogEntry, subscribeDiagnosticLogs, clearDiagnosticLogs, addDiagnosticLog } from '../services/diagnosticLogger';

interface TestingDiagnosticsDashboardProps {
  isHighContrast: boolean;
  isTestMode: boolean;
  onToggleTestMode: () => void;
  systemStatus: {
    camera: string;
    microphone: string;
    speaker: string;
    objectDetection: string;
    pathGuidance: string;
    textReader: string;
    navigation: string;
    trustedPerson: string;
    envIntelligence: string;
    smartAlert: string;
    sos: string;
  };
}

const statusColors: Record<string, string> = {
  'READY': 'text-green-500',
  'ACTIVE': 'text-blue-500',
  'LISTENING': 'text-blue-500',
  'SPEAKING': 'text-blue-500',
  'ARMED': 'text-red-500',
  'TEST MODE': 'text-yellow-500',
  'ERROR': 'text-red-500 font-bold animate-pulse',
  'NO PROFILES': 'text-yellow-500',
  'LOCATION UNAVAILABLE': 'text-yellow-500',
};

export const TestingDiagnosticsDashboard: React.FC<TestingDiagnosticsDashboardProps> = ({
  isHighContrast,
  isTestMode,
  onToggleTestMode,
  systemStatus,
}) => {
  const [logs, setLogs] = useState<DiagnosticLogEntry[]>([]);
  const [testResult, setTestResult] = useState<'IDLE' | 'PASS' | 'WARNING' | 'ERROR'>('IDLE');

  useEffect(() => {
    return subscribeDiagnosticLogs((newLogs) => setLogs([...newLogs]));
  }, []);

  const runSystemTest = async () => {
    setTestResult('IDLE');
    addDiagnosticLog('System Test Initiated', 'Diagnostics', 'Normal', 'Running checks...');
    
    let hasError = false;
    let hasWarning = false;

    // Check browser capabilities
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      addDiagnosticLog('Camera API', 'Diagnostics', 'Critical', 'Not Supported');
      hasError = true;
    } else {
      addDiagnosticLog('Camera API', 'Diagnostics', 'Normal', 'Supported');
    }

    if (!('speechSynthesis' in window)) {
      addDiagnosticLog('Speech Synthesis API', 'Diagnostics', 'Critical', 'Not Supported');
      hasError = true;
    } else {
      addDiagnosticLog('Speech Synthesis API', 'Diagnostics', 'Normal', 'Supported');
    }

    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      addDiagnosticLog('Speech Recognition API', 'Diagnostics', 'High', 'Not Supported');
      hasWarning = true;
    } else {
      addDiagnosticLog('Speech Recognition API', 'Diagnostics', 'Normal', 'Supported');
    }

    if (!navigator.geolocation) {
      addDiagnosticLog('Geolocation API', 'Diagnostics', 'High', 'Not Supported');
      hasWarning = true;
    } else {
      addDiagnosticLog('Geolocation API', 'Diagnostics', 'Normal', 'Supported');
    }

    // Evaluate current system status
    Object.entries(systemStatus).forEach(([module, status]) => {
      if (status === 'ERROR') hasError = true;
      if (status === 'LOCATION UNAVAILABLE' || status === 'NO PROFILES') hasWarning = true;
    });

    if (hasError) {
      setTestResult('ERROR');
      addDiagnosticLog('System Test Complete', 'Diagnostics', 'Critical', 'ERROR');
    } else if (hasWarning) {
      setTestResult('WARNING');
      addDiagnosticLog('System Test Complete', 'Diagnostics', 'High', 'WARNING');
    } else {
      setTestResult('PASS');
      addDiagnosticLog('System Test Complete', 'Diagnostics', 'Normal', 'PASS');
    }
  };

  const bgPanel = isHighContrast ? 'bg-black border-4 border-white' : 'bg-neutral-900 border border-neutral-800';
  const textPrimary = isHighContrast ? 'text-white' : 'text-neutral-100';
  
  const scenarios = [
    { title: 'Scenario 1: Person directly ahead', expected: '"Person ahead" or obstacle warning.' },
    { title: 'Scenario 2: Path blocked', expected: '"MOVE LEFT", "MOVE RIGHT", or "STOP".' },
    { title: 'Scenario 3: Read text', expected: 'Detected text is spoken.' },
    { title: 'Scenario 4: Trusted person', expected: 'Registered person is identified only if recognition confidence is sufficient.' },
    { title: 'Scenario 5: Navigation', expected: 'Current navigation instruction is displayed/spoken when real route data is available.' },
    { title: 'Scenario 6: Multiple events', expected: 'Smart Alert Priority Engine chooses the highest-priority alert.' },
    { title: 'Scenario 7: SOS', expected: 'Only simulated SOS is generated while TEST MODE is enabled.' },
  ];

  return (
    <div className={`p-4 mx-4 my-2 rounded-xl flex flex-col gap-6 transition-colors ${bgPanel}`}>
      <div className="flex flex-col gap-2">
        <h2 className={`text-2xl font-black uppercase tracking-wider flex items-center gap-2 ${textPrimary}`}>
          <Activity size={28} className="text-blue-500" />
          Testing & Diagnostics
        </h2>
        <p className="text-sm text-neutral-400">Systematic prototype testing dashboard. Never rely on this prototype for real emergency situations.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Left Column: Status Indicators & Actions */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <StatusIndicator label="Camera" status={systemStatus.camera} icon={<Camera size={16}/>} />
            <StatusIndicator label="Microphone" status={systemStatus.microphone} icon={<Mic size={16}/>} />
            <StatusIndicator label="Speaker / TTS" status={systemStatus.speaker} icon={<Volume2 size={16}/>} />
            <StatusIndicator label="Object Detection" status={systemStatus.objectDetection} icon={<Search size={16}/>} />
            <StatusIndicator label="Path Guidance" status={systemStatus.pathGuidance} icon={<Navigation size={16}/>} />
            <StatusIndicator label="Text Reader / OCR" status={systemStatus.textReader} icon={<FileText size={16}/>} />
            <StatusIndicator label="Navigation" status={systemStatus.navigation} icon={<Globe size={16}/>} />
            <StatusIndicator label="Trusted Person" status={systemStatus.trustedPerson} icon={<UserCheck size={16}/>} />
            <StatusIndicator label="Env. Intelligence" status={systemStatus.envIntelligence} icon={<Radio size={16}/>} />
            <StatusIndicator label="Smart Alert Engine" status={systemStatus.smartAlert} icon={<ShieldAlert size={16}/>} />
            <StatusIndicator label="SOS Prototype" status={isTestMode ? 'TEST MODE' : systemStatus.sos} icon={<Activity size={16}/>} />
          </div>

          <div className="flex gap-2 mt-2">
            <button
              onClick={runSystemTest}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold uppercase transition-colors flex items-center justify-center gap-2"
            >
              <Play size={18} /> Run System Test
            </button>
            <button
              onClick={onToggleTestMode}
              className={`flex-1 py-3 rounded-lg font-bold uppercase transition-colors flex items-center justify-center gap-2 border-2 ${
                isTestMode 
                  ? 'bg-yellow-500 text-black border-yellow-500 hover:bg-yellow-400' 
                  : 'bg-transparent text-neutral-400 border-neutral-700 hover:bg-neutral-800'
              }`}
            >
              <ShieldAlert size={18} /> {isTestMode ? 'Test Mode ON' : 'Test Mode OFF'}
            </button>
          </div>

          {testResult !== 'IDLE' && (
            <div className={`p-4 rounded-xl font-black text-xl text-center uppercase border-2 ${
              testResult === 'PASS' ? 'bg-green-900/30 text-green-500 border-green-700' :
              testResult === 'WARNING' ? 'bg-yellow-900/30 text-yellow-500 border-yellow-700' :
              'bg-red-900/30 text-red-500 border-red-700'
            }`}>
              Test Result: {testResult}
            </div>
          )}

          {isTestMode && (
            <div className="p-3 bg-yellow-900/40 border border-yellow-700 rounded-lg text-yellow-500 font-bold text-center text-sm">
              TEST MODE — NO REAL EMERGENCY ALERTS
            </div>
          )}
        </div>

        {/* Right Column: Logs & Scenarios */}
        <div className="flex-1 flex flex-col gap-4">
          <div className={`p-4 rounded-xl flex-1 flex flex-col ${isHighContrast ? 'bg-neutral-900' : 'bg-neutral-950'}`}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-neutral-300 uppercase text-sm">Diagnostic Log</h3>
              <button onClick={clearDiagnosticLogs} className="text-neutral-500 hover:text-neutral-300 flex items-center gap-1 text-xs uppercase font-bold">
                <RefreshCw size={12} /> Clear
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto max-h-[250px] flex flex-col gap-1 pr-2 custom-scrollbar">
              {logs.length === 0 ? (
                <div className="text-neutral-600 text-sm italic text-center mt-10">No diagnostic events recorded.</div>
              ) : (
                logs.map(log => (
                  <div key={log.id} className="grid grid-cols-[80px_1fr] gap-2 text-xs py-1.5 border-b border-neutral-800/50">
                    <div className="text-neutral-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                    </div>
                    <div>
                      <span className="font-bold text-blue-400">[{log.module}]</span>{' '}
                      <span className={textPrimary}>{log.event}</span>{' '}
                      <span className="text-neutral-500">— {log.result}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div className={`p-4 rounded-xl ${isHighContrast ? 'bg-neutral-900' : 'bg-neutral-950'}`}>
        <h3 className="font-bold text-neutral-300 uppercase text-sm mb-3">Demo Scenarios</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {scenarios.map((s, i) => (
            <div key={i} className="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700">
              <div className="font-bold text-blue-400 text-sm mb-1">{s.title}</div>
              <div className="text-neutral-300 text-xs italic">Expected: {s.expected}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const StatusIndicator = ({ label, status, icon }: { label: string, status: string, icon: React.ReactNode }) => (
  <div className="flex items-center justify-between p-2.5 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
    <span className="text-sm text-neutral-300 flex items-center gap-2">
      {icon}
      {label}
    </span>
    <span className={`text-xs font-black uppercase tracking-wider ${statusColors[status] || 'text-neutral-400'}`}>
      {status}
    </span>
  </div>
);
