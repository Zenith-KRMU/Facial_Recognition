export type SkillId =
  | 'face_reid'
  | 'optical_flow'
  | 'hazard_sentry'
  | 'tripwire_sentry'
  | 'privacy_guard'
  | 'cloud_ai_agent';

export type InferenceEngine =
  | 'cloud_neural'  // Offloaded to open-source models / cloud (Ollama, DeepSeek, Qwen2.5-VL, etc.)
  | 'eco_adaptive'  // Throttled on-device inference (1200ms) with 60 FPS motion interpolation
  | 'turbo_local';  // Continuous on-device WebGL for high-spec GPU workstations

export type ModelProvider = 'ollama' | 'openrouter' | 'groq' | 'custom' | 'gemini';

export type DeviceImpact = 'NEAR_ZERO' | 'VERY_LOW' | 'LOW' | 'MEDIUM' | 'HIGH';

export interface AISkill {
  id: SkillId;
  name: string;
  category: 'biometrics' | 'crowd_dynamics' | 'safety' | 'security' | 'privacy' | 'cloud_agent';
  version: string;
  description: string;
  enabled: boolean;
  deviceImpact: DeviceImpact;
  sensitivity: number; // 0 to 100
  cloudSupported: boolean;
}

export interface SkillsConfig {
  engine: InferenceEngine;
  provider: ModelProvider;
  providerEndpoint: string;
  modelName: string;
  apiKey: string;
  cloudSampleIntervalMs: number;
  skills: Record<SkillId, AISkill>;
}
