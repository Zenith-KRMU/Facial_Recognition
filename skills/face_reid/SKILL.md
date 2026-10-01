---
name: face-reid
description: Real-time CNN face detection, 6-point landmark alignment, and cosine embedding Re-ID clustering across multi-camera streams.
version: 1.2.0
category: biometrics
device_impact: MEDIUM
cloud_supported: true
---

# Face Re-ID Skill

## Overview
Detects human faces in real-time video streams, extracts lightweight 128-dimensional biometric embeddings, and performs cross-camera identity matching using cosine similarity and DBSCAN clustering.

## Capabilities
- **Face Detection**: BlazeFace 6-point landmark model running on downscaled inference canvas (480x270).
- **Biometric Matching**: Fast cosine distance calculation against enrolled community identities.
- **Occlusion Handling**: Heuristic occlusion scoring based on eye/nose/mouth visibility ratios.
- **Cross-Camera Handover**: Links sightings of the same subject across different cameras.

## Parameters
- `match_threshold`: Minimum cosine similarity required to confirm an identity (default: `0.65`).
- `occlusion_threshold`: Percent occlusion to trigger masked face warning (default: `35%`).
- `min_face_size`: Minimum bounding box area in pixels (default: `24x24`).
