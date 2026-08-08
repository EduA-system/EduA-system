"use client";
import { useEffect,useRef } from "react";
import Konva from "konva";
import type { IronFilingsScene, IronFiling } from "../../engines/iron-filings/types";
import { fieldAt,stepFilings } from "../../engines/iron-filings/physics";
import { useContainerSize } from "../../shared/use-container-size";

export function SceneKonvaIronFilings({scene,running,resetSignal,onRunningChange,speed=1}:{scene:IronFilingsScene;running:boolean;resetSignal:number;onRunningChange:(r:boolean)=>void;speed?:number}){
 const {ref,size}=useContainerSize<HTMLDivElement>(); const runningRef=useRef(running);const speedRef=useRef(speed);
 useEffect(()=>{runningRef.current=running},[running]);useEffect(()=>{speedRef.current=speed},[speed]);
 useEffect(()=>{const c=ref.current,{width:W,height:H}=size;if(!c||!W||!H)return;const stage=new Konva.Stage({container:c,width:W,height:H}),layer=new Konva.Layer();stage.add(layer);
  layer.add(new Konva.Rect({x:0,y:0,width:W,height:H,fill:"#d9c3a1"}));layer.add(new Konva.Rect({x:0,y:H*.08,width:W,height:H*.84,fill:"#d4b88d",opacity:.35}));
  const center={x:W*.5,y:H*.52},scale=Math.min(W/7,H/4.8);const toScreen=(x:number,y:number)=>({x:center.x+x*scale,y:center.y-y*scale});
  layer.add(new Konva.Text({x:18,y:16,text:"Rải mạt sắt rồi kéo nam châm để quan sát từ phổ",fontSize:15,fill:"#3f2d20"}));
  // Lưới dày có nhiễu nhẹ giúp mạt sắt phủ kín bàn nhưng vẫn trông tự nhiên.
  const columns=78,rows=48;
  let filings:IronFiling[]=Array.from({length:columns*rows},(_,i)=>{const col=i%columns,row=Math.floor(i/columns),x=-3.45+(6.9*col)/(columns-1)+(Math.random()-.5)*.055,y=-1.78+(3.56*row)/(rows-1)+(Math.random()-.5)*.055;return{x,y,angle:fieldAt(scene,x,y).angle}});
  const filingLayer=new Konva.Group();layer.add(filingLayer);
  const dashes=filings.map(()=>new Konva.Line({stroke:"#374151",strokeWidth:1.15,opacity:.62,lineCap:"round"}));dashes.forEach(d=>filingLayer.add(d));
  const magnet=new Konva.Group({draggable:true});layer.add(magnet);
  const drawMagnet=()=>{magnet.destroyChildren();magnet.add(new Konva.Rect({x:-75,y:-18,width:75,height:36,fill:"#dc2626",stroke:"#7f1d1d",strokeWidth:2,cornerRadius:4}),new Konva.Rect({x:0,y:-18,width:75,height:36,fill:"#2563eb",stroke:"#1e3a8a",strokeWidth:2,cornerRadius:4}),new Konva.Text({x:-75,y:-8,width:75,text:"N",align:"center",fontSize:18,fontStyle:"bold",fill:"#fff"}),new Konva.Text({x:0,y:-8,width:75,text:"S",align:"center",fontSize:18,fontStyle:"bold",fill:"#fff"}));};
  drawMagnet();magnet.position(toScreen(scene.magnetX,scene.magnetY));
  magnet.on("dragstart",()=>{runningRef.current=true;onRunningChange(true)});magnet.on("dragmove",()=>{const p=magnet.position();scene.magnetX=(p.x-center.x)/scale;scene.magnetY=(center.y-p.y)/scale});
  const draw=()=>{for(let i=0;i<filings.length;i++){const f=filings[i],s=toScreen(f.x,f.y),field=fieldAt(scene,f.x,f.y),len=Math.min(8,2.2+Math.sqrt(field.strength)*.55);dashes[i].points([s.x-Math.cos(f.angle)*len,s.y+Math.sin(f.angle)*len,s.x+Math.cos(f.angle)*len,s.y-Math.sin(f.angle)*len]);dashes[i].opacity(Math.min(.94,.48+Math.sqrt(field.strength)*.045));}layer.batchDraw()};
  draw();let raf=0,last=performance.now();const loop=(now:number)=>{const dt=Math.min((now-last)/1000,1/30);last=now;if(runningRef.current){filings=stepFilings(scene,filings,dt*speedRef.current);draw()}raf=requestAnimationFrame(loop)};raf=requestAnimationFrame(loop);return()=>{cancelAnimationFrame(raf);stage.destroy()};
 },[scene,size,resetSignal,onRunningChange,ref]);
 return <div ref={ref} className="h-full w-full overflow-hidden rounded-lg"/>;
}
