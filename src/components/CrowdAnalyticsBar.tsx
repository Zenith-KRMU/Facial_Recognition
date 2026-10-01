import { CrowdDynamicsMetrics } from '../types';
import {
  Users,
  Layers,
  ShieldAlert,
  Activity,
  Package,
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
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 font-mono text-xs">
      {/* Metric 1: Headcount */}
      <div className="p-3 glass-card rounded-xl border border-white/[0.08] hover:border-violet-500/40 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-[10px] tracking-wider font-semibold uppercase">
          <span>Headcount</span>
          <Users className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <div className="flex items-baseline gap-1 mt-1.5">
          <span className="text-xl sm:text-2xl font-light text-white tracking-tight glow-text">
            {detectedFaceCount}
          </span>
          <span className="text-[10px] text-slate-400">detected</span>
        </div>
        <span className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Active Detection
        </span>
      </div>

      {/* Metric 2: Objects Tracked */}
      <div className="p-3 glass-card rounded-xl border border-white/[0.08] hover:border-cyan-500/40 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-[10px] tracking-wider font-semibold uppercase">
          <span>Objects Tracked</span>
          <Package className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-1 mt-1.5">
          <span className="text-xl sm:text-2xl font-light text-cyan-300 tracking-tight">
            {detectedObjectCount}
          </span>
          <span className="text-[10px] text-slate-400">items</span>
        </div>
        <span className="text-[10px] text-slate-400 mt-1">In Field of View</span>
      </div>

      {/* Metric 3: Unattended Items */}
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
          <span className="text-[10px] text-slate-400">anomalies</span>
        </div>
        <span className={`text-[10px] mt-1 ${unattendedCount > 0 ? 'text-red-400 font-semibold' : 'text-slate-400'}`}>
          {unattendedCount > 0 ? 'Attention Needed' : 'Normal'}
        </span>
      </div>

      {/* Metric 4: Active Alerts */}
      <div className="p-3 glass-card rounded-xl border border-white/[0.08] hover:border-amber-500/40 transition-all flex flex-col justify-between">
        <div className="flex items-center justify-between text-slate-400 text-[10px] tracking-wider font-semibold uppercase">
          <span>Active Incidents</span>
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
          <span className="text-[10px] text-slate-400">alerts</span>
        </div>
        <span className={`text-[10px] mt-1 ${activeAlertCount > 0 ? 'text-amber-400 font-semibold' : 'text-slate-400'}`}>
          {activeAlertCount > 0 ? 'Review Required' : 'All Clear'}
        </span>
      </div>

      {/* Metric 5: Crowd Density */}
      <div className="p-3 glass-card rounded-xl border border-white/[0.08] hover:border-indigo-500/40 transition-all flex flex-col justify-between col-span-2 sm:col-span-1">
        <div className="flex items-center justify-between text-slate-400 text-[10px] tracking-wider font-semibold uppercase">
          <span>Crowd Density</span>
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
        <span className={`text-[10px] mt-1 ${isHighDensity ? 'text-red-400 font-semibold' : 'text-slate-400'}`}>
          {isHighDensity ? 'High Density Zone' : 'Standard Density'}
        </span>
      </div>
    </div>
  );
}
