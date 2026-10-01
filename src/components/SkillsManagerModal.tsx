import { useState, useEffect } from 'react';
import {
  AISkill,
  InferenceEngine,
  ModelProvider,
  SkillId,
  SkillsConfig,
} from '../skills/types';
import {
  loadSkillsConfig,
  saveSkillsConfig,
  toggleSkill,
  setInferenceEngine,
  setSkillSensitivity,
  setModelProvider,
  updateModelSettings,
} from '../skills/skillsRegistry';
import {
  X,
  Cpu,
  Cloud,
  Zap,
  Leaf,
  Sliders,
  CheckCircle,
  AlertTriangle,
  Layers,
  Key,
  Server,
  Terminal,
} from 'lucide-react';

interface SkillsManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SkillsManagerModal({ isOpen, onClose }: SkillsManagerModalProps) {
  const [config, setConfig] = useState<SkillsConfig>(loadSkillsConfig());
  const [endpointInput, setEndpointInput] = useState<string>('');
  const [modelInput, setModelInput] = useState<string>('');
  const [apiKeyInput, setApiKeyInput] = useState<string>('');
  const [settingsSaved, setSettingsSaved] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const current = loadSkillsConfig();
      setConfig(current);
      setEndpointInput(current.providerEndpoint || '');
      setModelInput(current.modelName || '');
      setApiKeyInput(current.apiKey || '');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleToggle = (id: SkillId) => {
    const updated = toggleSkill(id);
    setConfig(updated);
  };

  const handleEngineChange = (engine: InferenceEngine) => {
    const updated = setInferenceEngine(engine);
    setConfig(updated);
  };

  const handleProviderSelect = (provider: ModelProvider) => {
    const updated = setModelProvider(provider);
    setConfig(updated);
    setEndpointInput(updated.providerEndpoint);
    setModelInput(updated.modelName);
  };

  const handleSaveModelSettings = () => {
    const updated = updateModelSettings(
      endpointInput.trim(),
      modelInput.trim(),
      apiKeyInput.trim()
    );
    setConfig(updated);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2200);
  };

  const handleSensitivityChange = (id: SkillId, val: number) => {
    const updated = setSkillSensitivity(id, val);
    setConfig(updated);
  };

  const activeSkillCount = Object.values(config.skills).filter((s) => s.enabled).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#050713]/95 border border-violet-500/30 rounded-2xl shadow-[0_0_50px_rgba(139,92,246,0.3)] overflow-hidden font-mono text-slate-200">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.02] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/25 border border-violet-400/40 text-violet-300 flex items-center justify-center shadow-lg">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  AI Skills & Inference Engine Manager
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-violet-500/20 text-violet-300 border border-violet-500/30">
                  Open-Source Vision Pipeline
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Configure pluggable vision skills and select your neural inference backend (Ollama, DeepSeek, Qwen, Groq, or Edge).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl glass hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* SECTION 1: INFERENCE ENGINE SELECTOR */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-violet-400" />
                <span>Primary Inference Engine</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Controls device thermal & battery impact
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Cloud / Remote Neural Option */}
              <button
                type="button"
                onClick={() => handleEngineChange('cloud_neural')}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between relative ${
                  config.engine === 'cloud_neural'
                    ? 'bg-gradient-to-br from-violet-950/60 to-indigo-950/70 border-violet-400/80 shadow-[0_0_20px_rgba(139,92,246,0.3)] ring-1 ring-violet-400'
                    : 'glass-card border-white/[0.08] hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Cloud className="w-4 h-4 text-cyan-400" />
                      <span className="font-bold text-xs text-white">Cloud Vision Engine</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40">
                      REMOTE
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    Offloads inference to remote models (DeepSeek, Qwen2.5-VL, Ollama, Groq, Gemini). Eliminates device thermal throttling.
                  </p>
                </div>
                <div className="mt-3 text-[10px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>Optimal for Android & Laptops</span>
                </div>
              </button>

              {/* Eco Adaptive Local Edge Option */}
              <button
                type="button"
                onClick={() => handleEngineChange('eco_adaptive')}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between relative ${
                  config.engine === 'eco_adaptive'
                    ? 'bg-gradient-to-br from-emerald-950/60 to-teal-950/70 border-emerald-400/80 shadow-[0_0_20px_rgba(16,185,129,0.3)] ring-1 ring-emerald-400'
                    : 'glass-card border-white/[0.08] hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Leaf className="w-4 h-4 text-emerald-400" />
                      <span className="font-bold text-xs text-white">Eco Adaptive Edge</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40">
                      -90% CPU LOAD
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    Local inference throttled to 1.2s intervals with 60 FPS motion interpolation.
                  </p>
                </div>
                <div className="mt-3 text-[10px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  <span>Offline Battery Saver</span>
                </div>
              </button>

              {/* Turbo Local WebGL Option */}
              <button
                type="button"
                onClick={() => handleEngineChange('turbo_local')}
                className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between relative ${
                  config.engine === 'turbo_local'
                    ? 'bg-gradient-to-br from-amber-950/60 to-orange-950/70 border-amber-400/80 shadow-[0_0_20px_rgba(245,158,11,0.3)] ring-1 ring-amber-400'
                    : 'glass-card border-white/[0.08] hover:border-white/20'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-xs text-white">Turbo Local WebGL</span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                      CONTINUOUS
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                    Continuous 40 FPS neural net inference. Requires dedicated workstation GPU.
                  </p>
                </div>
                <div className="mt-3 text-[10px] text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>High power & heating</span>
                </div>
              </button>
            </div>
          </div>

          {/* SECTION 1.5: MODEL PROVIDER & OPEN-SOURCE AI SETTINGS */}
          {config.engine === 'cloud_neural' && (
            <div className="p-4 rounded-xl bg-violet-950/20 border border-violet-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-violet-300 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-violet-400" />
                  <span>Model Provider & Vision Architecture</span>
                </span>
                <span className="text-[10px] text-slate-400 font-sans">
                  DeepCamera-standard OpenAI Vision API
                </span>
              </div>

              {/* Provider Selection Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {(
                  [
                    { id: 'ollama', label: 'Ollama (Local)', badge: 'Self-Hosted' },
                    { id: 'openrouter', label: 'OpenRouter', badge: 'Multi-Model' },
                    { id: 'groq', label: 'Groq Cloud', badge: 'Ultra-Fast' },
                    { id: 'custom', label: 'Custom API', badge: 'vLLM / Server' },
                    { id: 'gemini', label: 'Gemini', badge: 'Managed' },
                  ] as const
                ).map((prov) => {
                  const isSelected = config.provider === prov.id;
                  return (
                    <button
                      key={prov.id}
                      type="button"
                      onClick={() => handleProviderSelect(prov.id)}
                      className={`p-2 rounded-lg border text-left transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'bg-violet-600/30 border-violet-400 text-white shadow-[0_0_12px_rgba(139,92,246,0.25)]'
                          : 'bg-black/30 border-white/[0.08] text-slate-300 hover:border-white/20'
                      }`}
                    >
                      <span className="text-xs font-bold truncate">{prov.label}</span>
                      <span className="text-[9px] text-slate-400 font-sans mt-0.5">{prov.badge}</span>
                    </button>
                  );
                })}
              </div>

              {/* Editable Fields: Endpoint, Model, API Key */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">
                    API Endpoint URL:
                  </label>
                  <input
                    type="text"
                    value={endpointInput}
                    onChange={(e) => setEndpointInput(e.target.value)}
                    placeholder="http://localhost:11434/v1"
                    className="w-full bg-black/60 border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-400"
                  />
                  <span className="text-[10px] text-slate-400 font-sans mt-1 block">
                    {config.provider === 'ollama' && 'Runs on your PC or LAN via Ollama (/v1/chat/completions)'}
                    {config.provider === 'openrouter' && 'Accesses DeepSeek, Qwen2.5-VL, LLaVA gateway'}
                    {config.provider === 'groq' && 'High-speed Groq Llama 3.2 Vision endpoint'}
                    {config.provider === 'custom' && 'Local vLLM, SGLang, or custom OpenAI vision server'}
                    {config.provider === 'gemini' && 'Server-managed Gemini Flash vision pipeline'}
                  </span>
                </div>

                <div>
                  <label className="text-[11px] text-slate-300 block mb-1">
                    Model Identifier:
                  </label>
                  <input
                    type="text"
                    value={modelInput}
                    onChange={(e) => setModelInput(e.target.value)}
                    placeholder="qwen2.5-vl"
                    className="w-full bg-black/60 border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-400"
                  />
                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400">Presets:</span>
                    {['qwen2.5-vl', 'deepseek-r1', 'llava:13b', 'llama-3.2-11b-vision-preview'].map((pModel) => (
                      <button
                        key={pModel}
                        type="button"
                        onClick={() => setModelInput(pModel)}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.12] text-slate-300 border border-white/[0.08]"
                      >
                        {pModel}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* API Key (Optional for local Ollama) */}
              <div>
                <label className="text-[11px] text-slate-300 block mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Key className="w-3 h-3 text-violet-400" />
                    <span>API Key / Token (leave blank for local Ollama):</span>
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder={
                      config.provider === 'ollama'
                        ? 'Not required for local Ollama'
                        : 'sk-... (or leave empty to use server default)'
                    }
                    className="flex-1 bg-black/60 border border-white/[0.1] rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-violet-400"
                  />
                  <button
                    type="button"
                    onClick={handleSaveModelSettings}
                    className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shrink-0 shadow-md"
                  >
                    {settingsSaved ? 'Saved!' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: PLUGGABLE SKILLS LIST */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Installed AI Skills ({activeSkillCount}/6 Active)</span>
              </label>
              <span className="text-[11px] text-slate-400">
                Toggle skills on/off to balance safety vs performance
              </span>
            </div>

            <div className="space-y-2.5">
              {Object.values(config.skills).map((skill: AISkill) => {
                const isEnabled = skill.enabled;
                return (
                  <div
                    key={skill.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isEnabled
                        ? 'bg-white/[0.03] border-white/[0.12] hover:border-violet-500/40'
                        : 'bg-black/20 border-white/[0.04] opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-white">{skill.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/[0.08]">
                            v{skill.version}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                              skill.deviceImpact === 'NEAR_ZERO'
                                ? 'bg-cyan-500/20 text-cyan-300'
                                : skill.deviceImpact === 'VERY_LOW' || skill.deviceImpact === 'LOW'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : skill.deviceImpact === 'MEDIUM'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-red-500/20 text-red-300'
                            }`}
                          >
                            Load: {skill.deviceImpact}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 font-sans leading-relaxed">
                          {skill.description}
                        </p>
                      </div>

                      {/* Toggle Button */}
                      <button
                        type="button"
                        onClick={() => handleToggle(skill.id)}
                        className={`w-12 h-6 rounded-full transition-colors relative shrink-0 p-0.5 ${
                          isEnabled ? 'bg-violet-600' : 'bg-slate-700'
                        }`}
                        title={isEnabled ? 'Click to disable skill' : 'Click to enable skill'}
                      >
                        <div
                          className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                            isEnabled ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Sensitivity Slider when skill is active */}
                    {isEnabled && (
                      <div className="mt-3 pt-2.5 border-t border-white/[0.05] flex items-center justify-between gap-4 text-[10px] text-slate-400">
                        <span className="shrink-0">Sensitivity / Trigger Threshold:</span>
                        <input
                          type="range"
                          min={20}
                          max={95}
                          value={skill.sensitivity}
                          onChange={(e) => handleSensitivityChange(skill.id, Number(e.target.value))}
                          className="flex-1 accent-violet-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                        />
                        <span className="font-mono text-violet-300 w-8 text-right font-bold">
                          {skill.sensitivity}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.08] bg-white/[0.02] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              Engine: <strong className="text-white uppercase">{config.engine.replace('_', ' ')}</strong>
              {config.engine === 'cloud_neural' && (
                <span className="text-slate-400 ml-1.5">
                  ({config.provider}: <strong className="text-violet-300">{config.modelName}</strong>)
                </span>
              )}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold transition-all shadow-md"
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}
