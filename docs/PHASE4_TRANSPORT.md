# SCW Phase 4 — Transport and route planning

## Delivered
- Fleet master with three demo vehicle classes and payload capacities.
- Delivery task list with customer, city, weight and package count.
- Route planning from the Tashkent training hub.
- Nearest-neighbour construction followed by 2-opt local improvement.
- Vehicle capacity validation before a route is created.
- Route dispatch and delivery status progression: PENDING → IN_TRANSIT → DELIVERED.
- Cost estimate includes distance tariff, fixed driver allowance and per-stop service cost; fuel litres and fuel cost are shown separately.

## Distance and cost assumptions
Coordinates are demo city-centre coordinates. Distances use Haversine great-circle distance, including return to the hub. This is a learning estimate, not road-network distance, navigation, traffic-aware ETA or a carrier quote. Fuel consumption is a vehicle-class assumption; the displayed fuel cost uses a configurable-in-code training assumption of 12,500 UZS/litre.

## Optimization
The planner uses a nearest-neighbour initial tour, then applies 2-opt edge swaps to reduce total closed-tour distance. It does not guarantee a globally optimal solution. All pending demo deliveries are included in a route; one selected vehicle must have sufficient payload capacity.

## Limitations / next work
- No live road routing, traffic, toll database, GPS, map tiles, geocoding or external carrier API.
- Coordinates are demo city-centre points; city-to-city straight-line distance underestimates road distance.
- Single-vehicle route planning; multi-vehicle capacitated VRP and time windows are future work.
- Delivery completion is a training action, not proof of physical delivery.
- All data is browser localStorage only.
