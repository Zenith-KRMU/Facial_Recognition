import { useState } from 'react';
import { SuspiciousAlert, CameraId, AlertSeverity, TrackedPerson } from '../types';
import { playSecuritySiren } from '../utils/audioAlert';
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle,
  Radio,
  Send,
  Volume2,
  VolumeX,
  Package,
  Trash2,
  ArrowRight,
  Flame,
} from 'lucide-react';

interface AlertStreamPanelProps {
  alerts: SuspiciousAlert[];
  onAcknowledgeAlert: (alertId: string) => void;
  onDispatchAlert: (alertId: string) => void;
  onResolveAlert: (alertId: string) => void;
  onClearResolved?: () => void;
  onSelectPersonById: (personClusterId: string) => void;
  onSelectCamera: (camId: CameraId) => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export function AlertStreamPanel({
  alerts,
  onAcknowledgeAlert,
  onDispatchAlert,
  onResolveAlert,
  onClearResolved,
  onSelectPersonById,
  onSelectCamera,
  soundEnabled,
  onToggleSound,
}: AlertStreamPanelProps) {
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'ALL'>('ALL');

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === 'ALL') return true;
    return a.severity === filterSeverity;
  });

  const activeCount = alerts.filter((a) => a.status === 'ACTIVE').length;

  return (
    <div className="flex flex-col h-full glass-panel border border-white/[0.08] rounded-2xl overflow-hidden text-slate-200 shadow-xl font-mono text-xs">
      {/* Top Title & Audio Control */}
      <div className="p-3.5 border-b border-white/[0.08] bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <ShieldAlert className="w-4 h-4 text-red-400" />
            {activeCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-xs uppercase tracking-wider text-slate-100">
              Security Incident Stream
            </h3>
            <span className="text-[10px] text-slate-400">
              {activeCount} active threat anomalies
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleSound}
            className={`p-1.5 rounded-lg text-xs transition-colors border ${
              soundEnabled
                ? 'bg-violet-500/20 border-violet-400/50 text-violet-300 hover:text-white shadow-[0_0_10px_rgba(139,92,246,0.2)]'
                : 'glass-card border-white/[0.08] text-slate-500 hover:text-slate-300'
            }`}
            title={soundEnabled ? 'Mute Alert Audio' : 'Enable Alert Audio'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Severity Filter Tabs */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-2.5 py-2 bg-black/20 text-[11px] gap-1">
        <div className="flex gap-1">
          {(['ALL', 'CRITICAL', 'WARNING', 'ADVISORY'] as const).map((sev) => {
            const count =
              sev === 'ALL' ? alerts.length : alerts.filter((a) => a.severity === sev).length;
            return (
              <button
                key={sev}
                onClick={() => setFilterSeverity(sev)}
                className={`px-2 py-0.5 rounded-lg transition-all flex items-center gap-1.5 ${
                  filterSeverity === sev
                    ? sev === 'CRITICAL'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-bold'
                      : sev === 'WARNING'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'bg-violet-500/20 text-violet-300 border border-violet-500/40 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <span>{sev}</span>
                <span className="text-[9px] opacity-75">({count})</span>
              </button>
            );
          })}
        </div>

        {onClearResolved && (
          <button
            onClick={onClearResolved}
            className="text-[10px] text-slate-500 hover:text-slate-300 hover:underline"
          >
            Clear Resolved
          </button>
        )}
      </div>

      {/* Neural Pipeline Status Banner */}
      <div className="px-3 py-1.5 border-b border-white/[0.06] bg-black/40 flex items-center justify-between text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>Real-time Tripwire, Loitering & Object Sentry</span>
        </div>
        <span className="text-emerald-400 font-bold">100% REAL CV</span>
      </div>

      {/* Alert Feed List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredAlerts.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-slate-500 text-center p-4">
            <CheckCircle className="w-8 h-8 text-emerald-500/40 mb-2" />
            <span className="font-bold text-slate-300 text-xs">No Active Security Anomalies</span>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs font-sans">
              Neural CV pipeline is actively analyzing feeds for tripwire breaches, prolonged loitering, unattended items, and watchlist identities.
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const isCritical = alert.severity === 'CRITICAL';
            const isWarning = alert.severity === 'WARNING';
            const isResolved = alert.status === 'RESOLVED';
            const isAcknowledged = alert.status === 'ACKNOWLEDGED';

            return (
              <div
                key={alert.id}
                className={`p-3 rounded-xl border transition-all ${
                  isResolved
                    ? 'opacity-60 bg-black/20 border-white/[0.06]'
                    : isCritical
                    ? 'bg-red-950/25 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                    : isWarning
                    ? 'bg-amber-950/25 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                    : 'bg-violet-950/20 border-violet-500/40 shadow-[0_0_15px_rgba(139,92,246,0.1)]'
                }`}
              >
                {/* Alert Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {alert.type === 'DANGEROUS_OBJECT' ? (
                      <Flame className="w-4 h-4 text-red-400 shrink-0 animate-pulse" />
                    ) : alert.type === 'UNATTENDED_OBJECT' ? (
                      <Package className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : isCritical ? (
                      <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <Info className="w-4 h-4 text-violet-400 shrink-0" />
                    )}
                    <span
                      className={`font-bold uppercase text-[11px] ${
                        isCritical ? 'text-red-300' : isWarning ? 'text-amber-300' : 'text-violet-300'
                      }`}
                    >
                      {alert.title}
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-500 shrink-0">{alert.timestamp}</span>
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-300 font-sans mt-1.5 leading-relaxed">
                  {alert.description}
                </p>

                {/* Subject & Camera tags */}
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.06] text-[10px] flex-wrap">
                  <button
                    onClick={() => onSelectCamera(alert.cameraId)}
                    className="text-violet-300 hover:underline flex items-center gap-1"
                  >
                    <span>Cam:</span>
                    <span className="font-bold">{alert.cameraId}</span>
                  </button>

                  {alert.personClusterId && (
                    <>
                      <span className="text-slate-600">•</span>
                      <button
                        onClick={() => onSelectPersonById(alert.personClusterId!)}
                        className="text-cyan-300 hover:underline flex items-center gap-1"
                      >
                        <span>Subject:</span>
                        <span className="font-bold">{alert.personClusterId}</span>
                      </button>
                    </>
                  )}

                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">Confidence: {alert.confidence.toFixed(0)}%</span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-1.5 mt-2.5">
                  {(alert.type === 'DANGEROUS_OBJECT' || isCritical) && !isResolved && (
                    <button
                      onClick={() => playSecuritySiren(3500)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-950/80 border border-red-500/60 text-red-300 hover:bg-red-900/80 hover:text-white flex items-center gap-1 transition-all"
                      title="Broadcast 3.5s emergency siren"
                    >
                      <Volume2 className="w-2.5 h-2.5 text-red-400" />
                      <span>Siren Alarm</span>
                    </button>
                  )}

                  {alert.status === 'ACTIVE' && (
                    <>
                      <button
                        onClick={() => onAcknowledgeAlert(alert.id)}
                        className="px-2 py-1 rounded-lg text-[10px] font-bold glass hover:bg-white/[0.08] text-slate-300 border border-white/[0.1] transition-colors"
                      >
                        Acknowledge
                      </button>
                      <button
                        onClick={() => onDispatchAlert(alert.id)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white flex items-center gap-1 shadow-[0_0_10px_rgba(239,68,68,0.25)] transition-all"
                      >
                        <Send className="w-2.5 h-2.5" />
                        <span>Dispatch Security</span>
                      </button>
                    </>
                  )}

                  {isAcknowledged && (
                    <button
                      onClick={() => onResolveAlert(alert.id)}
                      className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1 transition-all"
                    >
                      <CheckCircle className="w-2.5 h-2.5" />
                      <span>Resolve</span>
                    </button>
                  )}

                  {isResolved && (
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold">
                      <CheckCircle className="w-3 h-3" /> Resolved
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
