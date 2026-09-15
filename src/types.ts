export type SpatialPosition = 'Left' | 'Center' | 'Right';

export interface DetectedItem {
  id: string;
  label: string;
  confidence: number; // 0 to 100 percentage
  position: SpatialPosition;
  bbox: [number, number, number, number]; // [x, y, width, height]
  relativeArea: number; // percentage of viewport
  proximity: 'Far' | 'Medium' | 'Close';
  timestamp: number;
  recognizedPerson?: RecognizedPerson | null;
}

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export type SosStatus = 'idle' | 'confirming' | 'countdown' | 'sent';

export type AlertPriorityLevel = 1 | 2 | 3 | 4 | 5 | 6;
export type AlertCategory = 'CRITICAL' | 'HIGH' | 'NORMAL' | 'INFORMATION';

export interface SmartAlert {
  id: string;
  text: string;
  priorityLevel: AlertPriorityLevel;
  category: AlertCategory;
  timestamp: number;
}

export type AssistantMode = 'live' | 'paused' | 'stopped';

export type PathStatus = 'PATH CLEAR' | 'MOVE LEFT' | 'MOVE RIGHT' | 'STOP' | 'PROCEED CAREFULLY';

export interface ZoneAnalysis {
  isObstructed: boolean;
  obstructionScore: number; // 0 (clear) to 100+
  items: DetectedItem[];
  hasPerson: boolean;
  hasCloseObstacle: boolean;
}

export interface PathGuidanceResult {
  status: PathStatus;
  voiceText: string;
  recommendedZone: 'Left' | 'Center' | 'Right' | 'None';
  leftZone: ZoneAnalysis;
  centerZone: ZoneAnalysis;
  rightZone: ZoneAnalysis;
  uncertain: boolean;
  reason: string;
}

export type ListeningStatus = 'idle' | 'listening' | 'processing' | 'error';

export interface VoiceAssistantInteraction {
  id: string;
  timestamp: number;
  question: string;
  response: string;
  source: 'voice' | 'quick-query' | 'text';
}

export interface OcrTextBlock {
  text: string;
  confidence: number;
  bbox?: [number, number, number, number]; // [x, y, width, height]
  area?: number;
}

export type OcrReadingStatus = 'idle' | 'reading' | 'success' | 'no-text' | 'unclear' | 'error';

export interface OcrResult {
  status: OcrReadingStatus;
  spokenText: string;
  detectedBlocks: OcrTextBlock[];
  fullRawText: string;
  timestamp: number;
}

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy?: number; // In meters
  heading?: number | null;
  speed?: number | null;
  timestamp?: number;
}

export type GeolocationStatus =
  | 'idle'
  | 'locating'
  | 'available'
  | 'denied'
  | 'unavailable'
  | 'timeout'
  | 'simulated';

export type TurnDirection = 'straight' | 'slight-left' | 'left' | 'slight-right' | 'right' | 'u-turn' | 'arrive';

export interface RouteStep {
  id: string;
  instruction: string; // e.g., "Walk straight.", "Turn left.", "Continue for 100 meters.", "You have arrived."
  distanceMeters: number;
  direction: TurnDirection;
  roadName?: string;
  completed: boolean;
}

export type NavigationSystemStatus = 'idle' | 'searching' | 'active' | 'arrived' | 'paused' | 'error';

export interface NavigationRoute {
  destinationName: string;
  destinationCoords?: GeoCoordinates;
  startCoords?: GeoCoordinates;
  steps: RouteStep[];
  currentStepIndex: number;
  totalDistanceMeters: number;
  estimatedWalkingMinutes: number;
  source: 'gps-osrm' | 'gps-direct' | 'simulated-sample';
  timestamp: number;
}

export interface NavigationState {
  isActive: boolean;
  status: NavigationSystemStatus;
  destinationQuery: string;
  selectedDestination: string | null;
  route: NavigationRoute | null;
  currentLocation: GeoCoordinates | null;
  locationStatus: GeolocationStatus;
  locationErrorMessage: string | null;
  nextInstruction: string | null;
  distanceRemainingMeters: number;
  hasObstacleConflict: boolean;
}

// ==========================================
// Part 6: Trusted Person Recognition Types
// ==========================================

export type PersonRecognitionConfidence = 'high' | 'medium' | 'low' | 'unknown';

export interface TrustedPersonFaceSample {
  id: string;
  dataUrl: string; // Small Base64 thumbnail for visual confirmation
  descriptor: number[]; // Normalized visual feature vector
  timestamp: number;
}

export interface TrustedPersonProfile {
  id: string;
  name: string; // e.g. "Rahul"
  relationship?: string; // e.g. "Friend", "Doctor", "Family"
  faceSamples: TrustedPersonFaceSample[];
  createdAt: number;
  lastRecognizedAt?: number;
}

export interface RecognizedPerson {
  matchedProfileId: string | null;
  name: string | null; // null if unknown
  confidence: number; // 0 to 100 percentage
  confidenceLevel: PersonRecognitionConfidence;
  position: SpatialPosition; // 'Left' | 'Center' | 'Right'
  bbox: [number, number, number, number];
  proximity: 'Far' | 'Medium' | 'Close';
  isRegistered: boolean;
  faceSampleUrl?: string;
}

export interface TrustedPersonAnnouncementRecord {
  name: string;
  lastPosition: SpatialPosition;
  lastAnnouncedTime: number;
}


