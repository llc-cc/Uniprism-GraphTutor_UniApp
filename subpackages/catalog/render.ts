import type { CatalogScene, Primitive, Vec3, VectorOp } from './types'
import tokens from './data/tokens.json'
import vectorStyles from './data/vector-styles.json'

export interface ViewState {zoom: number; panX: number; panY: number; azimuth: number; elevation: number}
export interface Hit {id: string; points: number[][]; radius?: number; closed?: boolean; text?: string}
type StateToken={color:string;width:number;opacity:number;fill:string;fillOpacity:number;dash:number[]|null;dot:number}
const states = tokens.states as Record<string, StateToken>
const radians = (value: number) => value * Math.PI / 180
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0]-b[0],a[1]-b[1],a[2]-b[2]]
const dot = (a: Vec3,b: Vec3) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2]
const cross = (a: Vec3,b: Vec3): Vec3 => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
const unit = (v: Vec3): Vec3 => {const n=Math.hypot(...v)||1;return v.map(x=>x/n) as Vec3}
const distanceToSegment = (p:number[],a:number[],b:number[]) => {
  const x=b[0]!-a[0]!,y=b[1]!-a[1]!,l=x*x+y*y
  const t=l?Math.max(0,Math.min(1,((p[0]!-a[0]!)*x+(p[1]!-a[1]!)*y)/l)):0
  return Math.hypot(p[0]!-a[0]!-t*x,p[1]!-a[1]!-t*y)
}
export function pickObject(hits: Hit[], x:number,y:number) {
  let selected: Hit|undefined, best=Number.POSITIVE_INFINITY
  for(const hit of [...hits].reverse()) {
    const d=hit.points.length===1 ? Math.hypot(x-hit.points[0]![0]!,y-hit.points[0]![1]!) : Math.min(...hit.points.slice(1).map((p,i)=>distanceToSegment([x,y],hit.points[i]!,p)))
    if(d<=(hit.radius??14)&&d<best){best=d;selected=hit}
  }
  return selected
}
function grid(ctx: CanvasRenderingContext2D,w:number,h:number){
  for(let i=0;i<=Math.max(w,h);i+=20){ctx.strokeStyle=i%100===0?tokens.theme.gridMajor:tokens.theme.gridMinor;ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i,h);ctx.moveTo(0,i);ctx.lineTo(w,i);ctx.stroke()}
}
const vectorCache=new WeakMap<CatalogScene,VectorOp[]>()
function vectorOperations(scene:CatalogScene){
  let ops=vectorCache.get(scene)
  if(!ops){ops=(scene.operations??[]).map(command=>({...vectorStyles[command.styleRef],...command} as unknown as VectorOp));vectorCache.set(scene,ops)}
  return ops
}
export function drawCatalog(ctx:CanvasRenderingContext2D,scene:CatalogScene,w:number,h:number,view:ViewState,showGrid=false,selected='',lineScale=1,pointScale=1): Hit[]{
  ctx.clearRect(0,0,w,h);ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h)
  if(showGrid&&scene.dimension===2)grid(ctx,w,h)
  const safeLineScale=Math.max(.7,Math.min(1.6,lineScale)),safePointScale=Math.max(.7,Math.min(1.6,pointScale))
  return scene.dimension===2?drawVectors(ctx,vectorOperations(scene),w,h,view,selected,safeLineScale,safePointScale):drawSpatial(ctx,scene,w,h,view,selected,safeLineScale,safePointScale)
}

function drawVectors(ctx:CanvasRenderingContext2D,ops:VectorOp[],w:number,h:number,view:ViewState,selected:string,lineScale:number,pointScale:number):Hit[]{
  const fit=Math.min(w/800,h/560),scale=fit*view.zoom
  const ox=(w-800*scale)/2+view.panX,oy=(h-560*scale)/2+view.panY
  const hits:Hit[]=[]
  ctx.save();ctx.translate(ox,oy);ctx.scale(scale,scale)
  for(const op of ops){
    ctx.save();ctx.transform(...op.matrix)
    const emphasis=Boolean(selected&&op.id===selected)
    const matrixScale=Math.hypot(op.matrix[0],op.matrix[1])||1
    ctx.lineWidth=op.width*lineScale/(op.nonScaling?scale*matrixScale:1)
    ctx.lineCap=op.cap;ctx.lineJoin=op.join;ctx.setLineDash(op.dash.map(x=>x/(op.nonScaling?scale*matrixScale:1)))
    ctx.strokeStyle=emphasis&&op.kind!=='text'?'#d85b35':op.stroke||'transparent'
    ctx.fillStyle=emphasis&&op.kind==='text'?'#d85b35':op.fill||'transparent'
    const transform=(p:number[])=>[ox+scale*(op.matrix[0]*p[0]!+op.matrix[2]*p[1]!+op.matrix[4]),oy+scale*(op.matrix[1]*p[0]!+op.matrix[3]*p[1]!+op.matrix[5])]
    if(op.kind==='text'){
      ctx.font=`${op.fontStyle||'normal'} ${op.fontWeight||'400'} ${op.fontSize||16}px ${op.fontFamily||'serif'}`
      ctx.textAlign=op.anchor==='middle'?'center':op.anchor==='end'?'right':'left'
      ctx.textBaseline=['central','middle'].includes(op.baseline||'')?'middle':op.baseline==='hanging'?'top':'alphabetic'
      const at=op.at!,text=op.text||''
      const stroke=()=>{if(op.stroke){ctx.globalAlpha=op.strokeOpacity*op.opacity;ctx.strokeText(text,at[0]!,at[1]!)}}
      const fill=()=>{if(op.fill){ctx.globalAlpha=op.fillOpacity*op.opacity;ctx.fillText(text,at[0]!,at[1]!)}}
      if(op.paintOrder?.startsWith('stroke')){stroke();fill()}else{fill();stroke()}
      if(op.id)hits.push({id:op.id,points:[transform(at)],text})
    }else{
      ctx.beginPath()
      if(op.kind==='circle')ctx.arc(op.at![0]!,op.at![1]!,(op.radius||0)*pointScale,0,Math.PI*2)
      else if(op.kind==='rect')ctx.rect(op.at![0]!,op.at![1]!,op.size![0]!,op.size![1]!)
      else if(op.points?.length){ctx.moveTo(op.points[0]![0]!,op.points[0]![1]!);op.points.slice(1).forEach(p=>ctx.lineTo(p[0]!,p[1]!));if(op.kind==='polygon')ctx.closePath()}
      if(op.fill){ctx.globalAlpha=op.fillOpacity*op.opacity;ctx.fill()}
      if(op.stroke){ctx.globalAlpha=op.strokeOpacity*op.opacity;ctx.stroke()}
      if(op.id)hits.push({id:op.id,points:op.points?.map(transform)??[transform(op.at!)],closed:op.kind==='polygon'})
    }
    ctx.restore()
  }
  ctx.restore();return hits
}

// Convex hull boundary triangles are determined from the original Web hull.
// The weak cache keeps this work out of touchmove frames.
const hullCache=new WeakMap<CatalogScene,Vec3[][]>()
function hullTriangles(scene:CatalogScene){
  const previous=hullCache.get(scene);if(previous)return previous
  const result:Vec3[][]=[]
  for(const hull of (scene.primitives??[]).filter(p=>p.kind==='hull')){
    const points=hull.points??[]
    for(let a=0;a<points.length-2;a++)for(let b=a+1;b<points.length-1;b++)for(let c=b+1;c<points.length;c++){
      const normal=cross(sub(points[b]!,points[a]!),sub(points[c]!,points[a]!))
      if(Math.hypot(...normal)<1e-8)continue
      const signs=points.map(p=>dot(sub(p,points[a]!),normal)).filter(d=>Math.abs(d)>1e-7)
      if(signs.every(d=>d>=0)||signs.every(d=>d<=0))result.push([points[a]!,points[b]!,points[c]!])
    }
  }
  hullCache.set(scene,result);return result
}
function drawSpatial(ctx:CanvasRenderingContext2D,scene:CatalogScene,w:number,h:number,view:ViewState,selected:string,lineScale:number,pointScale:number):Hit[]{
  const az=radians(view.azimuth),el=radians(view.elevation)
  const z:Vec3=[Math.sin(az)*Math.cos(el),Math.cos(az)*Math.cos(el),Math.sin(el)]
  const x=unit(cross(Math.abs(z[2])>.94?[0,1,0]:[0,0,1],z)),y=cross(z,x)
  const distance=scene.radius*3.25/view.zoom,focal=h/(2*Math.tan(radians(19)))
  const project=(p:Vec3)=>{const r=sub(p,scene.center),depth=dot(r,z),d=Math.max(.05,distance-depth);return [w/2+dot(r,x)*focal/d+view.panX,h/2-dot(r,y)*focal/d+view.panY,depth]}
  const triangles=hullTriangles(scene).map(t=>t.map(project))
  const hidden=(p:number[])=>triangles.some(([a,b,c])=>{
    const den=(b![1]!-c![1]!)*(a![0]!-c![0]!)+(c![0]!-b![0]!)*(a![1]!-c![1]!)
    if(Math.abs(den)<1e-7)return false
    const u=((b![1]!-c![1]!)*(p[0]!-c![0]!)+(c![0]!-b![0]!)*(p[1]!-c![1]!))/den
    const v=((c![1]!-a![1]!)*(p[0]!-c![0]!)+(a![0]!-c![0]!)*(p[1]!-c![1]!))/den
    // Depth is perspective-correct, not linear in screen barycentric weights.
    // Linear interpolation incorrectly hides front edges on the prism itself.
    const inverseDepth=u/(distance-a![2]!)+v/(distance-b![2]!)+(1-u-v)/(distance-c![2]!)
    const surfaceDepth=distance-1/inverseDepth
    return u>=-1e-5&&v>=-1e-5&&u+v<=1.00001&&surfaceDepth>p[2]!+scene.radius*.002
  })
  const hits:Hit[]=[],primitives=scene.primitives??[],font=Math.max(11,Math.min(15,w/26))
  const token=(p:Primitive)=>states[p.state]??states.given!
  const color=(p:Primitive)=>(p.pickId??p.objectId)===selected?'#d85b35':token(p).color
  const label=(text:string,p:number[],id:string,paint:string,dx=0,dy=-9)=>{
    ctx.save();ctx.font=`600 ${font}px Georgia, serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.globalAlpha=1
    const px=Math.min(w-12,Math.max(12,p[0]!+dx)),py=Math.min(h-12,Math.max(12,p[1]!+dy))
    ctx.strokeText(text,px,py);ctx.fillStyle=paint;ctx.fillText(text,px,py);ctx.restore();hits.push({id,points:[[px,py]],text})
  }
  ctx.lineCap='round';ctx.lineJoin='round'
  for(const p of primitives.filter(p=>p.kind==='face'&&!p.inspectionTarget).sort((a,b)=>{
    const depth=(p:Primitive)=>(p.points??[]).reduce((s,v)=>s+project(v)[2]!,0)/Math.max(1,p.points?.length??1)
    return depth(a)-depth(b)
  })){
    const points=p.points!.map(project);if(points.length<3)continue
    ctx.beginPath();ctx.moveTo(points[0]![0]!,points[0]![1]!);points.slice(1).forEach(v=>ctx.lineTo(v[0]!,v[1]!));ctx.closePath()
    ctx.fillStyle=color(p);ctx.globalAlpha=Math.max(.12,token(p).fillOpacity*((p.opacity??.28)/.28));ctx.fill()
  }
  for(const p of primitives.filter(p=>p.kind==='path')){
    const points=p.points!.map(project),t=token(p),id=p.pickId??p.objectId
    ctx.strokeStyle=color(p);ctx.lineWidth=t.width*(p.widthScale??1)*lineScale;ctx.globalAlpha=t.opacity;ctx.setLineDash(t.dash?t.dash.map(n=>n*36):[])
    if(p.structural){
      for(let i=1;i<points.length;i++){
        const a=points[i-1]!,b=points[i]!
        const mid=project(p.points![i-1]!.map((value,j)=>(value+p.points![i]![j]!)/2) as Vec3),isHidden=hidden(mid)
        ctx.setLineDash(isHidden?[5,4]:t.dash?t.dash.map(n=>n*36):[]);ctx.globalAlpha=isHidden ? .32 : t.opacity
        ctx.beginPath();ctx.moveTo(a[0]!,a[1]!);ctx.lineTo(b[0]!,b[1]!);ctx.stroke()
      }
    }else {ctx.beginPath();points.forEach((v,i)=>i?ctx.lineTo(v[0]!,v[1]!):ctx.moveTo(v[0]!,v[1]!));ctx.stroke()}
    if(p.arrow&&p.arrow!=='none'&&points.length>=2){
      const headScale=Math.sqrt(lineScale)
      const head=(at:number[],from:number[])=>{const angle=Math.atan2(at[1]!-from[1]!,at[0]!-from[0]!);ctx.save();ctx.translate(at[0]!,at[1]!);ctx.rotate(angle);ctx.scale(headScale,headScale);ctx.setLineDash([]);ctx.globalAlpha=t.opacity;ctx.fillStyle=color(p);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-9,-3.5);ctx.lineTo(-9,3.5);ctx.closePath();ctx.fill();ctx.restore()}
      head(points[points.length-1]!,points[points.length-2]!)
      if(p.arrow==='both')head(points[0]!,points[1]!)
    }
    if(p.label&&points.length>=2){const a=points[0]!,b=points[points.length-1]!;label(p.label,[(a[0]!+b[0]!)/2,(a[1]!+b[1]!)/2],id,color(p))}
    hits.push({id,points})
  }
  ctx.setLineDash([])
  for(const p of primitives.filter(p=>p.kind==='arc')){
    const at=project(p.at!),id=p.pickId??p.objectId
    const u=unit(sub(p.from!,p.at!)),v=unit(sub(p.to!,p.at!)),r=scene.radius*.11*(p.radiusScale??1)
    const point=(vector:Vec3)=>project(p.at!.map((n,i)=>n+vector[i]!*r) as Vec3)
    let curve:number[][]
    if(p.right)curve=[point(u),point(u.map((n,i)=>n+v[i]!) as Vec3),point(v)]
    else{
      const angle=Math.acos(Math.max(-1,Math.min(1,dot(u,v)))),axis=unit(cross(u,v)),side=cross(axis,u)
      curve=Array.from({length:15},(_,i)=>point(u.map((n,j)=>n*Math.cos(angle*i/14)+side[j]!*Math.sin(angle*i/14)) as Vec3))
    }
    ctx.beginPath();ctx.moveTo(at[0]!,at[1]!);curve.forEach(q=>ctx.lineTo(q[0]!,q[1]!));ctx.closePath();ctx.fillStyle=color(p);ctx.globalAlpha=.09;ctx.fill()
    ctx.beginPath();curve.forEach((q,i)=>i?ctx.lineTo(q[0]!,q[1]!):ctx.moveTo(q[0]!,q[1]!));ctx.strokeStyle=color(p);ctx.lineWidth=token(p).width*lineScale;ctx.globalAlpha=token(p).opacity;ctx.stroke()
    hits.push({id,points:curve})
    if(p.label){const mid=point(unit(u.map((n,i)=>n+v[i]!) as Vec3)),dx=mid[0]!-at[0]!,dy=mid[1]!-at[1]!,len=Math.hypot(dx,dy)||1;label(p.label,mid,id,color(p),dx*13/len,dy*13/len)}
  }
  for(const p of primitives.filter(p=>p.kind==='dot')){
    const at=project(p.at!),t=token(p),isSelected=(p.pickId??p.objectId)===selected
    const radius=2.7*t.dot*(p.scale??1)*pointScale
    if(isSelected){ctx.globalAlpha=.18;ctx.fillStyle='#d85b35';ctx.beginPath();ctx.arc(at[0]!,at[1]!,radius*2.1,0,2*Math.PI);ctx.fill()}
    ctx.globalAlpha=t.opacity;ctx.fillStyle=color(p);ctx.strokeStyle='#fff';ctx.lineWidth=(isSelected?1.7:1.2)*pointScale
    ctx.beginPath();ctx.arc(at[0]!,at[1]!,radius*(isSelected?1.35:1),0,2*Math.PI);ctx.fill();ctx.stroke();hits.push({id:p.pickId??p.objectId,points:[at],radius:isSelected?22:18})
  }
  const placed:number[][]=[]
  for(const p of primitives.filter(p=>p.kind==='text')){
    const at=project(p.at!),id=p.pickId??p.objectId
    let dx=at[0]!>=w/2?11:-11,dy=at[1]!>=h/2?10:-10
    if(p.away){const other=project([p.at![0]+p.away[0],p.at![1]+p.away[1],p.at![2]+p.away[2]]);const n=Math.hypot(other[0]!-at[0]!,other[1]!-at[1]!)||1;dx=(other[0]!-at[0]!)*13/n;dy=(other[1]!-at[1]!)*13/n}
    for(let i=0;i<5&&placed.some(q=>Math.abs(q[0]!-at[0]!-dx)<font*(p.text?.length??1)*.6&&Math.abs(q[1]!-at[1]!-dy)<font);i++)dy+=(dy>=0?1:-1)*font
    placed.push([at[0]!+dx,at[1]!+dy]);label(p.text||'',at,id,color(p),dx,dy)
  }
  ctx.globalAlpha=1;return hits
}
