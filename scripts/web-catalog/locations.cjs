const fs=require('node:fs'),path=require('node:path')
const root=process.env.GRAPHTUTOR_WEB_ROOT||path.resolve(__dirname,'../../..')
const staged=path.resolve(__dirname,'../miniapp')
const target=process.env.GRAPHTUTOR_MINIAPP_ROOT||(fs.existsSync(path.join(staged,'manifest.json'))?staged:path.resolve(__dirname,'../..'))
if(!fs.existsSync(path.join(root,'packages/web/src/data/problem-library.ts')))throw Error('请设置 GRAPHTUTOR_WEB_ROOT，指向包含 packages/web 的 Web 仓库根目录。')
module.exports={root,target}
