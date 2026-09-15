import React, { useState, useRef } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  Camera,
  Upload,
  ShieldCheck,
  ShieldAlert,
  ToggleLeft,
  ToggleRight,
  Eye,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import {
  TrustedPersonProfile,
  RecognizedPerson,
  DetectedItem,
} from '../types';
import {
  extractFaceDescriptorFromCanvas,
  extractFaceDescriptorFromImageFile,
  extractFaceDescriptorFromVideo,
  createTrustedProfile,
} from '../services/trustedPersonService';

interface TrustedPersonPanelProps {
  profiles: TrustedPersonProfile[];
  onProfilesChange: (updated: TrustedPersonProfile[]) => void;
  isRecognitionEnabled: boolean;
  onToggleRecognition: () => void;
  onDeleteAllProfiles: () => void;
  onResetSampleProfiles: () => void;
  isCameraRunning: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  activeRecognizedPeople: RecognizedPerson[];
  isHighContrast: boolean;
  onAnnounceFeedback?: (message: string) => void;
  onVoiceAnnouncement?: (message: string) => void;
  detections?: DetectedItem[];
}

export const TrustedPersonPanel: React.FC<TrustedPersonPanelProps> = ({
  profiles,
  onProfilesChange,
  isRecognitionEnabled,
  onToggleRecognition,
  onDeleteAllProfiles,
  onResetSampleProfiles,
  isCameraRunning,
  videoRef,
  activeRecognizedPeople,
  isHighContrast,
  onAnnounceFeedback,
  onVoiceAnnouncement,
  detections = [],
}) => {
  const [newPersonName, setNewPersonName] = useState('');
  const [newPersonRole, setNewPersonRole] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showConfirmDeleteAll, setShowConfirmDeleteAll] = useState(false);
  const [captureStatusMessage, setCaptureStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const targetProfileIdRef = useRef<string | null>(null);

  // Safe notification helper that handles both prop variants
  const notifyFeedback = (message: string) => {
    if (typeof onAnnounceFeedback === 'function') {
      onAnnounceFeedback(message);
    } else if (typeof onVoiceAnnouncement === 'function') {
      onVoiceAnnouncement(message);
    }
  };

  // Handle Add Profile Form Submission
  const handleAddProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newPersonName.trim();
    if (!trimmedName) return;

    const newProfile = createTrustedProfile(trimmedName, newPersonRole);
    const updated = [newProfile, ...profiles];
    onProfilesChange(updated);
    setSelectedProfileId(newProfile.id);
    targetProfileIdRef.current = newProfile.id;
    setNewPersonName('');
    setNewPersonRole('');

    const msg = `Added trusted profile for ${trimmedName}. Now capture or upload a face photo.`;
    setCaptureStatusMessage(msg);
    notifyFeedback(msg);
  };

  // Handle Delete Single Profile
  const handleDeleteProfile = (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    const updated = profiles.filter((p) => p.id !== profileId);
    onProfilesChange(updated);
    if (selectedProfileId === profileId) {
      setSelectedProfileId(null);
      targetProfileIdRef.current = null;
    }
    const msg = profile
      ? `Deleted profile for ${profile.name}.`
      : 'Deleted trusted profile.';
    setCaptureStatusMessage(msg);
    notifyFeedback(msg);
  };

  // Handle Delete All Profiles
  const handleConfirmDeleteAll = () => {
    onDeleteAllProfiles();
    setShowConfirmDeleteAll(false);
    setSelectedProfileId(null);
    targetProfileIdRef.current = null;
    const msg = 'All registered face profiles have been deleted.';
    setCaptureStatusMessage(msg);
    notifyFeedback(msg);
  };

  // Capture Face Snapshot From Live Active Camera (Requirements 2, 9, 10, 11, 12)
  const handleCaptureFaceFromCamera = (profileId: string) => {
    if (!isCameraRunning || !videoRef.current) {
      const err = 'Camera is not active. Please start camera first.';
      setCaptureStatusMessage(err);
      notifyFeedback(err);
      return;
    }

    const video = videoRef.current;
    if (video.readyState < 2 || video.videoWidth <= 0 || video.videoHeight <= 0) {
      const err = 'Camera stream is still starting up. Please wait a moment and try again.';
      setCaptureStatusMessage(err);
      notifyFeedback(err);
      return;
    }

    setIsCapturing(true);

    try {
      const vidW = video.videoWidth;
      const vidH = video.videoHeight;

      // Check detected persons from live detection pipeline
      const visiblePersons = (detections || []).filter(
        (d) => d.label.toLowerCase() === 'person'
      );

      let cropArea: { x: number; y: number; width: number; height: number };
      let captureNote = '';

      if (visiblePersons.length > 0) {
        // Requirement 11: Prevent crashes when multiple faces/persons are visible
        // Choose the primary person in the center or largest box
        const primaryPerson = [...visiblePersons].sort((a, b) => {
          if (a.position === 'Center' && b.position !== 'Center') return -1;
          if (b.position === 'Center' && a.position !== 'Center') return 1;
          return b.relativeArea - a.relativeArea;
        })[0];

        const [px, py, pw, ph] = primaryPerson.bbox;
        const headW = Math.max(24, Math.min(vidW, Math.floor(pw * 0.72)));
        const headH = Math.max(24, Math.min(vidH, Math.floor(ph * 0.42)));
        const headX = Math.max(0, Math.min(vidW - headW, Math.floor(px + (pw - headW) / 2)));
        const headY = Math.max(0, Math.min(vidH - headH, Math.floor(py + ph * 0.02)));

        cropArea = { x: headX, y: headY, width: headW, height: headH };

        if (visiblePersons.length > 1) {
          captureNote = ` (selected primary person in center from ${visiblePersons.length} people)`;
        }
      } else {
        // Requirement 10: Prevent crashes when no face/person is detected yet
        // Fallback to upper-center portrait region of the active webcam stream
        const cropW = Math.round(vidW * 0.55);
        const cropH = Math.round(vidH * 0.65);
        const cropX = Math.round((vidW - cropW) / 2);
        const cropY = Math.round((vidH - cropH) * 0.35);

        cropArea = { x: cropX, y: cropY, width: cropW, height: cropH };
      }

      const offscreen = document.createElement('canvas');
      offscreen.width = vidW;
      offscreen.height = vidH;
      const ctx = offscreen.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('Canvas not supported in this environment');
      ctx.drawImage(video, 0, 0, vidW, vidH);

      const { descriptor, thumbnailDataUrl } = extractFaceDescriptorFromCanvas(offscreen, cropArea);

      const updated = profiles.map((p) => {
        if (p.id === profileId) {
          const newSample = {
            id: `sample-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            dataUrl: thumbnailDataUrl,
            descriptor,
            timestamp: Date.now(),
          };
          return {
            ...p,
            faceSamples: [...p.faceSamples, newSample],
          };
        }
        return p;
      });

      onProfilesChange(updated);
      const target = profiles.find((p) => p.id === profileId);
      const msg = `Captured face for ${target?.name || 'profile'}${captureNote}. Face stored securely in local browser storage.`;
      setCaptureStatusMessage(msg);
      notifyFeedback(msg);
    } catch (err: any) {
      console.warn('Camera face capture issue:', err);
      // Requirement 12: Clear user-friendly error and allow retry
      const errMsg =
        err?.message && err.message.includes('dark')
          ? 'Camera view is too dark. Please face the camera with good lighting and try again.'
          : 'Failed to capture face from camera. Please face the webcam directly and try again, or use "Upload Photo".';
      setCaptureStatusMessage(errMsg);
      notifyFeedback(errMsg);
    } finally {
      setIsCapturing(false);
    }
  };

  // Handle Photo File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, profileId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCapturing(true);
    try {
      const { descriptor, thumbnailDataUrl } = await extractFaceDescriptorFromImageFile(file);

      const updated = profiles.map((p) => {
        if (p.id === profileId) {
          const newSample = {
            id: `sample-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            dataUrl: thumbnailDataUrl,
            descriptor,
            timestamp: Date.now(),
          };
          return {
            ...p,
            faceSamples: [...p.faceSamples, newSample],
          };
        }
        return p;
      });

      onProfilesChange(updated);
      const target = profiles.find((p) => p.id === profileId);
      const msg = `Uploaded face photo for ${target?.name || 'profile'}. Face descriptor saved locally.`;
      setCaptureStatusMessage(msg);
      notifyFeedback(msg);
    } catch (err) {
      console.error('File face upload error:', err);
      const errTxt = 'Failed to process face photo. Please select another image.';
      setCaptureStatusMessage(errTxt);
      notifyFeedback(errTxt);
    } finally {
      setIsCapturing(false);
      if (e.target) e.target.value = '';
    }
  };

  // Remove Single Face Sample From Profile
  const handleRemoveSample = (profileId: string, sampleId: string) => {
    const updated = profiles.map((p) => {
      if (p.id === profileId) {
        return {
          ...p,
          faceSamples: p.faceSamples.filter((s) => s.id !== sampleId),
        };
      }
      return p;
    });
    onProfilesChange(updated);
    setCaptureStatusMessage('Face sample removed.');
    notifyFeedback('Face sample removed.');
  };

  return (
    <section
      id="trusted-person-recognition-section"
      aria-label="Trusted Person Recognition"
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 mb-4"
    >
      <div
        className={`p-4 sm:p-6 rounded-2xl border-4 shadow-2xl transition-all ${
          isHighContrast
            ? 'bg-black border-yellow-400 text-yellow-300'
            : 'bg-neutral-900 border-neutral-800 text-neutral-100'
        }`}
      >
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-inherit/40">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 shadow-md ${
                isHighContrast
                  ? 'bg-yellow-400 text-black border-white'
                  : 'bg-indigo-600 text-white border-indigo-400'
              }`}
            >
              <Users className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                  Trusted People
                </h2>
                <span
                  className={`text-xs uppercase font-extrabold px-2.5 py-0.5 rounded-full border ${
                    isRecognitionEnabled
                      ? isHighContrast
                        ? 'bg-yellow-400 text-black border-white'
                        : 'bg-emerald-500 text-neutral-950 border-emerald-400'
                      : isHighContrast
                      ? 'bg-neutral-900 border-yellow-400 text-yellow-300'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}
                >
                  {isRecognitionEnabled ? 'Recognition Active' : 'Recognition Paused'}
                </span>
              </div>
              <p className="text-xs sm:text-sm font-medium opacity-80 mt-0.5">
                Privacy-first facial recognition for explicitly registered trusted people.
              </p>
            </div>
          </div>

          {/* Action Buttons: Enable/Disable Toggle & Delete All */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            {/* Enable/Disable Toggle Button (Requirement 4) */}
            <button
              id="toggle-recognition-button"
              type="button"
              onClick={onToggleRecognition}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-xs sm:text-sm border-2 transition-all cursor-pointer shadow-md ${
                isRecognitionEnabled
                  ? isHighContrast
                    ? 'bg-yellow-400 text-black border-white hover:bg-yellow-300'
                    : 'bg-emerald-500 text-neutral-950 border-emerald-300 hover:bg-emerald-400'
                  : isHighContrast
                  ? 'bg-neutral-900 border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
              }`}
              aria-label={
                isRecognitionEnabled
                  ? 'Disable Trusted Person Recognition'
                  : 'Enable Trusted Person Recognition'
              }
            >
              {isRecognitionEnabled ? (
                <>
                  <ToggleRight className="w-5 h-5 fill-current" />
                  <span>RECOGNITION ON</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="w-5 h-5 fill-current" />
                  <span>RECOGNITION OFF</span>
                </>
              )}
            </button>

            {/* Reset to Samples button */}
            <button
              id="reset-sample-profiles-button"
              type="button"
              onClick={onResetSampleProfiles}
              className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-black border-2 transition-all cursor-pointer ${
                isHighContrast
                  ? 'bg-neutral-900 border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black'
                  : 'bg-neutral-800 border-neutral-700 text-neutral-200 hover:bg-neutral-700'
              }`}
              title="Reset to demo sample profiles (Rahul & Sarah)"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Load Samples</span>
            </button>

            {/* Delete All Profiles Button (Requirement 14) */}
            {profiles.length > 0 && (
              <button
                id="delete-all-profiles-button"
                type="button"
                onClick={() => setShowConfirmDeleteAll(true)}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-black border-2 transition-all cursor-pointer ${
                  isHighContrast
                    ? 'bg-red-950 border-red-500 text-red-200 hover:bg-red-500 hover:text-white'
                    : 'bg-red-900/60 border-red-600 text-red-100 hover:bg-red-600'
                }`}
                title="Delete all registered face profiles"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete All</span>
              </button>
            )}
          </div>
        </div>

        {/* Strict Privacy Notice (Requirements 11, 12, 13) */}
        <div
          id="trusted-person-privacy-notice"
          role="note"
          className={`mt-4 p-3.5 sm:p-4 rounded-xl border-2 flex items-start gap-3 shadow-inner ${
            isHighContrast
              ? 'bg-yellow-950/40 border-yellow-400 text-yellow-200'
              : 'bg-indigo-950/40 border-indigo-500/80 text-indigo-200'
          }`}
        >
          <ShieldCheck className="w-6 h-6 flex-shrink-0 mt-0.5 text-inherit" />
          <div className="text-xs sm:text-sm leading-relaxed">
            <p className="font-black tracking-wide uppercase text-xs">
              Privacy Notice & Data Security
            </p>
            <p className="font-bold mt-0.5">
              Face recognition is only for people you have explicitly registered.
            </p>
            <p className="opacity-90 mt-1">
              All face images and mathematical feature vectors are processed and stored{' '}
              <strong>100% locally in your browser's private storage</strong>. No face data is
              ever uploaded, transmitted, or stored on external cloud servers.
            </p>
          </div>
        </div>

        {/* Delete All Confirmation Dialog */}
        {showConfirmDeleteAll && (
          <div
            role="alertdialog"
            aria-labelledby="delete-all-title"
            className={`mt-3 p-4 rounded-xl border-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
              isHighContrast
                ? 'bg-red-950 border-red-500 text-white'
                : 'bg-red-900/90 border-red-500 text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 flex-shrink-0 text-yellow-300" />
              <div>
                <p id="delete-all-title" className="font-black text-sm sm:text-base">
                  Delete all registered face profiles?
                </p>
                <p className="text-xs opacity-90">
                  This permanently removes all stored face images and recognition descriptors.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                type="button"
                onClick={() => setShowConfirmDeleteAll(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-black bg-neutral-800 text-neutral-200 hover:bg-neutral-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                className="px-4 py-1.5 rounded-lg text-xs font-black bg-red-600 text-white hover:bg-red-500 border border-white cursor-pointer"
              >
                Confirm Delete All
              </button>
            </div>
          </div>
        )}

        {/* Active Recognition Live Banner (Requirements 5, 6, 7) */}
        {activeRecognizedPeople.length > 0 && isRecognitionEnabled && (
          <div
            id="active-recognized-people-banner"
            role="status"
            className={`mt-4 p-3.5 rounded-xl border-2 flex flex-wrap items-center gap-3 animate-pulse ${
              isHighContrast
                ? 'bg-yellow-400 text-black border-white'
                : 'bg-indigo-950 border-indigo-400 text-indigo-100'
            }`}
          >
            <div className="flex items-center gap-2 font-black text-xs sm:text-sm uppercase tracking-wider">
              <Sparkles className="w-5 h-5 fill-current" />
              <span>Recognized In View:</span>
            </div>
            {activeRecognizedPeople.map((p, idx) => (
              <div
                key={idx}
                className={`px-3 py-1 rounded-lg text-xs sm:text-sm font-black border flex items-center gap-2 ${
                  p.isRegistered
                    ? isHighContrast
                      ? 'bg-black text-yellow-300 border-white'
                      : 'bg-indigo-600 text-white border-indigo-300'
                    : isHighContrast
                    ? 'bg-neutral-900 text-white border-yellow-400'
                    : 'bg-neutral-800 text-neutral-200 border-neutral-600'
                }`}
              >
                {p.isRegistered && p.name ? (
                  <span>
                    {p.name} &bull; {p.position} ({p.proximity})
                  </span>
                ) : (
                  <span>Person detected &bull; {p.position}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Person Form (Requirements 2, 3, 4) */}
        <div
          id="add-trusted-person-container"
          className={`mt-4 p-4 rounded-xl border-2 ${
            isHighContrast
              ? 'bg-neutral-950 border-yellow-400/80'
              : 'bg-neutral-800/80 border-neutral-700'
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="w-5 h-5 text-inherit" />
            <h3 className="text-base sm:text-lg font-black tracking-tight">
              Add New Trusted Person
            </h3>
          </div>

          <form onSubmit={handleAddProfile} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label htmlFor="new-person-name-input" className="sr-only">
                Person's Full Name
              </label>
              <input
                id="new-person-name-input"
                type="text"
                value={newPersonName}
                onChange={(e) => setNewPersonName(e.target.value)}
                placeholder="e.g. Rahul, Dr. Sarah, Mom"
                className={`w-full px-4 py-3 rounded-xl font-bold text-sm sm:text-base border-2 transition-all focus:outline-none focus:ring-4 ${
                  isHighContrast
                    ? 'bg-black text-yellow-300 border-yellow-400 placeholder-yellow-600 focus:ring-yellow-400'
                    : 'bg-neutral-900 text-neutral-100 border-neutral-600 placeholder-neutral-500 focus:ring-indigo-500'
                }`}
                required
              />
            </div>

            <div className="w-full sm:w-48">
              <label htmlFor="new-person-role-input" className="sr-only">
                Relationship (Optional)
              </label>
              <input
                id="new-person-role-input"
                type="text"
                value={newPersonRole}
                onChange={(e) => setNewPersonRole(e.target.value)}
                placeholder="Relationship (optional)"
                className={`w-full px-4 py-3 rounded-xl font-medium text-sm border-2 transition-all focus:outline-none focus:ring-4 ${
                  isHighContrast
                    ? 'bg-black text-yellow-300 border-yellow-400 placeholder-yellow-600 focus:ring-yellow-400'
                    : 'bg-neutral-900 text-neutral-100 border-neutral-600 placeholder-neutral-500 focus:ring-indigo-500'
                }`}
              />
            </div>

            <button
              id="create-person-profile-button"
              type="submit"
              disabled={!newPersonName.trim()}
              className={`flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-black text-sm sm:text-base border-2 shadow-lg transition-all cursor-pointer ${
                !newPersonName.trim()
                  ? 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed'
                  : isHighContrast
                  ? 'bg-yellow-400 text-black border-white hover:bg-yellow-300 active:scale-95'
                  : 'bg-indigo-600 text-white border-indigo-400 hover:bg-indigo-500 active:scale-95'
              }`}
            >
              <UserPlus className="w-5 h-5" />
              <span>Create Profile</span>
            </button>
          </form>
        </div>

        {/* Hidden File Input for Image Upload */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const targetId = targetProfileIdRef.current || selectedProfileId;
            if (targetId) {
              handleFileUpload(e, targetId);
            }
          }}
        />

        {/* Registered Profiles List (Requirements 2, 3, 4, 14) */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span>Registered Trusted People ({profiles.length})</span>
            </h3>
            {captureStatusMessage && (
              <span className="text-xs font-bold px-2 py-1 rounded bg-neutral-800 text-neutral-300">
                {captureStatusMessage}
              </span>
            )}
          </div>

          {profiles.length === 0 ? (
            <div
              className={`p-6 rounded-xl border-2 text-center ${
                isHighContrast
                  ? 'bg-neutral-950 border-yellow-400/60'
                  : 'bg-neutral-800/40 border-neutral-700'
              }`}
            >
              <Users className="w-10 h-10 mx-auto opacity-50 mb-2" />
              <p className="font-bold text-sm sm:text-base">No trusted people registered yet.</p>
              <p className="text-xs opacity-75 mt-1">
                Create a profile above or click "Load Samples" to explore demo faces.
              </p>
              <button
                type="button"
                onClick={onResetSampleProfiles}
                className={`mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black border cursor-pointer ${
                  isHighContrast
                    ? 'bg-yellow-400 text-black border-white'
                    : 'bg-indigo-600 text-white border-indigo-400'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Load Demo Profiles (Rahul & Sarah)</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profiles.map((profile) => {
                const isSelected = selectedProfileId === profile.id;
                const sampleCount = profile.faceSamples.length;

                return (
                  <div
                    key={profile.id}
                    id={`profile-card-${profile.id}`}
                    className={`p-4 rounded-xl border-3 transition-all flex flex-col justify-between ${
                      isSelected
                        ? isHighContrast
                          ? 'bg-black border-yellow-400 ring-2 ring-yellow-400'
                          : 'bg-neutral-800/90 border-indigo-400 ring-2 ring-indigo-500/40'
                        : isHighContrast
                        ? 'bg-neutral-950 border-yellow-400/60 hover:border-yellow-400'
                        : 'bg-neutral-800/60 border-neutral-700 hover:border-neutral-600'
                    }`}
                  >
                    {/* Top Row: Name, Role, and Remove Button */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {/* Avatar Thumbnail */}
                        <div
                          className={`w-14 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 flex items-center justify-center bg-neutral-950 ${
                            isHighContrast ? 'border-yellow-400' : 'border-neutral-600'
                          }`}
                        >
                          {profile.faceSamples[0] ? (
                            <img
                              src={profile.faceSamples[0].dataUrl}
                              alt={`Face sample of ${profile.name}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Users className="w-7 h-7 opacity-50" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-lg font-black tracking-tight">{profile.name}</h4>
                            {profile.relationship && (
                              <span className="text-xs px-2 py-0.5 rounded-md font-bold bg-neutral-700/60 text-neutral-300">
                                {profile.relationship}
                              </span>
                            )}
                          </div>
                          <p className="text-xs opacity-75 mt-0.5">
                            {sampleCount === 0 ? (
                              <span className="text-amber-400 font-bold">
                                No face samples &bull; Capture below
                              </span>
                            ) : (
                              <span>
                                {sampleCount} face sample{sampleCount > 1 ? 's' : ''} stored locally
                              </span>
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Remove Person Button (Requirement 4) */}
                      <button
                        id={`remove-person-${profile.id}`}
                        type="button"
                        onClick={() => handleDeleteProfile(profile.id)}
                        className={`p-2 rounded-lg text-xs font-black border transition-all cursor-pointer ${
                          isHighContrast
                            ? 'bg-neutral-900 border-red-500 text-red-300 hover:bg-red-500 hover:text-white'
                            : 'bg-neutral-700/50 border-neutral-600 text-neutral-300 hover:bg-red-600 hover:text-white'
                        }`}
                        title={`Remove ${profile.name}`}
                        aria-label={`Remove ${profile.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Face Samples Gallery / Preview */}
                    {sampleCount > 0 && (
                      <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                        {profile.faceSamples.map((sample, sIdx) => (
                          <div key={sample.id} className="relative group flex-shrink-0">
                            <img
                              src={sample.dataUrl}
                              alt={`Sample ${sIdx + 1} for ${profile.name}`}
                              className={`w-11 h-11 rounded-lg object-cover border ${
                                isHighContrast ? 'border-yellow-400' : 'border-neutral-600'
                              }`}
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveSample(profile.id, sample.id)}
                              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-600 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 hover:scale-110 transition-all cursor-pointer"
                              title="Delete this sample"
                              aria-label="Delete this face sample"
                            >
                              &times;
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Action Buttons: Capture Face (Live or Upload) (Requirement 4) */}
                    <div className="mt-4 pt-3 border-t border-inherit/30 flex flex-wrap items-center gap-2">
                      {/* Capture From Live Camera */}
                      <button
                        id={`capture-camera-button-${profile.id}`}
                        type="button"
                        disabled={isCapturing || !isCameraRunning}
                        onClick={() => handleCaptureFaceFromCamera(profile.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                          !isCameraRunning
                            ? 'bg-neutral-800 text-neutral-500 border-neutral-700 cursor-not-allowed'
                            : isHighContrast
                            ? 'bg-yellow-400 text-black border-white hover:bg-yellow-300'
                            : 'bg-indigo-600 text-white border-indigo-400 hover:bg-indigo-500'
                        }`}
                        title={
                          isCameraRunning
                            ? `Capture current camera face for ${profile.name}`
                            : 'Start camera to capture face snapshot'
                        }
                      >
                        <Camera className="w-4 h-4" />
                        <span>Capture Face</span>
                      </button>

                      {/* Upload Photo from Device */}
                      <button
                        id={`upload-photo-button-${profile.id}`}
                        type="button"
                        onClick={() => {
                          setSelectedProfileId(profile.id);
                          targetProfileIdRef.current = profile.id;
                          fileInputRef.current?.click();
                        }}
                        className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border-2 transition-all cursor-pointer ${
                          isHighContrast
                            ? 'bg-neutral-900 border-yellow-400 text-yellow-300 hover:bg-yellow-400 hover:text-black'
                            : 'bg-neutral-700 border-neutral-600 text-neutral-200 hover:bg-neutral-600'
                        }`}
                        title="Upload photo from disk"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Upload Photo</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
