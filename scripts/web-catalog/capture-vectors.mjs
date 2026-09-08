import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { spawn } from 'node:child_process'

const dir=path.dirname(fileURLToPath(import.meta.url))
const endpoint='http://127.0.0.1:9237'
const child=spawn(process.env.GRAPHTUTOR_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',[
  '--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
  '--remote-debugging-port=9237',`--user-data-dir=${path.join(dir,'chrome-profile')}`,
  '--allow-file-access-from-files','about:blank',
],{windowsHide:true,stdio:'ignore'})
child.on('error',e=>{throw e})
let target
for(let i=0;i<60;i++){
  try{target=await fetch(endpoint+'/json/new?about:blank',{method:'PUT'}).then(r=>r.json());break}catch{}
  await new Promise(r=>setTimeout(r,250))
}
if(!target)throw new Error('Headless Chrome did not start')
const socket=new WebSocket(target.webSocketDebuggerUrl)
await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})})
let sequence=0
const pending=new Map()
socket.addEventListener('message',({data})=>{const msg=JSON.parse(data);const p=pending.get(msg.id);if(!p)return;pending.delete(msg.id);msg.error?p.reject(Error(msg.error.message)):p.resolve(msg.result)})
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})
try {
  await send('Page.enable')
  await send('Page.navigate',{url:pathToFileURL(path.join(dir,'catalog-vectors.html')).href})
  for(let i=0;i<100;i++){
    const r=await send('Runtime.evaluate',{expression:"document.querySelectorAll('.board').length",returnByValue:true})
    if(r.result.value===96)break
    await new Promise(r=>setTimeout(r,100))
  }
  const response=await send('Runtime.evaluate',{returnByValue:true,expression:`(${extract.toString()})()`})
  if(response.exceptionDetails)throw new Error(JSON.stringify(response.exceptionDetails))
  const drawings=response.result.value
  if(Object.keys(drawings).length!==96)throw new Error('Incomplete drawing export')
  await fs.writeFile(path.join(dir,'vectors.json'),JSON.stringify(drawings))
  console.log(JSON.stringify({boards:Object.keys(drawings).length,operations:Object.values(drawings).reduce((s,a)=>s+a.length,0),bytes:JSON.stringify(drawings).length}))
} finally {await send('Browser.close').catch(()=>{});socket.close()}

// Serialize the actual Web SVG renderer's geometry AND resolved CSS, including
// its label layout and marker arrowheads. Native canvas replays these vectors.
function extract(){
  const round=n=>Math.round(n*10000)/10000
  const visible=c=>c&&c!=='none'&&c!=='transparent'&&c!=='rgba(0, 0, 0, 0)'
  const outputs={}
  for(const board of document.querySelectorAll('.board')){
    const svg=board.querySelector('svg'),ops=[]
    const inverse=svg.getScreenCTM().inverse()
    const matrixOf=el=>{const m=inverse.multiply(el.getScreenCTM());return [m.a,m.b,m.c,m.d,m.e,m.f].map(round)}
    function make(el,matrix){
      const cs=getComputedStyle(el)
      if(cs.display==='none'||cs.visibility==='hidden')return null
      const fill=visible(cs.fill)&&Number(cs.fillOpacity)>0?cs.fill:''
      const stroke=visible(cs.stroke)&&Number(cs.strokeOpacity)>0&&parseFloat(cs.strokeWidth)>0?cs.stroke:''
      if(!fill&&!stroke)return null
      const tag=el.tagName.toLowerCase()
      const op={kind:tag,id:el.closest('[data-object-id]')?.getAttribute('data-object-id')||'',matrix:matrix??matrixOf(el),fill,stroke,
        fillOpacity:round(Number(cs.fillOpacity)),strokeOpacity:round(Number(cs.strokeOpacity)),opacity:round(Number(cs.opacity)),
        width:parseFloat(cs.strokeWidth)||0,cap:cs.strokeLinecap,join:cs.strokeLinejoin,
        dash:cs.strokeDasharray==='none'?[]:cs.strokeDasharray.split(/[ ,]+/).map(parseFloat),
        nonScaling:cs.vectorEffect==='non-scaling-stroke'}
      if(tag==='polygon'||tag==='polyline')op.points=Array.from(el.points,p=>[round(p.x),round(p.y)])
      else if(tag==='line')op.points=[[el.x1.baseVal.value,el.y1.baseVal.value],[el.x2.baseVal.value,el.y2.baseVal.value]].map(p=>p.map(round))
      else if(tag==='circle'){op.at=[round(el.cx.baseVal.value),round(el.cy.baseVal.value)];op.radius=round(el.r.baseVal.value)}
      else if(tag==='rect'){op.at=[el.x.baseVal.value,el.y.baseVal.value].map(round);op.size=[el.width.baseVal.value,el.height.baseVal.value].map(round);op.radius=el.rx.baseVal.value}
      else if(tag==='text'){
        op.at=[el.x.baseVal[0]?.value||0,el.y.baseVal[0]?.value||0].map(round)
        op.text=Array.from(el.childNodes).filter(n=>n.nodeType===3||n.nodeName.toLowerCase()==='tspan').map(n=>n.textContent).join('').trim()
        if(!op.text)return null
        op.font=cs.font;op.fontSize=parseFloat(cs.fontSize);op.fontFamily=cs.fontFamily;op.fontWeight=cs.fontWeight;op.fontStyle=cs.fontStyle
        op.anchor=cs.textAnchor;op.baseline=cs.dominantBaseline;op.paintOrder=cs.paintOrder
      }else if(tag==='path'){
        op.kind=/z\s*$/i.test(el.getAttribute('d')||'')?'polygon':'polyline'
        const length=el.getTotalLength(),count=Math.max(2,Math.ceil(length/2));const points=[]
        for(let i=0;i<=count;i++){const p=el.getPointAtLength(length*i/count);points.push([round(p.x),round(p.y)])}
        // Remove collinear samples while retaining the authored curve to 0.02px.
        op.points=points.filter((p,i)=>{if(i===0||i===points.length-1)return true;const a=points[i-1],b=points[i+1];return Math.abs((p[0]-a[0])*(b[1]-a[1])-(p[1]-a[1])*(b[0]-a[0]))>0.002})
      }else throw new Error('Unhandled Web SVG node '+tag)
      return op
    }
    for(const el of svg.querySelectorAll('polygon,polyline,line,circle,rect,path,text')){
      if(el.closest('defs')||el.classList.contains('interaction-hit-target')||el.classList.contains('point-hit-target'))continue
      const op=make(el)
      if(!op)continue
      ops.push(op)
      const cs=getComputedStyle(el)
      for(const where of ['markerStart','markerEnd']){
        const markerRef=cs[where],id=markerRef?.match(/#([^"')]+)/)?.[1]
        if(!id||!op.points||op.points.length<2)continue
        const marker=Array.from(svg.querySelectorAll('marker')).find(m=>m.id===id)
        if(!marker)throw new Error('Missing marker '+id)
        const at=where==='markerEnd'?op.points.at(-1):op.points[0]
        const from=where==='markerEnd'?op.points.at(-2):op.points[1]
        const angle=Math.atan2(at[1]-from[1],at[0]-from[0])*180/Math.PI
        const m=new DOMMatrix(op.matrix).translate(at[0],at[1]).rotate(angle)
          .scale(marker.markerWidth.baseVal.value/12,marker.markerHeight.baseVal.value/12)
          .translate(-marker.refX.baseVal.value,-marker.refY.baseVal.value)
        for(const child of marker.querySelectorAll('path')){
          const arrow=make(child,[m.a,m.b,m.c,m.d,m.e,m.f].map(round))
          if(arrow){arrow.id=op.id;ops.push(arrow)}
        }
      }
    }
    outputs[board.dataset.key]=ops
  }
  return outputs
}
