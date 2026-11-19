/* SCW Shared Core Engine — Phase 21 foundation.
 * Coordinates module lifecycle and domain events without replacing legacy stores.
 * No DOM, Three.js, network, or localStorage side effects.
 */
(function(root){
  "use strict";
  const VERSION="1.0.0";
  const modules=new Map();
  const commands=new Map();
  const listeners=new Map();
  let eventSequence=0;

  function clone(value){
    if(value===undefined)return undefined;
    return JSON.parse(JSON.stringify(value));
  }
  function requireName(value,label){
    const name=String(value||"").trim();
    if(!name)throw new Error(label+" is required.");
    return name;
  }
  function on(type,handler){
    type=requireName(type,"Event type");
    if(typeof handler!=="function")throw new TypeError("Event handler must be a function.");
    if(!listeners.has(type))listeners.set(type,new Set());
    listeners.get(type).add(handler);
    return function unsubscribe(){off(type,handler);};
  }
  function off(type,handler){
    const bucket=listeners.get(type);
    if(!bucket)return false;
    const removed=bucket.delete(handler);
    if(bucket.size===0)listeners.delete(type);
    return removed;
  }
  function emit(type,payload,meta){
    type=requireName(type,"Event type");
    const event=Object.freeze({
      id:"EVT-"+String(++eventSequence).padStart(8,"0"),
      type,
      source:String(meta&&meta.source||"SCWCore"),
      at:new Date().toISOString(),
      sequence:eventSequence,
      payload:clone(payload===undefined?{}:payload)
    });
    const errors=[];
    Array.from(listeners.get(type)||[]).forEach(handler=>{
      try{handler(event);}catch(error){errors.push({message:error&&error.message?error.message:String(error)});}
    });
    return {event,delivered:(listeners.get(type)||new Set()).size,errors};
  }
  function registerModule(definition){
    if(!definition||typeof definition!=="object")throw new TypeError("Module definition is required.");
    const id=requireName(definition.id,"Module id").toUpperCase();
    if(modules.has(id))throw new Error("Module already registered: "+id);
    const deps=Array.isArray(definition.dependencies)?definition.dependencies.map(x=>String(x).toUpperCase()):[];
    modules.set(id,{
      id,name:String(definition.name||id),version:String(definition.version||"1.0.0"),
      dependencies:deps,status:"REGISTERED",registeredAt:new Date().toISOString(),
      start:typeof definition.start==="function"?definition.start:null,
      stop:typeof definition.stop==="function"?definition.stop:null,
      health:typeof definition.health==="function"?definition.health:null,
      error:null
    });
    emit("core.module.registered",{moduleId:id},{source:"SCWCore"});
    return getModule(id);
  }
  function getModule(id){
    const item=modules.get(String(id||"").toUpperCase());
    if(!item)return null;
    return {id:item.id,name:item.name,version:item.version,dependencies:item.dependencies.slice(),status:item.status,error:item.error};
  }
  function listModules(){return Array.from(modules.keys()).map(getModule);}
  async function startModule(id){
    id=requireName(id,"Module id").toUpperCase();
    const item=modules.get(id);
    if(!item)throw new Error("Module is not registered: "+id);
    if(item.status==="RUNNING")return getModule(id);
    const missing=item.dependencies.filter(dep=>!modules.has(dep)||modules.get(dep).status!=="RUNNING");
    if(missing.length)throw new Error("Module dependencies are not running: "+missing.join(", "));
    try{
      if(item.start)await item.start({core:api,emit,on});
      item.status="RUNNING";item.error=null;
      emit("core.module.started",{moduleId:id},{source:"SCWCore"});
      return getModule(id);
    }catch(error){
      item.status="ERROR";item.error=error&&error.message?error.message:String(error);
      emit("core.module.error",{moduleId:id,message:item.error},{source:"SCWCore"});
      throw error;
    }
  }
  async function stopModule(id){
    id=requireName(id,"Module id").toUpperCase();
    const item=modules.get(id);
    if(!item)throw new Error("Module is not registered: "+id);
    const activeDependents=Array.from(modules.values()).filter(x=>x.status==="RUNNING"&&x.dependencies.includes(id));
    if(activeDependents.length)throw new Error("Stop dependent modules first: "+activeDependents.map(x=>x.id).join(", "));
    if(item.status!=="RUNNING")return getModule(id);
    if(item.stop)await item.stop({core:api,emit,off});
    item.status="REGISTERED";
    emit("core.module.stopped",{moduleId:id},{source:"SCWCore"});
    return getModule(id);
  }
  function registerCommand(name,handler,options){
    name=requireName(name,"Command name");
    if(typeof handler!=="function")throw new TypeError("Command handler must be a function.");
    if(commands.has(name))throw new Error("Command already registered: "+name);
    commands.set(name,{handler,moduleId:options&&options.moduleId?String(options.moduleId).toUpperCase():null});
    return true;
  }
  async function execute(name,input,context){
    name=requireName(name,"Command name");
    const command=commands.get(name);
    if(!command)throw new Error("Unknown SCW command: "+name);
    if(command.moduleId){
      const owner=modules.get(command.moduleId);
      if(!owner||owner.status!=="RUNNING")throw new Error("Command module is not running: "+command.moduleId);
    }
    const result=await command.handler(clone(input===undefined?{}:input),context||{});
    emit("core.command.completed",{name,moduleId:command.moduleId},{source:"SCWCore"});
    return result;
  }
  function status(){
    const all=listModules();
    return {version:VERSION,eventSequence,registeredModules:all.length,runningModules:all.filter(x=>x.status==="RUNNING").length,commands:commands.size,modules:all};
  }
  const api=Object.freeze({version:VERSION,on,off,emit,registerModule,getModule,listModules,startModule,stopModule,registerCommand,execute,status});
  root.SCWCore=api;
})(window);
