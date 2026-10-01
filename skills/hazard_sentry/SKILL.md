---
name: hazard-sentry
description: 80-Class COCO-SSD object detection detecting unattended baggage, stationary backpacks, and dangerous weapons with automated siren alarms.
version: 1.3.0
category: safety
device_impact: MEDIUM
cloud_supported: true
---

# Hazard & Unattended Object Sentry Skill

## Overview
Detects and classifies public space objects into categories (Luggage, Vehicles, Electronics, Weapons). Tracks dwell time of stationary baggage to detect unattended threats, and flags dangerous items (knives, weapons, slender objects) with instant security broadcasts.

## Capabilities
- **Object Classification**: MobileNetV2-COCO-SSD detecting 80 classes at 30% confidence floor.
- **Unattended Baggage Watch**: Flags backpacks, suitcases, and handbags left stationary without a pedestrian within 1.5m for >6 seconds.
- **Weapon Detection & Siren**: Immediately sounds emergency audio siren when a weapon or sharp object is classified.
- **Slender Object / Pen Detector**: Specialized color and aspect ratio kernel identifying pens and hand-held slender objects.

## Parameters
- `unattended_time_seconds`: Dwell time threshold before triggering unattended luggage alert (default: `6s`).
- `confidence_threshold`: Minimum model score to accept object prediction (default: `0.30`).
