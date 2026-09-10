import { useState } from 'react';
import { GeminiIncidentReport, CameraFeedInfo, SuspiciousAlert, CrowdDynamicsMetrics } from '../types';
import {
  Sparkles,
  X,
  ShieldAlert,
  Send,
  Loader2,
  FileCheck,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Compass,
} from 'lucide-react';

interface GeminiIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  cameras: CameraFeedInfo[];
  alerts: SuspiciousAlert[];
  metrics: CrowdDynamicsMetrics;
}

export function GeminiIncidentModal({
  isOpen,
  onClose,
  cameras,
  alerts,
  metrics,
}: GeminiIncidentModalProps) {
  const [report, setReport] = useState<GeminiIncidentReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateReport = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/gemini/analyze-incident', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cameraFeeds: cameras.map((c) => ({
            id: c.id,
            name: c.name,
            crowdCount: c.crowdCount,
            density: c.densityIndex,
            turbulence: c.opticalFlowTurbulence,
          })),
          activeAlerts: alerts.map((a) => ({
            id: a.id,
            type: a.type,
            severity: a.severity,
            camera: a.cameraId,
            subject: a.personClusterId,
            description: a.description,
          })),
          crowdMetrics: metrics,
          incidentQuery: userQuery || undefined,
        }),
      });

      const data = await res.json();
      if (data.report) {
        setReport(data.report);
      } else {
        throw new Error(data.error || 'Failed to generate report');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Error reaching Gemini intelligence service');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#070913]/95 border border-white/[0.12] rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden text-slate-200 flex flex-col max-h-[85vh] glass-panel backdrop-blur-2xl">
        {/* Header */}
        <div className="p-4 border-b border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center justify-center shadow-[0_0_12px_rgba(139,92,246,0.3)]">
              <Sparkles className="w-4 h-4 text-violet-300" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm font-mono tracking-wide glow-text">
                AI Crowd Intelligence Officer (Gemini)
              </h3>
              <p className="text-[11px] text-slate-400 font-sans">
                Automated threat analysis, optical flow anomaly evaluation, and tactical SOP dispatch.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl glass hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content area */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs font-mono">
          {/* Query input */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 uppercase font-semibold">
              Operational Command Focus / Query:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
                placeholder="e.g. Assess stampede risk at Gate 4 or track Cluster C-104 loitering..."
                className="flex-1 glass-card border border-white/[0.1] rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 font-sans"
              />
              <button
                onClick={handleGenerateReport}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold flex items-center gap-1.5 transition-all shadow-[0_0_18px_rgba(139,92,246,0.35)]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Analyze</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error display */}
          {errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-red-300 text-xs shadow-[0_0_15px_rgba(239,68,68,0.15)]">
              {errorMessage}
            </div>
          )}

          {/* Initial state / No report generated yet */}
          {!report && !isLoading && (
            <div className="p-6 border border-dashed border-white/[0.12] rounded-2xl text-center space-y-3 glass-card">
              <Compass className="w-8 h-8 text-violet-400 mx-auto opacity-80" />
              <div>
                <h4 className="font-semibold text-slate-200">Generate Tactical Situation Assessment</h4>
                <p className="text-[11px] text-slate-400 max-w-md mx-auto mt-1 font-sans leading-relaxed">
                  The AI analyst will ingest live multi-camera telemetry, optical flow turbulence vectors, and suspicious facial recognition alerts to draft an official dispatch briefing.
                </p>
              </div>
              <button
                onClick={handleGenerateReport}
                className="px-4 py-2 glass hover:bg-white/[0.08] text-violet-300 border border-violet-500/40 rounded-xl font-bold transition-all text-xs shadow-[0_0_12px_rgba(139,92,246,0.2)]"
              >
                Generate Briefing Now
              </button>
            </div>
          )}

          {/* Render Generated Incident Report */}
          {report && (
            <div className="space-y-4 animate-in fade-in duration-250">
              {/* Threat Level Banner */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  report.threatLevel === 'CRITICAL'
                    ? 'bg-red-950/40 border-red-500/60 text-red-200 shadow-[0_0_18px_rgba(239,68,68,0.2)]'
                    : report.threatLevel === 'HIGH' || report.threatLevel === 'ELEVATED'
                    ? 'bg-amber-950/40 border-amber-500/60 text-amber-200 shadow-[0_0_18px_rgba(245,158,11,0.2)]'
                    : 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.2)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  <span className="font-bold text-xs uppercase tracking-wide">
                    EVALUATED THREAT LEVEL: {report.threatLevel}
                  </span>
                </div>
                <span className="text-[10px] opacity-90 font-medium">
                  Containment Confidence: {report.containmentConfidence}
                </span>
              </div>

              {/* Executive Summary */}
              <div className="p-3.5 glass-card border border-white/[0.08] rounded-xl space-y-1">
                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  Executive Briefing
                </span>
                <p className="text-slate-100 text-xs leading-relaxed font-sans font-normal">
                  {report.executiveSummary}
                </p>
              </div>

              {/* Anomaly Breakdown */}
              {report.anomalyBreakdown && report.anomalyBreakdown.length > 0 && (
                <div className="p-3.5 glass-card border border-white/[0.08] rounded-xl space-y-2">
                  <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    Computer Vision Anomalies Identified
                  </span>
                  <ul className="space-y-1.5 font-sans text-xs">
                    {report.anomalyBreakdown.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-300">
                        <span className="text-amber-400 font-bold shrink-0">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tactical Recommendations */}
              {report.tacticalRecommendations && report.tacticalRecommendations.length > 0 && (
                <div className="p-3.5 glass-card border border-white/[0.08] rounded-xl space-y-2">
                  <span className="text-violet-300 text-[10px] uppercase font-bold flex items-center gap-1.5 tracking-wider">
                    <FileCheck className="w-3.5 h-3.5" />
                    Recommended On-Ground Tactical SOP Actions
                  </span>
                  <ul className="space-y-1.5 font-sans text-xs">
                    {report.tacticalRecommendations.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-200">
                        <span className="w-4 h-4 rounded bg-violet-950 text-violet-300 border border-violet-700/60 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Optical Flow Insights */}
              {report.opticalFlowInsights && (
                <div className="p-3.5 glass-card border border-white/[0.08] rounded-xl text-slate-300 font-sans text-xs">
                  <span className="text-slate-400 text-[10px] uppercase font-mono block mb-1">
                    Optical Flow Turbulence Assessment:
                  </span>
                  <p className="italic text-slate-400">{report.opticalFlowInsights}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 border-t border-white/[0.08] bg-black/30 flex items-center justify-between text-[11px] font-mono">
          <span className="text-slate-500">Model: Gemini 2.5 Flash • Server-Side GenAI</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl glass hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
