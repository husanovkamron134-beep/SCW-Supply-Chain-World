# Phase 8 — 3D Supply Chain Digital Twin

## Delivered
- A separate interactive Three.js scene for the supplier-to-customer network.
- 3D facility blocks for suppliers, factory, central warehouse, distribution centres and customer destinations.
- Route corridors and two animated delivery vehicles with cargo.
- Play/pause, reset and playback speed controls.
- Pointer drag to orbit the camera and wheel/pinch-style scroll to zoom.
- Responsive scene sizing and lazy initialization when the page is opened.

## Simulation model
The two demonstration vehicle paths follow the Phase 7 network topology:
- Eastern flow: SUP-A → FACT → HUB → DC-E → CUS-E.
- Western flow: SUP-B → FACT → HUB → DC-W → CUS-W.

The timeline is deterministic and client-side. Vehicle positions are interpolated between configured network nodes; speed changes the simulated clock, not actual transport velocity or a live ETA.

## Limitations
Facilities, route geometry and vehicles are schematic training visuals. This is not a geospatial map, live GPS feed, road-routing engine, fleet telematics system or real-time digital twin connected to ERP/WMS. The 3D library is loaded from a CDN, so an internet connection is required. Existing warehouse scene and operational modules remain separate.
