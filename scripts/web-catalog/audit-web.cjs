const path = require('node:path')
const { createRequire } = require('node:module')
const {root} = require('./locations.cjs')
const miniRequire = createRequire(path.join(root, 'apps/miniapp/package.json'))
const viteRequire = createRequire(miniRequire.resolve('vite'))
const esbuild = viteRequire('esbuild')
const vueRequire = createRequire(miniRequire.resolve('vue'))
const compiler = vueRequire('@vue/compiler-sfc')
const fs = require('node:fs')
async function main() {
await esbuild.build({
  entryPoints: [path.join(__dirname, 'web-catalog.ts')],
  outfile: path.join(__dirname, 'web-catalog.bundle.cjs'),
  bundle: true, platform: 'node', format: 'cjs',
  alias: { '#': path.join(root, 'packages/web/src'), '@chat-tutor/shared': path.join(root, 'packages/shared/src/index.ts'),
    'vue/server-renderer': vueRequire.resolve('@vue/server-renderer'),
    'vue': miniRequire.resolve('vue'), '@vue/server-renderer': vueRequire.resolve('@vue/server-renderer') },
  plugins: [{name:'vue-ssr',setup(build) { build.onLoad({filter:/\.vue$/}, async ({path:file}) => {
    const {descriptor}=compiler.parse(fs.readFileSync(file,'utf8'))
    const compiled=compiler.compileScript(descriptor,{id:'catalog-export',inlineTemplate:true,templateOptions:{ssr:true}})
    return {contents:compiled.content,loader:'ts',resolveDir:path.dirname(file)}
  })}}],
})
const module = require('./web-catalog.bundle.cjs')
const entries = await module.buildCatalog()
fs.writeFileSync(path.join(__dirname, 'catalog-raw.json'), JSON.stringify(entries))
const {descriptor}=compiler.parse(fs.readFileSync(path.join(root,'packages/web/src/components/whiteboard/whiteboard-2d.vue'),'utf8'))
const styles=descriptor.styles.map(s=>s.content).join('\n')
fs.writeFileSync(path.join(__dirname,'catalog-vectors.html'), '<!doctype html><meta charset="utf-8"><style>'+styles+'\nbody{margin:0}.board{width:800px;height:560px}</style>'+entries.flatMap(p=>p.steps.filter(s=>s.svg).map(s=>'<section class="board" data-key="'+p.id+'/'+s.id+'">'+s.svg+'</section>')).join('\n'))
fs.writeFileSync(path.join(__dirname,'web-tokens.json'), JSON.stringify({theme:module.CANVAS_THEME,states:module.STATE_TOKENS,tones:module.VISUAL_TONE_TOKENS,metrics:module.DRAWING_METRICS}))
console.log(JSON.stringify({total:entries.length,steps:entries.reduce((s,p)=>s+p.steps.length,0),boards2d:entries.flatMap(p=>p.steps).filter(s=>s.svg).length,boards3d:entries.flatMap(p=>p.steps).filter(s=>s.scene.dimension===3).length}))
}
main().catch(e=>{console.error(e);process.exitCode=1})
