/* SCW Mega Warehouse — Phase 20 foundation layout.
 * Pure configuration: no DOM, Three.js, storage, or network side effects.
 * Coordinates are world-space X/Z units; the building footprint is 116 x 94.
 */
(function(root){
  "use strict";
  const BUILDING = Object.freeze({
    id: "SCW-MEGA-5XL",
    name: "SCW Mega Warehouse",
    width: 116,
    depth: 94,
    wallHeight: 12,
    floorY: 0,
    aisleWidth: 4,
    coordinateSystem: "right-handed; X east-west, Z north-south; origin at building centre"
  });

  // Three columns × four rows. Zone footprints leave a 4-unit service aisle
  // between neighbours and keep the complete layout inside the 116 × 94 shell.
  const zones = [
    {id:"INBOUND",code:"Z01",name:"Inbound",x:-38,z:-34,width:34,depth:18,kind:"receiving",priority:1},
    {id:"QUALITY",code:"Z02",name:"Quality Control",x:0,z:-34,width:34,depth:18,kind:"inspection",priority:2},
    {id:"RETURNS",code:"Z11",name:"Returns",x:38,z:-34,width:34,depth:18,kind:"returns",priority:11},

    {id:"RESERVE",code:"Z03",name:"Reserve Storage",x:-38,z:-11,width:34,depth:18,kind:"storage",priority:3},
    {id:"HIGH_BAY",code:"Z04",name:"High-Bay AS/RS",x:0,z:-11,width:34,depth:18,kind:"automated_storage",priority:4},
    {id:"REPLENISHMENT",code:"Z06",name:"Replenishment",x:38,z:-11,width:34,depth:18,kind:"replenishment",priority:6},

    {id:"PICKING",code:"Z05",name:"Picking",x:-38,z:12,width:34,depth:18,kind:"picking",priority:5},
    {id:"SORTING",code:"Z07",name:"Sorting",x:0,z:12,width:34,depth:18,kind:"sorting",priority:7},
    {id:"PACKING",code:"Z08",name:"Packing",x:38,z:12,width:34,depth:18,kind:"packing",priority:8},

    {id:"OUTBOUND",code:"Z09",name:"Outbound Staging",x:-38,z:35,width:34,depth:18,kind:"staging",priority:9},
    {id:"DISPATCH",code:"Z10",name:"Dispatch",x:0,z:35,width:34,depth:18,kind:"dispatch",priority:10},
    {id:"CONTROL",code:"Z12",name:"Control Center",x:38,z:35,width:34,depth:18,kind:"control",priority:12}
  ].map(z => Object.freeze({...z,
    minX:z.x-z.width/2, maxX:z.x+z.width/2,
    minZ:z.z-z.depth/2, maxZ:z.z+z.depth/2
  }));

  const corridors = [
    {id:"AISLE-WEST",from:{x:-56,z:-45},to:{x:-56,z:45},width:4},
    {id:"AISLE-WEST-CENTRE",from:{x:-19,z:-45},to:{x:-19,z:45},width:4},
    {id:"AISLE-EAST-CENTRE",from:{x:19,z:-45},to:{x:19,z:45},width:4},
    {id:"AISLE-EAST",from:{x:56,z:-45},to:{x:56,z:45},width:4},
    {id:"CROSS-NORTH",from:{x:-56,z:-22},to:{x:56,z:-22},width:4},
    {id:"CROSS-MID-1",from:{x:-56,z:1},to:{x:56,z:1},width:4},
    {id:"CROSS-MID-2",from:{x:-56,z:24},to:{x:56,z:24},width:4}
  ].map(Object.freeze);

  function getZone(id){
    return zones.find(z=>z.id===id || z.code===id) || null;
  }
  function contains(zoneId,x,z){
    const zone=getZone(zoneId);
    return !!zone && x>=zone.minX && x<=zone.maxX && z>=zone.minZ && z<=zone.maxZ;
  }
  function validate(){
    const errors=[];
    const halfW=BUILDING.width/2, halfD=BUILDING.depth/2;
    zones.forEach((a,i)=>{
      if(a.minX < -halfW || a.maxX > halfW || a.minZ < -halfD || a.maxZ > halfD)
        errors.push(a.id+" exceeds building bounds");
      zones.slice(i+1).forEach(b=>{
        const overlapX=a.minX < b.maxX && a.maxX > b.minX;
        const overlapZ=a.minZ < b.maxZ && a.maxZ > b.minZ;
        if(overlapX && overlapZ) errors.push(a.id+" overlaps "+b.id);
      });
    });
    if(zones.length!==12) errors.push("Expected exactly 12 zones");
    return {valid:errors.length===0,zoneCount:zones.length,errors};
  }

  root.SCWMegaLayout=Object.freeze({
    BUILDING, zones:Object.freeze(zones), corridors:Object.freeze(corridors),
    getZone, contains, validate
  });
})(window);
