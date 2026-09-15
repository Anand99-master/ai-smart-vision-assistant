/**
 * Real-Time Voice Warning System for AI Smart Vision Assistant.
 * Provides accessible, debounced, short auditory warnings for visually impaired users.
 * PART 9: Smart Alert Priority Engine
 */

import { SmartAlert, AlertCategory, AlertPriorityLevel } from '../types';

export type WarningPriority = 'normal' | 'high';

export interface VoiceState {
  isSpeaking: boolean;
  lastSpokenText: string;
  lastSpokenTime: number;
  currentAlert: SmartAlert | null;
  alertHistory: SmartAlert[];
  isQuietMode: boolean;
}

let isCurrentlySpeaking = false;
let currentVolume = 0.85;

// Smart Alert Priority Queue
let alertQueue: SmartAlert[] = [];
let currentAlert: SmartAlert | null = null;
let alertHistory: SmartAlert[] = [];
let isQuietMode = false;
let isInterrupting = false;

type VoiceStateListener = (state: VoiceState) => void;
const listeners: Set<VoiceStateListener> = new Set();

function notifyListeners(): void {
  const state: VoiceState = {
    isSpeaking: isCurrentlySpeaking,
    lastSpokenText: currentAlert?.text || (alertHistory.length > 0 ? alertHistory[0].text : ''),
    lastSpokenTime: currentAlert?.timestamp || (alertHistory.length > 0 ? alertHistory[0].timestamp : 0),
    currentAlert,
    alertHistory: [...alertHistory],
    isQuietMode
  };
  listeners.forEach((listener) => listener(state));
}

export function subscribeVoiceState(listener: VoiceStateListener): () => void {
  listeners.add(listener);
  notifyListeners();
  return () => {
    listeners.delete(listener);
  };
}

export function setVoiceVolume(volume: number): void {
  currentVolume = Math.max(0, Math.min(1, volume));
}

export function getVoiceVolume(): number {
  return currentVolume;
}

export function setQuietMode(enabled: boolean): void {
  isQuietMode = enabled;
  notifyListeners();
}

export function enqueueSmartAlert(alert: SmartAlert): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false;
  }

  // Quiet mode suppresses non-critical alerts (priority > 2)
  if (isQuietMode && alert.priorityLevel > 2) {
    return false; // Dropped
  }

  alertQueue.push(alert);
  // Sort queue by priority: lowest number = highest priority
  alertQueue.sort((a, b) => a.priorityLevel - b.priorityLevel);

  processQueue();
  return true;
}

function processQueue() {
  if (alertQueue.length === 0) return;

  const nextAlert = alertQueue[0];

  if (isCurrentlySpeaking && currentAlert) {
    // Check for interruption
    if (nextAlert.priorityLevel < currentAlert.priorityLevel) {
      isInterrupting = true;
      window.speechSynthesis.cancel(); // This will trigger onend/onerror which calls processQueue again
      return;
    } else {
      // Current speech is higher or equal priority, wait for it to finish.
      return;
    }
  }

  // Ready to speak
  isInterrupting = false;
  currentAlert = alertQueue.shift() || null;
  if (!currentAlert) return;

  // Add to history (keep last 10)
  alertHistory = [currentAlert, ...alertHistory].slice(0, 10);

  const utterance = new SpeechSynthesisUtterance(currentAlert.text);
  utterance.volume = currentVolume;
  utterance.rate = 1.15;
  utterance.pitch = currentAlert.priorityLevel === 1 ? 1.1 : 1.0;

  const voices = window.speechSynthesis.getVoices();
  const selectedVoice = voices.find(
    (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.default)
  ) || voices.find((v) => v.lang.startsWith('en'));

  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  utterance.onstart = () => {
    isCurrentlySpeaking = true;
    notifyListeners();
  };

  utterance.onend = () => {
    if (!isInterrupting) {
      currentAlert = null;
    }
    isCurrentlySpeaking = false;
    notifyListeners();
    // Use timeout to let speech engine breathe briefly
    setTimeout(processQueue, 50);
  };

  utterance.onerror = () => {
    if (!isInterrupting) {
      currentAlert = null;
    }
    isCurrentlySpeaking = false;
    notifyListeners();
    setTimeout(processQueue, 50);
  };

  window.speechSynthesis.speak(utterance);
}

/**
 * Backwards compatibility for existing UI components calling speakVoiceWarning
 */
export function speakVoiceWarning(
  warningText: string,
  priority: WarningPriority = 'normal',
  volume = currentVolume
): boolean {
  if (volume !== currentVolume) setVoiceVolume(volume);
  
  const priorityLevel: AlertPriorityLevel = priority === 'high' ? 1 : 3;
  const category: AlertCategory = priority === 'high' ? 'CRITICAL' : 'NORMAL';
  
  return enqueueSmartAlert({
    id: `legacy-${Date.now()}`,
    text: warningText,
    priorityLevel,
    category,
    timestamp: Date.now()
  });
}

/**
 * Speaks a direct answer from the Voice AI Assistant.
 * priorityLevel 2 ensures it interrupts general info but yields to critical obstacles.
 */
export function speakAssistantResponse(
  responseText: string,
  volume = currentVolume
): boolean {
  if (volume !== currentVolume) setVoiceVolume(volume);
  
  return enqueueSmartAlert({
    id: `assistant-${Date.now()}`,
    text: responseText,
    priorityLevel: 2,
    category: 'HIGH',
    timestamp: Date.now()
  });
}

export function stopSpeaking(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    alertQueue = []; // Clear queue when manually stopped
    currentAlert = null;
    window.speechSynthesis.cancel();
    isCurrentlySpeaking = false;
    notifyListeners();
  }
}

export function resetVoiceHistory(): void {
  alertQueue = [];
  currentAlert = null;
  alertHistory = [];
  isCurrentlySpeaking = false;
  notifyListeners();
}
