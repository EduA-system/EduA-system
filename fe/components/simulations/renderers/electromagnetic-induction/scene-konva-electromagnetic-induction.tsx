"use client";
import { useEffect,useRef } from "react";
import Konva from "konva";
import type { ElectromagneticInductionScene } from "../../engines/electromagnetic-induction/types";
import { initialInductionState,stepInduction } from "../../engines/electromagnetic-induction/physics";
import { useContainerSize } from "../../shared/use-container-size";

const RAD_TO_DEG=180/Math.PI;

export function SceneKonvaElectromagneticInduction({scene,running,resetSignal,onRunningChange,speed=1}:{scene:ElectromagneticInductionScene;running:boolean;resetSignal:number;onRunningChange:(r:boolean)=>void;speed?:number}){
 const {ref,size}=useContainerSize<HTMLDivElement>();const runningRef=useRef(running),speedRef=useRef(speed);
 useEffect(()=>{runningRef.current=running},[running]);useEffect(()=>{speedRef.current=speed},[speed]);
 useEffect(()=>{const container=ref.current,{width:W,height:H}=size;if(!container||!W||!H)return;
  const stage=new Konva.Stage({container,width:W,height:H}),layer=new Konva.Layer();stage.add(layer);
  layer.add(new Konva.Rect({x:0,y:0,width:W,height:H,fill:"#eef3f7"}));
  const scale=Math.min(W/7,H/4.7),origin={x:W*.5,y:H*.64};const sx=(x:number)=>origin.x+x*scale;
  layer.add(new Konva.Text({x:18,y:16,text:"Kéo nam châm xuyên qua cuộn dây và quan sát chiều lệch của kim",fontSize:15,fill:"#334155"}));

  const coilX=sx(scene.coilX),coilY=origin.y;
  const magneticField=new Konva.Group({listening:false});
  addMagneticFieldLines(magneticField,scene.magnetStrength);
  layer.add(magneticField);
  const coil=new Konva.Group();layer.add(coil);
  coil.add(new Konva.Rect({x:coilX-48,y:coilY-46,width:96,height:92,cornerRadius:8,fill:"#a56a38",stroke:"#6b4423",strokeWidth:2}));
  for(let i=0;i<13;i++){coil.add(new Konva.Ellipse({x:coilX-38+i*6.3,y:coilY,radiusX:12,radiusY:38,stroke:"#f59e0b",strokeWidth:2.2,opacity:.95}));}
  coil.add(new Konva.Text({x:coilX-48,y:coilY+57,width:96,text:"CUỘN DÂY",align:"center",fontSize:12,fontStyle:"bold",fill:"#6b4423"}));

  const meterCenter={x:W*.5,y:H*.25},meterR=Math.min(82,W*.13);
  layer.add(new Konva.Arc({x:meterCenter.x,y:meterCenter.y,innerRadius:meterR-5,outerRadius:meterR,angle:180,rotation:180,fill:"#64748b"}));
  layer.add(new Konva.Rect({x:meterCenter.x-meterR-12,y:meterCenter.y-10,width:(meterR+12)*2,height:62,cornerRadius:8,fill:"#fff",stroke:"#64748b",strokeWidth:2}));
  layer.add(new Konva.Text({x:meterCenter.x-50,y:meterCenter.y+28,width:100,text:"ĐIỆN KẾ",align:"center",fontSize:12,fontStyle:"bold",fill:"#334155"}));
  for(let i=0;i<=10;i++){const a=Math.PI+(Math.PI*i)/10,x1=meterCenter.x+Math.cos(a)*(meterR-15),y1=meterCenter.y+Math.sin(a)*(meterR-15),x2=meterCenter.x+Math.cos(a)*(meterR-7),y2=meterCenter.y+Math.sin(a)*(meterR-7);layer.add(new Konva.Line({points:[x1,y1,x2,y2],stroke:i===5?"#dc2626":"#475569",strokeWidth:i===5?2:1}));}
  layer.add(new Konva.Text({x:meterCenter.x-9,y:meterCenter.y-meterR+15,text:"0",fontSize:12,fontStyle:"bold",fill:"#dc2626"}));
  const needle=new Konva.Line({x:meterCenter.x,y:meterCenter.y,points:[0,0,0,-meterR+18],stroke:"#dc2626",strokeWidth:3,lineCap:"round"});layer.add(needle,new Konva.Circle({x:meterCenter.x,y:meterCenter.y,radius:6,fill:"#334155"}));

  // Hai dây đối xứng nối từ hai đầu cuộn lên hai cọc điện kế.
  layer.add(new Konva.Line({points:[coilX-42,coilY-43,coilX-110,H*.48,meterCenter.x-meterR*.58,meterCenter.y+48],stroke:"#2563eb",strokeWidth:4,tension:.3,lineCap:"round"}));
  layer.add(new Konva.Line({points:[coilX+42,coilY-43,coilX+110,H*.48,meterCenter.x+meterR*.58,meterCenter.y+48],stroke:"#dc2626",strokeWidth:4,tension:.3,lineCap:"round"}));
  layer.add(new Konva.Circle({x:meterCenter.x-meterR*.58,y:meterCenter.y+48,radius:6,fill:"#2563eb",stroke:"#1e3a8a",strokeWidth:2}));
  layer.add(new Konva.Circle({x:meterCenter.x+meterR*.58,y:meterCenter.y+48,radius:6,fill:"#dc2626",stroke:"#7f1d1d",strokeWidth:2}));

  let magnetX=scene.magnetStartX;
  const magnet=new Konva.Group({draggable:true,dragBoundFunc:p=>({x:Math.max(80,Math.min(W-80,p.x)),y:coilY})});layer.add(magnet);
  magnet.add(new Konva.Rect({x:-74,y:-20,width:74,height:40,fill:"#dc2626",stroke:"#7f1d1d",strokeWidth:2,cornerRadius:4}),new Konva.Rect({x:0,y:-20,width:74,height:40,fill:"#2563eb",stroke:"#1e3a8a",strokeWidth:2,cornerRadius:4}),new Konva.Text({x:-74,y:-9,width:74,text:"N",align:"center",fontSize:19,fontStyle:"bold",fill:"#fff"}),new Konva.Text({x:0,y:-9,width:74,text:"S",align:"center",fontSize:19,fontStyle:"bold",fill:"#fff"}));
  // Vòng dây phía trước che xen kẽ để nam châm trông như đi xuyên qua lòng cuộn.
  const frontWindings=new Konva.Group({listening:false});
  for(let i=0;i<13;i++){frontWindings.add(new Konva.Ellipse({x:coilX-38+i*6.3,y:coilY,radiusX:12,radiusY:38,stroke:"#fde68a",strokeWidth:1.7,opacity:.58,dash:[36,36]}));}
  layer.add(frontWindings);
  const magnetPosition={x:sx(magnetX),y:coilY};
  magneticField.position(magnetPosition);magnet.position(magnetPosition);
  magnet.on("dragstart",()=>{runningRef.current=true;onRunningChange(true)});magnet.on("dragmove",()=>{magneticField.position(magnet.position());magnetX=(magnet.x()-origin.x)/scale;layer.batchDraw()});

  const status=new Konva.Text({x:0,y:H-42,width:W,align:"center",fontSize:14,fontStyle:"bold",fill:"#334155"});layer.add(status);
  let state=initialInductionState(scene,magnetX);
  const draw=()=>{needle.rotation(state.needle*70);const direction=Math.abs(state.emf)<.0001?"Nam châm đứng yên → kim về 0":state.emf>0?"Dòng cảm ứng theo chiều dương":"Dòng cảm ứng đảo chiều";status.text(direction+"   |   ℰ = "+state.emf.toFixed(3)+" V");layer.batchDraw()};draw();
  let raf=0,last=performance.now();const loop=(now:number)=>{const dt=Math.min((now-last)/1000,1/30)*speedRef.current;last=now;if(runningRef.current){state=stepInduction(scene,state,magnetX,dt);draw()}raf=requestAnimationFrame(loop)};raf=requestAnimationFrame(loop);
  return()=>{cancelAnimationFrame(raf);stage.destroy()};
 },[scene,size,resetSignal,onRunningChange,ref]);
 return <div ref={ref} className="h-full w-full overflow-hidden rounded-lg bg-[#eef3f7]"/>;
}

function addMagneticFieldLines(group:Konva.Group,strength:number){
 const normalizedStrength=Math.max(0,Math.min(1,(strength-.5)/2));
 const opacity=.42+normalizedStrength*.34;
 const strokeWidth=1.7+normalizedStrength*.7;
 const loops=[
  {halfWidth:108,height:54},
  {halfWidth:136,height:84},
  {halfWidth:168,height:116},
 ];

 for(const {halfWidth,height} of loops){
  for(const sign of [-1,1]){
   const crestY=sign*height*1.08;
   group.add(new Konva.Line({
    points:[-70,0,-halfWidth,sign*height*.3,-halfWidth*.68,sign*height,0,crestY,halfWidth*.68,sign*height,halfWidth,sign*height*.3,70,0],
    stroke:"#0ea5e9",
    strokeWidth,
    opacity,
    tension:.42,
    lineCap:"round",
    lineJoin:"round",
    shadowColor:"#38bdf8",
    shadowBlur:3,
    shadowOpacity:.3,
   }));
   group.add(new Konva.Arrow({
    points:[-18,crestY,18,crestY],
    stroke:"#0284c7",fill:"#0284c7",strokeWidth:strokeWidth+.3,
    pointerLength:7,pointerWidth:7,opacity:Math.min(1,opacity+.12),
   }));
  }
 }
}
