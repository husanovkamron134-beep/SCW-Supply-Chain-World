/* SCW Industrial Mega Warehouse — process-flow layout v1 */
(function(root){
"use strict";
const BUILDING=Object.freeze({id:"SCW-INDUSTRIAL-5XL",name:"SCW Industrial Mega Warehouse",width:160,depth:150,wallHeight:15,floorY:0,coordinateSystem:"X east-west; Z north-south; origin centre"});
const raw=[
{id:"INBOUND",code:"Z01",name:"Inbound Receiving",x:-54,z:-51,width:46,depth:28,kind:"receiving",priority:1},
{id:"QUALITY",code:"Z02",name:"Quality Control",x:0,z:-51,width:34,depth:28,kind:"inspection",priority:2},
{id:"RETURNS",code:"Z11",name:"Returns",x:55,z:-51,width:34,depth:28,kind:"returns",priority:11},
{id:"RESERVE",code:"Z03",name:"Reserve Storage",x:-54,z:-13,width:46,depth:42,kind:"storage",priority:3},
{id:"HIGH_BAY",code:"Z04",name:"High-Bay AS/RS",x:0,z:-13,width:38,depth:42,kind:"automated_storage",priority:4},
{id:"REPLENISHMENT",code:"Z06",name:"Replenishment",x:55,z:-13,width:34,depth:42,kind:"replenishment",priority:6},
{id:"PICKING",code:"Z05",name:"Picking",x:-54,z:34,width:46,depth:34,kind:"picking",priority:5},
{id:"SORTING",code:"Z07",name:"Sorting",x:0,z:34,width:38,depth:34,kind:"sorting",priority:7},
{id:"PACKING",code:"Z08",name:"Packing",x:55,z:34,width:34,depth:34,kind:"packing",priority:8},
{id:"OUTBOUND",code:"Z09",name:"Outbound Staging",x:-54,z:65,width:46,depth:20,kind:"staging",priority:9},
{id:"DISPATCH",code:"Z10",name:"Dispatch",x:0,z:65,width:38,depth:20,kind:"dispatch",priority:10},
{id:"CONTROL",code:"Z12",name:"Control Center",x:55,z:65,width:34,depth:20,kind:"control",priority:12}
].map(z=>Object.freeze({...z,minX:z.x-z.width/2,maxX:z.x+z.width/2,minZ:z.z-z.depth/2,maxZ:z.z+z.depth/2}));
const corridors=Object.freeze([
{id:"WEST-SPINE",from:{x:-80,z:-70},to:{x:-80,z:70},width:5},
{id:"CENTRE-SPINE",from:{x:-21,z:-70},to:{x:-21,z:70},width:5},
{id:"EAST-SPINE",from:{x:21,z:-70},to:{x:21,z:70},width:5},
{id:"NORTH-CROSS",from:{x:-80,z:-32},to:{x:80,z:-32},width:5},
{id:"MID-CROSS",from:{x:-80,z:10},to:{x:80,z:10},width:5},
{id:"SOUTH-CROSS",from:{x:-80,z:53},to:{x:80,z:53},width:5}
]);
function getZone(id){return raw.find(z=>z.id===id||z.code===id)||null}
function contains(id,x,z){const a=getZone(id);return !!a&&x>=a.minX&&x<=a.maxX&&z>=a.minZ&&z<=a.maxZ}
function validate(){const errors=[];for(let i=0;i<raw.length;i++){const a=raw[i];if(a.minX< -80||a.maxX>80||a.minZ< -75||a.maxZ>75)errors.push(a.id+" outside building");for(let j=i+1;j<raw.length;j++){const b=raw[j];if(a.minX<b.maxX&&a.maxX>b.minX&&a.minZ<b.maxZ&&a.maxZ>b.minZ)errors.push(a.id+" overlaps "+b.id)}}if(raw.length!==12)errors.push("Expected 12 zones");return{valid:!errors.length,zoneCount:raw.length,errors}}
root.SCWIndustrialLayout=Object.freeze({BUILDING,zones:Object.freeze(raw),corridors,getZone,contains,validate});
})(window);
