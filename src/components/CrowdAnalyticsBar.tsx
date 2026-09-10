import { CrowdDynamicsMetrics } from '../types';
import {
  Users,
  Layers,
  Wind,
  ShieldAlert,
  Activity,
  Eye,
  Package,
  Cpu,
} from 'lucide-react';

interface CrowdAnalyticsBarProps {
  metrics: CrowdDynamicsMetrics;
  activeAlertCount: number;
  detectedFaceCount: number;
  detectedObjectCount: number;
  unattendedCount: number;
}

export function CrowdAnalyticsBar({
  metrics,
  activeAlertCount,
  detectedFaceCount,
  detectedObjectCount,
  unattendedCount,
}: CrowdAnalyticsBarProps) {
  const isHighDensity = metrics.averageDensity > 3.0;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 font-mono text-xs">
      {/* Metric 1: Real Detected Faces */}
      <div className="p-3 glass-card rounded-xl border border-white/[0.08] hover:border-violet-500/40 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-[10px] tracking-wider font-semibold uppercase">
          <span>Detected Faces</span>
          <Users className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <div className="flex items-baseline gap-1 mt-1.5">
          <span className="text-xl sm:text-2xl font-light text-white tracking-tight glow-text">
            {detectedFaceCount}
          </span>
          <span className="text-[10px] text-slate-400">active</span>
        </div>
        <span className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_5px_#34d399]" />
          BlazeFace 6-pt CNN
        </span>
      </div>

      {/* Metric 2: Real Identified Objects */}
      <div className="p-3 glass-card rounded-xl border border-white/[0.08] hover:border-cyan-500/40 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-[10px] tracking-wider font-semibold uppercase">
          <span>Identified Objects</span>
          <Package className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-1 mt-1.5">
          <span className="text-xl sm:text-2xl font-light text-cyan-300 tracking-tight">
            {detectedObjectCount}
          </span>
          <span className="text-[10px] text-slate-400">items</span>
        </div>
        <span className="text-[10px] text-cyan-400 mt-1">COCO-SSD 80-Class</span>
      </div>

      {/* Metric 3: Unattended Items / Threats */}
      <div className="p-3 glass-card rounded-xl border border-white/[0.08] hover:border-red-500/40 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-[10px] tracking-wider font-semibold uppercase">
          <span>Unattended Items</span>
          <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
        </div>
        <div className="flex items-baseline gap-1 mt-1.5">
          <span
            className={`text-xl sm:text-2xl font-light tracking-tight ${
              unattendedCount > 0 ? 'text-red-400' : 'text-slate-300'
            }`}
          >
            {unattendedCount}
          </span>
          <span className="text-[10px] text-slate-400">luggage/bags</span>
        </div>
        <span className="text-[10px] text-slate-400 mt-1">
          {unattendedCount > 0 ? 'Security Anomaly' : 'Zero Anomaly'}
        </span>
      </div>

      {/* Metric 4: Active Alerts */}
      <div className="p-3 glass-card rounded-xl border border-white/[0.08] hover:border-amber-500/40 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-[10px] tracking-wider font-semibold uppercase">
          <span>Active Alerts</span>
          <Activity className="w-3.5 h-3.5 text-amber-400" />
        </div>
        <div className="flex items-baseline gap-1 mt-1.5">
          <span
            className={`text-xl sm:text-2xl font-light tracking-tight ${
              activeAlertCount > 0 ? 'text-amber-300' : 'text-slate-300'
            }`}
          >
            {activeAlertCount}
          </span>
          <span className="text-[10px] text-slate-400">incidents</span>
        </div>
        <span className="text-[10px] text-amber-400 mt-1">
          Tripwire / Loiter Sentry
        </span>
      </div>

      {/* Metric 5: Real Occlusion Ratio */}
      <div className="p-3 glass-card rounded-xl border border-white/[0.08] hover:border-violet-500/40 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-[10px] tracking-wider font-semibold uppercase">
          <span>Face Occlusion</span>
          <Eye className="w-3.5 h-3.5 text-purple-400" />
        </div>
        <div className="flex items-baseline gap-1 mt-1.5">
          <span className="text-xl sm:text-2xl font-light text-purple-300 tracking-tight">
            {metrics.occlusionRatioPercent.toFixed(0)}%
          </span>
          <span className="text-[10px] text-slate-400">ratio</span>
        </div>
        <span className="text-[10px] text-purple-400 mt-1">Mask / Visor Sensor</span>
      </div>

      {/* Metric 6: Density Index */}
      <div className="p-3 glass-card rounded-xl border border-white/[0.08] hover:border-violet-500/40 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-[10px] tracking-wider font-semibold uppercase">
          <span>Density Index</span>
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
        </div>
        <div className="flex items-baseline gap-1 mt-1.5">
          <span
            className={`text-xl sm:text-2xl font-light tracking-tight ${
              isHighDensity ? 'text-red-400' : 'text-white'
            }`}
          >
            {metrics.averageDensity.toFixed(1)}
          </span>
          <span className="text-[10px] text-slate-400">pers/m²</span>
        </div>
        <span className="text-[10px] text-slate-400 mt-1 truncate">
          Concourse Spatial
        </span>
      </div>

      {/* Metric 7: Vision Pipeline Latency */}
      <div className="p-3 glass-card rounded-xl border border-white/[0.08] hover:border-violet-500/40 transition-all flex flex-col justify-between col-span-2 sm:col-span-2 lg:col-span-1">
        <div className="flex items-center justify-between text-slate-400 text-[10px] tracking-wider font-semibold uppercase">
          <span>Vision Engine</span>
          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-1 mt-1.5">
          <span className="text-xl sm:text-2xl font-light text-emerald-400 tracking-tight">100%</span>
          <span className="text-[10px] text-slate-400">Live</span>
        </div>
        <span className="text-[10px] text-slate-400 mt-1">
          WebGL Accelerated
        </span>
      </div>
    </div>
  );
}
