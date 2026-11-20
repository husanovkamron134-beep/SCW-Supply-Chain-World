# SCW Phase 34 — Integrated module bootstrap

## Purpose
Provides an explicit startup / shutdown entry point after every script has been loaded. It does not inject scripts into production pages or start modules automatically.

## Script load order
1. `src/core/shared_core.js`
2. Legacy scripts: `src/domain.js`, `src/operations.js`, `src/warehouse_sim.js` in their existing dependency order.
3. Adapters: Inventory, WMS, Operations.
4. Modules: Inbound, Quality Control, Reserve Storage, High-Bay AS/RS, Picking, Replenishment, Sorting, Packing, Outbound Staging, Dispatch, Returns, Control Center.
5. `src/core/module_bootstrap.js`.

## Start / stop
```js
const result = await SCWBootstrap.startAll();
console.log(result.core);
await SCWBootstrap.stopAll();
```
Startup follows dependency order. If a module fails to start, the bootstrap attempts to stop modules started in that invocation. Shutdown runs in reverse order.

## Important
The bootstrap must not be loaded before the module scripts. This phase does not wire the modules into `index.html`, `warehouse3d.html` or the Render production preview. Isolated integration tests must pass before navigation / production activation.
