/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import type * as cocoSsd from '@tensorflow-models/coco-ssd';
import {
  DetectedItem,
  PathGuidanceResult,
  ListeningStatus,
  VoiceAssistantInteraction,
  OcrResult,
  OcrReadingStatus,
  GeoCoordinates,
  GeolocationStatus,
  NavigationRoute,
  NavigationSystemStatus,
  TrustedPersonProfile,
  RecognizedPerson,
  SpatialPosition,
  SosStatus,
} from './types';
import { loadVisionModel, detectObjectsInFrame } from './services/visionDetector';
import { readTextFromCamera } from './services/ocrService';
import {
  loadTrustedProfiles,
  saveTrustedProfiles,
  getIsRecognitionEnabled,
  setIsRecognitionEnabled,
  deleteAllTrustedProfiles,
  resetToSampleProfiles,
  extractFaceDescriptorFromVideo,
  matchFaceAgainstTrustedProfiles,
  formatPersonVoiceNotification,
} from './services/trustedPersonService';
import {
  VoiceState,
  speakVoiceWarning,
  speakAssistantResponse,
  stopSpeaking,
  setVoiceVolume,
  subscribeVoiceState,
  resetVoiceHistory,
  enqueueSmartAlert,
} from './services/speechService';
import { evaluateDetectionsForVoiceWarning } from './services/warningEngine';
import { evaluatePathGuidance } from './services/pathGuidanceEngine';
import {
  startSpeechRecognition,
  stopSpeechRecognition,
  subscribeListeningStatus,
} from './services/speechRecognitionService';
import { answerVoiceQuery } from './services/voiceAssistantEngine';
import { playCameraClickSound, playObstacleAlertSound } from './services/soundEffects';
import {
  getBrowserLocation,
  watchBrowserLocation,
  searchDestination,
  calculateWalkingRoute,
  extractDestinationFromSpeech,
  DEFAULT_PROTOTYPE_COORDS,
} from './services/navigationService';
import { Header } from './components/Header';
import { CameraView } from './components/CameraView';
import { PathGuidanceBanner } from './components/PathGuidanceBanner';
import { VoiceAssistantPanel } from './components/VoiceAssistantPanel';
import { TextReaderPanel } from './components/TextReaderPanel';
import { NavigationPanel } from './components/NavigationPanel';
import { TrustedPersonPanel } from './components/TrustedPersonPanel';
import { EnvironmentalIntelligencePanel } from './components/EnvironmentalIntelligencePanel';
import { EmergencySOSPanel } from './components/EmergencySOSPanel';
import { SmartAlertPanel } from './components/SmartAlertPanel';
import { TestingDiagnosticsDashboard } from './components/TestingDiagnosticsDashboard';
import { LiveStatusBar } from './components/LiveStatusBar';
import { DetectedObjectsList } from './components/DetectedObjectsList';
import { VoiceControlPanel } from './components/VoiceControlPanel';
import { createSampleVideoStream, stopSampleVideoStream } from './utils/sampleStream';
import { buildSceneUnderstanding, determineProactiveAnnouncement, SceneUnderstanding, clearCooldowns } from './services/environmentalIntelligenceEngine';

export default function App() {
  const [model, setModel] = useState<cocoSsd.ObjectDetection | null>(null);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isCameraRunning, setIsCameraRunning] = useState(false);
  const [isSampleFeed, setIsSampleFeed] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detections, setDetections] = useState<DetectedItem[]>([]);
  const [sceneUnderstanding, setSceneUnderstanding] = useState<SceneUnderstanding | null>(null);

  // Path Guidance State (Part 2)
  const [pathGuidance, setPathGuidance] = useState<PathGuidanceResult | null>(null);

  // Voice AI Assistant State (Part 3)
  const [listeningStatus, setListeningStatus] = useState<ListeningStatus>('idle');
  const [lastInteraction, setLastInteraction] = useState<VoiceAssistantInteraction | null>(null);
  const [micErrorMessage, setMicErrorMessage] = useState<string | null>(null);

  // Real-Time Text & Sign Reading State (Part 4)
  const [ocrResult, setOcrResult] = useState<OcrResult | null>(null);
  const [ocrStatus, setOcrStatus] = useState<OcrReadingStatus>('idle');
  const [cooldownRemainingSec, setCooldownRemainingSec] = useState<number>(0);
  const lastOcrSpokenTextRef = useRef<string>('');
  const lastOcrSpokenTimeRef = useRef<number>(0);

  // Assisted Navigation State (Part 5)
  const [isNavigating, setIsNavigating] = useState<boolean>(false);
  const [navStatus, setNavStatus] = useState<NavigationSystemStatus>('idle');
  const [destinationInput, setDestinationInput] = useState<string>('');
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [navigationRoute, setNavigationRoute] = useState<NavigationRoute | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
  const [currentLocation, setCurrentLocation] = useState<GeoCoordinates | null>(null);
  const [locationStatus, setLocationStatus] = useState<GeolocationStatus>('idle');
  const [locationErrorMessage, setLocationErrorMessage] = useState<string | null>(null);
  const [isListeningForDestination, setIsListeningForDestination] = useState<boolean>(false);
  const [hasObstacleConflict, setHasObstacleConflict] = useState<boolean>(false);
  const [obstacleWarningText, setObstacleWarningText] = useState<string | null>(null);

  const lastNavSpokenStepRef = useRef<number>(-1);
  const lastNavSpokenTimeRef = useRef<number>(0);

  // Part 6: Trusted Person Recognition State
  const [trustedProfiles, setTrustedProfiles] = useState<TrustedPersonProfile[]>(() =>
    loadTrustedProfiles()
  );
  const [isRecognitionEnabled, setIsRecognitionEnabledState] = useState<boolean>(() =>
    getIsRecognitionEnabled()
  );
  const [activeRecognizedPeople, setActiveRecognizedPeople] = useState<RecognizedPerson[]>([]);

  const lastPersonAnnouncedMapRef = useRef<
    Map<string, { position: SpatialPosition; time: number }>
  >(new Map());
  const lastGenericPersonAnnounceTimeRef = useRef<number>(0);

  // Voice System States
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(true);
  const [voiceVolume, setVolumeState] = useState<number>(0.85);
  const [voiceState, setVoiceState] = useState<VoiceState>({
    isSpeaking: false,
    lastSpokenText: '',
    lastSpokenTime: 0,
  });
  const [currentWarning, setCurrentWarning] = useState<string | null>(null);

  // Part 8: Emergency & SOS Assistance State
  const [sosStatus, setSosStatus] = useState<SosStatus>('idle');
  const [sosCountdown, setSosCountdown] = useState<number>(5);
  const [emergencyContactName, setEmergencyContactName] = useState<string>(() => localStorage.getItem('emergencyName') || '');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState<string>(() => localStorage.getItem('emergencyPhone') || '');
  const [isTestMode, setIsTestMode] = useState(false);

  // Cooldown tracking for path guidance voice announcements
  const lastGuidanceSpokenTextRef = useRef<string>('');
  const lastGuidanceSpokenTimeRef = useRef<number>(0);
  const lastCloseAlertTimeRef = useRef<number>(0);

  // Accessible Visual Contrast
  const [isHighContrast, setIsHighContrast] = useState(true);

  // Camera devices
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isDetectingRef = useRef<boolean>(false);
  const detectionLoopTimeoutRef = useRef<number | null>(null);
  const isStartingCameraRef = useRef<boolean>(false);

  // Subscribe to speech synthesis status
  useEffect(() => {
    const unsubscribe = subscribeVoiceState((state) => {
      setVoiceState(state);
    });
    return () => unsubscribe();
  }, []);

  // Cleanup camera streams on unmount (Requirement 6)
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        try {
          streamRef.current.getTracks().forEach((track) => track.stop());
        } catch {
          // ignore
        }
        streamRef.current = null;
      }
      stopSampleVideoStream();
      stopSpeechRecognition();
      stopSpeaking();
    };
  }, []);

  // Subscribe to speech recognition status (Part 3)
  useEffect(() => {
    const unsubscribe = subscribeListeningStatus((status) => {
      setListeningStatus(status);
    });
    return () => unsubscribe();
  }, []);

  // Update volume
  const handleVolumeChange = (newVolume: number) => {
    setVolumeState(newVolume);
    setVoiceVolume(newVolume);
  };

  // Test voice output button handler
  const handleTestVoice = () => {
    speakVoiceWarning('Voice test. Person ahead.', 'high', voiceVolume);
  };

  const handleTestGuidanceVoice = (text: string) => {
    speakVoiceWarning(text, 'high', voiceVolume);
  };

  // Part 8: SOS Handlers & Countdown
  const handleUpdateEmergencyContact = useCallback((name: string, phone: string) => {
    setEmergencyContactName(name);
    setEmergencyContactPhone(phone);
    localStorage.setItem('emergencyName', name);
    localStorage.setItem('emergencyPhone', phone);
  }, []);

  const handleTriggerSOS = useCallback(() => {
    setSosStatus('confirming');
    if (isVoiceActive) {
      speakVoiceWarning('Emergency assistance requested. Confirm to send SOS.', 'high', voiceVolume);
    }
  }, [isVoiceActive, voiceVolume]);

  const handleConfirmSOS = useCallback(() => {
    setSosStatus('countdown');
    setSosCountdown(5);
    if (isVoiceActive) {
      speakVoiceWarning('Sending SOS in 5 seconds. Cancel to stop.', 'high', voiceVolume);
    }
  }, [isVoiceActive, voiceVolume]);

  const handleCancelSOS = useCallback(() => {
    setSosStatus('idle');
    setSosCountdown(5);
    if (isVoiceActive) {
      speakVoiceWarning('SOS cancelled.', 'normal', voiceVolume);
    }
  }, [isVoiceActive, voiceVolume]);

  const handleResetSOS = useCallback(() => {
    setSosStatus('idle');
    setSosCountdown(5);
  }, []);

  useEffect(() => {
    if (sosStatus !== 'countdown') return;
    if (sosCountdown <= 0) {
      setSosStatus('sent');
      const locMsg = (locationStatus === 'available' || locationStatus === 'simulated') ? 'Location available.' : 'Location unavailable.';
      if (isVoiceActive) {
        speakVoiceWarning(`SOS activated. ${locMsg}`, 'high', voiceVolume);
      }
      return;
    }
    const timer = setInterval(() => {
      setSosCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [sosStatus, sosCountdown, locationStatus, isVoiceActive, voiceVolume]);

  // Cooldown countdown timer for text reading (Requirement 13)
  useEffect(() => {
    if (cooldownRemainingSec <= 0) return;
    const timer = setInterval(() => {
      setCooldownRemainingSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownRemainingSec]);

  // Real-Time Text & Sign Reading Handler (Part 4, Requirements 1-15)
  const handleReadText = useCallback(async () => {
    if (ocrStatus === 'reading') return;

    if (!isCameraRunning) {
      const msg = 'The camera is currently turned off. Please start the camera first.';
      if (isVoiceActive) {
        speakAssistantResponse(msg, voiceVolume);
      }
      return;
    }

    setOcrStatus('reading');
    stopSpeaking(); // Cancel any background guidance speech immediately (Requirement 14)

    try {
      const result = await readTextFromCamera(videoRef.current);
      setOcrResult(result);
      setOcrStatus(result.status);

      const now = Date.now();
      const isIdentical =
        result.spokenText.toLowerCase().trim() ===
        lastOcrSpokenTextRef.current.toLowerCase().trim();
      const elapsed = now - lastOcrSpokenTimeRef.current;

      // Cooldown prevention for repeat readings (Requirement 13)
      if (isIdentical && elapsed < 8000) {
        setCooldownRemainingSec(Math.ceil((8000 - elapsed) / 1000));
        if (isVoiceActive) {
          speakAssistantResponse(`Still reading: ${result.spokenText}`, voiceVolume);
        }
      } else {
        lastOcrSpokenTextRef.current = result.spokenText;
        lastOcrSpokenTimeRef.current = now;
        setCooldownRemainingSec(8);

        if (isVoiceActive) {
          speakAssistantResponse(result.spokenText, voiceVolume);
        }
      }
    } catch (err) {
      console.error('OCR reader failure:', err);
      setOcrStatus('unclear');
      if (isVoiceActive) {
        speakAssistantResponse('The text is unclear.', voiceVolume);
      }
    }
  }, [isCameraRunning, isVoiceActive, ocrStatus, voiceVolume]);

  // Geolocation Startup (Part 5)
  useEffect(() => {
    let isMounted = true;
    getBrowserLocation().then((res) => {
      if (!isMounted) return;
      setCurrentLocation(res.coords);
      setLocationStatus(res.status);
      if (res.errorMessage) {
        setLocationErrorMessage(res.errorMessage);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Recenter GPS Location
  const handleRecenterLocation = useCallback(async () => {
    setLocationStatus('locating');
    const res = await getBrowserLocation();
    setCurrentLocation(res.coords);
    setLocationStatus(res.status);
    if (res.errorMessage) {
      setLocationErrorMessage(res.errorMessage);
    }
    if (res.coords) {
      if (isVoiceActive) {
        speakAssistantResponse('Location updated from current GPS.', voiceVolume);
      }
    } else if (res.status === 'denied') {
      if (isVoiceActive) {
        speakAssistantResponse('Location access denied. Please enable location permissions.', voiceVolume);
      }
    }
  }, [isVoiceActive, voiceVolume]);

  // Use Simulated Location for indoors / testing
  const handleUseSimulatedLocation = useCallback(() => {
    setCurrentLocation(DEFAULT_PROTOTYPE_COORDS);
    setLocationStatus('simulated');
    setLocationErrorMessage(null);
    if (isVoiceActive) {
      speakAssistantResponse('Simulated GPS coordinates activated for prototype testing.', voiceVolume);
    }
  }, [isVoiceActive, voiceVolume]);

  // Trusted Person Recognition Handlers (Part 6)
  const handleUpdateProfiles = useCallback((updated: TrustedPersonProfile[]) => {
    setTrustedProfiles(updated);
    saveTrustedProfiles(updated);
  }, []);

  const handleToggleRecognition = useCallback(() => {
    setIsRecognitionEnabledState((prev) => {
      const next = !prev;
      setIsRecognitionEnabled(next);
      if (isVoiceActive) {
        speakAssistantResponse(
          next
            ? 'Trusted person recognition enabled. Matching against registered profiles only.'
            : 'Trusted person recognition disabled.',
          voiceVolume
        );
      }
      return next;
    });
  }, [isVoiceActive, voiceVolume]);

  const handleDeleteAllProfiles = useCallback(() => {
    deleteAllTrustedProfiles();
    setTrustedProfiles([]);
    if (isVoiceActive) {
      speakAssistantResponse('All trusted person profiles deleted from local storage.', voiceVolume);
    }
  }, [isVoiceActive, voiceVolume]);

  const handleResetSampleProfiles = useCallback(() => {
    const samples = resetToSampleProfiles();
    setTrustedProfiles(samples);
    if (isVoiceActive) {
      speakAssistantResponse('Sample trusted profiles loaded for testing.', voiceVolume);
    }
  }, [isVoiceActive, voiceVolume]);

  const handleVoiceAnnouncement = useCallback(
    (text: string) => {
      if (isVoiceActive) {
        speakAssistantResponse(text, voiceVolume);
      }
    },
    [isVoiceActive, voiceVolume]
  );

  // Search & Calculate Walking Route
  const handleSearchAndRoute = useCallback(async (destinationQuery?: string) => {
    const query = (destinationQuery || destinationInput).trim();
    if (!query) return;

    setNavStatus('searching');
    stopSpeaking();

    let coords = currentLocation;
    if (!coords) {
      const locRes = await getBrowserLocation();
      coords = locRes.coords;
      setCurrentLocation(coords);
      setLocationStatus(locRes.status);
    }

    const effectiveOrigin = coords || DEFAULT_PROTOTYPE_COORDS;

    try {
      const dest = await searchDestination(query, effectiveOrigin);
      if (!dest) {
        setNavStatus('error');
        if (isVoiceActive) {
          speakAssistantResponse(`Could not find destination: ${query}.`, voiceVolume);
        }
        return;
      }

      setSelectedDestination(dest.name);
      setDestinationInput(dest.name);

      const calculatedRoute = await calculateWalkingRoute(
        effectiveOrigin,
        dest.name,
        dest.coords
      );

      if (calculatedRoute && calculatedRoute.steps.length > 0) {
        setNavigationRoute(calculatedRoute);
        setCurrentStepIndex(0);
        setNavStatus('idle');
        lastNavSpokenStepRef.current = -1;

        if (isVoiceActive) {
          speakAssistantResponse(
            `Route found to ${dest.name}. Distance: ${calculatedRoute.totalDistanceMeters} meters, about ${calculatedRoute.estimatedWalkingMinutes} minutes walk. Tap Start Navigation to begin.`,
            voiceVolume
          );
        }
      } else {
        setNavStatus('error');
        if (isVoiceActive) {
          speakAssistantResponse('Routing service unavailable for this destination.', voiceVolume);
        }
      }
    } catch (err) {
      console.error('Route calculation error:', err);
      setNavStatus('error');
      if (isVoiceActive) {
        speakAssistantResponse('Error calculating route. Please try again.', voiceVolume);
      }
    }
  }, [currentLocation, destinationInput, isVoiceActive, voiceVolume]);

  // Start navigation
  const handleStartNavigation = useCallback(() => {
    if (!navigationRoute || navigationRoute.steps.length === 0) {
      if (isVoiceActive) {
        speakAssistantResponse('Please search and select a destination first.', voiceVolume);
      }
      return;
    }

    setIsNavigating(true);
    setNavStatus('active');
    const firstStep = navigationRoute.steps[0];
    lastNavSpokenStepRef.current = 0;
    lastNavSpokenTimeRef.current = Date.now();

    if (isVoiceActive) {
      speakVoiceWarning(`Navigation active. ${firstStep.instruction}`, 'high', voiceVolume);
    }
  }, [isVoiceActive, navigationRoute, voiceVolume]);

  // Stop navigation
  const handleStopNavigation = useCallback(() => {
    setIsNavigating(false);
    setNavStatus('idle');
    setHasObstacleConflict(false);
    setObstacleWarningText(null);
    stopSpeaking();

    if (isVoiceActive) {
      speakAssistantResponse('Navigation stopped.', voiceVolume);
    }
  }, [isVoiceActive, voiceVolume]);

  // Step advancement
  const handleNextStep = useCallback(() => {
    if (!navigationRoute) return;
    const nextIdx = currentStepIndex + 1;
    if (nextIdx < navigationRoute.steps.length) {
      setCurrentStepIndex(nextIdx);
      const step = navigationRoute.steps[nextIdx];
      lastNavSpokenStepRef.current = nextIdx;
      lastNavSpokenTimeRef.current = Date.now();

      if (step.direction === 'arrive') {
        setNavStatus('arrived');
        setIsNavigating(false);
        if (isVoiceActive) {
          speakVoiceWarning('You have arrived at your destination.', 'high', voiceVolume);
        }
      } else if (isVoiceActive) {
        speakVoiceWarning(step.instruction, 'normal', voiceVolume);
      }
    }
  }, [currentStepIndex, isVoiceActive, navigationRoute, voiceVolume]);

  const handlePrevStep = useCallback(() => {
    if (!navigationRoute) return;
    const prevIdx = Math.max(0, currentStepIndex - 1);
    setCurrentStepIndex(prevIdx);
    const step = navigationRoute.steps[prevIdx];
    lastNavSpokenStepRef.current = prevIdx;
    lastNavSpokenTimeRef.current = Date.now();
    if (isVoiceActive) {
      speakVoiceWarning(step.instruction, 'normal', voiceVolume);
    }
  }, [currentStepIndex, isVoiceActive, navigationRoute, voiceVolume]);

  const handleRepeatInstruction = useCallback(() => {
    if (!navigationRoute || !navigationRoute.steps[currentStepIndex]) return;
    const step = navigationRoute.steps[currentStepIndex];
    if (isVoiceActive) {
      speakAssistantResponse(step.instruction, voiceVolume);
    }
  }, [currentStepIndex, isVoiceActive, navigationRoute, voiceVolume]);

  // Destination Voice Input (Part 5 Requirement 1 & 3)
  const handleToggleDestinationVoiceInput = useCallback(() => {
    if (isListeningForDestination) {
      stopSpeechRecognition();
      setIsListeningForDestination(false);
      return;
    }

    stopSpeaking();
    setIsListeningForDestination(true);

    startSpeechRecognition(
      (transcript) => {
        setIsListeningForDestination(false);
        const dest = extractDestinationFromSpeech(transcript) || transcript.trim();
        setDestinationInput(dest);
        handleSearchAndRoute(dest);
      },
      (errorMsg) => {
        setIsListeningForDestination(false);
        setMicErrorMessage(errorMsg);
        if (isVoiceActive) {
          speakAssistantResponse('Could not recognize destination. Please type or try again.', voiceVolume);
        }
      }
    );
  }, [handleSearchAndRoute, isListeningForDestination, isVoiceActive, voiceVolume]);

  // Voice AI Assistant Question Handler (Requirements 2, 4, 5, 6, 7, 8, 9, 10, 12)
  const handleAskQuestion = useCallback(
    (question: string, source: 'voice' | 'quick-query' | 'text' = 'quick-query') => {
      if (!question.trim()) return;
      setMicErrorMessage(null);

      const lowerQ = question.toLowerCase();

      // Part 8: SOS Voice Triggers
      if (lowerQ === 'cancel' || lowerQ === 'stop' || lowerQ === 'cancel sos') {
        if (sosStatus === 'confirming' || sosStatus === 'countdown') {
          handleCancelSOS();
          const interaction: VoiceAssistantInteraction = {
            id: String(Date.now()), timestamp: Date.now(), question: question.trim(), response: 'SOS Cancelled.', source,
          };
          setLastInteraction(interaction);
          return;
        }
      }
      
      if (lowerQ === 'send sos' || lowerQ === 'confirm' || lowerQ === 'yes') {
        if (sosStatus === 'confirming') {
          handleConfirmSOS();
          const interaction: VoiceAssistantInteraction = {
            id: String(Date.now()), timestamp: Date.now(), question: question.trim(), response: 'SOS Confirmed. Counting down.', source,
          };
          setLastInteraction(interaction);
          return;
        }
      }
  
      if (
        lowerQ.includes('emergency') ||
        lowerQ === 'sos' ||
        lowerQ.includes('help me')
      ) {
        handleTriggerSOS();
        const interaction: VoiceAssistantInteraction = {
          id: String(Date.now()), timestamp: Date.now(), question: question.trim(), response: 'Emergency assistance requested. Confirm to send SOS.', source,
        };
        setLastInteraction(interaction);
        return;
      }

      // If user asks to read the sign or text, trigger active OCR scan directly!
      if (
        lowerQ.includes('read text') ||
        lowerQ.includes('read the text') ||
        lowerQ.includes('read sign') ||
        lowerQ.includes('read the sign')
      ) {
        handleReadText();
        return;
      }

      // Check if user is asking for navigation destination via voice assistant!
      const destCandidate = extractDestinationFromSpeech(question);
      if (
        destCandidate &&
        (lowerQ.includes('take me to') ||
          lowerQ.includes('navigate to') ||
          lowerQ.includes('where is the nearest') ||
          lowerQ.includes('directions to') ||
          lowerQ.includes('walk to'))
      ) {
        setDestinationInput(destCandidate);
        handleSearchAndRoute(destCandidate);
        const resp = `Finding route to ${destCandidate}.`;
        speakAssistantResponse(resp, voiceVolume);
        const interaction: VoiceAssistantInteraction = {
          id: String(Date.now()),
          timestamp: Date.now(),
          question: question.trim(),
          response: resp,
          source,
        };
        setLastInteraction(interaction);
        return;
      }

      const answer = answerVoiceQuery(
        question,
        detections,
        isCameraRunning,
        pathGuidance,
        ocrResult,
        {
          isNavigating,
          destination: selectedDestination,
          nextInstruction: navigationRoute?.steps[currentStepIndex]?.instruction || null,
          totalDistanceMeters: navigationRoute?.totalDistanceMeters,
        }
      );

      const interaction: VoiceAssistantInteraction = {
        id: String(Date.now()),
        timestamp: Date.now(),
        question: question.trim(),
        response: answer,
        source,
      };

      setLastInteraction(interaction);

      // Immediate concise spoken response (Requirement 6)
      speakAssistantResponse(answer, voiceVolume);
    },
    [
      currentStepIndex,
      detections,
      handleReadText,
      handleSearchAndRoute,
      isCameraRunning,
      isNavigating,
      navigationRoute,
      ocrResult,
      pathGuidance,
      selectedDestination,
      voiceVolume,
    ]
  );

  // Microphone toggle button handler (Requirements 1, 11, 12)
  const handleToggleListen = useCallback(() => {
    setMicErrorMessage(null);
    if (listeningStatus === 'listening') {
      stopSpeechRecognition();
      return;
    }

    // Silence active speech when listening
    stopSpeaking();

    startSpeechRecognition(
      (transcript) => {
        handleAskQuestion(transcript, 'voice');
      },
      (errorMsg) => {
        setMicErrorMessage(errorMsg);
      }
    );
  }, [handleAskQuestion, listeningStatus]);

  // Load vision AI model on startup
  useEffect(() => {
    let isMounted = true;
    setIsModelLoading(true);

    loadVisionModel()
      .then((loadedModel) => {
        if (isMounted) {
          setModel(loadedModel);
          setIsModelLoading(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load vision model:', err);
        if (isMounted) {
          setIsModelLoading(false);
          setCameraError('Could not initialize the visual AI model. Please refresh the browser.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Enumerate video devices
  const updateDeviceList = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((d) => d.kind === 'videoinput');
      setAvailableDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (e) {
      console.warn('Could not enumerate media devices:', e);
    }
  }, [selectedDeviceId]);

  useEffect(() => {
    updateDeviceList();
  }, [updateDeviceList]);

  // Stop camera helper
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      try {
        streamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.warn('Track stop error:', e);
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    stopSampleVideoStream();
    stopSpeechRecognition();
    setIsCameraRunning(false);
    setIsSampleFeed(false);
    setDetections([]);
    setActiveRecognizedPeople([]);
    setPathGuidance(null);
    setCurrentWarning(null);
    lastGuidanceSpokenTextRef.current = '';
    lastGuidanceSpokenTimeRef.current = 0;
    lastCloseAlertTimeRef.current = 0;
    setOcrStatus('idle');
    setCooldownRemainingSec(0);
    stopSpeaking();
    resetVoiceHistory();
    playCameraClickSound();
  }, []);

  // Start real webcam
  const startCamera = useCallback(
    async (deviceId?: string) => {
      // Requirement 7: Prevent multiple simultaneous camera access attempts
      if (isStartingCameraRef.current) {
        return;
      }
      isStartingCameraRef.current = true;
      setCameraError(null);
      stopCamera();

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Webcam access is not supported by your browser or environment. You can test with the sample video stream.');
        isStartingCameraRef.current = false;
        return;
      }

      try {
        const constraints: MediaStreamConstraints = {
          video: deviceId
            ? { deviceId: { exact: deviceId } }
            : {
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 },
              },
          audio: false,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch((e) => console.warn('Video play caught:', e));
        }

        setIsCameraRunning(true);
        setIsSampleFeed(false);
        playCameraClickSound();
        updateDeviceList();

        if (isVoiceActive) {
          speakVoiceWarning('Camera started. Vision assistant and voice AI active.', 'normal', voiceVolume);
        }
      } catch (err: unknown) {
        console.error('Camera access error:', err);
        const error = err as { name?: string; message?: string };
        let msg = 'Could not access the laptop webcam.';
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          msg =
            'Webcam permission was denied. Please allow camera access in browser settings or click "Test With Sample Video Stream".';
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          msg = 'No physical webcam was found on this laptop or device.';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          msg = 'The webcam is currently being used by another application.';
        }
        setCameraError(msg);
        setIsCameraRunning(false);
        if (isVoiceActive) {
          speakAssistantResponse(msg, voiceVolume);
        }
      } finally {
        isStartingCameraRef.current = false;
      }
    },
    [isVoiceActive, stopCamera, updateDeviceList, voiceVolume]
  );

  // Start sample feed fallback
  const startSampleFeed = useCallback(() => {
    if (isStartingCameraRef.current) {
      return;
    }
    isStartingCameraRef.current = true;
    setCameraError(null);
    stopCamera();

    try {
      const sampleStream = createSampleVideoStream();
      if (sampleStream && videoRef.current) {
        streamRef.current = sampleStream;
        videoRef.current.srcObject = sampleStream;
        videoRef.current.play().catch((e) => console.warn('Sample video play caught:', e));
        setIsCameraRunning(true);
        setIsSampleFeed(true);
        playCameraClickSound();

        if (isVoiceActive) {
          speakVoiceWarning('Sample testing feed started. Path guidance and voice AI active.', 'normal', voiceVolume);
        }
      } else {
        setCameraError('Unable to generate sample video stream.');
      }
    } finally {
      isStartingCameraRef.current = false;
    }
  }, [isVoiceActive, stopCamera, voiceVolume]);

  // Device selection change
  const handleSelectDevice = (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    if (isCameraRunning && !isSampleFeed) {
      startCamera(deviceId);
    }
  };

  // Real-time Detection Loop & Path Guidance
  useEffect(() => {
    if (!isCameraRunning || !model) {
      return;
    }

    let isMounted = true;

    const runDetection = async () => {
      if (!isMounted || !isCameraRunning || !model || !videoRef.current) {
        return;
      }

      if (videoRef.current.readyState < 2 || videoRef.current.videoWidth <= 0) {
        detectionLoopTimeoutRef.current = window.setTimeout(runDetection, 100);
        return;
      }

      if (isDetectingRef.current) {
        detectionLoopTimeoutRef.current = window.setTimeout(runDetection, 80);
        return;
      }

      isDetectingRef.current = true;
      try {
        const rawItems = await detectObjectsInFrame(videoRef.current, model, 0.45);
        if (isMounted) {
          let items = rawItems;
          const detectedPersons: RecognizedPerson[] = [];

          // Part 6: Trusted Person Recognition (Local & Privacy-Preserving)
          if (videoRef.current && isRecognitionEnabled && trustedProfiles.length > 0) {
            const updatedItems: DetectedItem[] = [];
            for (const item of rawItems) {
              if (item.label.toLowerCase() === 'person') {
                try {
                  const faceData = extractFaceDescriptorFromVideo(videoRef.current, item.bbox);
                  if (faceData) {
                    const matched = matchFaceAgainstTrustedProfiles(
                      faceData.descriptor,
                      trustedProfiles,
                      item
                    );
                    item.recognizedPerson = matched;
                    detectedPersons.push(matched);
                  }
                } catch (faceErr) {
                  console.warn('Face analysis error:', faceErr);
                }
              }
              updatedItems.push(item);
            }
            items = updatedItems;
          }

          setActiveRecognizedPeople(detectedPersons);
          setDetections(items);

          // Path Guidance Analysis
          const guidance = evaluatePathGuidance(items);
          setPathGuidance(guidance);

          // Immediate close proximity check & obstacle evaluation (Part 5 Requirement 8)
          const now = Date.now();
          const hasCloseObstacle = items.some((item) => item.proximity === 'Close');
          const isObstacleDetected =
            hasCloseObstacle ||
            guidance.status === 'STOP' ||
            guidance.centerZone.isObstructed ||
            items.some((item) => item.position === 'Center' && item.proximity !== 'Far');

          // Part 7: Environmental Intelligence
          const scene = buildSceneUnderstanding(
            items,
            detectedPersons,
            isNavigating,
            navigationRoute,
            currentStepIndex
          );
          setSceneUnderstanding(scene);

          // Maintain UI state for navigation obstacles
          if (isNavigating) {
            if (isObstacleDetected) {
              setHasObstacleConflict(true);
              setObstacleWarningText(hasCloseObstacle ? 'Obstacle very close. Please stop.' : 'Obstacle ahead. Please proceed carefully.');
            } else {
              setHasObstacleConflict(false);
              setObstacleWarningText(null);
            }
          } else {
            setHasObstacleConflict(false);
            setObstacleWarningText(null);
          }

          // Unified Voice Announcements
          if (isVoiceActive && listeningStatus !== 'listening') {
            const proactiveAlert = determineProactiveAnnouncement(scene, guidance, now);
            if (proactiveAlert) {
              setCurrentWarning(proactiveAlert.text);
              if (proactiveAlert.priorityLevel === 1) {
                playObstacleAlertSound();
              }
              enqueueSmartAlert(proactiveAlert);
            } else if (!isNavigating && guidance.status !== 'PATH CLEAR') {
               // Fallback: silently update current warning UI text if there's no proactive announcement
               setCurrentWarning(guidance.voiceText);
            }
          }
        }
      } catch (err) {
        console.error('Detection frame error:', err);
      } finally {
        isDetectingRef.current = false;
        if (isMounted && isCameraRunning) {
          detectionLoopTimeoutRef.current = window.setTimeout(runDetection, 100);
        }
      }
    };

    runDetection();

    return () => {
      isMounted = false;
      if (detectionLoopTimeoutRef.current !== null) {
        clearTimeout(detectionLoopTimeoutRef.current);
      }
    };
  }, [
    isCameraRunning,
    model,
    isVoiceActive,
    voiceVolume,
    voiceState.isSpeaking,
    listeningStatus,
    isNavigating,
    navigationRoute,
    currentStepIndex,
    isRecognitionEnabled,
    trustedProfiles,
  ]);

  // Keyboard accessibility shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        if (isCameraRunning) {
          stopCamera();
        } else {
          startCamera(selectedDeviceId);
        }
      } else if (e.key === 'v' || e.key === 'V') {
        setIsVoiceActive((prev) => {
          const next = !prev;
          if (!next) {
            stopSpeaking();
          } else {
            speakVoiceWarning('Voice guidance enabled.', 'normal', voiceVolume);
          }
          return next;
        });
      } else if (e.key === 'c' || e.key === 'C') {
        setIsHighContrast((prev) => !prev);
      } else if (e.key === 'm' || e.key === 'M') {
        // Toggle microphone
        e.preventDefault();
        handleToggleListen();
      } else if (e.key === 't' || e.key === 'T') {
        // Read text from camera
        e.preventDefault();
        handleReadText();
      } else if (e.key === 's' || e.key === 'S') {
        // Stop speaking immediately
        e.preventDefault();
        stopSpeaking();
      } else if (e.key === 'n' || e.key === 'N') {
        // Toggle navigation
        e.preventDefault();
        if (isNavigating) {
          handleStopNavigation();
        } else {
          handleStartNavigation();
        }
      } else if (e.key === 'l' || e.key === 'L') {
        // Recenter location
        e.preventDefault();
        handleRecenterLocation();
      } else if (e.key === 'p' || e.key === 'P') {
        // Toggle trusted person recognition
        e.preventDefault();
        handleToggleRecognition();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleReadText,
    handleRecenterLocation,
    handleStartNavigation,
    handleStopNavigation,
    handleToggleListen,
    handleToggleRecognition,
    isCameraRunning,
    isNavigating,
    selectedDeviceId,
    startCamera,
    stopCamera,
    voiceVolume,
  ]);

  return (
    <div
      id="vision-assistant-app"
      className={`min-h-screen flex flex-col transition-colors ${
        isHighContrast ? 'bg-black text-white' : 'bg-neutral-950 text-neutral-100'
      }`}
    >
      {/* Accessible Header & High Contrast Switch */}
      <Header
        isVoiceActive={isVoiceActive}
        onToggleVoice={() => {
          setIsVoiceActive((prev) => {
            const next = !prev;
            if (!next) stopSpeaking();
            return next;
          });
        }}
        isHighContrast={isHighContrast}
        onToggleHighContrast={() => setIsHighContrast((prev) => !prev)}
        isModelReady={!isModelLoading && model !== null}
        isSpeaking={voiceState.isSpeaking}
      />

      {/* Main Vision & Voice Workspace */}
      <main id="main-vision-content" className="flex-1 flex flex-col justify-between">
        {/* Dedicated Voice System Controls & Audition Shortcuts */}
        <div className="pt-4">
          <VoiceControlPanel
            isVoiceActive={isVoiceActive}
            onToggleVoice={() => {
              setIsVoiceActive((prev) => {
                const next = !prev;
                if (!next) stopSpeaking();
                return next;
              });
            }}
            volume={voiceVolume}
            onVolumeChange={handleVolumeChange}
            voiceState={voiceState}
            onTestVoice={handleTestVoice}
            onTestGuidanceVoice={handleTestGuidanceVoice}
            isHighContrast={isHighContrast}
          />
        </div>

        {/* Part 8: Emergency & SOS Assistance */}
        <EmergencySOSPanel
          contactName={emergencyContactName}
          contactPhone={emergencyContactPhone}
          onContactChange={handleUpdateEmergencyContact}
          sosStatus={sosStatus}
          countdown={sosCountdown}
          onTriggerSOS={handleTriggerSOS}
          onConfirmSOS={handleConfirmSOS}
          onCancelSOS={handleCancelSOS}
          onResetSOS={handleResetSOS}
          currentLocation={currentLocation}
          locationStatus={locationStatus}
          isHighContrast={isHighContrast}
          isTestMode={isTestMode}
        />

        {/* Part 5: Assisted Navigation Panel */}
        <NavigationPanel
          isNavigating={isNavigating}
          navStatus={navStatus}
          destinationInput={destinationInput}
          onDestinationInputChange={setDestinationInput}
          onSearchAndRoute={handleSearchAndRoute}
          selectedDestination={selectedDestination}
          route={navigationRoute}
          currentStepIndex={currentStepIndex}
          onNextStep={handleNextStep}
          onPrevStep={handlePrevStep}
          onStartNavigation={handleStartNavigation}
          onStopNavigation={handleStopNavigation}
          onRecenterLocation={handleRecenterLocation}
          onUseSimulatedLocation={handleUseSimulatedLocation}
          currentLocation={currentLocation}
          locationStatus={locationStatus}
          locationErrorMessage={locationErrorMessage}
          hasObstacleConflict={hasObstacleConflict}
          obstacleWarningText={obstacleWarningText}
          isHighContrast={isHighContrast}
          isSpeaking={voiceState.isSpeaking}
          onRepeatInstruction={handleRepeatInstruction}
          isListeningForDestination={isListeningForDestination}
          onToggleDestinationVoiceInput={handleToggleDestinationVoiceInput}
        />

        {/* Part 6: Privacy-Focused Trusted Person Recognition */}
        <TrustedPersonPanel
          profiles={trustedProfiles}
          onProfilesChange={handleUpdateProfiles}
          isRecognitionEnabled={isRecognitionEnabled}
          onToggleRecognition={handleToggleRecognition}
          videoRef={videoRef}
          isCameraRunning={isCameraRunning}
          activeRecognizedPeople={activeRecognizedPeople}
          isHighContrast={isHighContrast}
          onVoiceAnnouncement={handleVoiceAnnouncement}
          onAnnounceFeedback={handleVoiceAnnouncement}
          onDeleteAllProfiles={handleDeleteAllProfiles}
          onResetSampleProfiles={handleResetSampleProfiles}
          detections={detections}
        />

        {/* Part 9: Smart Alert Priority Engine Panel */}
        <SmartAlertPanel isHighContrast={isHighContrast} />

        {/* Part 7: Environmental Intelligence */}
        {sceneUnderstanding && (
          <EnvironmentalIntelligencePanel
            scene={sceneUnderstanding}
            isHighContrast={isHighContrast}
            onAnnounce={handleVoiceAnnouncement}
          />
        )}

        {/* Part 4: Real-Time Text & Sign Reading Panel */}
        <TextReaderPanel
          ocrResult={ocrResult}
          ocrStatus={ocrStatus}
          onReadText={handleReadText}
          isSpeaking={voiceState.isSpeaking}
          onStopSpeaking={stopSpeaking}
          isHighContrast={isHighContrast}
          isCameraRunning={isCameraRunning}
          cooldownRemainingSec={cooldownRemainingSec}
        />

        {/* Part 3: Hands-Free Voice AI Assistant Panel */}
        <VoiceAssistantPanel
          listeningStatus={listeningStatus}
          onToggleListen={handleToggleListen}
          isSpeaking={voiceState.isSpeaking}
          onStopSpeaking={stopSpeaking}
          lastInteraction={lastInteraction}
          onAskQuestion={handleAskQuestion}
          isHighContrast={isHighContrast}
          isCameraRunning={isCameraRunning}
          micErrorMessage={micErrorMessage}
        />

        {/* Part 10: Testing & Diagnostics Dashboard */}
        <TestingDiagnosticsDashboard
          isHighContrast={isHighContrast}
          isTestMode={isTestMode}
          onToggleTestMode={() => setIsTestMode(!isTestMode)}
          systemStatus={{
            camera: isCameraRunning ? 'ACTIVE' : (cameraError ? 'ERROR' : 'READY'),
            microphone: listeningStatus === 'listening' ? 'LISTENING' : (micErrorMessage ? 'ERROR' : 'READY'),
            speaker: voiceState.isSpeaking ? 'SPEAKING' : 'READY',
            objectDetection: isCameraRunning && model ? 'ACTIVE' : (isModelLoading ? 'READY' : 'ERROR'),
            pathGuidance: pathGuidance ? 'ACTIVE' : 'READY',
            textReader: ocrStatus === 'reading' ? 'ACTIVE' : (ocrStatus === 'error' ? 'ERROR' : 'READY'),
            navigation: isNavigating ? 'ACTIVE' : (locationStatus === 'unavailable' || locationStatus === 'denied' ? 'LOCATION UNAVAILABLE' : (locationErrorMessage ? 'ERROR' : 'READY')),
            trustedPerson: !isRecognitionEnabled ? 'READY' : (trustedProfiles.length === 0 ? 'NO PROFILES' : (activeRecognizedPeople.length > 0 ? 'ACTIVE' : 'READY')),
            envIntelligence: sceneUnderstanding ? 'ACTIVE' : 'READY',
            smartAlert: voiceState.currentAlert ? 'ACTIVE' : 'READY',
            sos: sosStatus !== 'idle' ? 'ARMED' : 'READY'
          }}
        />

        {/* Part 2: Intelligent Path Guidance Banner */}
        <PathGuidanceBanner
          guidance={pathGuidance}
          isCameraRunning={isCameraRunning}
          isHighContrast={isHighContrast}
        />

        {/* Live Camera View with Real-Time Bounding Boxes and Directional Highlights */}
        <CameraView
          isCameraRunning={isCameraRunning}
          onStartCamera={() => startCamera(selectedDeviceId)}
          onStopCamera={stopCamera}
          detections={detections}
          videoRef={videoRef}
          cameraError={cameraError}
          onSelectDevice={handleSelectDevice}
          availableDevices={availableDevices}
          selectedDeviceId={selectedDeviceId}
          isHighContrast={isHighContrast}
          onUseSampleFeed={startSampleFeed}
          isSampleFeed={isSampleFeed}
          pathGuidance={pathGuidance}
          ocrResult={ocrResult}
          isReadingText={ocrStatus === 'reading'}
          onReadText={handleReadText}
        />

        {/* Detailed Breakdown of Active Detections */}
        {isCameraRunning && detections.length > 0 && (
          <DetectedObjectsList
            detections={detections}
            isHighContrast={isHighContrast}
          />
        )}
      </main>

      {/* Bottom Live Status Bar */}
      <LiveStatusBar
        detections={detections}
        isCameraRunning={isCameraRunning}
        isHighContrast={isHighContrast}
        currentVoiceWarning={currentWarning}
        isSpeaking={voiceState.isSpeaking}
        pathStatus={pathGuidance?.status}
        lastOcrText={ocrResult?.status === 'success' ? ocrResult.spokenText : null}
        isReadingText={ocrStatus === 'reading'}
        isNavigating={isNavigating}
        destination={selectedDestination}
        nextInstruction={navigationRoute?.steps[currentStepIndex]?.instruction}
      />
    </div>
  );
}
