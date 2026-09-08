<script setup lang="ts">
import {computed,markRaw,nextTick,ref,shallowRef} from 'vue'
import {onLoad,onUnload} from '@dcloudio/uni-app'
import sourceProblems from './data/solution-payload'
import type {CatalogProblem} from './types'
import CatalogCanvas from './components/CatalogCanvas.vue'
import CatalogObjectInspector from './components/CatalogObjectInspector.vue'
import CatalogText from './components/CatalogText.vue'
import MiniFormulaKeyboard from './components/MiniFormulaKeyboard.vue'
import MiniFormulaVoicePanel from '../../components/formula/MiniFormulaVoicePanel.vue'
import {useSpokenFormulaVoice} from '../../composables/useSpokenFormulaVoice'
import {productApi} from '../../services/product-api'
import type {SpokenFormulaClarificationOption} from '../../services/spoken-formula'
import {loadPreferences,preferencesState} from '../../stores/preferences'
import {getSavedProblemIds,recordProblemOpen,toggleProblemSaved} from '../../data/problems'
import {resolveCustomNavigationTop} from '../../utils/layout'
import {inspectCatalogObject} from './inspection'

// Large immutable drawing arrays must never become reactive/setData payloads.
const catalog=markRaw(sourceProblems as unknown as CatalogProblem[])
const problem=shallowRef<CatalogProblem|null>(null)
const active=ref(0),visited=ref(0),stepMode=ref(true),grid=ref(false),expanded=ref(false),saved=ref(false)
const selectedId=ref(''),selectedLabel=ref(''),scrollTarget=ref(''),missing=ref(false)
const navTop=resolveCustomNavigationTop()
const current=computed(()=>problem.value?.steps[active.value])
const selectedInspection=computed(()=>inspectCatalogObject(current.value?.scene,selectedId.value,selectedLabel.value))
const fontSize=computed(()=>preferencesState.fontSize==='舒适'?31:preferencesState.fontSize==='紧凑'?25:28)
const strategyTitle=computed(()=>problem.value?.subject==='physics'?'绘图策略':problem.value?.subject==='chemistry'?'观察策略':'解题思路')
const equilibriumLabel=computed(()=>problem.value?.equilibrium?.status==='balanced'?'ΣF = 0 · 平衡':problem.value?.equilibrium?.status==='unbalanced'?'ΣF ≠ 0 · 不平衡':'标准图像 · 可交互素材')
onLoad((query)=>{
  loadPreferences()
  const id=String(query?.id??'')
  problem.value=catalog.find(p=>p.id===id||p.webId===id)??null
  if(!problem.value){missing.value=true;return}
  const step=Number(query?.step??0)
  active.value=Number.isInteger(step)?Math.min(problem.value.steps.length-1,Math.max(0,step)):0
  visited.value=active.value;stepMode.value=preferencesState.stepMode
  // Web physics/chemistry boards use plain white paper, never a graph grid.
  grid.value=preferencesState.showGrid&&current.value?.scene.dimension===2&&!['physics','chemistry'].includes(problem.value.subject)
  saved.value=getSavedProblemIds().includes(problem.value.id)
  recordProblemOpen(problem.value.id)
})
function exit(){if(expanded.value){expanded.value=false;return}if(getCurrentPages().length>1)uni.navigateBack();else uni.switchTab({url:'/pages/plaza/index'})}
async function scrollTo(id:string){scrollTarget.value='';await nextTick();scrollTarget.value=id}
function openStep(index:number,scroll=false){
  if(!problem.value)return
  active.value=Math.max(0,Math.min(problem.value.steps.length-1,index));visited.value=Math.max(visited.value,active.value)
  selectedId.value='';selectedLabel.value='';keyboard.value=false;voice.cancel()
  if(scroll)void scrollTo('solution-board')
}
function selectObject(id:string,label:string){selectedId.value=id;selectedLabel.value=label}
function save(){if(problem.value)saved.value=toggleProblemSaved(problem.value.id)}
function previewFigure(){if(problem.value?.figure)uni.previewImage({urls:[problem.value.figure.imagePath]})}

const question=ref(''),cursor=ref(0),keyboard=ref(false),sending=ref(false),submitError=ref('')
const exchanges=ref<Array<{stepId:string;question:string;answer:string;appendix:string}>>([])
const visibleExchanges=computed(()=>exchanges.value.filter(e=>e.stepId===current.value?.id))
const voice=useSpokenFormulaVoice()
const {status,seconds,transcript,resolution,selectedCandidateIndex,selectedLatex,errorMessage,permissionRecoveryRequired}=voice
function input(event:any){question.value=event.detail.value;cursor.value=event.detail.cursor??question.value.length}
function rememberCursor(event:any){if(typeof event.detail.cursor==='number'&&event.detail.cursor>=0)cursor.value=event.detail.cursor}
function insert(key:{value:string;cursorBack?:number}){
  const position=Math.min(question.value.length,Math.max(0,cursor.value))
  question.value=(question.value.slice(0,position)+key.value+question.value.slice(position)).slice(0,4000)
  cursor.value=Math.min(question.value.length,position+key.value.length-(key.cursorBack??0))
}
function backspace(){if(cursor.value>0){question.value=question.value.slice(0,cursor.value-1)+question.value.slice(cursor.value);cursor.value--}}
function moveCursor(offset:number){cursor.value=Math.min(question.value.length,Math.max(0,cursor.value+offset))}
function toggleKeyboard(){keyboard.value=!keyboard.value;if(keyboard.value){voice.cancel();uni.hideKeyboard()}}
function startVoice(){keyboard.value=false;uni.hideKeyboard();if(voice.isListening.value){voice.stop();return}if(!voice.isBusy.value)void voice.start()}
function insertVoice(latex:string){insert({value:`$${latex.trim()}$`});voice.cancel()}
function clarify(option:SpokenFormulaClarificationOption){if(option.action==='useKeyboard'){voice.cancel();keyboard.value=true}else void voice.answerClarification(option)}
async function send(){
  const text=question.value.trim(),p=problem.value,s=current.value
  if(!text||!p||!s||sending.value||voice.isBusy.value)return
  sending.value=true;submitError.value=''
  try{
    const response=await productApi.submitFollowUp({question:text,context:{problemId:p.webId,solutionId:p.webId,
      stepId:s.id,stepTitle:s.title,stepSummary:[s.summary,s.detail,s.formula].filter(Boolean).join('\n'),
      whiteboardPageId:s.pageId,objectId:selectedId.value||undefined,objectTitle:selectedLabel.value||undefined}})
    exchanges.value.push({stepId:s.id,question:text,answer:response.answer,appendix:response.stepAppendix})
    if(question.value.trim()===text){question.value='';cursor.value=0}
    keyboard.value=false
  }catch(e){submitError.value=e instanceof Error?e.message:'答疑服务暂时不可用，请稍后重试。'}
  finally{sending.value=false}
}
onUnload(()=>voice.cancel())
</script>

<template>
  <view class="catalog-page" :style="{'--nav-top':navTop}">
    <view class="navigation">
      <button class="back-button" @tap="exit">← 退出解题</button>
      <view class="navigation-title">解题过程 <text class="navigation-count">{{ active+1 }} / {{ problem?.steps.length??0 }}</text></view>
      <button class="save-button" @tap="save">{{ saved?'已收藏':'收藏' }}</button>
    </view>
    <view v-if="missing" class="missing"><text>没有找到这道公开例题</text><button class="plain-button" @tap="exit">返回题目广场</button></view>
    <scroll-view v-if="problem !== null && current !== undefined" class="page-scroll" :scroll-y="!expanded" :scroll-into-view="scrollTarget" :scroll-with-animation="!preferencesState.reducedMotion">
      <view class="page-content">
        <view class="card question-card">
          <text class="eyebrow">题干</text><text class="problem-title">{{ problem.title }}</text>
          <CatalogText :value="problem.statement" :size="fontSize" />
          <image v-if="problem.figure" class="question-figure" :src="problem.figure.imagePath" mode="widthFix" @tap="previewFigure" />
          <text v-if="problem.figure?.caption" class="muted">{{ problem.figure.caption }} · 点击放大</text>
        </view>
        <view class="schema-row">
          <view class="schema-cell"><text class="eyebrow">题型</text><CatalogText :value="problem.problemType" :size="24" /></view>
          <view class="schema-cell"><text class="eyebrow">{{ problem.subject==='physics'?'本地判定':'目标' }}</text><CatalogText :value="problem.subject==='physics'?equilibriumLabel:problem.target.join('；')" :size="24" /></view>
        </view>
        <view v-if="problem.givens.length" class="card givens"><text class="eyebrow">已知条件</text><CatalogText v-for="(given,i) in problem.givens" :key="i" :value="given" :size="fontSize" /></view>
        <view v-if="problem.overview" class="card strategy"><text class="eyebrow">{{ strategyTitle }}</text><CatalogText :value="problem.overview" :size="fontSize" /></view>
        <view id="solution-board" class="board-anchor">
          <view class="board-section" :class="{'board-section--fullscreen':expanded}">
            <view class="board-toolbar"><view class="step-toggle" @tap="stepMode=!stepMode"><view class="toggle-dot" :class="{'toggle-dot--on':stepMode}" /><text>逐步展开</text></view><view class="board-actions"><button class="tool-button tool-button--accent" @tap="expanded=!expanded">{{ expanded?'收起 ×':'放大白板 ↗' }}</button></view></view>
            <scroll-view scroll-x class="step-tabs" :scroll-into-view="'tab-'+active" :scroll-with-animation="!preferencesState.reducedMotion">
              <view class="step-tabs-inner"><template v-for="(step,i) in problem.steps" :key="step.id"><view v-if="!stepMode||i<=visited" :id="'tab-'+i" class="step-tab" :class="{'step-tab--active':i===active}" @tap="openStep(i)"><text class="step-number">{{ i+1 }}</text><text>{{ step.title }}</text></view><view v-else-if="i===visited+1" :id="'tab-'+i" class="step-tab step-tab--next" @tap="openStep(i)">下一步 →</view></template></view>
            </scroll-view>
            <view class="board-drawing">
              <CatalogCanvas :scene="current.scene" v-model:show-grid="grid" :expanded="expanded" :selected="selectedId" @select="selectObject" />
              <view v-if="selectedInspection" class="object-inspector-layer" @tap.stop>
                <CatalogObjectInspector :inspection="selectedInspection" @close="selectObject('','')" />
              </view>
            </view>
            <view class="board-caption"><CatalogText :value="current.caption" :size="23" /></view>
            <view class="step-navigation"><button class="plain-button" :disabled="active===0" @tap="openStep(active-1)">← 上一步</button><text class="muted">插图 {{ active+1 }} / {{ problem.steps.length }}</text><button class="plain-button plain-button--accent" :disabled="active===problem.steps.length-1" @tap="openStep(active+1)">下一步 →</button></view>
          </view>
        </view>
        <view class="article-heading">解题过程</view>
        <view v-for="(step,i) in problem.steps" :id="'reasoning-'+i" :key="step.id" class="card reasoning-card" :class="{'reasoning-card--active':i===active}">
          <view class="reasoning-title"><text class="reasoning-number">{{ String(i+1).padStart(2,'0') }}</text><CatalogText :value="step.title" :size="31" /></view>
          <view class="step-summary"><CatalogText :value="step.summary" :size="fontSize" /></view>
          <CatalogText v-if="step.detail" :value="step.detail" :size="fontSize" />
          <view v-if="step.formula" class="formula-box"><CatalogText :value="step.formula" :size="fontSize" /></view>
          <button class="figure-link" @tap="openStep(i,true)">↗ 查看{{ problem.subject==='chemistry'?'结构图':'插图' }} · {{ step.title }}</button>
          <template v-for="(exchange,j) in exchanges" :key="j"><view v-if="exchange.stepId===step.id&&exchange.appendix" class="appendix"><text class="eyebrow">答疑补充</text><CatalogText :value="exchange.appendix" :size="fontSize" /></view></template>
        </view>
        <view v-if="problem.answer" class="card answer-box"><text class="eyebrow">结论</text><CatalogText :value="problem.answer" :size="fontSize" /></view>
        <view id="step-follow-up" class="follow-up">
          <text class="article-heading">步骤答疑</text><text class="follow-up-context">当前步骤：{{ current.title }}</text>
          <text v-if="selectedId" class="follow-up-context">图中对象：{{ selectedLabel }}</text>
          <text v-if="!visibleExchanges.length" class="follow-up-empty">围绕这一页的题意、图形关系或解题步骤继续提问。</text>
          <view v-for="(exchange,i) in visibleExchanges" :key="i" class="exchange"><view class="exchange-question"><CatalogText :value="exchange.question" :size="fontSize" /></view><CatalogText :value="exchange.answer" :size="fontSize" /></view>
          <MiniFormulaVoicePanel v-if="status!=='idle'" :status="status" :seconds="seconds" :transcript="transcript" :resolution="resolution" :selected-candidate-index="selectedCandidateIndex" :selected-latex="selectedLatex" :error-message="errorMessage" :permission-recovery-required="permissionRecoveryRequired" show-keyboard-action @stop="voice.stop" @cancel="voice.cancel" @retry="voice.retry" @relisten="voice.start()" @clarify="clarify" @select="voice.selectCandidate" @insert="insertVoice" />
          <view class="composer"><input class="composer-input" :value="question" :cursor="cursor" :selection-start="cursor" :selection-end="cursor" :disabled="keyboard" maxlength="4000" confirm-type="send" placeholder="就当前图解提问…" @input="input" @blur="rememberCursor" @confirm="send" /><view class="composer-actions"><button class="composer-tool" @tap="toggleKeyboard">𝑓x</button><button class="composer-tool" @tap="startVoice">语音</button><button class="send-button" :disabled="!question.trim()||sending" @tap="send">{{ sending?'…':'↑' }}</button></view></view>
          <MiniFormulaKeyboard v-if="keyboard" @insert="insert" @move="moveCursor" @backspace="backspace" @done="keyboard=false" />
          <text v-if="submitError" class="submit-error">{{ submitError }}（输入内容已保留）</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.catalog-page{height:100vh;display:flex;flex-direction:column;background:#f6f8fb;color:#27364d;overflow:hidden}
.navigation{padding:calc(var(--nav-top)) 24rpx 14rpx;display:flex;align-items:center;gap:12rpx;background:#fff;border-bottom:1px solid #e9edf4;flex-shrink:0}
.back-button,.save-button,.tool-button,.plain-button,.composer-tool,.send-button,.figure-link{margin:0;border-radius:16rpx;font-size:24rpx;line-height:1.5;background:#fff;color:#526581}
.back-button{padding:10rpx 16rpx;border:1px solid #e0e7f0;box-shadow:0 3rpx 8rpx #27364d08}
.navigation-title{flex:1;text-align:center;font-size:28rpx;font-weight:600}.navigation-count{font-size:20rpx;color:#95a2b6;font-weight:400}
.save-button{padding:10rpx 4rpx;color:#3974e8;min-width:75rpx}
.back-button::after,.save-button::after,.tool-button::after,.plain-button::after,.composer-tool::after,.send-button::after,.figure-link::after{border:0}
.page-scroll{flex:1;min-height:0;height:0}
.page-content{padding:24rpx 24rpx calc(45rpx + env(safe-area-inset-bottom))}
.card{padding:25rpx;border:1px solid #e3e9f2;border-radius:24rpx;background:#fff;margin-bottom:20rpx;box-shadow:0 3rpx 10rpx #27364d03}
.eyebrow{display:block;font-size:22rpx;color:#8b9aaf;font-weight:600;margin-bottom:12rpx;letter-spacing:1rpx}
.problem-title{display:block;font-size:33rpx;font-weight:650;margin-bottom:18rpx;color:#172b49}
.question-figure{display:block;width:100%;margin:22rpx auto 10rpx;border-radius:10rpx}
.schema-row{display:flex;gap:16rpx;margin-bottom:20rpx}.schema-cell{flex:1;min-width:0;padding:22rpx;background:#fff;border:1px solid #e0e7f1;border-radius:20rpx;color:#183252}
.strategy{background:#f0f5fd;border-color:#dce8fa}.strategy .eyebrow{color:#5a80b7}
.givens{background:#fafbfd}.board-anchor{margin-bottom:30rpx}.board-section{background:#fff;border:1px solid #dfe7f2;border-radius:24rpx;padding:16rpx;box-shadow:0 6rpx 20rpx #27364d05}
.board-toolbar{display:flex;align-items:center;justify-content:space-between;gap:8rpx;margin-bottom:20rpx}
.step-toggle{display:flex;align-items:center;gap:10rpx;font-size:22rpx;color:#5f7595}.toggle-dot{width:42rpx;height:24rpx;background:#d1d9e5;border-radius:20rpx;position:relative}.toggle-dot::after{content:'';position:absolute;left:3rpx;top:3rpx;width:18rpx;height:18rpx;border-radius:50%;background:#fff}.toggle-dot--on{background:#ee7144}.toggle-dot--on::after{left:21rpx}
.board-actions{display:flex;gap:10rpx}.tool-button{font-size:21rpx;padding:10rpx 12rpx;background:#f6f8fc}.tool-button--accent{color:#3974e8;background:#eef4ff}
.step-tabs{width:100%;white-space:nowrap;margin-bottom:16rpx}.step-tabs-inner{display:inline-flex;gap:12rpx;min-width:100%}.step-tab{display:inline-flex;align-items:center;gap:12rpx;padding:17rpx 20rpx;border:1px solid #dfe7f2;border-radius:17rpx;font-size:25rpx;color:#526581;white-space:nowrap;background:#fafbfd;flex-shrink:0}.step-tab--active{background:#edf5ff;border-color:#92bafa;box-shadow:inset 0 -5rpx 0 #2f72bd;color:#1762ac;font-weight:600}.step-tab--next{color:#cf6840;border:1px dashed #efad94;background:#fff5ef}.step-number{font-size:21rpx;color:#829ab8}
.board-caption{padding:16rpx 7rpx 12rpx;color:#7e8da2}.step-navigation{display:flex;justify-content:space-between;align-items:center;gap:12rpx;padding-top:8rpx}.plain-button{padding:12rpx 20rpx;background:#f7f9fc}.plain-button--accent{color:#3974e8;background:#eef4ff}.plain-button[disabled]{color:#b7c0cc;background:#fafbfd}
.muted{font-size:22rpx;color:#94a0b2}.board-drawing{position:relative}.object-inspector-layer{position:absolute;z-index:12;left:20rpx;right:20rpx;bottom:100rpx;height:58%;max-height:600rpx}
.board-section--fullscreen{position:fixed;z-index:40;left:0;right:0;top:var(--nav-top);bottom:0;border:0;border-radius:0;display:flex;flex-direction:column;padding:20rpx 16rpx calc(16rpx + env(safe-area-inset-bottom));box-sizing:border-box}.board-section--fullscreen .board-drawing{flex:1;min-height:0}.board-section--fullscreen .board-caption{max-height:130rpx;overflow:auto}
.article-heading{display:block;font-size:36rpx;font-weight:700;color:#172b49;margin:28rpx 0 22rpx}.reasoning-card--active{border-color:#adcafa}.reasoning-title{display:flex;gap:13rpx;align-items:baseline;color:#256cc1;font-weight:650;margin-bottom:15rpx}.reasoning-number{color:#9bb5d9;font-size:22rpx;font-weight:500}.step-summary{font-weight:600;margin-bottom:8rpx}
.formula-box{background:#edf4ff;color:#2c66b5;padding:18rpx;border-radius:16rpx;margin-top:16rpx;overflow-x:auto}.figure-link{display:inline-block;max-width:100%;box-sizing:border-box;text-align:left;white-space:normal;padding:11rpx 20rpx;color:#e57848;border:1px solid #ffc6af;margin-top:22rpx;border-radius:30rpx;font-size:23rpx}
.answer-box{background:#fff7f2;border-color:#f7c7b3;color:#ab6445;font-weight:600}.answer-box .eyebrow{color:#b77b60}.appendix{border-left:4rpx solid #bbd1ef;margin-top:20rpx;padding:10rpx 20rpx;background:#f6f9fe}
.follow-up{padding:25rpx 0 20rpx}.follow-up-context{display:block;font-size:25rpx;color:#7a8ba3;line-height:1.8;margin-bottom:12rpx}.follow-up-empty{display:block;font-size:27rpx;line-height:1.9;color:#788aa4;margin:25rpx 0 35rpx}.composer{display:flex;align-items:center;gap:8rpx;border:1px solid #d9e2ef;border-radius:48rpx;background:#fff;padding:10rpx 12rpx 10rpx 24rpx;box-shadow:0 8rpx 30rpx #27364d07}.composer-input{flex:1;min-width:0;font-size:27rpx;height:70rpx}.composer-actions{display:flex;gap:6rpx;align-items:center}.composer-tool{font-size:23rpx;padding:10rpx;color:#637b9b}.send-button{width:64rpx;height:64rpx;line-height:64rpx;border-radius:50%;background:#3974e8;color:#fff;padding:0;font-size:40rpx}.send-button[disabled]{background:#a5afbd;color:#fff}.submit-error{display:block;padding:18rpx 5rpx;font-size:24rpx;color:#b75a44;line-height:1.7}.exchange{margin:20rpx 0;padding:22rpx;background:#fff;border-radius:20rpx}.exchange-question{padding:15rpx 18rpx;background:#edf4ff;border-radius:16rpx;margin-bottom:18rpx}.missing{padding:100rpx 40rpx;text-align:center;line-height:3}
</style>
