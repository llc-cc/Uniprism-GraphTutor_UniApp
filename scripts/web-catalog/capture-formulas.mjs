import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath,pathToFileURL} from 'node:url'
import {createRequire} from 'node:module'
import {browser} from './browser.mjs'
import locations from './locations.cjs'
const {root,target}=locations
const require=createRequire(path.join(root,'package.json')),sharp=require('sharp')
const dir=path.dirname(fileURLToPath(import.meta.url))
const formulas=JSON.parse(await fs.readFile(path.join(dir,'formulas.json'),'utf8'))
await fs.mkdir(path.join(target,'subpackages/catalog/static/math'),{recursive:true})
const session=await browser()
try{
  await session.send('Emulation.setDefaultBackgroundColorOverride',{color:{r:0,g:0,b:0,a:0}})
  await session.send('Page.navigate',{url:pathToFileURL(path.join(dir,'formulas.html')).href})
  for(let i=0;i<100;i++){
    if(await session.evaluate("document.querySelectorAll('.formula').length")===formulas.length)break
    await new Promise(r=>setTimeout(r,100))
  }
  await session.evaluate('document.fonts.ready.then(()=>true)')
  const boxes=await session.evaluate("Array.from(document.querySelectorAll('.formula'),e=>{const r=e.getBoundingClientRect();return {id:e.id,x:r.x,y:r.y,width:Math.ceil(r.width),height:Math.ceil(r.height)}})")
  const manifest={}
  let bytes=0
  for(const [i,f] of formulas.entries()){
    const box=boxes.find(b=>b.id==='m'+f.id)
    const {data}=await session.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:{x:box.x,y:box.y,width:box.width,height:box.height,scale:1}})
    const image=await sharp(Buffer.from(data,'base64')).png({palette:true}).toBuffer()
    const src=`/subpackages/catalog/static/math/${f.id}.png`
    await fs.writeFile(path.join(target,src),image);bytes+=image.length
    manifest[f.key]={src,width:box.width,height:box.height}
    if((i+1)%50===0)console.log('Math formulas '+(i+1)+'/'+formulas.length)
  }
  await fs.writeFile(path.join(target,'subpackages/catalog/data/formulas.json'),JSON.stringify(manifest))
  console.log(JSON.stringify({formulas:formulas.length,bytes}))
}finally{await session.close()}
