/* SCW Phase 4 — fleet, delivery planning and route optimization.
   Distances use great-circle geometry (Haversine), not live road routing. */
(function(){
"use strict";
const KEY="scw-phase4-transport-v1";
const HUB={name:"Toshkent logistika markazi",lat:41.3111,lon:69.2797};
const CITIES=[
 {name:"Toshkent",lat:41.3111,lon:69.2797},
 {name:"Samarqand",lat:39.6542,lon:66.9597},
 {name:"Buxoro",lat:39.7747,lon:64.4286},
 {name:"Andijon",lat:40.7821,lon:72.3442},
 {name:"Farg'ona",lat:40.3864,lon:71.7864},
 {name:"Namangan",lat:40.9983,lon:71.6726},
 {name:"Qarshi",lat:38.8606,lon:65.7890},
 {name:"Nukus",lat:42.4531,lon:59.6103}
];
const FLEET=[
 {id:"VAN-01",name:"Yengil furgon",capacityKg:1200,fuelL100:12,ratePerKm:1800},
 {id:"TRUCK-01",name:"O'rta yuk mashinasi",capacityKg:5000,fuelL100:22,ratePerKm:2600},
 {id:"TRUCK-02",name:"Og'ir yuk mashinasi",capacityKg:12000,fuelL100:30,ratePerKm:3400}
];
const seed={hub:HUB,cities:CITIES,fleet:FLEET,deliveries:[
 {id:"DLV-001",customer:"Samarqand Textile",city:"Samarqand",lat:39.6542,lon:66.9597,weightKg:620,packages:18,status:"PENDING"},
 {id:"DLV-002",customer:"Buxoro Market",city:"Buxoro",lat:39.7747,lon:64.4286,weightKg:850,packages:24,status:"PENDING"},
 {id:"DLV-003",customer:"Andijon Savdo",city:"Andijon",lat:40.7821,lon:72.3442,weightKg:410,packages:12,status:"PENDING"},
 {id:"DLV-004",customer:"Farg'ona Distribution",city:"Farg'ona",lat:40.3864,lon:71.7864,weightKg:280,packages:9,status:"PENDING"},
 {id:"DLV-005",customer:"Namangan Retail",city:"Namangan",lat:40.9983,lon:71.6726,weightKg:360,packages:11,status:"PENDING"}
],routes:[],sequence:6};
const clone=x=>JSON.parse(JSON.stringify(x));
function load(){try{const x=JSON.parse(localStorage.getItem(KEY));if(x&&Array.isArray(x.deliveries)&&Array.isArray(x.routes)&&Array.isArray(x.fleet))return x}catch(e){}const s=clone(seed);localStorage.setItem(KEY,JSON.stringify(s));return s}
let state=load();
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function positive(v,label){const n=Number(v);if(!Number.isFinite(n)||n<=0)throw Error(label+" musbat son bo'lishi kerak.");return n}
function distance(a,b){const rad=x=>x*Math.PI/180,R=6371,dLat=rad(b.lat-a.lat),dLon=rad(b.lon-a.lon),v=Math.sin(dLat/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(v))}
function addDelivery(input){
 const city=state.cities.find(x=>x.name===input.city);if(!city)throw Error("Demo katalogdan shahar tanlang.");
 const customer=String(input.customer||"").trim();if(!customer)throw Error("Mijoz nomi kiritilishi shart.");
 const weightKg=positive(input.weightKg,"Yuk og'irligi"),packages=positive(input.packages,"Qadoqlar soni");
 const item={id:"DLV-"+String(state.sequence++).padStart(3,"0"),customer,city:city.name,lat:city.lat,lon:city.lon,weightKg,packages,status:"PENDING",createdAt:new Date().toISOString()};
 state.deliveries.unshift(item);save();return clone(item)
}
function routeDistance(stops){
 let km=0,prev=state.hub;
 for(const s of stops){km+=distance(prev,s);prev=s}
 km+=distance(prev,state.hub);return km
}
function optimize(ids,vehicleId){
 const vehicle=state.fleet.find(x=>x.id===vehicleId);if(!vehicle)throw Error("Transport vositasi topilmadi.");
 const wanted=ids&&ids.length?ids:state.deliveries.filter(x=>x.status==="PENDING").map(x=>x.id);
 const stops=wanted.map(id=>state.deliveries.find(x=>x.id===id)).filter(Boolean);
 if(!stops.length)throw Error("Marshrut uchun kutayotgan yetkazmalar yo'q.");
 if(stops.some(x=>x.status!=="PENDING"))throw Error("Faqat kutilayotgan yetkazmalar rejalashtiriladi.");
 const loadKg=stops.reduce((n,x)=>n+x.weightKg,0);
 if(loadKg>vehicle.capacityKg)throw Error("Yuk og'irligi transport sig'imidan oshdi: "+loadKg+" / "+vehicle.capacityKg+" kg.");
 // Nearest-neighbour route, then 2-opt improvement for a closed hub tour.
 const remaining=stops.slice(),ordered=[];let current=state.hub;
 while(remaining.length){let best=0,bestD=Infinity;remaining.forEach((s,i)=>{const d=distance(current,s);if(d<bestD){bestD=d;best=i}});current=remaining.splice(best,1)[0];ordered.push(current)}
 let improved=true,rounds=0;
 while(improved&&rounds++<30){improved=false;for(let i=0;i<ordered.length-1;i++)for(let k=i+1;k<ordered.length;k++){
  const A=i===0?state.hub:ordered[i-1],B=ordered[i],C=ordered[k],D=k===ordered.length-1?state.hub:ordered[k+1];
  if(distance(A,C)+distance(B,D)+0.0001<distance(A,B)+distance(C,D)){const rev=ordered.slice(i,k+1).reverse();ordered.splice(i,rev.length,...rev);improved=true}
 }}
 const km=routeDistance(ordered),fuelLitres=km*vehicle.fuelL100/100,fuelCost=fuelLitres*12500,driverCost=80000,serviceCost=ordered.length*15000,totalCost=km*vehicle.ratePerKm+fuelCost+driverCost+serviceCost;
 return {vehicle,stops:ordered,loadKg,km,fuelLitres,fuelCost,driverCost,serviceCost,totalCost,costPerKg:totalCost/loadKg,estimatedHours:km/45+ordered.length*.25}
}
function createRoute(input){
 const plan=optimize(input.ids,input.vehicleId);
 const route={id:"RTE-"+String(state.sequence++).padStart(3,"0"),vehicleId:plan.vehicle.id,vehicleName:plan.vehicle.name,stopIds:plan.stops.map(x=>x.id),stopOrder:plan.stops.map((x,i)=>({deliveryId:x.id,sequence:i+1,customer:x.customer,city:x.city})),loadKg:plan.loadKg,distanceKm:Number(plan.km.toFixed(1)),fuelLitres:Number(plan.fuelLitres.toFixed(1)),fuelCost:Math.round(plan.fuelCost),driverCost:plan.driverCost,serviceCost:plan.serviceCost,totalCost:Math.round(plan.totalCost),costPerKg:Number(plan.costPerKg.toFixed(2)),estimatedHours:Number(plan.estimatedHours.toFixed(1)),status:"PLANNED",createdAt:new Date().toISOString()};
 state.routes.unshift(route);save();return clone(route)
}
function dispatchRoute(id){
 const r=state.routes.find(x=>x.id===id);if(!r)throw Error("Reys topilmadi.");if(r.status!=="PLANNED")throw Error("Faqat rejalashtirilgan reys jo'natiladi.");
 for(const id of r.stopIds){const d=state.deliveries.find(x=>x.id===id);if(!d||d.status!=="PENDING")throw Error("Yetkazma holati o'zgargan; reysni qayta tuzing.")}
 r.status="DISPATCHED";r.dispatchedAt=new Date().toISOString();r.stopIds.forEach(id=>{const d=state.deliveries.find(x=>x.id===id);d.status="IN_TRANSIT";d.routeId=r.id});save();return clone(r)
}
function completeDelivery(id){const d=state.deliveries.find(x=>x.id===id);if(!d)throw Error("Yetkazma topilmadi.");if(d.status!=="IN_TRANSIT")throw Error("Yetkazma yo'lda holatida emas.");d.status="DELIVERED";d.deliveredAt=new Date().toISOString();save();return clone(d)}
function snapshot(){return clone(state)}
function reset(){state=clone(seed);save();return snapshot()}
window.SCWTransport={snapshot,addDelivery,optimize,createRoute,dispatchRoute,completeDelivery,reset,distance};
})();