# SCW Phase 39 — Mobile 3D performance profile

## Delivered
- Mobile preview uses a lower pixel-ratio cap, no antialiasing, low-power GPU preference and disabled real-time shadows.
- Mobile rack density is reduced while retaining reserve, high-bay and picking visual structure.
- Mobile animation rendering is capped at approximately 30 FPS; desktop retains the higher-quality profile.
- Changes apply only to `mega-warehouse-5xl-ops.html`.

## Verification needed
Static source changes are in place, but FPS, memory and thermal performance must be measured on actual Android and desktop browsers. No claim of a device benchmark is made.
