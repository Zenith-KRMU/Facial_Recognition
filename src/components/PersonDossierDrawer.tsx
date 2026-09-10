import { useState, type FormEvent } from 'react';
import { TrackedPerson, CameraId, IdentifiedObject, RegisteredFace } from '../types';
import { saveEnrolledFace } from '../utils/faceRecognition';
import {
  isDangerousObject,
  classifyObjectCategory,
  getObjectIcon,
} from '../utils/objectClassifier';
import { playSecuritySiren } from '../utils/audioAlert';
import {
  X,
  User,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Navigation,
  Activity,
  Layers,
  Fingerprint,
  Camera,
  MapPin,
  Eye,
  AlertTriangle,
  UserPlus,
  Package,
  CheckCircle2,
  Volume2,
} from 'lucide-react';

interface PersonDossierDrawerProps {
  person: TrackedPerson | null;
  selectedObject?: IdentifiedObject | null;
  onClose: () => void;
  onFlagPerson: (personId: string, isFlagged: boolean) => void;
  onSelectCamera: (camId: CameraId) => void;
  onFaceEnrolled?: (newFace: RegisteredFace) => void;
}

export function PersonDossierDrawer({
  person,
  selectedObject,
  onClose,
  onFlagPerson,
  onSelectCamera,
  onFaceEnrolled,
}: PersonDossierDrawerProps) {
  // Biometric Face Enrollment Form state
  const [enrollName, setEnrollName] = useState('');
  const [enrollRole, setEnrollRole] = useState('Authorized Staff');
  const [enrollStatus, setEnrollStatus] = useState<'REGISTERED' | 'WATCHLIST_FLAG'>('REGISTERED');
  const [enrollSuccess, setEnrollSuccess] = useState(false);

  if (!person && !selectedObject) return null;

  // Handle Object Dossier view
  if (selectedObject && !person) {
    const isDangerous = selectedObject.isDangerous || isDangerousObject(selectedObject.class);
    const category = selectedObject.category || classifyObjectCategory(selectedObject.class);
    const icon = getObjectIcon(selectedObject.class);

    return (
      <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[#020205]/95 backdrop-blur-2xl border-l border-white/[0.1] shadow-[0_0_50px_rgba(0,0,0,0.8)] z-40 flex flex-col text-slate-200 overflow-hidden animate-in slide-in-from-right duration-250 font-mono">
        <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg border ${
                isDangerous
                  ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]'
                  : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
              }`}
            >
              {icon}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-white text-base tracking-wide uppercase">
                  {selectedObject.class}
                </h3>
                {isDangerous && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-600 text-white border border-red-400 font-bold animate-pulse">
                    🚨 WEAPON / DANGER
                  </span>
                )}
                {selectedObject.isUnattended && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                    UNATTENDED
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">Object ID: {selectedObject.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl glass hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {isDangerous && (
            <div className="p-4 bg-red-950/50 border border-red-500/60 rounded-xl text-red-200 space-y-3 shadow-[0_0_25px_rgba(239,68,68,0.3)]">
              <div className="flex items-center gap-2 font-bold text-red-400 text-sm">
                <ShieldAlert className="w-5 h-5 text-red-400 shrink-0 animate-bounce" />
                <span>CRITICAL SECURITY THREAT IDENTIFIED</span>
              </div>
              <p className="text-[11px] text-red-200/90 font-sans leading-relaxed">
                This item is classified as a hazardous/dangerous object (<strong>{selectedObject.class.toUpperCase()}</strong>) in a public surveillance area. Immediate automated sirens and security protocol deployment are armed.
              </p>
              <button
                onClick={() => playSecuritySiren(3500)}
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all"
              >
                <Volume2 className="w-4 h-4" />
                <span>Broadcast Emergency Siren (3.5s)</span>
              </button>
            </div>
          )}

          {selectedObject.isUnattended && (
            <div className="p-3.5 bg-amber-950/30 border border-amber-500/40 rounded-xl text-amber-200 space-y-1 shadow-[0_0_20px_rgba(245,158,11,0.15)]">
              <div className="flex items-center gap-1.5 font-bold text-amber-400">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>SECURITY ANOMALY: UNATTENDED ITEM</span>
              </div>
              <p className="text-[11px] text-amber-300/90 font-sans">
                This {selectedObject.class} has been stationary with no accompanying person within 20% spatial radius for {selectedObject.unattendedDurationSec || 5} seconds.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 glass-card rounded-xl border border-white/[0.08]">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Public Category</span>
              <div className="text-xs font-bold text-purple-300 mt-1">{category}</div>
            </div>
            <div className="p-3 glass-card rounded-xl border border-white/[0.08]">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">COCO-SSD Confidence</span>
              <div className="text-lg font-bold text-cyan-300 mt-1">{selectedObject.score}%</div>
            </div>
            <div className="p-3 glass-card rounded-xl border border-white/[0.08]">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Camera Source</span>
              <div className="text-sm font-bold text-violet-300 mt-1 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                {selectedObject.camera}
              </div>
            </div>
            <div className="p-3 glass-card rounded-xl border border-white/[0.08]">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Coordinates</span>
              <div className="text-xs font-bold text-white mt-1">
                ({selectedObject.x.toFixed(1)}%, {selectedObject.y.toFixed(1)}%)
              </div>
            </div>
            <div className="p-3 glass-card rounded-xl border border-white/[0.08] col-span-2">
              <span className="text-slate-400 text-[10px] uppercase font-semibold">Detected At</span>
              <div className="text-xs font-bold text-slate-300 mt-1">{selectedObject.detectedAt}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle Person Dossier view
  if (!person) return null;

  const isHighRisk = person.isFlaggedSuspicious || person.riskScore > 75;

  const handleEnrollFace = (e: FormEvent) => {
    e.preventDefault();
    if (!enrollName.trim()) return;

    const newFace: RegisteredFace = {
      id: `ENROLLED_${Date.now()}`,
      name: enrollName.trim(),
      role: enrollRole.trim(),
      status: enrollStatus,
      embedding: person.embeddingSample && person.embeddingSample.length >= 8
        ? [...person.embeddingSample]
        : new Array(128).fill(0.08),
      enrolledAt: new Date().toLocaleDateString(),
      faceCropUrl: person.faceCropUrl,
    };

    saveEnrolledFace(newFace);
    setEnrollSuccess(true);
    if (onFaceEnrolled) onFaceEnrolled(newFace);

    setTimeout(() => {
      setEnrollSuccess(false);
      setEnrollName('');
    }, 2000);
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[#020205]/95 backdrop-blur-2xl border-l border-white/[0.1] shadow-[0_0_50px_rgba(0,0,0,0.8)] z-40 flex flex-col text-slate-200 overflow-hidden animate-in slide-in-from-right duration-250 font-mono">
      {/* Top Header */}
      <div className="p-4 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm border ${
              isHighRisk
                ? 'bg-red-500/20 text-red-400 border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.25)]'
                : person.status === 'REGISTERED'
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                : 'bg-violet-500/20 text-violet-300 border-violet-500/40 shadow-[0_0_12px_rgba(139,92,246,0.25)]'
            }`}
          >
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base tracking-wide glow-text">
                {person.clusterId}
              </h3>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border uppercase font-semibold ${
                  isHighRisk
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : person.status === 'REGISTERED'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                }`}
              >
                {person.status}
              </span>
            </div>
            <p className="text-xs text-slate-400">{person.label}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-xl glass hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Real Cropped Face Thumbnail Preview */}
        {person.faceCropUrl && (
          <div className="p-3 glass-card rounded-xl border border-white/[0.1] flex items-center gap-3.5 bg-black/40">
            <div className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-violet-400/60 shrink-0 shadow-[0_0_15px_rgba(139,92,246,0.3)]">
              <img
                src={person.faceCropUrl}
                alt="Detected Face Crop"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-0 inset-x-0 bg-black/80 text-[8px] text-center text-emerald-300 py-0.5">
                OPTICAL
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Live Biometric Crop</span>
              <div className="text-xs text-white font-bold truncate mt-0.5">
                {person.label}
              </div>
              <div className="text-[10px] text-violet-300 mt-0.5 flex items-center gap-1.5">
                <span>{person.landmarks.length} Landmark Points</span>
                <span>•</span>
                <span>{person.occlusionType}</span>
              </div>
            </div>
          </div>
        )}

        {/* Flag Alert Box if High Risk */}
        {isHighRisk && (
          <div className="p-3.5 bg-red-950/30 border border-red-500/40 rounded-xl text-red-200 space-y-1 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
            <div className="flex items-center gap-1.5 font-bold text-red-400 text-xs">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>SUSPICIOUS ACTIVITY FLAGGED</span>
            </div>
            <p className="text-[11px] leading-relaxed text-red-300/90 font-sans">
              {person.flagReason || 'Subject flagged due to prolonged concourse dwell time or watchlist registry hit.'}
            </p>
          </div>
        )}

        {/* Primary Telemetry Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 glass-card rounded-xl border border-white/[0.08]">
            <span className="text-slate-400 text-[10px] uppercase font-semibold">CNN Match Confidence</span>
            <div className="text-base font-bold text-white mt-0.5">{person.matchConfidence.toFixed(1)}%</div>
            <div className="w-full bg-slate-800/80 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full shadow-[0_0_8px_#34d399]"
                style={{ width: `${person.matchConfidence}%` }}
              />
            </div>
          </div>

          <div className="p-3 glass-card rounded-xl border border-white/[0.08]">
            <span className="text-slate-400 text-[10px] uppercase font-semibold">Threat Risk Score</span>
            <div
              className={`text-base font-bold mt-0.5 ${
                person.riskScore > 70
                  ? 'text-red-400'
                  : person.riskScore > 40
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {person.riskScore}/100
            </div>
            <div className="w-full bg-slate-800/80 h-1.5 rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  person.riskScore > 70
                    ? 'bg-red-500 shadow-[0_0_8px_#ef4444]'
                    : person.riskScore > 40
                    ? 'bg-amber-500'
                    : 'bg-emerald-500'
                }`}
                style={{ width: `${person.riskScore}%` }}
              />
            </div>
          </div>

          <div className="p-3 glass-card rounded-xl border border-white/[0.08]">
            <span className="text-slate-400 text-[10px] uppercase font-semibold">Current Camera</span>
            <div className="text-sm font-bold text-violet-300 mt-1 flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" />
              {person.camera}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Position: ({person.x.toFixed(0)}%, {person.y.toFixed(0)}%)</span>
          </div>

          <div className="p-3 glass-card rounded-xl border border-white/[0.08]">
            <span className="text-slate-400 text-[10px] uppercase font-semibold">Velocity / Speed</span>
            <div className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-indigo-400" />
              {person.speed.toFixed(1)} m/s
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 block">Heading: {person.directionDeg}°</span>
          </div>
        </div>

        {/* Real Occlusion Handling Module */}
        <div className="p-3.5 glass-card rounded-xl border border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-violet-400" />
              Partial Occlusion Analysis
            </span>
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                person.occlusionPercent > 40
                  ? 'bg-red-500/20 text-red-400 border-red-500/30'
                  : person.occlusionPercent > 15
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}
            >
              {person.occlusionPercent}% Occluded
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Obstruction Type:</span>
            <span className="text-white font-medium uppercase">{person.occlusionType.replace('_', ' ')}</span>
          </div>

          <div className="w-full bg-slate-800/80 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full ${
                person.occlusionPercent > 40
                  ? 'bg-red-500'
                  : person.occlusionPercent > 20
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-violet-500 to-indigo-500'
              }`}
              style={{ width: `${person.occlusionPercent}%` }}
            />
          </div>
        </div>

        {/* Biometric Face Enrollment Form (Teach the system who this person is!) */}
        <div className="p-3.5 glass-card rounded-xl border border-violet-500/30 bg-violet-950/15 space-y-3 shadow-[0_0_15px_rgba(139,92,246,0.15)]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-violet-200 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-violet-400" />
              Enroll Face in Biometric Database
            </span>
            {enrollSuccess && (
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Enrolled!
              </span>
            )}
          </div>

          <form onSubmit={handleEnrollFace} className="space-y-2 font-sans">
            <div>
              <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Full Name / Identity:</label>
              <input
                type="text"
                value={enrollName}
                onChange={(e) => setEnrollName(e.target.value)}
                placeholder="e.g. Commander Nayan Jinal"
                className="w-full glass border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Role:</label>
                <input
                  type="text"
                  value={enrollRole}
                  onChange={(e) => setEnrollRole(e.target.value)}
                  className="w-full glass border border-white/[0.1] rounded-lg px-2 py-1 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-mono block mb-1">Status:</label>
                <select
                  value={enrollStatus}
                  onChange={(e) => setEnrollStatus(e.target.value as any)}
                  className="w-full bg-[#090d1f] border border-white/[0.1] rounded-lg px-2 py-1 text-xs text-white"
                >
                  <option value="REGISTERED">Registered</option>
                  <option value="WATCHLIST_FLAG">Watchlist Flag</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={!enrollName.trim()}
              className="w-full mt-2 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-40 text-white font-mono font-bold text-xs transition-all shadow-[0_0_12px_rgba(139,92,246,0.3)] flex items-center justify-center gap-1.5"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Save to Biometric Database</span>
            </button>
          </form>
        </div>

        {/* 128-D Feature Embedding Representation */}
        <div className="p-3.5 glass-card rounded-xl border border-white/[0.08] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-400" />
              128D Face Embedding Vector
            </span>
            <span className="text-[10px] text-purple-400 font-mono">L2 Normalized</span>
          </div>
          <div className="grid grid-cols-16 gap-0.5 h-7 items-end bg-[#020205] p-1.5 rounded-lg border border-white/[0.06]">
            {person.embeddingSample.map((val, idx) => {
              const heightPct = Math.min(100, Math.max(15, Math.abs(val) * 100));
              return (
                <div
                  key={idx}
                  className="w-full rounded-xs bg-violet-400 shadow-[0_0_5px_#a78bfa]"
                  style={{ height: `${heightPct}%` }}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Authority Action Buttons */}
      <div className="p-3.5 border-t border-white/[0.08] bg-black/30 flex items-center gap-2">
        <button
          onClick={() => onFlagPerson(person.id, !person.isFlaggedSuspicious)}
          className={`flex-1 py-2.5 px-3.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
            person.isFlaggedSuspicious
              ? 'glass hover:bg-white/[0.08] text-slate-200 border border-white/[0.1]'
              : 'bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.3)]'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          {person.isFlaggedSuspicious ? 'Clear Watchlist Flag' : 'Flag as Suspect'}
        </button>
      </div>
    </div>
  );
}
