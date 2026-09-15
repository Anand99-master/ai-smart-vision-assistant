import React, { useState } from 'react';
import {
  Navigation,
  Compass,
  MapPin,
  Mic,
  MicOff,
  Search,
  Play,
  Square,
  RotateCcw,
  AlertTriangle,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ShieldAlert,
  Locate,
  Footprints,
  Info,
  Clock,
  Volume2,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import {
  NavigationRoute,
  RouteStep,
  GeoCoordinates,
  GeolocationStatus,
  NavigationSystemStatus,
  TurnDirection,
} from '../types';

interface NavigationPanelProps {
  isNavigating: boolean;
  navStatus: NavigationSystemStatus;
  destinationInput: string;
  onDestinationInputChange: (value: string) => void;
  onSearchAndRoute: (destinationQuery?: string) => void;
  selectedDestination: string | null;
  route: NavigationRoute | null;
  currentStepIndex: number;
  onNextStep: () => void;
  onPrevStep: () => void;
  onStartNavigation: () => void;
  onStopNavigation: () => void;
  onRecenterLocation: () => void;
  onUseSimulatedLocation: () => void;
  currentLocation: GeoCoordinates | null;
  locationStatus: GeolocationStatus;
  locationErrorMessage: string | null;
  hasObstacleConflict: boolean;
  obstacleWarningText: string | null;
  isHighContrast: boolean;
  isSpeaking: boolean;
  onRepeatInstruction: () => void;
  isListeningForDestination: boolean;
  onToggleDestinationVoiceInput: () => void;
}

const QUICK_DESTINATIONS = [
  'Pharmacy',
  'Railway Station',
  'Hospital',
  'Market',
  'Metro Cafe',
];

function getDirectionIcon(direction: TurnDirection, className: string = 'w-8 h-8') {
  switch (direction) {
    case 'left':
    case 'slight-left':
      return <ArrowLeft className={className} />;
    case 'right':
    case 'slight-right':
      return <ArrowRight className={className} />;
    case 'arrive':
      return <CheckCircle2 className={className} />;
    case 'straight':
    default:
      return <ArrowUp className={className} />;
  }
}

export const NavigationPanel: React.FC<NavigationPanelProps> = ({
  isNavigating,
  navStatus,
  destinationInput,
  onDestinationInputChange,
  onSearchAndRoute,
  selectedDestination,
  route,
  currentStepIndex,
  onNextStep,
  onPrevStep,
  onStartNavigation,
  onStopNavigation,
  onRecenterLocation,
  onUseSimulatedLocation,
  currentLocation,
  locationStatus,
  locationErrorMessage,
  hasObstacleConflict,
  obstacleWarningText,
  isHighContrast,
  isSpeaking,
  onRepeatInstruction,
  isListeningForDestination,
  onToggleDestinationVoiceInput,
}) => {
  const [showAllSteps, setShowAllSteps] = useState(false);

  const activeStep: RouteStep | null =
    route && route.steps && route.steps[currentStepIndex]
      ? route.steps[currentStepIndex]
      : null;

  const nextStep: RouteStep | null =
    route && route.steps && route.steps[currentStepIndex + 1]
      ? route.steps[currentStepIndex + 1]
      : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (destinationInput.trim()) {
      onSearchAndRoute(destinationInput.trim());
    }
  };

  return (
    <section
      id="assisted-navigation-section"
      aria-label="Assisted Pedestrian Navigation"
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
                  : 'bg-sky-500 text-neutral-950 border-sky-400'
              }`}
            >
              <Compass className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Assisted Navigation
                </h2>
                <span
                  className={`text-xs uppercase font-extrabold px-2 py-0.5 rounded-full border ${
                    isNavigating
                      ? isHighContrast
                        ? 'bg-yellow-400 text-black border-white animate-pulse'
                        : 'bg-emerald-500 text-neutral-950 border-emerald-400 animate-pulse'
                      : isHighContrast
                      ? 'bg-neutral-900 border-yellow-400 text-yellow-300'
                      : 'bg-sky-950 border-sky-500 text-sky-300'
                  }`}
                >
                  {isNavigating ? 'Active Guidance' : 'Part 5 Prototype'}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium opacity-80 mt-0.5">
                Turn-by-turn spoken guidance synchronized with camera obstacle prioritization.
              </p>
            </div>
          </div>

          {/* Recenter & Location Status Controls (Requirement 10 & 11) */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <button
              id="nav-recenter-button"
              type="button"
              onClick={onRecenterLocation}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-black border-2 transition-all cursor-pointer ${
                isHighContrast
                  ? 'bg-neutral-900 border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700'
              }`}
              title="Re-query GPS coordinates"
              aria-label="Recenter Location"
            >
              <Locate className="w-4 h-4" />
              <span>Recenter Location</span>
            </button>

            {locationStatus === 'denied' && (
              <button
                type="button"
                onClick={onUseSimulatedLocation}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-black border-2 transition-all cursor-pointer ${
                  isHighContrast
                    ? 'bg-yellow-400 text-black border-white'
                    : 'bg-amber-500 text-neutral-950 border-amber-400'
                }`}
              >
                <span>Use Simulated GPS</span>
              </button>
            )}
          </div>
        </div>

        {/* Location Denied or Unavailable Warning Banner (Requirement 11) */}
        {locationStatus === 'denied' && (
          <div
            id="nav-location-denied-alert"
            role="alert"
            className={`mt-3 p-3.5 rounded-xl border-2 flex items-start sm:items-center justify-between gap-3 ${
              isHighContrast
                ? 'bg-yellow-950/80 border-yellow-400 text-yellow-200'
                : 'bg-amber-950/80 border-amber-500 text-amber-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <div className="text-xs sm:text-sm font-bold">
                Location access was denied. You can enable it in browser settings or use simulated location for prototype testing.
              </div>
            </div>
            <button
              type="button"
              onClick={onUseSimulatedLocation}
              className={`px-3 py-1.5 rounded-lg text-xs font-black border whitespace-nowrap cursor-pointer ${
                isHighContrast
                  ? 'bg-yellow-400 text-black border-white'
                  : 'bg-amber-500 text-neutral-950 border-amber-300'
              }`}
            >
              Simulate GPS
            </button>
          </div>
        )}

        {/* High-Priority Obstacle Detection Banner (Requirement 8) */}
        {isNavigating && hasObstacleConflict && (
          <div
            id="nav-obstacle-conflict-banner"
            role="alert"
            aria-live="assertive"
            className={`mt-4 p-4 rounded-2xl border-4 flex items-center gap-3 shadow-2xl animate-pulse ${
              isHighContrast
                ? 'bg-red-950 border-red-500 text-red-200'
                : 'bg-red-900/90 border-red-500 text-red-100'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center flex-shrink-0 font-black">
              <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="flex-1">
              <div className="text-xs uppercase font-extrabold tracking-wider text-red-300">
                PRIORITY SAFETY OVERRIDE ACTIVE
              </div>
              <div className="text-lg sm:text-xl font-black leading-tight">
                {obstacleWarningText || 'Obstacle ahead. Please proceed carefully.'}
              </div>
              <p className="text-xs font-semibold opacity-90 mt-0.5">
                Normal navigation turn instructions paused until path ahead is safe.
              </p>
            </div>
          </div>
        )}

        {/* Destination Input & Voice Trigger Row (Requirements 1 & 3) */}
        <div className="mt-4">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none opacity-60">
                <MapPin className="w-5 h-5" />
              </div>
              <input
                id="destination-text-input"
                type="text"
                value={destinationInput}
                onChange={(e) => onDestinationInputChange(e.target.value)}
                placeholder="Where to? (e.g. 'Pharmacy', 'Hospital', 'Station')"
                aria-label="Enter destination"
                className={`w-full pl-11 pr-4 py-3.5 sm:py-4 rounded-2xl font-bold text-base sm:text-lg border-3 transition-all focus:outline-none focus:ring-4 ${
                  isHighContrast
                    ? 'bg-neutral-950 border-yellow-400 text-yellow-300 placeholder:text-yellow-400/50 focus:ring-yellow-400'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-100 placeholder:text-neutral-400 focus:border-sky-500 focus:ring-sky-500/30'
                }`}
              />
            </div>

            <div className="flex items-center gap-2">
              {/* Voice Destination Mic Button (Requirement 1 & 3) */}
              <button
                id="destination-voice-mic-button"
                type="button"
                onClick={onToggleDestinationVoiceInput}
                className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-3.5 sm:py-4 rounded-2xl font-black text-base sm:text-lg border-3 shadow-lg transition-all cursor-pointer focus:outline-none focus:ring-4 ${
                  isListeningForDestination
                    ? 'bg-red-600 text-white border-white animate-pulse'
                    : isHighContrast
                    ? 'bg-neutral-900 border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700'
                }`}
                title="Speak destination (e.g. 'Take me to the pharmacy')"
                aria-label="Speak destination"
              >
                {isListeningForDestination ? (
                  <>
                    <MicOff className="w-6 h-6" />
                    <span>LISTENING...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-6 h-6" />
                    <span>SPEAK</span>
                  </>
                )}
              </button>

              {/* Find Route Button */}
              <button
                id="destination-search-button"
                type="submit"
                disabled={!destinationInput.trim() || navStatus === 'searching'}
                className={`flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl font-black text-base sm:text-lg border-3 shadow-xl transition-all cursor-pointer focus:outline-none focus:ring-4 ${
                  !destinationInput.trim() || navStatus === 'searching'
                    ? 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed'
                    : isHighContrast
                    ? 'bg-yellow-400 text-black border-white hover:bg-yellow-300 active:scale-95'
                    : 'bg-sky-500 text-neutral-950 border-sky-400 hover:bg-sky-400 active:scale-95'
                }`}
              >
                <Search className="w-6 h-6 stroke-[2.5]" />
                <span>FIND ROUTE</span>
              </button>
            </div>
          </form>

          {/* Quick Destination Shortcut Pills (Requirement 1 Examples) */}
          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-extrabold opacity-75 whitespace-nowrap">
              Quick Suggestions:
            </span>
            {QUICK_DESTINATIONS.map((dest) => (
              <button
                key={dest}
                type="button"
                onClick={() => {
                  onDestinationInputChange(dest);
                  onSearchAndRoute(dest);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer whitespace-nowrap ${
                  isHighContrast
                    ? 'bg-neutral-900 border-yellow-400/70 text-yellow-300 hover:bg-yellow-400 hover:text-black'
                    : 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-sky-600 hover:text-white'
                }`}
              >
                {dest}
              </button>
            ))}
          </div>
        </div>

        {/* 4 Required Status Fields: NAVIGATION ACTIVE, DESTINATION, NEXT INSTRUCTION, CURRENT LOCATION (Requirement 9) */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Status 1: NAVIGATION ACTIVE */}
          <div
            id="nav-status-card"
            className={`p-3.5 rounded-xl border-2 flex flex-col justify-between ${
              isNavigating
                ? isHighContrast
                  ? 'bg-neutral-950 border-yellow-400 text-yellow-300'
                  : 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                : isHighContrast
                ? 'bg-neutral-950 border-neutral-700 text-neutral-400'
                : 'bg-neutral-800/70 border-neutral-700 text-neutral-400'
            }`}
          >
            <div className="text-[11px] uppercase font-black tracking-wider opacity-80">
              NAVIGATION STATUS
            </div>
            <div className="text-lg sm:text-xl font-black mt-1 flex items-center gap-2">
              <span
                className={`w-3.5 h-3.5 rounded-full ${
                  isNavigating
                    ? 'bg-emerald-400 animate-ping'
                    : 'bg-neutral-600'
                }`}
              />
              <span>{isNavigating ? 'NAVIGATION ACTIVE' : 'NAVIGATION STANDBY'}</span>
            </div>
          </div>

          {/* Status 2: DESTINATION */}
          <div
            id="nav-destination-card"
            className={`p-3.5 rounded-xl border-2 flex flex-col justify-between ${
              selectedDestination
                ? isHighContrast
                  ? 'bg-neutral-950 border-yellow-400 text-yellow-300'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-100'
                : isHighContrast
                ? 'bg-neutral-950 border-neutral-800 text-neutral-500'
                : 'bg-neutral-800/50 border-neutral-800 text-neutral-500'
            }`}
          >
            <div className="text-[11px] uppercase font-black tracking-wider opacity-80">
              DESTINATION
            </div>
            <div className="text-base sm:text-lg font-black mt-1 truncate" title={selectedDestination || 'None set'}>
              {selectedDestination || 'No destination set'}
            </div>
          </div>

          {/* Status 3: NEXT INSTRUCTION */}
          <div
            id="nav-instruction-card"
            className={`p-3.5 rounded-xl border-2 flex flex-col justify-between ${
              activeStep
                ? isHighContrast
                  ? 'bg-neutral-950 border-yellow-400 text-yellow-300'
                  : 'bg-sky-950/60 border-sky-500 text-sky-200'
                : isHighContrast
                ? 'bg-neutral-950 border-neutral-800 text-neutral-500'
                : 'bg-neutral-800/50 border-neutral-800 text-neutral-500'
            }`}
          >
            <div className="text-[11px] uppercase font-black tracking-wider opacity-80">
              NEXT INSTRUCTION
            </div>
            <div className="text-base sm:text-lg font-black mt-1 truncate" title={activeStep?.instruction || 'Await route'}>
              {activeStep ? activeStep.instruction : 'Await route generation'}
            </div>
          </div>

          {/* Status 4: CURRENT LOCATION */}
          <div
            id="nav-location-card"
            className={`p-3.5 rounded-xl border-2 flex flex-col justify-between ${
              currentLocation
                ? isHighContrast
                  ? 'bg-neutral-950 border-yellow-400 text-yellow-300'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-200'
                : isHighContrast
                ? 'bg-neutral-950 border-neutral-800 text-neutral-500'
                : 'bg-neutral-800/50 border-neutral-800 text-neutral-500'
            }`}
          >
            <div className="text-[11px] uppercase font-black tracking-wider opacity-80">
              CURRENT LOCATION
            </div>
            <div className="text-xs sm:text-sm font-black mt-1 font-mono">
              {currentLocation ? (
                <>
                  <div>
                    {currentLocation.latitude.toFixed(4)}°, {currentLocation.longitude.toFixed(4)}°
                  </div>
                  <div className="text-[11px] opacity-75 font-sans font-bold">
                    Acc: ±{currentLocation.accuracy || 10}m {locationStatus === 'simulated' && '(Simulated)'}
                  </div>
                </>
              ) : (
                <span className="font-sans text-xs">Locating GPS...</span>
              )}
            </div>
          </div>
        </div>

        {/* Active Route Step & Navigation Controls (Requirements 5, 6, 10, 14, 15) */}
        {route && (
          <div
            id="active-route-display-card"
            className={`mt-4 p-4 sm:p-6 rounded-2xl border-3 shadow-xl ${
              isHighContrast
                ? 'bg-neutral-950 border-yellow-400 text-yellow-300'
                : 'bg-neutral-800/95 border-sky-500/60 text-neutral-100'
            }`}
          >
            {/* Active Turn-by-Turn Big Banner */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-inherit/30">
              <div className="flex items-center gap-4">
                {/* Large Direction Indicator Icon */}
                <div
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center border-3 flex-shrink-0 shadow-xl ${
                    activeStep?.direction === 'arrive'
                      ? 'bg-emerald-500 text-neutral-950 border-emerald-300'
                      : isHighContrast
                      ? 'bg-yellow-400 text-black border-white'
                      : 'bg-sky-500 text-neutral-950 border-sky-400'
                  }`}
                >
                  {activeStep && getDirectionIcon(activeStep.direction, 'w-10 h-10 sm:w-12 sm:h-12 stroke-[3]')}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs uppercase font-extrabold px-2 py-0.5 rounded-lg border ${
                        isHighContrast
                          ? 'bg-yellow-400 text-black border-white'
                          : 'bg-sky-500 text-neutral-950 border-sky-300'
                      }`}
                    >
                      Step {currentStepIndex + 1} of {route.steps.length}
                    </span>
                    <span className="text-xs font-bold opacity-75">
                      Distance: ~{route.totalDistanceMeters}m ({route.estimatedWalkingMinutes} min walk)
                    </span>
                  </div>

                  {/* Spoken Turn Instruction (Requirement 6) */}
                  <div
                    id="nav-spoken-instruction-text"
                    className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tight leading-snug mt-1"
                  >
                    &ldquo;{activeStep?.instruction || 'Follow route.'}&rdquo;
                  </div>

                  {/* Upcoming Following Step Preview */}
                  {nextStep && (
                    <div className="text-xs sm:text-sm font-semibold opacity-75 mt-1 flex items-center gap-1.5">
                      <span>Then:</span>
                      <span className="font-bold">{nextStep.instruction}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Start / Stop Navigation Large Action Buttons (Requirement 10) */}
              <div className="flex flex-wrap items-center gap-2 self-stretch md:self-center">
                {!isNavigating ? (
                  <button
                    id="nav-start-button"
                    type="button"
                    onClick={onStartNavigation}
                    className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 sm:px-8 py-4 rounded-2xl font-black text-lg sm:text-xl border-3 shadow-xl transition-all cursor-pointer focus:outline-none focus:ring-4 ${
                      isHighContrast
                        ? 'bg-yellow-400 text-black border-white hover:bg-yellow-300 active:scale-95'
                        : 'bg-emerald-500 text-neutral-950 border-emerald-400 hover:bg-emerald-400 active:scale-95'
                    }`}
                    aria-label="Start Navigation"
                  >
                    <Play className="w-6 h-6 fill-current" />
                    <span>START NAVIGATION</span>
                  </button>
                ) : (
                  <button
                    id="nav-stop-button"
                    type="button"
                    onClick={onStopNavigation}
                    className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-6 sm:px-8 py-4 rounded-2xl font-black text-lg sm:text-xl border-3 shadow-xl transition-all cursor-pointer focus:outline-none focus:ring-4 ${
                      isHighContrast
                        ? 'bg-red-600 text-white border-white hover:bg-red-500 active:scale-95'
                        : 'bg-red-600 text-white border-red-400 hover:bg-red-500 active:scale-95'
                    }`}
                    aria-label="Stop Navigation"
                  >
                    <Square className="w-6 h-6 fill-current" />
                    <span>STOP NAVIGATION</span>
                  </button>
                )}

                {/* Repeat Instruction Button */}
                <button
                  type="button"
                  onClick={onRepeatInstruction}
                  className={`px-4 py-4 rounded-2xl font-black border-3 transition-all cursor-pointer shadow-md ${
                    isHighContrast
                      ? 'bg-neutral-900 border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black'
                      : 'bg-neutral-700 border-neutral-600 text-neutral-200 hover:bg-neutral-600'
                  }`}
                  title="Hear active instruction again"
                  aria-label="Repeat instruction"
                >
                  <Volume2 className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Step Controls: Previous Step / Next Step manual progression for testing or walking */}
            <div className="mt-4 pt-2 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onPrevStep}
                  disabled={currentStepIndex === 0}
                  className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-black text-sm border-2 transition-all cursor-pointer ${
                    currentStepIndex === 0
                      ? 'opacity-40 border-neutral-700 cursor-not-allowed'
                      : isHighContrast
                      ? 'bg-neutral-900 border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black'
                      : 'bg-neutral-700 border-neutral-600 text-neutral-200 hover:bg-neutral-600'
                  }`}
                  aria-label="Previous step"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Previous Step</span>
                </button>

                <button
                  type="button"
                  onClick={onNextStep}
                  disabled={currentStepIndex >= route.steps.length - 1}
                  className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-black text-sm border-2 transition-all cursor-pointer ${
                    currentStepIndex >= route.steps.length - 1
                      ? 'opacity-40 border-neutral-700 cursor-not-allowed'
                      : isHighContrast
                      ? 'bg-yellow-400 text-black border-white hover:bg-yellow-300'
                      : 'bg-sky-500 text-neutral-950 border-sky-300 hover:bg-sky-400'
                  }`}
                  aria-label="Next step"
                >
                  <span>Next Step</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Toggle complete step list */}
              <button
                type="button"
                onClick={() => setShowAllSteps(!showAllSteps)}
                className={`text-xs sm:text-sm font-bold underline cursor-pointer opacity-80 hover:opacity-100`}
              >
                {showAllSteps ? 'Hide Full Route List' : `View All ${route.steps.length} Steps`}
              </button>
            </div>

            {/* Full Steps Itinerary Dropdown / List */}
            {showAllSteps && (
              <div className="mt-4 pt-3 border-t border-inherit/25 space-y-2">
                {route.steps.map((st, idx) => (
                  <div
                    key={st.id || idx}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs sm:text-sm font-bold ${
                      idx === currentStepIndex
                        ? isHighContrast
                          ? 'bg-yellow-400 text-black border-white'
                          : 'bg-sky-500 text-neutral-950 border-sky-300'
                        : idx < currentStepIndex
                        ? 'opacity-50 line-through bg-neutral-900 border-neutral-800'
                        : isHighContrast
                        ? 'bg-neutral-900 border-yellow-400/50 text-yellow-300'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full border flex items-center justify-center text-xs font-black">
                        {idx + 1}
                      </span>
                      <span>{st.instruction}</span>
                    </div>
                    {st.distanceMeters > 0 && (
                      <span className="opacity-80 text-xs">{st.distanceMeters}m</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Safety Disclaimer (Requirements 12 & 13) */}
        <div className="mt-4 pt-3 border-t border-inherit/30 flex items-start gap-2 text-xs opacity-80 font-semibold">
          <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            <strong>Safety Notice (Prototype):</strong> This experimental navigation prototype does not guarantee physical safety, sidewalk accessibility, or absence of moving obstacles. Always exercise caution, rely on cane/guide tools, and stay alert to surrounding conditions.
          </span>
        </div>
      </div>
    </section>
  );
};
