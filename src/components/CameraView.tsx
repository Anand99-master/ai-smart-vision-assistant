import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, AlertCircle, RefreshCw, Video, FileText } from 'lucide-react';
import { DetectedItem, PathGuidanceResult, OcrResult } from '../types';
import { DetectionOverlay } from './DetectionOverlay';

interface CameraViewProps {
  isCameraRunning: boolean;
  onStartCamera: () => void;
  onStopCamera: () => void;
  detections: DetectedItem[];
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraError: string | null;
  onSelectDevice?: (deviceId: string) => void;
  availableDevices: MediaDeviceInfo[];
  selectedDeviceId: string;
  isHighContrast: boolean;
  onUseSampleFeed?: () => void;
  isSampleFeed?: boolean;
  pathGuidance?: PathGuidanceResult | null;
  ocrResult?: OcrResult | null;
  isReadingText?: boolean;
  onReadText?: () => void;
}

export const CameraView: React.FC<CameraViewProps> = ({
  isCameraRunning,
  onStartCamera,
  onStopCamera,
  detections,
  videoRef,
  cameraError,
  onSelectDevice,
  availableDevices,
  selectedDeviceId,
  isHighContrast,
  onUseSampleFeed,
  isSampleFeed,
  pathGuidance,
  ocrResult,
  isReadingText,
  onReadText,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [videoDims, setVideoDims] = useState<{ width: number; height: number }>({
    width: 640,
    height: 480,
  });
  const [containerDims, setContainerDims] = useState<{ width: number; height: number }>({
    width: 640,
    height: 480,
  });

  // Track video and container dimensions using ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDims = () => {
      if (containerRef.current) {
        setContainerDims({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
      if (videoRef.current && videoRef.current.videoWidth > 0) {
        setVideoDims({
          width: videoRef.current.videoWidth,
          height: videoRef.current.videoHeight,
        });
      }
    };

    updateDims();
    const observer = new ResizeObserver(updateDims);
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, [videoRef, isCameraRunning]);

  return (
    <div
      id="camera-view-section"
      className="flex-1 flex flex-col items-stretch w-full max-w-7xl mx-auto p-4 sm:p-6"
    >
      {/* Primary Control Action Bar (Requirements 7, 8, 9) */}
      <div
        id="camera-controls-bar"
        className={`flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl border-3 mb-4 sm:mb-6 shadow-md ${
          isHighContrast
            ? 'bg-black border-yellow-400 text-yellow-300'
            : 'bg-neutral-900 border-neutral-800 text-neutral-100'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-4 h-4 rounded-full ${
              isCameraRunning
                ? 'bg-emerald-400 animate-pulse shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                : isHighContrast
                ? 'bg-neutral-700'
                : 'bg-neutral-600'
            }`}
          />
          <div>
            <div className="text-lg sm:text-xl font-black">
              {isCameraRunning
                ? isSampleFeed
                  ? 'Sample Feed Active'
                  : 'Webcam Feed Active'
                : 'Webcam Inactive'}
            </div>
            <div
              className={`text-xs sm:text-sm font-medium ${
                isHighContrast ? 'text-yellow-200' : 'text-neutral-400'
              }`}
            >
              {isCameraRunning
                ? 'AI object detection is processing live camera frames'
                : 'Press Start Camera to begin real-time object detection'}
            </div>
          </div>
        </div>

        {/* Start / Stop Buttons & Device Selector */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Device Selector if multiple cameras exist */}
          {availableDevices.length > 1 && !isSampleFeed && (
            <select
              id="camera-device-select"
              value={selectedDeviceId}
              onChange={(e) => onSelectDevice && onSelectDevice(e.target.value)}
              className={`px-3 py-3 rounded-xl font-bold text-sm border-2 cursor-pointer focus:outline-none focus:ring-2 ${
                isHighContrast
                  ? 'bg-black text-yellow-300 border-yellow-400'
                  : 'bg-neutral-800 text-neutral-200 border-neutral-700'
              }`}
              aria-label="Select camera device"
            >
              {availableDevices.map((dev, idx) => (
                <option key={dev.deviceId || idx} value={dev.deviceId}>
                  {dev.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          )}

          {/* Read Text Quick Button when Camera is Running */}
          {isCameraRunning && onReadText && (
            <button
              id="camera-bar-read-text-button"
              type="button"
              onClick={onReadText}
              disabled={isReadingText}
              className={`flex items-center justify-center gap-2 px-4 sm:px-5 py-3.5 sm:py-4 rounded-xl font-black text-base sm:text-lg tracking-wide transition-all shadow-xl cursor-pointer border-3 focus:outline-none focus:ring-4 ${
                isReadingText
                  ? 'bg-neutral-800 text-neutral-400 border-neutral-700 cursor-wait'
                  : isHighContrast
                  ? 'bg-yellow-400 text-black border-white hover:bg-yellow-300 active:scale-95'
                  : 'bg-amber-500 text-neutral-950 border-amber-400 hover:bg-amber-400 active:scale-95'
              }`}
              aria-label="Read text from camera"
            >
              {isReadingText ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  <span>READING TEXT...</span>
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 stroke-[2.5]" />
                  <span>READ TEXT</span>
                </>
              )}
            </button>
          )}

          {/* Start / Stop Camera Buttons */}
          {!isCameraRunning ? (
            <button
              id="start-camera-button"
              type="button"
              onClick={onStartCamera}
              className={`flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-black text-lg sm:text-xl tracking-wide transition-all shadow-xl cursor-pointer border-3 focus:outline-none focus:ring-4 ${
                isHighContrast
                  ? 'bg-yellow-400 text-black border-white hover:bg-yellow-300'
                  : 'bg-emerald-500 text-neutral-950 border-emerald-400 hover:bg-emerald-400'
              }`}
              aria-label="Start Camera Feed"
            >
              <Camera className="w-7 h-7 stroke-[2.5]" />
              <span>START CAMERA</span>
            </button>
          ) : (
            <button
              id="stop-camera-button"
              type="button"
              onClick={onStopCamera}
              className={`flex items-center justify-center gap-2.5 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl font-black text-lg sm:text-xl tracking-wide transition-all shadow-xl cursor-pointer border-3 focus:outline-none focus:ring-4 ${
                isHighContrast
                  ? 'bg-red-600 text-white border-white hover:bg-red-500'
                  : 'bg-red-600 text-white border-red-500 hover:bg-red-500'
              }`}
              aria-label="Stop Camera Feed"
            >
              <CameraOff className="w-7 h-7 stroke-[2.5]" />
              <span>STOP CAMERA</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Video Viewport Container */}
      <div
        ref={containerRef}
        id="camera-viewport-container"
        className={`relative flex-1 min-h-[380px] sm:min-h-[480px] md:min-h-[540px] w-full rounded-2xl overflow-hidden flex items-center justify-center border-4 shadow-2xl transition-colors ${
          isHighContrast
            ? 'bg-black border-yellow-400'
            : 'bg-neutral-950 border-neutral-800'
        }`}
      >
        {/* The Live Video Element */}
        <video
          ref={videoRef}
          id="webcam-live-video"
          playsInline
          muted
          autoPlay
          onLoadedMetadata={() => {
            if (videoRef.current) {
              setVideoDims({
                width: videoRef.current.videoWidth,
                height: videoRef.current.videoHeight,
              });
            }
          }}
          className={`w-full h-full object-contain ${
            isCameraRunning ? 'block' : 'hidden'
          }`}
          aria-label="Live webcam stream showing detected objects"
        />

        {/* Real-time Bounding Box Overlay */}
        {isCameraRunning && (
          <DetectionOverlay
            detections={detections}
            videoDimensions={videoDims}
            containerDimensions={containerDims}
            isHighContrast={isHighContrast}
            pathGuidance={pathGuidance}
            ocrResult={ocrResult}
          />
        )}

        {/* Offline / Stopped State Visual */}
        {!isCameraRunning && !cameraError && (
          <div
            id="camera-stopped-placeholder"
            className="flex flex-col items-center justify-center text-center p-6 max-w-md"
          >
            <div
              className={`w-24 h-24 rounded-3xl flex items-center justify-center mb-6 border-3 ${
                isHighContrast
                  ? 'bg-yellow-400 text-black border-yellow-300'
                  : 'bg-neutral-900 text-neutral-400 border-neutral-800'
              }`}
            >
              <Camera className="w-12 h-12" />
            </div>
            <h2
              className={`text-2xl sm:text-3xl font-black mb-3 ${
                isHighContrast ? 'text-yellow-300' : 'text-neutral-100'
              }`}
            >
              Camera Feed Inactive
            </h2>
            <p
              className={`text-base sm:text-lg mb-6 leading-relaxed font-medium ${
                isHighContrast ? 'text-yellow-200' : 'text-neutral-400'
              }`}
            >
              Click <strong>&ldquo;Start Camera&rdquo;</strong> above to grant webcam access.
              The AI model will detect people, objects, and their relative positions in real time.
            </p>

            {onUseSampleFeed && (
              <button
                type="button"
                onClick={onUseSampleFeed}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm border-2 transition-all ${
                  isHighContrast
                    ? 'bg-black text-yellow-300 border-yellow-400 hover:bg-yellow-950/40'
                    : 'bg-neutral-800 text-neutral-300 border-neutral-700 hover:bg-neutral-700'
                }`}
                title="Use simulated test video if you do not have a physical webcam connected"
              >
                <Video className="w-4 h-4" />
                <span>Test With Sample Video Stream</span>
              </button>
            )}
          </div>
        )}

        {/* Camera Error / Permission Blocked State */}
        {cameraError && (
          <div
            id="camera-error-banner"
            className="flex flex-col items-center justify-center text-center p-8 max-w-lg"
            role="alert"
          >
            <div className="w-20 h-20 rounded-2xl bg-red-950/80 text-red-400 border-2 border-red-500 flex items-center justify-center mb-4">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-black text-red-400 mb-2">Webcam Access Notice</h2>
            <p className="text-base text-neutral-300 mb-6 leading-relaxed">
              {cameraError}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onStartCamera}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-neutral-800 text-white border-2 border-neutral-600 hover:bg-neutral-700"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Webcam Permission</span>
              </button>
              {onUseSampleFeed && (
                <button
                  type="button"
                  onClick={onUseSampleFeed}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  <Video className="w-4 h-4" />
                  <span>Use Sample Video Instead</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
