---
name: tripwire-loiter
description: Virtual perimeter breach boundary line and pedestrian dwell-time loitering sentry in restricted zones.
version: 1.0.0
category: security
device_impact: LOW
cloud_supported: true
---

# Tripwire & Loitering Sentry Skill

## Overview
Monitors virtual tripwire lines across public access zones and measures dwell times of individuals in sensitive concourse sectors.

## Capabilities
- **Virtual Boundary Sentry**: Ray-casting line intersection detecting when a tracked centroid crosses a virtual tripwire boundary.
- **Loitering Sentry**: Accumulates time-in-frame metrics for detected clusters; triggers warning when an individual remains in a non-transit zone for >180s.
- **Directional Enforcement**: Detects wrong-way entry through designated one-way exits.

## Parameters
- `loiter_threshold_seconds`: Time before triggering loitering investigation (default: `180s`).
- `tripwire_y_position`: Normalized Y coordinate percentage of the tripwire line (default: `60%`).
