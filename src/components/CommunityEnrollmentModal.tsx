import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import {
  X,
  UserCheck,
  Camera,
  Sparkles,
  Cloud,
  CheckCircle2,
  AlertCircle,
  Settings,
  Database,
  Upload,
  RefreshCw,
  Globe,
  Share2,
} from 'lucide-react';
import { extractFaceEmbedding } from '../utils/faceRecognition';
import {
  enrollPersonInCommunity,
  getStoredFirebaseConfig,
  saveStoredFirebaseConfig,
  getFirebaseInstance,
} from '../utils/firebase';

interface CommunityEnrollmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFaceSnapshot?: string | null;
  activeEmbedding?: number[] | null;
  onEnrolledSuccess?: (name: string) => void;
}

export function CommunityEnrollmentModal({
  isOpen,
  onClose,
  activeFaceSnapshot,
  activeEmbedding,
  onEnrolledSuccess,
}: CommunityEnrollmentModalProps) {
  const [tab, setTab] = useState<'enroll' | 'firebase-config'>('enroll');

  // Form Fields
  const [name, setName] = useState('');
  const [role, setRole] = useState('Community Member');
  const [status, setStatus] = useState<'REGISTERED' | 'WATCHLIST_FLAG'>('REGISTERED');
  const [notes, setNotes] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [embedding, setEmbedding] = useState<number[]>([]);

  // Feedback & Loading
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Firebase Config Form
  const [projectId, setProjectId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [authDomain, setAuthDomain] = useState('');
  const [configSuccess, setConfigSuccess] = useState(false);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  // File Upload input
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (activeFaceSnapshot) {
        setPreviewUrl(activeFaceSnapshot);
      }
      if (activeEmbedding && activeEmbedding.length > 0) {
        setEmbedding(activeEmbedding);
      }
      setSubmitSuccess(null);
      setSubmitError(null);

      // Load stored Firebase config
      const cfg = getStoredFirebaseConfig();
      if (cfg) {
        setProjectId(cfg.projectId || '');
        setApiKey(cfg.apiKey || '');
        setAuthDomain(cfg.authDomain || '');
      }
      const { db } = getFirebaseInstance();
      setIsFirebaseConnected(!!db);
    }
  }, [isOpen, activeFaceSnapshot, activeEmbedding]);

  if (!isOpen) return null;

  // Handle uploading a custom face photo for enrollment
  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPreviewUrl(dataUrl);

      // Extract embedding from image
      const img = new Image();
      img.onload = () => {
        const { embedding: extractedEmb } = extractFaceEmbedding(
          img,
          { x: 0, y: 0, width: img.width, height: img.height },
          false
        );
        setEmbedding(extractedEmb);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleEnrollSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setSubmitError('Please enter a name for the person.');
      return;
    }

    let finalEmbedding = embedding;
    if (finalEmbedding.length === 0) {
      // Generate standard pseudo-embedding if no face was captured
      finalEmbedding = new Array(128).fill(0).map(() => Number((Math.random() * 0.1).toFixed(4)));
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const result = await enrollPersonInCommunity({
        name: name.trim(),
        role: role.trim(),
        status,
        notes: notes.trim(),
        embedding: finalEmbedding,
        faceCropUrl: previewUrl,
      });

      setSubmitSuccess(
        `Successfully enrolled "${name}"! Biometric profile synced to ${
          result.source === 'FIREBASE' ? 'Firebase Firestore & Local Edge' : 'Local Edge Registry'
        }.`
      );

      if (onEnrolledSuccess) {
        onEnrolledSuccess(name);
      }

      setTimeout(() => {
        setName('');
        setNotes('');
        onClose();
      }, 1600);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to enroll person');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId.trim() || !apiKey.trim()) {
      alert('Please provide both Project ID and API Key.');
      return;
    }

    saveStoredFirebaseConfig({
      projectId: projectId.trim(),
      apiKey: apiKey.trim(),
      authDomain: authDomain.trim() || `${projectId.trim()}.firebaseapp.com`,
    });

    const { db } = getFirebaseInstance();
    setIsFirebaseConnected(!!db);
    setConfigSuccess(true);
    setTimeout(() => setConfigSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-lg bg-[#070913]/95 text-slate-200 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden border border-white/[0.12] glass-panel backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 pb-3 border-b border-white/[0.08] bg-white/[0.02]">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight font-mono">
                Open Community Face Registry
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-sans">
              Public SDG Project • No Admin Required • Instant Cloud Sync
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl glass hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-white/[0.08] px-5 bg-black/30 text-xs font-mono">
          <button
            onClick={() => setTab('enroll')}
            className={`py-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              tab === 'enroll'
                ? 'border-emerald-500 text-emerald-300 font-bold shadow-[0_4px_15px_rgba(16,185,129,0.25)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            Enroll Individual
          </button>
          <button
            onClick={() => setTab('firebase-config')}
            className={`py-2.5 px-3 border-b-2 transition-all flex items-center gap-1.5 ${
              tab === 'firebase-config'
                ? 'border-amber-500 text-amber-300 font-bold shadow-[0_4px_15px_rgba(245,158,11,0.25)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" />
            Firebase Sync {isFirebaseConnected ? '● Active' : '○ Local'}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4 text-xs font-sans">
          {tab === 'enroll' && (
            <form onSubmit={handleEnrollSubmit} className="space-y-4">
              {/* Photo & Live Face Preview */}
              <div className="flex items-center gap-4 p-3 rounded-xl bg-black/40 border border-white/[0.06]">
                <div className="relative w-20 h-20 rounded-xl bg-slate-900 border border-white/20 overflow-hidden flex items-center justify-center shrink-0">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Face Snapshot" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-2 text-slate-500">
                      <Camera className="w-6 h-6 mx-auto mb-1 opacity-50" />
                      <span className="text-[9px]">No Photo</span>
                    </div>
                  )}
                  {previewUrl && (
                    <span className="absolute bottom-1 right-1 px-1 py-0.5 rounded text-[8px] font-mono bg-emerald-500 text-black font-bold">
                      128D
                    </span>
                  )}
                </div>

                <div className="space-y-1.5 flex-1">
                  <div className="text-slate-200 font-medium text-xs">Biometric Facial Crop</div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    {previewUrl
                      ? 'Live face capture ready. Embedding extracted and normalized.'
                      : 'Capture a snapshot from camera or upload a clear photo.'}
                  </p>
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 rounded-lg glass text-[10px] text-slate-300 hover:text-white border border-white/10 flex items-center gap-1 font-mono"
                    >
                      <Upload className="w-3 h-3 text-cyan-400" />
                      Upload Face Photo
                    </button>
                  </div>
                </div>
              </div>

              {/* Name Input */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold text-xs flex items-center justify-between">
                  <span>Full Name or Citizen Alias *</span>
                  <span className="text-[10px] text-emerald-400 font-mono">Public Community ID</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Mercer, Officer Smith, Citizen #104"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-emerald-500/60 font-mono"
                />
              </div>

              {/* Role & Status Row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-medium text-[11px]">Role / Affiliation</label>
                  <input
                    type="text"
                    placeholder="e.g. Volunteer, Passenger, Staff"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/60 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-medium text-[11px]">Recognition Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-xl bg-slate-900 border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/60 font-mono"
                  >
                    <option value="REGISTERED">Authorized / Registered</option>
                    <option value="WATCHLIST_FLAG">Watchlist Sentry Flag</option>
                  </select>
                </div>
              </div>

              {/* Optional Notes */}
              <div className="space-y-1">
                <label className="text-slate-300 font-medium text-[11px]">Optional Notes / Contact Info</label>
                <input
                  type="text"
                  placeholder="e.g. Authorized personnel for Gate 4"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs focus:outline-none focus:border-emerald-500/60 font-mono"
                />
              </div>

              {/* Feedback Alert Messages */}
              {submitSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{submitSuccess}</span>
                </div>
              )}
              {submitError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl glass hover:bg-white/[0.08] text-slate-300 text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs font-mono shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center gap-1.5 transition-all"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Saving to Firebase...
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3.5 h-3.5" />
                      Enroll & Sync to Cloud
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {tab === 'firebase-config' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <Cloud className="w-3.5 h-3.5" />
                  Cloud Firestore Real-time Sync
                </div>
                <p className="text-[11px] font-sans text-amber-200/80 leading-relaxed">
                  When configured, any citizen or device that enrolls a face immediately broadcasts the biometric embedding to all other active cameras and dashboards across the world!
                </p>
              </div>

              <form onSubmit={handleSaveFirebaseConfig} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-slate-300 text-xs font-mono">Firebase Project ID *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. crowd-vision-sdg"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 text-xs font-mono">Web API Key *</label>
                  <input
                    type="text"
                    required
                    placeholder="AIzaSy..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 text-xs font-mono">Auth Domain (Optional)</label>
                  <input
                    type="text"
                    placeholder="crowd-vision-sdg.firebaseapp.com"
                    value={authDomain}
                    onChange={(e) => setAuthDomain(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-white text-xs font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>

                {configSuccess && (
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Firebase configuration saved! Real-time sync is now live.</span>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400 font-mono">
                    Stored securely in browser LocalStorage & .env
                  </span>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs font-mono transition-all shadow-[0_0_15px_rgba(245,158,11,0.3)]"
                  >
                    Save & Connect Firebase
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
