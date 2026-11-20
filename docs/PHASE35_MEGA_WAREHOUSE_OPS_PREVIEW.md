# SCW Phase 35 — Mega Warehouse 5XL operations preview

## Page
- `mega-warehouse-5xl-ops.html` is a separate preview page based on the existing Mega Warehouse 5XL Three.js scene.
- The existing `mega-warehouse-5xl.html` page is not modified.
- Loads Core, legacy domain APIs, adapters, all 12 operational modules and the module bootstrap in dependency order.
- Includes a collapsible Control Center panel with module start, live metrics, module status and recent event feed.
- Module startup is explicit via the UI button; the page does not silently start operational modules.

## Test
1. Open `mega-warehouse-5xl-ops.html` over HTTPS (not Android content:// local file mode).
2. Open the 12-module operations panel and press "Modullarni ishga tushirish".
3. Confirm 12 operational modules show RUNNING and the three adapters are running.
4. Press refresh and inspect inventory / order / task metrics.
5. Confirm the existing Mega Warehouse 3D scene remains visible and interactive.

## Limitations
- This is an isolated preview, not yet linked from the main navigation or deployed to the production page.
- No end-to-end workflow has been browser-tested yet.
- 3D equipment remains a visualization prototype; the operational APIs are browser-local and not multi-user synchronized.
