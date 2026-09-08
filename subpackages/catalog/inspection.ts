import type {CatalogScene,Primitive,Vec3,VectorCommand} from './types'

export type CatalogInspectionKind='point'|'segment'|'vector'|'angle'|'polygon'|'solid'|'curve'|'label'
export interface CatalogInspectionField{label:string;value:string;code?:boolean}
export interface CatalogObjectInspection{
  objectId:string
  objectType:CatalogInspectionKind
  category:string
  title:string
  fields:CatalogInspectionField[]
  learningTip:string
}

const EPSILON=1e-7
const STATE_LABELS:Record<string,string>={
  given:'题目已知',emphasis:'当前重点',history:'前序对象',derived:'推导所得',unknown:'待求对象',
  ghost:'辅助对象',hint:'提示对象',error:'错误对象',missing:'缺失对象',
}
const formatNumber=(value:number)=>Number((Math.abs(value)<EPSILON?0:value).toFixed(3)).toString()
const formatVector=(value:Vec3,dimension:2|3)=>`(${value.slice(0,dimension).map(formatNumber).join(', ')})`
const subtract=(a:Vec3,b:Vec3):Vec3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]]
const lengthOf=(value:Vec3)=>Math.hypot(value[0],value[1],value[2])
const distance=(a:Vec3,b:Vec3)=>lengthOf(subtract(a,b))
const cross=(a:Vec3,b:Vec3):Vec3=>[
  a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0],
]
const dot=(a:Vec3,b:Vec3)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2]
const samePoint=(a:Vec3|undefined,b:Vec3|undefined)=>Boolean(a&&b&&distance(a,b)<=EPSILON)
const selectionId=(primitive:Primitive)=>primitive.pickId??primitive.objectId
const uniqueCount=(primitives:Primitive[])=>new Set(primitives.map(primitive=>selectionId(primitive)||primitive.id)).size
const stateField=(state:string):CatalogInspectionField=>({label:'当前状态',value:STATE_LABELS[state]??state})

function pointIdentity(scene:CatalogScene,at:Vec3){
  const primitives=scene.primitives??[]
  const point=primitives.find(primitive=>primitive.kind==='dot'&&samePoint(primitive.at,at))
  const label=primitives.find(primitive=>primitive.kind==='text'&&(
    point?primitive.objectId===point.objectId:samePoint(primitive.at,at)
  ))
  return {id:point?.objectId??'',label:label?.text??point?.objectId??''}
}

function pointTitle(scene:CatalogScene,point:Primitive,fallback:string){
  const label=(scene.primitives??[]).find(primitive=>
    primitive.kind==='text'&&primitive.objectId===point.objectId&&samePoint(primitive.at,point.at))
  return label?.text??fallback??point.objectId
}

function connectionField(scene:CatalogScene,at:Vec3):CatalogInspectionField[]{
  const primitives=scene.primitives??[]
  const lines=uniqueCount(primitives.filter(primitive=>{
    if(primitive.kind!=='path'||!primitive.points?.length)return false
    return primitive.points.some(point=>samePoint(point,at))
  }))
  const faces=uniqueCount(primitives.filter(primitive=>
    primitive.kind==='face'&&!primitive.inspectionTarget&&Boolean(primitive.points?.some(point=>samePoint(point,at)))))
  const angles=uniqueCount(primitives.filter(primitive=>
    primitive.kind==='arc'&&[primitive.at,primitive.from,primitive.to].some(point=>samePoint(point,at))))
  const values=[lines?`${lines} 条线`:'',faces?`${faces} 个面`:'',angles?`${angles} 个角`:''].filter(Boolean)
  return values.length?[{label:'关联对象',value:values.join(' · ')}]:[]
}

function inspectPoint(scene:CatalogScene,selected:string,label:string,point:Primitive):CatalogObjectInspection|null{
  if(!point.at)return null
  return {
    objectId:selected,objectType:'point',category:'点',title:pointTitle(scene,point,label),
    fields:[
      {label:'坐标',value:formatVector(point.at,scene.dimension),code:true},
      ...connectionField(scene,point.at),stateField(point.state),
    ],
    learningTip:'点由坐标和关联对象共同确定；可结合相连线段继续判断距离、方向与夹角。',
  }
}

function inspectPath(scene:CatalogScene,selected:string,path:Primitive):CatalogObjectInspection|null{
  const points=path.points??[]
  if(points.length<2)return null
  const from=pointIdentity(scene,points[0]!),to=pointIdentity(scene,points[points.length-1]!)
  const vector=Boolean(path.arrow&&path.arrow!=='none')
  const baseTitle=vector?`向量 ${from.label||from.id}${to.label||to.id}`:`线段 ${from.label||from.id}${to.label||to.id}`
  const total=points.slice(1).reduce((sum,point,index)=>sum+distance(points[index]!,point),0)
  return {
    objectId:selected,objectType:vector?'vector':'segment',category:vector?'向量':'线段',
    title:path.label?`${baseTitle} · ${path.label}`:baseTitle,
    fields:[
      {label:'端点',value:`${from.label||from.id||'起点'} → ${to.label||to.id||'终点'}`,code:true},
      {label:vector?'模长':'长度',value:formatNumber(total),code:true},stateField(path.state),
    ],
    learningTip:vector
      ?'向量由方向和模共同决定；平移向量不会改变它的方向与大小。'
      :'线段由两个端点确定；可结合长度、平行、垂直或等长关系继续推理。',
  }
}

function angleDegrees(from:Vec3,at:Vec3,to:Vec3){
  const first=subtract(from,at),second=subtract(to,at),divisor=lengthOf(first)*lengthOf(second)
  if(divisor<EPSILON)return 0
  return Math.acos(Math.max(-1,Math.min(1,dot(first,second)/divisor)))*180/Math.PI
}

function inspectArc(scene:CatalogScene,selected:string,arc:Primitive):CatalogObjectInspection|null{
  if(!arc.at||!arc.from||!arc.to)return null
  const vertex=pointIdentity(scene,arc.at),from=pointIdentity(scene,arc.from),to=pointIdentity(scene,arc.to)
  const degrees=arc.right?90:angleDegrees(arc.from,arc.at,arc.to)
  const notation=arc.label??`∠${from.label||from.id}${vertex.label||vertex.id}${to.label||to.id}`
  return {
    objectId:selected,objectType:'angle',category:'角',title:notation,
    fields:[
      {label:'顶点',value:vertex.label||vertex.id||formatVector(arc.at,scene.dimension),code:true},
      {label:'角度',value:`${formatNumber(degrees)}°`,code:true},stateField(arc.state),
    ],
    learningTip:arc.right
      ?'直角标记表示两条射线互相垂直，可作为后续长度、角度和垂直证明的依据。'
      :'角度由两条射线的方向向量计算；在空间中同样使用点积求夹角。',
  }
}

function polygonArea(points:Vec3[]){
  if(points.length<3)return 0
  const sum:Vec3=[0,0,0]
  points.forEach((point,index)=>{
    const value=cross(point,points[(index+1)%points.length]!)
    sum[0]+=value[0];sum[1]+=value[1];sum[2]+=value[2]
  })
  return lengthOf(sum)/2
}

function inspectFace(scene:CatalogScene,selected:string,face:Primitive):CatalogObjectInspection|null{
  const points=face.points??[]
  if(points.length<3)return null
  const names=points.map(point=>{const identity=pointIdentity(scene,point);return identity.label||identity.id}).filter(Boolean)
  const perimeter=points.reduce((sum,point,index)=>sum+distance(point,points[(index+1)%points.length]!),0)
  return {
    objectId:selected,objectType:'polygon',category:points.length===3?'三角形':'多边形',
    title:points.length===3?`△${names.join('')}`:`${points.length} 边形 ${names.join('')}`,
    fields:[
      {label:'顶点',value:names.join(' → ')||`${points.length} 个顶点`,code:true},
      {label:'周长',value:formatNumber(perimeter),code:true},
      {label:'面积',value:formatNumber(polygonArea(points)),code:true},stateField(face.state),
    ],
    learningTip:points.length===3
      ?'三角形的三条边、三个角和面积信息可直接用于全等、相似、勾股与三角函数推理。'
      :'多边形由有序顶点确定；将它分割成三角形，通常能把问题化为更基础的几何关系。',
  }
}

function inspectHull(selected:string,hull:Primitive):CatalogObjectInspection{
  return {
    objectId:selected,objectType:'solid',category:'立体图形',title:'立体图形',
    fields:[{label:'顶点数量',value:String(hull.points?.length??0),code:true},stateField(hull.state)],
    learningTip:'可继续点选立体的顶点或棱，查看对应位置、长度与几何关系。',
  }
}

function inspectPrimitive(scene:CatalogScene,selected:string,label:string,primitive:Primitive){
  if(primitive.kind==='dot')return inspectPoint(scene,selected,label,primitive)
  if(primitive.kind==='path')return inspectPath(scene,selected,primitive)
  if(primitive.kind==='arc')return inspectArc(scene,selected,primitive)
  if(primitive.kind==='face')return inspectFace(scene,selected,primitive)
  if(primitive.kind==='hull')return inspectHull(selected,primitive)
  return {
    objectId:selected,objectType:'label' as const,category:'图中标注',title:label||primitive.text||primitive.label||selected,
    fields:[stateField(primitive.state)],
    learningTip:'标注用于解释图中的对象，本身不改变长度、角度或位置关系。',
  }
}

function inspectVectorOperation(selected:string,label:string,operations:VectorCommand[]):CatalogObjectInspection{
  const operation=operations.find(item=>item.kind!=='text')??operations[0]
  const kind=operation?.kind==='polygon'?'polygon':operation?.kind==='line'||operation?.kind==='polyline'?'curve':'label'
  const category=kind==='polygon'?'图形区域':kind==='curve'?'曲线与线段':'图中标注'
  return {
    objectId:selected,objectType:kind,title:label||selected,category,
    fields:[{label:'对象类型',value:category},{label:'当前状态',value:'当前图层'}],
    learningTip:'该二维画面由同一组图层共同表达；可结合坐标轴、交点和标注继续理解当前步骤。',
  }
}

export function inspectCatalogObject(scene:CatalogScene|undefined,selected:string,label=''):CatalogObjectInspection|null{
  if(!scene||!selected)return null
  if(scene.dimension===2){
    const operations=(scene.operations??[]).filter(operation=>operation.id===selected)
    return operations.length?inspectVectorOperation(selected,label,operations):null
  }
  const candidates=(scene.primitives??[]).filter(primitive=>selectionId(primitive)===selected)
  if(!candidates.length)return null
  const order:Primitive['kind'][]=['dot','face','path','arc','hull','glyph','text']
  const primitive=[...candidates].sort((a,b)=>order.indexOf(a.kind)-order.indexOf(b.kind))[0]!
  return inspectPrimitive(scene,selected,label,primitive)
}
