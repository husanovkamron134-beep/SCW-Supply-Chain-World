/* SCW Phase 8 — deterministic 3D digital-twin transport timeline. */
(function(){
"use strict";
const paths=[
 {id:"ROUTE-E",name:"Sharqiy oqim",nodes:["SUP-A","FACT","HUB","DC-E","CUS-E"]},
 {id:"ROUTE-W",name:"G‘arbiy oqim",nodes:["SUP-B","FACT","HUB","DC-W","CUS-W"]}
];
const nodeIds=["SUP-A","SUP-B","FACT","HUB","DC-E","DC-W","CUS-E","CUS-W"];
let playing=true,speed=1,elapsed=0;
function setPlaying(value){playing=!!value;return playing}
function setSpeed(value){const n=Number(value);if(!Number.isFinite(n)||n<.25||n>4)throw Error("Tezlik 0.25–4 oralig‘ida bo‘lishi kerak.");speed=n;return speed}
function reset(){elapsed=0;playing=false;return snapshot()}
function tick(deltaSeconds){const dt=Math.max(0,Math.min(Number(deltaSeconds)||0,10));if(playing)elapsed+=dt*speed;return snapshot()}
function snapshot(){return {playing,speed,elapsed,paths:paths.map(p=>({...p,nodes:p.nodes.slice()})),nodeIds:nodeIds.slice(),cycleSeconds:48}}
function position(routeId,offsetSeconds=0){const p=paths.find(x=>x.id===routeId);if(!p)throw Error("Marshrut topilmadi.");const phase=((elapsed+offsetSeconds)%48)/48;return {routeId,progress:phase,segment:Math.min(p.nodes.length-2,Math.floor(phase*(p.nodes.length-1))),segmentProgress:(phase*(p.nodes.length-1))%1}}
window.SCWDigitalTwin={snapshot,setPlaying,setSpeed,reset,tick,position};
})();