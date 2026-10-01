---
name: cloud-vision-agent
description: Offloads computer vision and crowd dynamics inference to remote open-source multimodal models (DeepSeek, Qwen2.5-VL, Ollama, Groq, or Gemini), delivering high-precision inference without device overheating.
version: 2.1.0
category: cloud_agent
device_impact: NEAR_ZERO
cloud_supported: true
---

# Cloud & Open-Source Vision Agent Skill

## Overview
Replaces continuous heavy client-side CNN execution with periodic remote neural analysis using DeepCamera-standard OpenAI-compatible vision endpoints. The client captures a lightweight image frame and dispatches it to the designated provider (Ollama, OpenRouter, Groq, or Gemini).

## Capabilities
- **Near-Zero Device Load**: Device runs 0 local neural nets in this mode, preventing CPU overheating, thermal throttling, and battery drain on Android and low-spec PCs.
- **Open-Source Model Support**: Fully compatible with Ollama (`qwen2.5-vl`, `deepseek-r1`, `llava`), OpenRouter, Groq (`llama-3.2-11b-vision-preview`), and custom vLLM servers.
- **Multimodal Visual Reasoning**: Analyzes headcount, pedestrian clusters, unattended bags, physical hazards, and crowd velocity in a single forward pass.
- **Graceful Fallback**: Automatically falls back to Eco Adaptive local mode if network connectivity is interrupted.

## Parameters
- `sample_interval_ms`: Milliseconds between frame dispatches (default: `2400ms`).
- `provider`: AI provider (`ollama`, `openrouter`, `groq`, `custom`, `gemini`).
- `model`: Target vision model identifier (e.g. `qwen2.5-vl`, `deepseek-r1`).
