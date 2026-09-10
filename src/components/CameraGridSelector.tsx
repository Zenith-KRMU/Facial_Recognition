import { CameraFeedInfo, CameraId } from '../types';
import {
  Camera,
  RefreshCw,
  Package,
  Grid2X2,
} from 'lucide-react';

interface CameraGridSelectorProps {
  cameras: CameraFeedInfo[];
  selectedCameraId: CameraId;
  onSelectCamera: (id: CameraId) => void;
  onRefreshCameras: () => void;
  isMultiView: boolean;
  onToggleMultiView: () => void;
  // Visual layer toggles
  showBoundingBoxes: boolean;
  onToggleBoundingBoxes: () => void;
  showObjects: boolean;
  onToggleObjects: () => void;
  showLandmarks: boolean;
  onToggleLandmarks: () => void;
  showOpticalFlow: boolean;
  onToggleOpticalFlow: () => void;
  showTripwire: boolean;
  onToggleTripwire: () => void;
}

export function CameraGridSelector({
  cameras,
  selectedCameraId,
  onSelectCamera,
  onRefreshCameras,
  isMultiView,
  onToggleMultiView,
  showBoundingBoxes,
  onToggleBoundingBoxes,
  showObjects,
  onToggleObjects,
  showLandmarks,
  onToggleLandmarks,
  showOpticalFlow,
  onToggleOpticalFlow,
  showTripwire,
  onToggleTripwire,
}: CameraGridSelectorProps) {
  const hasMultipleCameras = cameras.length > 1;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2 glass rounded-xl border border-white/[0.08] text-xs font-mono">
      {/* Left: Real Connected Hardware Cameras */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1 mr-1">
          <Camera className="w-3.5 h-3.5 text-violet-400" />
          <span>Connected Devices:</span>
        </span>

        {/* If multiple cameras exist, allow Multi-Camera Grid */}
        {hasMultipleCameras && (
          <button
            onClick={onToggleMultiView}
            className={`px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
              isMultiView
                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-[0_0_15px_rgba(139,92,246,0.35)] border border-violet-400/40'
                : 'glass-card border border-white/[0.08] text-slate-300 hover:text-white hover:border-white/20'
            }`}
            title="View all connected physical cameras in a multi-stream grid"
          >
            <Grid2X2 className="w-3.5 h-3.5" />
            <span>Multi-Grid ({cameras.length})</span>
          </button>
        )}

        {/* Real Physical Camera Buttons */}
        {cameras.length === 0 ? (
          <div className="px-2.5 py-1 rounded-lg glass-card border border-amber-500/30 text-amber-300 text-[11px] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            <span>Scanning hardware cameras...</span>
          </div>
        ) : (
          cameras.map((cam, idx) => {
            const isSelected = selectedCameraId === cam.id && !isMultiView;
            // Clean up name if too long
            const displayName = cam.name.length > 26 ? `${cam.name.slice(0, 24)}...` : cam.name;

            return (
              <button
                key={cam.id || idx}
                onClick={() => {
                  if (isMultiView) onToggleMultiView();
                  onSelectCamera(cam.id);
                }}
                className={`px-2.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 max-w-[240px] truncate ${
                  isSelected
                    ? 'bg-emerald-500/20 border border-emerald-400/80 text-emerald-300 font-bold shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                    : 'glass-card border border-white/[0.08] text-slate-400 hover:text-slate-200 hover:border-white/15'
                }`}
                title={`Device: ${cam.name} (${cam.resolution})`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isSelected ? 'bg-emerald-400 shadow-[0_0_5px_#34d399]' : 'bg-slate-500'
                  }`}
                />
                <span className="truncate">{displayName}</span>
              </button>
            );
          })
        )}

        {/* Refresh Device Scanner */}
        <button
          onClick={onRefreshCameras}
          className="p-1.5 rounded-lg glass-card border border-white/[0.08] text-slate-400 hover:text-violet-300 hover:border-violet-400/40 transition-all"
          title="Re-scan system for connected USB cameras or webcams"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: Computer Vision Layer Overlays Toggle */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider mr-1">CV Layers:</span>

        {/* Face Bounding Boxes Toggle */}
        <button
          onClick={onToggleBoundingBoxes}
          className={`px-2 py-1 rounded-lg text-[11px] border transition-all ${
            showBoundingBoxes
              ? 'bg-violet-500/20 border-violet-400/70 text-violet-200 font-bold shadow-[0_0_10px_rgba(139,92,246,0.2)]'
              : 'glass-card border-white/[0.08] text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle CNN Face Bounding Boxes"
        >
          [Face CNN]
        </button>

        {/* Objects SSD Toggle */}
        <button
          onClick={onToggleObjects}
          className={`px-2 py-1 rounded-lg text-[11px] border transition-all flex items-center gap-1 ${
            showObjects
              ? 'bg-cyan-500/20 border-cyan-400/70 text-cyan-200 font-bold shadow-[0_0_10px_rgba(6,182,212,0.2)]'
              : 'glass-card border-white/[0.08] text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle COCO-SSD Object Detection (backpacks, cell phones, laptops, etc.)"
        >
          <Package className="w-3 h-3" />
          <span>[Objects SSD]</span>
        </button>

        {/* 6-Landmark Mesh Toggle */}
        <button
          onClick={onToggleLandmarks}
          className={`px-2 py-1 rounded-lg text-[11px] border transition-all ${
            showLandmarks
              ? 'bg-emerald-500/20 border-emerald-400/70 text-emerald-200 font-bold shadow-[0_0_10px_rgba(16,185,129,0.2)]'
              : 'glass-card border-white/[0.08] text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle 6-Point Facial Landmark Mesh"
        >
          [Landmarks]
        </button>

        {/* Optical Flow Vectors Toggle */}
        <button
          onClick={onToggleOpticalFlow}
          className={`px-2 py-1 rounded-lg text-[11px] border transition-all ${
            showOpticalFlow
              ? 'bg-indigo-500/20 border-indigo-400/70 text-indigo-200 font-bold shadow-[0_0_10px_rgba(99,102,241,0.2)]'
              : 'glass-card border-white/[0.08] text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Lucas-Kanade Optical Flow Motion Vectors"
        >
          [Optical Flow]
        </button>

        {/* Security Tripwire Toggle */}
        <button
          onClick={onToggleTripwire}
          className={`px-2 py-1 rounded-lg text-[11px] border transition-all ${
            showTripwire
              ? 'bg-red-500/20 border-red-400/70 text-red-200 font-bold shadow-[0_0_10px_rgba(239,68,68,0.2)]'
              : 'glass-card border-white/[0.08] text-slate-400 hover:text-slate-200'
          }`}
          title="Toggle Virtual Security Tripwire Boundary"
        >
          [Tripwire]
        </button>
      </div>
    </div>
  );
}
