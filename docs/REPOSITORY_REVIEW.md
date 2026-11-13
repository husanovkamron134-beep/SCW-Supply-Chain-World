# GitHub repository review for SCW

Research snapshot: 13 November 2026. Re-check current repository activity, releases, dependencies and licenses before integrating code.

## WareTwin
https://github.com/WayneChou-bot/WareTwin

Useful ideas: 3D warehouse digital twin, deterministic simulation ticks, scenario injection, what-if comparison and synchronized KPIs. Its desktop-oriented interface and backend expectations do not match SCW's browser-first requirement. Rebuild a smaller responsive warehouse domain instead of copying the application.

## OpenBoxes
https://github.com/openboxes/openboxes

Useful workflow references: receiving, stock movements, inventory locations and shipment workflows. It is a Groovy/Grails application, not a small browser component. Treat it as a workflow reference. Its EPL-1.0 license requires care before reusing code.

## SupplyNetPy
https://github.com/SupplyChainSimulation/SupplyNetPy

Useful concepts: supply-network nodes, inventory policies and discrete-event modelling. It is a Python library, so implement the educational browser subset in TypeScript first; a Python service can validate advanced scenarios later. MIT license shown.

## Google OR-Tools
https://github.com/google/or-tools

Useful for constraint programming, linear optimization, bin packing and vehicle routing. Keep as an optional future optimization service, not a required browser dependency. Apache-2.0.

## VROOM
https://github.com/VROOM-Project/vroom

Useful for vehicle-routing optimization and dispatch planning. It solves routing rather than warehouse inventory; keep it behind a future transport API. BSD-2-Clause.

## React Three Fiber
https://r3f.docs.pmnd.rs/

A declarative React renderer for Three.js. Consider it when the frontend moves to React/TypeScript. The initial prototype uses plain Three.js to avoid a build step.

## Integration decision
Build SCW's own inventory and event model first, then connect the 3D view to that same state. Add simulation and optimization as separately testable modules. Do not import complete external applications into the initial browser release.
