import { useState } from 'react';
import { X, CheckCircle2, Cpu, Database, Server, GitBranch, Layers, ShieldCheck, FileText } from 'lucide-react';
import { ProjectSpecData } from '../types';

interface ProjectSpecsModalProps {
  isOpen: boolean;
  onClose: () => void;
  specs: ProjectSpecData;
}

export function ProjectSpecsModal({ isOpen, onClose, specs }: ProjectSpecsModalProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'architecture' | 'benchmarks'>('overview');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl bg-[#070913]/95 text-slate-200 rounded-2xl shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-hidden border border-white/[0.12] glass-panel backdrop-blur-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header matching exact user screenshot */}
        <div className="flex items-start justify-between p-6 pb-4 border-b border-white/[0.08] bg-white/[0.02]">
          <div className="pr-4">
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug glow-text font-mono">
              {specs.title}
            </h2>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-violet-500/15 text-violet-300 border border-violet-500/30 shadow-[0_0_10px_rgba(139,92,246,0.2)]">
              <span className="w-2 h-2 rounded-full bg-violet-400 shadow-[0_0_6px_#a78bfa] animate-pulse" />
              Approved
            </span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl glass hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-white/[0.08] px-6 bg-black/30 text-xs font-mono">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'overview'
                ? 'border-violet-500 text-violet-300 font-bold shadow-[0_4px_15px_rgba(139,92,246,0.25)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Proposal Card
          </button>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'architecture'
                ? 'border-violet-500 text-violet-300 font-bold shadow-[0_4px_15px_rgba(139,92,246,0.25)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            Pipeline Architecture
          </button>
          <button
            onClick={() => setActiveTab('benchmarks')}
            className={`py-3 px-4 border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'benchmarks'
                ? 'border-violet-500 text-violet-300 font-bold shadow-[0_4px_15px_rgba(139,92,246,0.25)]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            CV Algorithms
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6 text-sm">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Problem Description */}
              <div>
                <h3 className="font-semibold text-white text-base mb-2 font-mono flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-violet-500 rounded-full" />
                  Problem Description
                </h3>
                <p className="text-slate-300 leading-relaxed font-sans">
                  {specs.problemDescription}
                </p>
              </div>

              {/* Objectives */}
              <div>
                <h3 className="font-semibold text-white text-base mb-2 font-mono flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-indigo-500 rounded-full" />
                  Objectives
                </h3>
                <p className="text-slate-300 leading-relaxed font-sans">
                  {specs.objectives}
                </p>
              </div>

              {/* Proposed Solution */}
              <div>
                <h3 className="font-semibold text-white text-base mb-2 font-mono flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-cyan-500 rounded-full" />
                  Proposed Solution
                </h3>
                <p className="text-slate-300 leading-relaxed mb-3 font-sans">
                  System will integrate computer vision and deep learning techniques to: (1) use Convolutional Neural Networks (CNNs) for face detection and recognition, (2) employ Optical Flow techniques to track individuals across cameras, (3) develop a machine learning-based clustering algorithm to differentiate between individuals, and (4) design a web-based interface for authorities to view and analyze crowd dynamics.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  {specs.proposedSolution.map((sol, index) => (
                    <div key={index} className="p-3.5 glass-card border border-white/[0.08] rounded-xl flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/40 flex items-center justify-center shrink-0 font-bold text-xs mt-0.5 shadow-[0_0_8px_rgba(139,92,246,0.3)]">
                        {index + 1}
                      </div>
                      <span className="text-xs text-slate-200 font-medium">
                        {sol.replace(/^\(\d+\)\s*/, '')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Technology Stack */}
              <div>
                <h3 className="font-semibold text-white text-base mb-2 font-mono flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-purple-500 rounded-full" />
                  Technology Stack
                </h3>
                <p className="text-slate-300 leading-relaxed font-medium mb-3 font-sans">
                  TensorFlow 2.x, OpenCV 4.x, Docker for containerization, Flask API for data transmission, PostgreSQL for database management
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-xl glass-card text-amber-300 border border-amber-500/40 text-xs font-mono font-medium">
                    TensorFlow 2.x
                  </span>
                  <span className="px-3 py-1 rounded-xl glass-card text-emerald-300 border border-emerald-500/40 text-xs font-mono font-medium">
                    OpenCV 4.x (Optical Flow)
                  </span>
                  <span className="px-3 py-1 rounded-xl glass-card text-cyan-300 border border-cyan-500/40 text-xs font-mono font-medium">
                    Docker Containerization
                  </span>
                  <span className="px-3 py-1 rounded-xl glass-card text-purple-300 border border-purple-500/40 text-xs font-mono font-medium">
                    Flask / Express API
                  </span>
                  <span className="px-3 py-1 rounded-xl glass-card text-indigo-300 border border-indigo-500/40 text-xs font-mono font-medium">
                    PostgreSQL Database
                  </span>
                </div>
              </div>

              {/* Problem Type */}
              <div>
                <h3 className="font-semibold text-white text-base mb-1 font-mono flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-emerald-500 rounded-full" />
                  Problem Type
                </h3>
                <p className="text-slate-300 font-sans">
                  {specs.problemType}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'architecture' && (
            <div className="space-y-4 font-mono">
              <div className="p-3.5 glass-card border border-violet-500/30 rounded-xl text-xs text-violet-200">
                End-to-end data pipeline from multi-camera RTSP ingestion to authority alert dispatch:
              </div>

              <div className="space-y-3">
                <div className="p-3.5 border border-white/[0.08] rounded-xl flex items-start gap-3 glass-card">
                  <span className="w-6 h-6 rounded-lg bg-violet-600 text-white flex items-center justify-center font-mono text-xs shrink-0 shadow-[0_0_10px_rgba(139,92,246,0.3)]">1</span>
                  <div>
                    <h4 className="font-semibold text-white text-xs">CCTV RTSP Multi-Camera Ingestion (OpenCV 4.x)</h4>
                    <p className="text-xs text-slate-300 mt-0.5 font-sans leading-relaxed">Captures 30 FPS video frames from distributed cameras. Decodes YUV420 to RGB frames in Docker stream worker containers.</p>
                  </div>
                </div>

                <div className="p-3.5 border border-white/[0.08] rounded-xl flex items-start gap-3 glass-card">
                  <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-mono text-xs shrink-0 shadow-[0_0_10px_rgba(99,102,241,0.3)]">2</span>
                  <div>
                    <h4 className="font-semibold text-white text-xs">CNN Face Detection & Occlusion Analysis (TensorFlow 2.x)</h4>
                    <p className="text-xs text-slate-300 mt-0.5 font-sans leading-relaxed">MobileNetV2-SSD / RetinaFace locates bounding boxes and 68-landmark facial points. Segments masks, eyewear, and scarves for occlusion resilience.</p>
                  </div>
                </div>

                <div className="p-3.5 border border-white/[0.08] rounded-xl flex items-start gap-3 glass-card">
                  <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-mono text-xs shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.3)]">3</span>
                  <div>
                    <h4 className="font-semibold text-white text-xs">Lucas-Kanade Sparse & Dense Optical Flow</h4>
                    <p className="text-xs text-slate-300 mt-0.5 font-sans leading-relaxed">Computes crowd velocity vectors `(dx, dy)`. Detects counter-flow collisions, sudden stampede dispersal, and turbulent flow spikes.</p>
                  </div>
                </div>

                <div className="p-3.5 border border-white/[0.08] rounded-xl flex items-start gap-3 glass-card">
                  <span className="w-6 h-6 rounded-lg bg-purple-600 text-white flex items-center justify-center font-mono text-xs shrink-0 shadow-[0_0_10px_rgba(168,85,247,0.3)]">4</span>
                  <div>
                    <h4 className="font-semibold text-white text-xs">ML Feature Clustering & Cross-Camera Re-ID</h4>
                    <p className="text-xs text-slate-300 mt-0.5 font-sans leading-relaxed">Extracts 512D ArcFace embeddings and applies DBSCAN clustering with cosine distance to correlate individuals across camera handover transitions.</p>
                  </div>
                </div>

                <div className="p-3.5 border border-white/[0.08] rounded-xl flex items-start gap-3 glass-card">
                  <span className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center font-mono text-xs shrink-0 shadow-[0_0_10px_rgba(245,158,11,0.3)]">5</span>
                  <div>
                    <h4 className="font-semibold text-white text-xs">PostgreSQL Storage & Flask API Gateway</h4>
                    <p className="text-xs text-slate-300 mt-0.5 font-sans leading-relaxed">Stores person trajectory clusters, incident snapshots, and alert timestamps. Streams WebSockets to the authority command center.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'benchmarks' && (
            <div className="space-y-4 font-mono">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 glass-card border border-white/[0.08] rounded-xl">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Inference Latency</span>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">14.8 ms</div>
                  <span className="text-[11px] text-emerald-400 font-medium">TensorRT / TF Lite GPU quantized</span>
                </div>
                <div className="p-3.5 glass-card border border-white/[0.08] rounded-xl">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Occlusion Accuracy</span>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">93.6%</div>
                  <span className="text-[11px] text-cyan-400 font-medium">Resilient up to 60% face coverage</span>
                </div>
                <div className="p-3.5 glass-card border border-white/[0.08] rounded-xl">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Cross-Cam Re-ID mAP</span>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">88.2%</div>
                  <span className="text-[11px] text-purple-400 font-medium">DBSCAN ε=0.42 Cosine distance</span>
                </div>
                <div className="p-3.5 glass-card border border-white/[0.08] rounded-xl">
                  <span className="text-[11px] text-slate-400 uppercase font-semibold">Optical Flow Rate</span>
                  <div className="text-lg font-bold text-white font-mono mt-0.5">30.0 FPS</div>
                  <span className="text-[11px] text-amber-400 font-medium">Lucas-Kanade 3 pyramid levels</span>
                </div>
              </div>

              <div className="p-3.5 bg-[#020205] text-slate-200 rounded-xl font-mono text-xs space-y-1 border border-white/[0.08]">
                <div className="text-slate-400"># Docker Deployment Command</div>
                <div className="text-emerald-400">$ docker run -d --gpus all -p 5000:5000 -p 3000:3000 \</div>
                <div className="text-emerald-400 pl-4">-e POSTGRES_URI=postgresql://admin@db:5432/crowd_vision \</div>
                <div className="text-emerald-400 pl-4">crowd-dynamics/facial-recognition:v2.4</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer matching exact user screenshot */}
        <div className="flex items-center justify-end p-4 border-t border-white/[0.08] bg-white/[0.02]">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-white bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 rounded-xl shadow-[0_0_20px_rgba(139,92,246,0.3)] transition-all font-mono"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
