/**
 * Web Speech API Recognition Service for Voice AI Assistant.
 * Provides hands-free voice input, debouncing, and state synchronization.
 */

import { ListeningStatus } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type SpeechRecognitionType = any;

let recognitionInstance: SpeechRecognitionType | null = null;
let currentStatus: ListeningStatus = 'idle';
let statusListener: ((status: ListeningStatus) => void) | null = null;

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition
  );
}

export function subscribeListeningStatus(listener: (status: ListeningStatus) => void): () => void {
  statusListener = listener;
  listener(currentStatus);
  return () => {
    if (statusListener === listener) {
      statusListener = null;
    }
  };
}

function updateStatus(status: ListeningStatus): void {
  currentStatus = status;
  if (statusListener) {
    statusListener(status);
  }
}

export function getListeningStatus(): ListeningStatus {
  return currentStatus;
}

export function startSpeechRecognition(
  onTranscript: (text: string) => void,
  onError: (errorMessage: string) => void
): boolean {
  if (typeof window === 'undefined') return false;

  const SpeechRecognition =
    (window as any).SpeechRecognition ||
    (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    onError('Speech recognition is not supported by your browser. Use the quick voice query buttons below.');
    updateStatus('error');
    return false;
  }

  // Prevent accidental repeated listening if already active
  if (currentStatus === 'listening' && recognitionInstance) {
    stopSpeechRecognition();
    return false;
  }

  try {
    if (recognitionInstance) {
      try {
        recognitionInstance.abort();
      } catch {
        // ignore abort error
      }
      recognitionInstance = null;
    }

    const recognition = new SpeechRecognition();
    recognitionInstance = recognition;

    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      updateStatus('listening');
    };

    recognition.onresult = (event: any) => {
      updateStatus('processing');
      if (event.results && event.results.length > 0 && event.results[0].length > 0) {
        const transcript = event.results[0][0].transcript;
        if (transcript && transcript.trim()) {
          onTranscript(transcript.trim());
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error event:', event.error);
      let errorMsg = 'Could not capture voice input. Please try again.';
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        errorMsg = 'Microphone permission denied. Please allow microphone access or use the quick query buttons.';
      } else if (event.error === 'no-speech') {
        errorMsg = 'No speech was detected. Please tap listen and speak clearly.';
      } else if (event.error === 'network') {
        errorMsg = 'Speech service network interruption. Try again or use query buttons.';
      }
      updateStatus('error');
      onError(errorMsg);
    };

    recognition.onend = () => {
      if (currentStatus === 'listening') {
        updateStatus('idle');
      }
      recognitionInstance = null;
    };

    recognition.start();
    return true;
  } catch (err) {
    console.error('Failed to start speech recognition:', err);
    updateStatus('error');
    onError('Unable to start microphone listener. Please try again.');
    return false;
  }
}

export function stopSpeechRecognition(): void {
  if (recognitionInstance) {
    try {
      recognitionInstance.abort();
    } catch {
      // ignore
    }
    recognitionInstance = null;
  }
  updateStatus('idle');
}
