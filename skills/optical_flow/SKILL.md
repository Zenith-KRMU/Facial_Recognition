---
name: optical-flow-crowd
description: Lucas-Kanade and Gunnar Farneback optical motion vectors calculating velocity, directional divergence, and stampede turbulence.
version: 1.1.0
category: crowd_dynamics
device_impact: HIGH
cloud_supported: true
---

# Optical Flow Crowd Dynamics Skill

## Overview
Computes sparse and dense optical motion vectors across a downscaled video grid. Measures crowd speed, direction divergence, and Reynolds-analogue turbulence to predict pre-stampede hazards and abnormal crowd movement.

## Capabilities
- **Vector Field**: Spatio-temporal motion arrows indicating pedestrian flow velocities.
- **Turbulence Metric**: Normalized standard deviation of motion vectors across local grid tiles.
- **Stampede Early Warning**: Triggers alerts when turbulence index exceeds configured safety limits (>0.65).
- **Counter-Flow Detection**: Flags individuals or sub-groups moving opposite to the dominant corridor stream.

## Parameters
- `step_size`: Grid sample spacing in pixels (default: `24`).
- `turbulence_threshold`: Turbulence index threshold for critical crowd alerts (default: `0.68`).
- `min_velocity`: Noise threshold to ignore ambient background motion (default: `1.2 px/frame`).
