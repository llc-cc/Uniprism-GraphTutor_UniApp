<script setup lang="ts">
import {computed,getCurrentInstance,nextTick,onBeforeUnmount,onMounted,ref,watch} from 'vue'
import {drawCatalog,pickObject,type Hit,type ViewState} from '../render'
import type {CatalogScene} from '../types'

const props=defineProps<{scene:CatalogScene;showGrid:boolean;expanded?:boolean;selected?:string}>()
const emit=defineEmits<{select:[id:string,label:string];expand:[];'update:showGrid':[value:boolean]}>()
const instance=getCurrentInstance()
const error=ref(''),percent=ref(100),mode=ref<'orbit'|'pan'>('orbit')
const appearanceOpen=ref(false),lineScale=ref(1),pointScale=ref(1)
const panActive=computed(()=>mode.value==='pan')
const captureTouch=computed(()=>props.scene.dimension===3||panActive.value)
const hint=computed(()=>props.scene.dimension===3
  ?panActive.value?'单指移动 · 双指缩放':'单指旋转 · 双指缩放'
  :panActive.value?'移动画布已开启 · 双指缩放':'点按图形可选中 · 滑动页面')
const linePercent=computed(()=>`${Math.round(lineScale.value*100)}%`)
const pointPercent=computed(()=>`${Math.round(pointScale.value*100)}%`)
const linePreviewStyle=computed(()=>({height:`${Math.max(2,4*lineScale.value)}rpx`}))
const pointPreviewStyle=computed(()=>({width:`${Math.max(10,14*pointScale.value)}rpx`,height:`${Math.max(10,14*pointScale.value)}rpx`}))
type CanvasNode=HTMLCanvasElement&{requestAnimationFrame?:(fn:()=>void)=>number;cancelAnimationFrame?:(id:number)=>void}
let node:CanvasNode|null=null,ctx:CanvasRenderingContext2D|null=null
let w=0,h=0,dpr=1,destroyed=false,attempts=0,frame:number|null=null,timer:ReturnType<typeof setTimeout>|undefined
let initTimer:ReturnType<typeof setTimeout>|undefined,hits:Hit[]=[]
let view:ViewState={zoom:1,panX:0,panY:0,...props.scene.camera}
let gesture:{points:number[][];view:ViewState;moved:boolean}|null=null
const points=(event:any)=>Array.from(event.touches??[],(t:any)=>[t.x??t.clientX??0,t.y??t.clientY??0])
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v))
function paint(){
  if(!ctx||destroyed)return
  try{ctx.setTransform(dpr,0,0,dpr,0,0);hits=drawCatalog(ctx,props.scene,w,h,view,props.showGrid,props.selected,lineScale.value,pointScale.value);error.value=''}
  catch(e){error.value='图解绘制失败，请重试';console.error('[catalog canvas]',e)}
}
function schedule(){
  if(!ctx||frame!==null||timer||destroyed)return
  let painted=false
  const render=()=>{
    if(painted||destroyed)return
    painted=true
    if(frame!==null)node?.cancelAnimationFrame?.(frame)
    if(timer)clearTimeout(timer)
    frame=null;timer=undefined;paint()
  }
  if(node?.requestAnimationFrame)frame=node.requestAnimationFrame(render)
  // DevTools can suspend RAF for a canvas outside a scroll-view's viewport.
  // Never let an off-screen frame block all subsequent renders.
  timer=setTimeout(render,node?.requestAnimationFrame?48:16)
}
function attach(){
  if(destroyed)return
  // UniApp Vue 3 selector scopes resolve the internal instance to $scope.
  uni.createSelectorQuery().in(instance as never).select('#catalogScene').fields({node:true,size:true},()=>{}).exec((res:any[])=>{
    if(destroyed)return
    const target=res?.[0]
    if(!target?.node||target.width<=0||target.height<=0){
      if(attempts++<20)initTimer=setTimeout(attach,80)
      else error.value='图解尚未加载，点击重试'
      return
    }
    node=target.node;w=target.width;h=target.height
    dpr=Math.min(uni.getWindowInfo().pixelRatio||1,2)
    node!.width=Math.round(w*dpr);node!.height=Math.round(h*dpr)
    ctx=node!.getContext('2d');attempts=0
    if(!ctx){error.value='无法建立绘图环境，点击重试';return}
    paint()
  })
}
function reset(){view={zoom:1,panX:0,panY:0,...props.scene.camera};percent.value=100;schedule()}
function zoomLimits(){return props.scene.dimension===3?[.45,2.4]:[.7,2.5]}
function setZoom(value:number){const [min,max]=zoomLimits();view.zoom=clamp(value,min!,max!);percent.value=Math.round(view.zoom*100)}
function zoom(factor:number){setZoom(view.zoom*factor);schedule()}
function panTo(x:number,y:number){
  view.panX=props.scene.dimension===2?clamp(x,-w*.38,w*.38):x
  view.panY=props.scene.dimension===2?clamp(y,-h*.38,h*.38):y
}
function togglePan(){mode.value=panActive.value?'orbit':'pan';gesture=null}
function toggleGrid(){if(props.scene.dimension===2)emit('update:showGrid',!props.showGrid)}
function sliderValue(event:any){return clamp(Number(event.detail?.value??10)/10,.7,1.6)}
function setLineScale(event:any){lineScale.value=sliderValue(event)}
function setPointScale(event:any){pointScale.value=sliderValue(event)}
function resetAppearance(){lineScale.value=1;pointScale.value=1}
function start(event:any){gesture={points:points(event),view:{...view},moved:false}}
function move(event:any){
  if(!gesture)return
  const next=points(event),initial=gesture.points
  if(next.length!==initial.length){start(event);return}
  if(next.length>=2){
    const distance=(p:number[][])=>Math.hypot(p[0]![0]!-p[1]![0]!,p[0]![1]!-p[1]![1]!)
    const ratio=distance(next)/Math.max(1,distance(initial))
    setZoom(gesture.view.zoom*ratio)
    if(props.scene.dimension===3||panActive.value)panTo(
      gesture.view.panX+(next[0]![0]!+next[1]![0]!-initial[0]![0]!-initial[1]![0]!)/2,
      gesture.view.panY+(next[0]![1]!+next[1]![1]!-initial[0]![1]!-initial[1]![1]!)/2,
    )
    gesture.moved=true
  }else if(next[0]&&initial[0]){
    const dx=next[0][0]!-initial[0][0]!,dy=next[0][1]!-initial[0][1]!
    if(Math.hypot(dx,dy)>4)gesture.moved=true
    if(props.scene.dimension===3&&mode.value==='orbit'){
      view.azimuth=gesture.view.azimuth-dx*.45
      view.elevation=clamp(gesture.view.elevation+dy*.32,-85,85)
    }else if(panActive.value)panTo(gesture.view.panX+dx,gesture.view.panY+dy)
    else return
  }
  // No reactive scene/camera updates during touchmove: one native paint/frame.
  schedule()
}
function end(event:any){
  if(event.touches?.length){start(event);return}
  const wasTap=gesture&&!gesture.moved
  gesture=null;percent.value=Math.round(view.zoom*100)
  if(!wasTap)return
  const touch=event.changedTouches?.[0];if(!touch)return
  uni.createSelectorQuery().in(instance as never).select('#catalogScene').boundingClientRect((box:any)=>{
    if(destroyed)return
    const hit=pickObject(hits,touch.x??touch.clientX-box.left,touch.y??touch.clientY-box.top)
    emit('select',hit?.id??'',hit?.text??hit?.id??'')
  }).exec()
}
watch(()=>props.scene,()=>{mode.value='orbit';gesture=null;appearanceOpen.value=false;reset()})
watch(()=>[props.showGrid,props.selected,lineScale.value,pointScale.value],schedule)
watch(appearanceOpen,async()=>{await nextTick();attempts=0;attach()})
watch(()=>props.expanded,async()=>{await nextTick();attempts=0;attach()})
onMounted(async()=>{await nextTick();attach()})
onBeforeUnmount(()=>{destroyed=true;if(initTimer)clearTimeout(initTimer);if(timer)clearTimeout(timer);if(frame!==null)node?.cancelAnimationFrame?.(frame);node=null;ctx=null})
</script>

<template>
  <view class="canvas-shell" :class="{'canvas-shell--expanded':expanded}">
    <view class="canvas-toolbar">
      <button class="appearance-trigger" :class="{'appearance-trigger--active':appearanceOpen}" @tap.stop="appearanceOpen=!appearanceOpen">
        <view class="appearance-icon"><view /><view /><view /></view><text>图面</text>
      </button>
      <view class="canvas-hint">{{ hint }}</view>
    </view>
    <view v-if="appearanceOpen" class="appearance-panel">
        <view class="appearance-header"><view><text class="appearance-kicker">DISPLAY</text><text class="appearance-title">图面设置</text></view><button class="appearance-reset" @tap.stop="resetAppearance">恢复标准</button></view>
        <view class="appearance-field">
          <view class="appearance-heading"><text>线条粗细</text><text class="appearance-percent">{{ linePercent }}</text></view>
          <view class="appearance-row"><view class="appearance-preview"><view class="line-preview" :style="linePreviewStyle" /></view><slider class="appearance-slider" min="7" max="16" step="1" :value="Math.round(lineScale*10)" activeColor="#2f72bd" backgroundColor="#dce3eb" block-color="#2f72bd" :block-size="18" @changing="setLineScale" @change="setLineScale" /></view>
        </view>
        <view class="appearance-field">
          <view class="appearance-heading"><text>点的大小</text><text class="appearance-percent">{{ pointPercent }}</text></view>
          <view class="appearance-row"><view class="appearance-preview"><view class="point-preview" :style="pointPreviewStyle" /></view><slider class="appearance-slider" min="7" max="16" step="1" :value="Math.round(pointScale*10)" activeColor="#2f72bd" backgroundColor="#dce3eb" block-color="#2f72bd" :block-size="18" @changing="setPointScale" @change="setPointScale" /></view>
        </view>
        <view class="appearance-background"><text class="appearance-heading-label">画板背景</text><view v-if="scene.dimension===2" class="background-actions"><button class="background-button" :class="{'background-button--active':!showGrid}" @tap.stop="emit('update:showGrid',false)"><view class="background-swatch" />纯白</button><button class="background-button" :class="{'background-button--active':showGrid}" @tap.stop="emit('update:showGrid',true)"><view class="background-swatch background-swatch--grid" />网格</button></view><view v-else class="background-note">3D 画板固定使用纯白背景</view></view>
        <text class="appearance-note">仅改变显示，不影响题目数据</text>
    </view>
    <view class="canvas-stage">
      <canvas id="catalogScene" canvas-id="catalogScene" type="2d" class="scene-canvas" :disable-scroll="captureTouch" @touchstart="start" @touchmove="move" @touchend="end" @touchcancel="gesture=null" />
      <view v-if="error" class="canvas-error" @tap="attempts=0;attach()">{{ error }}</view>
    </view>
    <view class="canvas-footer">
      <view class="canvas-controls">
        <button class="canvas-button" :class="{'canvas-button--active':panActive}" @tap="togglePan">移动</button>
        <button v-if="scene.dimension===2" class="canvas-button" :class="{'canvas-button--active':showGrid}" @tap="toggleGrid">网格</button>
        <button class="canvas-button" @tap="zoom(1/1.18)">−</button>
        <button class="canvas-button canvas-button--reset" @tap="reset"><text>{{ percent }}%</text><text class="reset-label">适应画布</text></button>
        <button class="canvas-button" @tap="zoom(1.18)">＋</button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.canvas-shell{position:relative;background:#fff;border:1px solid #e8edf4;border-radius:20rpx;overflow:hidden}
.canvas-shell--expanded{height:100%;min-height:0;border-radius:0;border:0;display:flex;flex-direction:column}
.canvas-toolbar{min-height:80rpx;padding:12rpx 16rpx;box-sizing:border-box;display:flex;align-items:center;justify-content:space-between;gap:16rpx;flex-shrink:0;background:#fff}
.canvas-stage{position:relative;height:520rpx;min-height:270px;flex-shrink:0;overflow:hidden;border-top:1px solid #f1f4f8;border-bottom:1px solid #f1f4f8}
.canvas-shell--expanded .canvas-stage{height:auto;min-height:0;flex:1}
.scene-canvas{width:100%;height:100%;display:block}
.canvas-hint{flex:1;text-align:right;font-size:18rpx;color:#8b98aa;pointer-events:none}
.appearance-trigger,.appearance-reset,.background-button{margin:0;line-height:1.4;background:#fff;color:#637087}.appearance-trigger::after,.appearance-reset::after,.background-button::after{border:0}
.appearance-trigger{height:64rpx;display:flex;align-items:center;gap:12rpx;padding:0 18rpx;border:1px solid #d2d9e2;border-radius:17rpx;font-size:22rpx;font-weight:700;box-shadow:0 6rpx 18rpx #22314612}.appearance-trigger--active{color:#1f64ad;border-color:#a9c5e4;background:#f1f6fb}
.appearance-icon{width:30rpx;display:grid;gap:5rpx}.appearance-icon>view{height:2rpx;border-radius:4rpx;background:currentColor}.appearance-icon>view:nth-child(2){height:4rpx}.appearance-icon>view:nth-child(3){height:6rpx}
.appearance-panel{width:calc(100% - 32rpx);max-width:520rpx;box-sizing:border-box;display:flex;flex-direction:column;gap:20rpx;margin:0 16rpx 12rpx;padding:24rpx;border:1px solid #d2dbe6;border-radius:22rpx;background:#fff;box-shadow:0 12rpx 34rpx #1c2a4218;flex-shrink:0}
.appearance-header,.appearance-heading{display:flex;align-items:center;justify-content:space-between}.appearance-header>view{display:flex;flex-direction:column;gap:5rpx}.appearance-kicker{font-size:16rpx;color:#2f72bd;font-weight:800;letter-spacing:1rpx}.appearance-title{font-size:28rpx;font-weight:700}.appearance-reset{padding:10rpx 13rpx;border:1px solid #dce3eb;border-radius:11rpx;background:#f8fafc;font-size:19rpx;font-weight:650}
.appearance-field{display:flex;flex-direction:column;gap:10rpx}.appearance-heading,.appearance-heading-label{font-size:21rpx;color:#536176;font-weight:700}.appearance-heading-label{display:block;margin-bottom:12rpx}.appearance-percent{color:#1f64ad;font-size:19rpx}.appearance-row{display:flex;align-items:center;gap:12rpx}.appearance-preview{width:104rpx;height:50rpx;display:flex;align-items:center;justify-content:center;border:1px solid #e1e7ee;border-radius:12rpx;background:#f8fafc;flex-shrink:0}.line-preview{width:48rpx;border-radius:5rpx;background:#2f72bd}.point-preview{box-sizing:border-box;border:3rpx solid #fff;border-radius:50%;background:#2f72bd;box-shadow:0 0 0 2rpx #2f72bd}.appearance-slider{flex:1;min-width:0;margin:0}
.background-actions{display:flex;gap:12rpx}.background-button{flex:1;height:64rpx;display:flex;align-items:center;justify-content:center;gap:10rpx;padding:0;border:1px solid #dce3eb;border-radius:14rpx;font-size:21rpx;font-weight:650}.background-button--active{color:#1f64ad;border-color:#9fc0e1;background:#edf4fb;box-shadow:inset 0 0 0 1px #2f72bd14}.background-swatch{width:27rpx;height:27rpx;box-sizing:border-box;border:1px solid #cdd6e1;border-radius:5rpx;background:#fff}.background-swatch--grid{background-image:linear-gradient(#dce3eb 1px,transparent 1px),linear-gradient(90deg,#dce3eb 1px,transparent 1px);background-size:9rpx 9rpx}.background-note{padding:14rpx 16rpx;border-radius:12rpx;background:#f6f8fb;color:#8a95a6;font-size:19rpx}.appearance-note{text-align:center;color:#8a95a6;font-size:18rpx}
.canvas-footer{display:flex;justify-content:flex-end;padding:12rpx 16rpx 16rpx;background:#fff;flex-shrink:0}
.canvas-controls{position:relative;z-index:5;display:flex;align-items:stretch;background:#fff;border:1px solid #dce4ef;border-radius:20rpx;box-shadow:0 5rpx 18rpx #27364d0c;overflow:hidden}
.canvas-button{margin:0;padding:0 16rpx;min-width:58rpx;height:68rpx;line-height:68rpx;font-size:22rpx;color:#526581;background:#fff;border-radius:0}.canvas-button--active{color:#1f64ad;background:#edf4fb}
.canvas-button::after{border:0}
.canvas-button+.canvas-button{border-left:1px solid #edf1f6}
.canvas-button--reset{display:flex;flex-direction:column;justify-content:center;line-height:1.15;font-weight:600;min-width:95rpx}
.reset-label{font-size:16rpx;color:#92a0b3;font-weight:400;margin-top:2rpx}
.canvas-error{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#fffffff2;color:#b45339;font-size:26rpx;padding:30rpx;text-align:center}
</style>
