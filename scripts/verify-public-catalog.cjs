const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict')
const root=path.resolve(__dirname,'..')
const read=file=>JSON.parse(fs.readFileSync(path.join(root,file),'utf8'))
const previews=read('data/web-problems.json')
const problems=read('subpackages/catalog/data/problems.json')
const manifest=read('subpackages/catalog/data/source-manifest.json')
const formulas=read('subpackages/catalog/data/formulas.json')
const styles=read('subpackages/catalog/data/vector-styles.json')
const pages=read('pages.json')
assert.equal(previews.length,51);assert.equal(problems.length,51)
assert.equal(new Set(problems.map(p=>p.id)).size,51)
assert.equal(new Set(problems.map(p=>p.webId)).size,51)
assert(pages.subPackages.some(p=>p.root==='subpackages/catalog'))
const checkAsset=src=>{
  assert(src.startsWith('/'),'Asset must use a package-local path: '+src)
  const file=path.resolve(root,'.'+src)
  assert(file.startsWith(root+path.sep),'Asset escaped project root')
  assert(fs.existsSync(file),'Missing asset '+src)
}
const finite=value=>{
  if(typeof value==='number')assert(Number.isFinite(value),'Invalid drawing coordinate')
  else if(Array.isArray(value))value.forEach(finite)
  else if(value&&typeof value==='object')Object.values(value).forEach(finite)
}
let steps=0,boards2d=0,boards3d=0,formulaUses=0
for(const style of styles){finite(style);assert.equal(style.matrix.length,6)}
for(const [index,p] of problems.entries()){
  const preview=previews[index],source=manifest.entries[index]
  assert.equal(preview.id,p.id);assert.equal(preview.webId,p.webId);assert.equal(preview.title,p.title)
  assert(p.statement&&p.overview&&p.answer,'Incomplete solution '+p.id)
  assert.equal(p.steps.length,preview.stepCount);assert.equal(p.steps.length,source.steps.length)
  assert.equal(new Set(p.steps.map(s=>s.id)).size,p.steps.length)
  if(p.figure)checkAsset(p.figure.imagePath)
  if(preview.thumbnailPath)checkAsset(preview.thumbnailPath)
  const content=[p.statement,p.overview,p.answer,...p.givens,...p.target]
  for(const [i,s] of p.steps.entries()){
    steps++;assert.equal(s.id,source.steps[i].id);assert.equal(s.pageId,source.steps[i].pageId);assert.equal(s.title,source.steps[i].title)
    assert(s.title&&s.summary&&s.pageId,'Missing step content '+p.id+'/'+s.id)
    const scene=s.scene;finite(scene)
    if(scene.dimension===2){boards2d++;assert(scene.operations.length,'Empty vector board');for(const op of scene.operations){assert(styles[op.styleRef],'Missing drawing style');assert(['polygon','polyline','line','circle','text','rect'].includes(op.kind));if(op.kind==='text')assert(op.text);else assert(op.points?.length||op.at)}}
    else {boards3d++;assert(scene.primitives.length,'Empty spatial board');assert(scene.radius>0);assert.equal(scene.center.length,3)}
    content.push(s.title,s.summary,s.detail,s.formula,s.caption,...s.expect)
  }
  for(const text of content){
    if(typeof text!=='string')continue
    for(const match of text.matchAll(/\\\(([\s\S]*?)\\\)|\\\[([\s\S]*?)\\\]|\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g)){
      assert(formulas[match[0]],'Unrendered formula '+match[0]);formulaUses++
    }
  }
}
for(const f of Object.values(formulas)){checkAsset(f.src);assert(f.width>0&&f.height>0)}
assert.equal(steps,117);assert.equal(boards2d,96);assert.equal(boards3d,21)
const source=fs.readFileSync(path.join(root,'data/problems.ts'),'utf8')
assert(source.includes("problem.webId ? 'catalog' : 'solver'"),'Public examples still route to legacy templates')
console.log(JSON.stringify({problems:problems.length,steps,boards2d,boards3d,formulas:Object.keys(formulas).length,formulaUses,localAssets:'verified',publicRoutes:'verified'},null,2))
