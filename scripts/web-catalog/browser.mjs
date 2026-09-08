import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawn} from 'node:child_process'
export async function browser(port=9238){
  const dir=path.dirname(fileURLToPath(import.meta.url))
  const child=spawn(process.env.GRAPHTUTOR_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',[
    '--headless=new','--disable-gpu','--no-first-run','--no-default-browser-check',
    `--remote-debugging-port=${port}`,`--user-data-dir=${path.join(dir,'chrome-'+port)}`,
    '--allow-file-access-from-files','about:blank',
  ],{windowsHide:true,stdio:'ignore'})
  let target,startError
  child.on('error',e=>{startError=e})
  for(let i=0;i<60;i++){
    if(startError)throw startError
    try{target=await fetch(`http://127.0.0.1:${port}/json/new?about:blank`,{method:'PUT'}).then(r=>r.json());break}catch{}
    await new Promise(r=>setTimeout(r,250))
  }
  if(!target)throw Error('Headless Chrome did not start')
  const socket=new WebSocket(target.webSocketDebuggerUrl)
  await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true})})
  let sequence=0
  const pending=new Map()
  socket.addEventListener('message',({data})=>{const msg=JSON.parse(data);const p=pending.get(msg.id);if(!p)return;pending.delete(msg.id);msg.error?p.reject(Error(msg.error.message)):p.resolve(msg.result)})
  const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}))})
  const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(JSON.stringify(r.exceptionDetails));return r.result.value}
  await send('Page.enable')
  return {send,evaluate,close:async()=>{await send('Browser.close').catch(()=>{});socket.close()}}
}
