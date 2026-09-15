import React from 'react';
import { SosStatus, GeoCoordinates, GeolocationStatus } from '../types';
import { TriangleAlert, Phone, User, XCircle, CheckCircle, Navigation } from 'lucide-react';

interface EmergencySOSPanelProps {
  contactName: string;
  contactPhone: string;
  onContactChange: (name: string, phone: string) => void;
  sosStatus: SosStatus;
  countdown: number;
  onTriggerSOS: () => void;
  onConfirmSOS: () => void;
  onCancelSOS: () => void;
  onResetSOS: () => void;
  currentLocation: GeoCoordinates | null;
  locationStatus: GeolocationStatus;
  isHighContrast: boolean;
  isTestMode: boolean;
}

export const EmergencySOSPanel: React.FC<EmergencySOSPanelProps> = ({
  contactName,
  contactPhone,
  onContactChange,
  sosStatus,
  countdown,
  onTriggerSOS,
  onConfirmSOS,
  onCancelSOS,
  onResetSOS,
  currentLocation,
  locationStatus,
  isHighContrast,
  isTestMode,
}) => {
  const panelBg = isHighContrast ? 'bg-black border-red-600' : 'bg-red-950 border-red-900';
  const textPrimary = isHighContrast ? 'text-white' : 'text-neutral-100';
  const inputBg = isHighContrast ? 'bg-neutral-900 border-white/20' : 'bg-neutral-800 border-neutral-700';

  if (sosStatus === 'sent') {
    return (
      <div className={`p-4 mx-4 my-2 border-4 rounded-xl flex flex-col gap-4 ${panelBg}`}>
        <div className="flex flex-col items-center justify-center text-center gap-3">
          <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center animate-pulse">
            <TriangleAlert size={32} className="text-white" />
          </div>
          <h2 className={`text-2xl font-black uppercase ${textPrimary}`}>SOS Activated</h2>
          <p className="text-red-400 font-bold px-3 py-1 bg-red-950/50 rounded-lg text-sm border border-red-900">
            {isTestMode ? 'TEST MODE — NO REAL EMERGENCY ALERTS' : 'Prototype — No real emergency message has been sent.'}
          </p>
        </div>

        <div className={`p-4 rounded-xl border border-white/10 ${isHighContrast ? 'bg-neutral-900' : 'bg-neutral-800'}`}>
          <h3 className={`font-bold mb-2 ${textPrimary}`}>Simulated Message Content:</h3>
          <p className="text-sm text-neutral-300 mb-2">
            "EMERGENCY: User has triggered an SOS alert and needs immediate assistance."
          </p>
          
          {contactName && contactPhone && (
            <div className="mt-3 p-3 bg-neutral-950 rounded-lg text-sm text-neutral-300">
              <span className="block font-bold mb-1">To:</span>
              {contactName} ({contactPhone})
            </div>
          )}

          <div className="mt-3 flex items-start gap-2 text-sm text-neutral-300">
            <Navigation size={16} className="mt-0.5 shrink-0" />
            <div>
              <span className="block font-bold">Location:</span>
              {(locationStatus === 'available' || locationStatus === 'simulated') && currentLocation ? (
                <span>Lat: {currentLocation.latitude.toFixed(5)}, Lng: {currentLocation.longitude.toFixed(5)}</span>
              ) : (
                <span className="text-red-400">Location unavailable</span>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={onResetSOS}
          className="w-full py-4 bg-neutral-700 hover:bg-neutral-600 text-white rounded-xl font-bold text-lg uppercase transition-colors"
        >
          Reset System
        </button>
      </div>
    );
  }

  if (sosStatus === 'countdown') {
    return (
      <div className={`p-4 mx-4 my-2 border-4 rounded-xl flex flex-col items-center justify-center gap-6 ${panelBg}`}>
        <h2 className={`text-2xl font-black uppercase text-center ${textPrimary}`}>Sending SOS in...</h2>
        <div className="text-8xl font-black text-red-500 animate-pulse">
          {countdown}
        </div>
        <button
          onClick={onCancelSOS}
          className="w-full py-5 bg-neutral-200 hover:bg-white text-black rounded-xl font-black text-2xl uppercase transition-colors flex items-center justify-center gap-3 shadow-lg"
        >
          <XCircle size={32} />
          Cancel
        </button>
      </div>
    );
  }

  if (sosStatus === 'confirming') {
    return (
      <div className={`p-4 mx-4 my-2 border-4 rounded-xl flex flex-col gap-4 ${panelBg}`}>
        <h2 className={`text-2xl font-black uppercase text-center ${textPrimary}`}>Emergency assistance requested.</h2>
        <h3 className="text-xl font-bold text-red-500 text-center">Send SOS?</h3>
        
        <div className="flex flex-col gap-3 mt-4">
          <button
            onClick={onConfirmSOS}
            className="w-full py-5 bg-red-600 hover:bg-red-500 text-white rounded-xl font-black text-2xl uppercase transition-colors shadow-lg shadow-red-900/50 flex items-center justify-center gap-3"
          >
            <CheckCircle size={28} />
            SEND SOS
          </button>
          <button
            onClick={onCancelSOS}
            className="w-full py-5 bg-neutral-200 hover:bg-white text-black rounded-xl font-black text-2xl uppercase transition-colors flex items-center justify-center gap-3"
          >
            <XCircle size={28} />
            CANCEL
          </button>
        </div>
      </div>
    );
  }

  // Idle state
  return (
    <div className={`p-4 mx-4 my-2 border-2 rounded-xl flex flex-col gap-4 transition-colors ${isHighContrast ? 'bg-black border-red-900/50' : 'bg-neutral-900 border-neutral-800'}`}>
      <button
        onClick={onTriggerSOS}
        className="w-full py-6 bg-red-600 hover:bg-red-500 text-white rounded-2xl font-black text-3xl uppercase transition-colors shadow-lg shadow-red-900/50 flex items-center justify-center gap-4 active:scale-95"
      >
        <TriangleAlert size={36} />
        SOS / EMERGENCY
      </button>

      <div className={`mt-2 p-4 rounded-xl border border-white/10 ${isHighContrast ? 'bg-neutral-950' : 'bg-neutral-800'}`}>
        <h3 className={`font-bold mb-3 ${textPrimary} flex items-center gap-2`}>
          Emergency Contact Setup
        </h3>
        
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <User size={14} /> Name
            </label>
            <input
              type="text"
              value={contactName}
              onChange={(e) => onContactChange(e.target.value, contactPhone)}
              className={`w-full px-4 py-3 rounded-lg border text-base focus:ring-2 focus:ring-red-500 outline-none transition-colors ${inputBg} ${textPrimary}`}
              placeholder="e.g. Caregiver Name"
            />
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
              <Phone size={14} /> Phone Number
            </label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => onContactChange(contactName, e.target.value)}
              className={`w-full px-4 py-3 rounded-lg border text-base focus:ring-2 focus:ring-red-500 outline-none transition-colors ${inputBg} ${textPrimary}`}
              placeholder="e.g. +1 555-0198"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
