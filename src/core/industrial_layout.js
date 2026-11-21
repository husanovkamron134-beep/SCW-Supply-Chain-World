/* SCW Industrial Mega Warehouse — U-Flow layout v2 */
(function(root){
"use strict";
const BUILDING=Object.freeze({id:"SCW-INDUSTRIAL-5XL",name:"SCW Industrial Mega Warehouse",width:160,depth:150,wallHeight:15,floorY:0,coordinateSystem:"X east-west; Z north-south; origin centre; south docks at z=+75"});
const raw=[
{id:"INBOUND",code:"Z01",name:"Inbound Receiving",x:-57,z:55,width:46,depth:30,kind:"receiving",priority:1,level:0},
{id:"QUALITY",code:"Z02",name:"Quality Control",x:-42,z:23,width:34,depth:22,kind:"inspection",priority:2,level:0},
{id:"RETURNS",code:"Z11",name:"Returns",x:-70,z:21,width:18,depth:20,kind:"returns",priority:11,level:0},
{id:"RESERVE",code:"Z03",name:"Reserve Storage",x:-46,z:-32.5,width:68,depth:85,kind:"storage",priority:3,level:0},
{id:"HIGH_BAY",code:"Z04",name:"High-Bay AS/RS",x:13.5,z:-32.5,width:51,depth:85,kind:"automated_storage",priority:4,level:0,clearHeight:14,aisles:6},
{id:"REPLENISHMENT",code:"Z06",name:"Replenishment",x:59.5,z:-32.5,width:41,depth:85,kind:"replenishment",priority:6,level:0},
{id:"PICKING",code:"Z05",name:"Picking",x:59,z:21.5,width:42,depth:21,kind:"picking",priority:5,level:0},
{id:"SORTING",code:"Z07",name:"Sorting",x:40,z:42,width:30,depth:18,kind:"sorting",priority:7,level:0},
{id:"PACKING",code:"Z08",name:"Packing",x:67,z:42,width:24,depth:18,kind:"packing",priority:8,level:0},
{id:"OUTBOUND",code:"Z09",name:"Outbound Staging",x:30,z:62,width:30,depth:18,kind:"staging",priority:9,level:0},
{id:"DISPATCH",code:"Z10",name:"Dispatch",x:62,z:62,width:32,depth:18,kind:"dispatch",priority:10,level:0},
{id:"CONTROL",code:"Z12",name:"Control Center",x:0,z:60,width:34,depth:18,kind:"control",priority:12,level:5.2,mezzanine:true}
].map(z=>Object.freeze({...z,minX:z.x-z.width/2,maxX:z.x+z.width/2,minZ:z.z-z.depth/2,maxZ:z.z+z.depth/2}));
const docks=Object.freeze({side:"south",z:75,inbound:Object.freeze([-66,-54,-42]),outbound:Object.freeze([42,54,66]),north: Object.freeze([])});
const corridors=Object.freeze([
{id:"WEST-RETURN",from:{x:-70,z:34},to:{x:-70,z:42},width:4},
{id:"INBOUND-SPINE",from:{x:-57,z:40},to:{x:-57,z:12},width:4},
{id:"WEST-NORTH",from:{x:-57,z:12},to:{x:-57,z:-18},width:4},
{id:"NORTH-CROSS",from:{x:-57,z:-18},to:{x:54,z:-18},width:5},
{id:"EAST-SPINE",from:{x:54,z:-18},to:{x:54,z:32},width:5},
{id:"SORT-PACK",from:{x:40,z:30},to:{x:67,z:30},width:4},
{id:"OUTBOUND-SPINE",from:{x:67,z:54},to:{x:67,z:72},width:4},
{id:"SOUTH-CROSS",from:{x:-57,z:72},to:{x:67,z:72},width:5}
]);
function getZone(id){return raw.find(z=>z.id===id||z.code===id)||null}
function contains(id,x,z){const a=getZone(id);return !!a&&x>=a.minX&&x<=a.maxX&&z>=a.minZ&&z<=a.maxZ}
function validate(){
 const errors=[];
 for(let i=0;i<raw.length;i++){const a=raw[i];
  if(a.minX< -80||a.maxX>80||a.minZ< -75||a.maxZ>75)errors.push(a.id+" outside building");
  for(let j=i+1;j<raw.length;j++){const b=raw[j];if(a.level===b.level&&a.minX<b.maxX&&a.maxX>b.minX&&a.minZ<b.maxZ&&a.maxZ>b.minZ)errors.push(a.id+" overlaps "+b.id)}
 }
 if(raw.length!==12)errors.push("Expected 12 zones");
 const all=[...docks.inbound,...docks.outbound];
 if(all.length!==6||new Set(all).size!==6)errors.push("Expected six unique south docks");
 if(docks.north.length)errors.push("North wall must not have docks");
 for(const x of all)if(x< -80||x>80)errors.push("Dock outside building");
 return{valid:!errors.length,zoneCount:raw.length,errors,docks:{count:all.length,side:docks.side}};
}
root.SCWIndustrialLayout=Object.freeze({BUILDING,zones:Object.freeze(raw),corridors,docks,getZone,contains,validate});
})(window);
