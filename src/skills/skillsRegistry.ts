import { AISkill, InferenceEngine, ModelProvider, SkillId, SkillsConfig } from './types';

const STORAGE_KEY = 'crowdvision_skills_config_v3';

export const DEFAULT_SKILLS: Record<SkillId, AISkill> = {
  cloud_ai_agent: {
    id: 'cloud_ai_agent',
    name: 'Cloud Vision Agent (DeepSeek / Qwen / Ollama)',
    category: 'cloud_agent',
    version: '2.1.0',
    description: 'Offloads vision and crowd dynamics inference to remote open-source models (DeepSeek, Qwen2.5-VL, LLaVA) or cloud endpoints.',
    enabled: true,
    deviceImpact: 'NEAR_ZERO',
    sensitivity: 75,
    cloudSupported: true,
  },
  face_reid: {
    id: 'face_reid',
    name: 'Face Re-ID & Biometric Matching',
    category: 'biometrics',
    version: '1.2.0',
    description: 'BlazeFace 6-point landmark detection and cross-camera cosine clustering against community identities.',
    enabled: true,
    deviceImpact: 'MEDIUM',
    sensitivity: 65,
    cloudSupported: true,
  },
  hazard_sentry: {
    id: 'hazard_sentry',
    name: 'Hazard & Unattended Luggage Sentry',
    category: 'safety',
    version: '1.3.0',
    description: 'Detects unattended bags, stationary backpacks (>6s), and dangerous items with automated audio sirens.',
    enabled: true,
    deviceImpact: 'MEDIUM',
    sensitivity: 70,
    cloudSupported: true,
  },
  optical_flow: {
    id: 'optical_flow',
    name: 'Optical Flow & Stampede Turbulence',
    category: 'crowd_dynamics',
    version: '1.1.0',
    description: 'Lucas-Kanade motion vectors detecting velocity, sudden crowd dispersal, and pre-stampede turbulence.',
    enabled: true,
    deviceImpact: 'HIGH',
    sensitivity: 68,
    cloudSupported: true,
  },
  tripwire_sentry: {
    id: 'tripwire_sentry',
    name: 'Tripwire Perimeter & Loitering',
    category: 'security',
    version: '1.0.0',
    description: 'Virtual boundary crossing rays and dwell-time accumulator in restricted sectors (>180s loitering).',
    enabled: true,
    deviceImpact: 'LOW',
    sensitivity: 80,
    cloudSupported: true,
  },
  privacy_guard: {
    id: 'privacy_guard',
    name: 'Community Privacy Guard (Bystander Blur)',
    category: 'privacy',
    version: '1.0.0',
    description: 'Automatically blurs unflagged bystander faces in real-time for ethical public space monitoring.',
    enabled: false,
    deviceImpact: 'VERY_LOW',
    sensitivity: 90,
    cloudSupported: true,
  },
};

export const DEFAULT_CONFIG: SkillsConfig = {
  engine: 'cloud_neural',
  provider: 'ollama',
  providerEndpoint: 'http://localhost:11434/v1',
  modelName: 'qwen2.5-vl',
  apiKey: '',
  cloudSampleIntervalMs: 2400,
  skills: DEFAULT_SKILLS,
};

// Listeners for live reactive state updates
type Listener = (config: SkillsConfig) => void;
const listeners: Set<Listener> = new Set();

export function loadSkillsConfig(): SkillsConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      skills: {
        ...DEFAULT_SKILLS,
        ...(parsed.skills || {}),
      },
    };
  } catch (e) {
    console.warn('Failed to parse skills config from localStorage:', e);
    return DEFAULT_CONFIG;
  }
}

export function saveSkillsConfig(config: SkillsConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    listeners.forEach((fn) => fn(config));
  } catch (e) {
    console.warn('Failed to save skills config:', e);
  }
}

export function subscribeSkillsConfig(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function toggleSkill(skillId: SkillId): SkillsConfig {
  const current = loadSkillsConfig();
  const skill = current.skills[skillId];
  if (!skill) return current;

  const updated: SkillsConfig = {
    ...current,
    skills: {
      ...current.skills,
      [skillId]: {
        ...skill,
        enabled: !skill.enabled,
      },
    },
  };
  saveSkillsConfig(updated);
  return updated;
}

export function setInferenceEngine(engine: InferenceEngine): SkillsConfig {
  const current = loadSkillsConfig();
  const updated: SkillsConfig = {
    ...current,
    engine,
  };
  saveSkillsConfig(updated);
  return updated;
}

export function setModelProvider(provider: ModelProvider): SkillsConfig {
  const current = loadSkillsConfig();
  let defaultEndpoint = current.providerEndpoint;
  let defaultModel = current.modelName;

  if (provider === 'ollama') {
    defaultEndpoint = 'http://localhost:11434/v1';
    defaultModel = 'qwen2.5-vl';
  } else if (provider === 'openrouter') {
    defaultEndpoint = 'https://openrouter.ai/api/v1';
    defaultModel = 'qwen/qwen-2.5-vl-72b-instruct:free';
  } else if (provider === 'groq') {
    defaultEndpoint = 'https://api.groq.com/openai/v1';
    defaultModel = 'llama-3.2-11b-vision-preview';
  } else if (provider === 'custom') {
    defaultEndpoint = 'http://localhost:8000/v1';
    defaultModel = 'deepseek-r1';
  } else if (provider === 'gemini') {
    defaultEndpoint = '';
    defaultModel = 'gemini-2.5-flash';
  }

  const updated: SkillsConfig = {
    ...current,
    provider,
    providerEndpoint: defaultEndpoint,
    modelName: defaultModel,
  };
  saveSkillsConfig(updated);
  return updated;
}

export function updateModelSettings(endpoint: string, modelName: string, apiKey: string): SkillsConfig {
  const current = loadSkillsConfig();
  const updated: SkillsConfig = {
    ...current,
    providerEndpoint: endpoint,
    modelName,
    apiKey,
  };
  saveSkillsConfig(updated);
  return updated;
}

export function setSkillSensitivity(skillId: SkillId, sensitivity: number): SkillsConfig {
  const current = loadSkillsConfig();
  const skill = current.skills[skillId];
  if (!skill) return current;

  const updated: SkillsConfig = {
    ...current,
    skills: {
      ...current.skills,
      [skillId]: {
        ...skill,
        sensitivity,
      },
    },
  };
  saveSkillsConfig(updated);
  return updated;
}
