/* SCW Industrial Mega Warehouse — U-flow layout v2
   Flow: docks (south-west) -> Inbound -> QC -> Reserve / High-Bay (north) -> Replenishment -> Picking (east)
         -> Sorting -> Packing -> Outbound -> Dispatch docks (south-east). Control Center: central mezzanine. */
(function(root){
"use strict";
const BUILDING=Object.freeze({id:"SCW-INDUSTRIAL-5XL",name:"SCW Industrial Mega Warehouse",width:160,depth:150,wallHeight:15,floorY:0,coordinateSystem:"X east-west; Z north-south (+Z = south dock wall); origin centre"});
const raw=[
{id:"INBOUND",code:"Z01",name:"Inbound Receiving",x:-53,z:62,width:46,depth:26,kind:"receiving",priority:1},
{id:"QUALITY",code:"Z02",name:"Quality Control",x:-47,z:37,width:32,depth:22,kind:"inspection",priority:2},
{id:"RETURNS",code:"Z11",name:"Returns",x:-72,z:37,width:14,depth:22,kind:"returns",priority:11},
{id:"RESERVE",code:"Z03",name:"Reserve Storage",x:-54,z:-26.5,width:48,depth:97,kind:"storage",priority:3},
{id:"HIGH_BAY",code:"Z04",name:"High-Bay AS/RS",x:-8,z:-41,width:36,depth:66,kind:"automated_storage",priority:4},
{id:"REPLENISHMENT",code:"Z06",name:"Replenishment",x:46,z:-58,width:62,depth:30,kind:"replenishment",priority:6},
{id:"PICKING",code:"Z05",name:"Picking",x:46,z:-24.5,width:62,depth:33,kind:"picking",priority:5},
{id:"SORTING",code:"Z07",name:"Sorting",x:30,z:17,width:30,depth:34,kind:"sorting",priority:7},
{id:"PACKING",code:"Z08",name:"Packing",x:62,z:17,width:30,depth:34,kind:"packing",priority:8},
{id:"OUTBOUND",code:"Z09",name:"Outbound Staging",x:46,z:44,width:62,depth:12,kind:"staging",priority:9},
{id:"DISPATCH",code:"Z10",name:"Dispatch",x:54,z:64,width:48,depth:22,kind:"dispatch",priority:10},
{id:"CONTROL",code:"Z12",name:"Control Center",x:0,z:60,width:22,depth:20,kind:"control",priority:12}
].map(z=>Object.freeze({...z,minX:z.x-z.width/2,maxX:z.x+z.width/2,minZ:z.z-z.depth/2,maxZ:z.z+z.depth/2}));
/* AGV / forklift lanes (width 3 m). Used by the renderer and by vehicle routes. */
const corridors=Object.freeze([
{id:"WEST-SPINE",from:{x:-28,z:-72},to:{x:-28,z:72},width:3},
{id:"CENTRE-SPINE",from:{x:13,z:-72},to:{x:13,z:72},width:3},
{id:"MID-CROSS",from:{x:-28,z:-4},to:{x:77,z:-4},width:3},
{id:"SOUTH-CROSS",from:{x:-28,z:36},to:{x:77,z:36},width:3},
{id:"DOCK-CROSS",from:{x:14,z:51.5},to:{x:77,z:51.5},width:3},
{id:"WEST-CROSS",from:{x:-79,z:24},to:{x:-28,z:24},width:3}
]);
const DOCKS=Object.freeze({inbound:[-66,-54,-42],outbound:[42,54,66],wallZ:75});
const COLD=Object.freeze({id:"COLD",code:"COLD",name:"Cold Storage (-18.4°C)",x:-64,z:-63,width:28,depth:24,height:9,doorX:-66,doorZ:-51});
const FLOW=Object.freeze(["INBOUND","QUALITY","RESERVE","HIGH_BAY","REPLENISHMENT","PICKING","SORTING","PACKING","OUTBOUND","DISPATCH"]);
function getZone(id){return raw.find(z=>z.id===id||z.code===id)||null}
function zoneAt(x,z){return raw.find(a=>x>=a.minX&&x<=a.maxX&&z>=a.minZ&&z<=a.maxZ)||null}
function contains(id,x,z){const a=getZone(id);return !!a&&x>=a.minX&&x<=a.maxX&&z>=a.minZ&&z<=a.maxZ}
function validate(){const errors=[];for(let i=0;i<raw.length;i++){const a=raw[i];if(a.minX< -80||a.maxX>80||a.minZ< -75||a.maxZ>75)errors.push(a.id+" outside building");for(let j=i+1;j<raw.length;j++){const b=raw[j];if(a.minX<b.maxX&&a.maxX>b.minX&&a.minZ<b.maxZ&&a.maxZ>b.minZ)errors.push(a.id+" overlaps "+b.id)}}
 if(raw.length!==12)errors.push("Expected 12 zones");
 for(const d of DOCKS.inbound){const z=zoneAt(d,DOCKS.wallZ-1);if(!z||z.id!=="INBOUND")errors.push("inbound dock "+d+" not in Z01")}
 for(const d of DOCKS.outbound){const z=zoneAt(d,DOCKS.wallZ-1);if(!z||z.id!=="DISPATCH")errors.push("outbound dock "+d+" not in Z10")}
 if(COLD.x-COLD.width/2<getZone("RESERVE").minX||COLD.z-COLD.depth/2<getZone("RESERVE").minZ)errors.push("cold storage outside Z03");
 return{valid:!errors.length,zoneCount:raw.length,errors}}
root.SCWIndustrialLayout=Object.freeze({BUILDING,zones:Object.freeze(raw),corridors,DOCKS,COLD,FLOW,getZone,zoneAt,contains,validate});
})(window);
