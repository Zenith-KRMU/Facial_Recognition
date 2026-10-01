---
name: privacy-guard
description: Real-time on-device biometric anonymization and bystander face blurring for ethical public space surveillance and GDPR compliance.
version: 1.0.0
category: privacy
device_impact: VERY_LOW
cloud_supported: true
---

# Community Privacy Guard Skill

## Overview
Protects citizen privacy in public spaces by automatically applying real-time Gaussian blur or pixelation over unflagged bystander faces. Only authorized personnel or flagged persons of interest have unblurred faces.

## Capabilities
- **Selective Anonymization**: Scans detected face bounding boxes; if `status === 'UNREGISTERED'` and not on security watchlist, obfuscates facial region on canvas.
- **Biometric Protection**: Prevents unauthorized casual observation of bystanders in public spaces.
- **Zero Heavy Compute**: Uses high-speed 2D canvas filter and pixel downscale without requiring secondary neural models.

## Parameters
- `blur_radius`: Gaussian blur radius in pixels (default: `14px`).
- `allow_enrolled_visible`: Keep community enrolled authorized staff visible (default: `true`).
