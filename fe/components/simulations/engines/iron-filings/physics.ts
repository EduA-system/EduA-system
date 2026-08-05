import type { IronFilingsScene, IronFiling } from "./types";
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));

/** Trường lưỡng cực của nam châm thẳng, mô-men từ hướng từ S về N. */
export function fieldAt(scene: IronFilingsScene,x:number,y:number){
  const dx=x-scene.magnetX,dy=y-scene.magnetY;
  const d=Math.max(.12,Math.hypot(dx,dy));
  const ux=dx/d,uy=dy/d;
  const mx=1,my=0,dot=mx*ux+my*uy;
  const bx=(3*dot*ux-mx)*scene.strength/(d*d*d);
  const by=(3*dot*uy-my)*scene.strength/(d*d*d);
  return {x:bx,y:by,strength:Math.hypot(bx,by),angle:Math.atan2(by,bx)};
}

export function stepFilings(scene: IronFilingsScene, filings: IronFiling[], dt:number){
  const response=clamp(dt*12,.08,.42);
  return filings.map(f=>{const field=fieldAt(scene,f.x,f.y);const angle=f.angle+response*Math.atan2(Math.sin(field.angle-f.angle),Math.cos(field.angle-f.angle));return{x:f.x,y:f.y,angle};});
}
