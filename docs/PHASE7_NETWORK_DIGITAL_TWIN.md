# Phase 7 — Supply Chain Network & Digital Twin

## Scope
- Supplier, factory, central warehouse, distribution-centre and customer nodes.
- Connected network edges with capacity, lead time, unit-flow cost and reliability assumptions.
- Deterministic baseline-versus-disruption scenario comparison.
- Disruption controls: affected edge, remaining-capacity factor, added delay and cost multiplier.
- KPIs: delivered quantity, unmet demand, service level, bottleneck capacity, total lead time, estimated flow cost and path reliability.

## Model
The network is an educational directed graph. The simulation estimates a single planning horizon:
- Bottleneck = minimum active edge capacity and internal factory/warehouse capacity.
- Available fulfilment = bottleneck × (horizon days − total path lead time, floored at zero).
- Delivered = minimum of horizon demand and available fulfilment.
- Flow cost = delivered quantity × sum of edge unit-cost assumptions.
- Reliability = product of edge reliability assumptions.

The baseline uses the same network without a disruption. Scenario impact is the difference from baseline.

## Limitations
This is a deterministic training model, not live digital-twin telemetry. Nodes, routes, costs, reliability and capacities are illustrative assumptions. It does not connect to GPS, road-routing, supplier ERP, real stock reservations or carrier APIs. The simplified model does not yet split customer demand across multiple branches or calculate stochastic lead-time distributions. Browser localStorage is used for scenario settings.
