<script setup lang="ts">
import { computed, ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import ProblemCard from '../../components/library/ProblemCard.vue'
import { resolveCustomNavigationTop } from '../../utils/layout'
import {
  PUBLIC_PROBLEMS,
  SUBJECT_OPTIONS,
  buildSolverUrl,
  getSavedProblemIds,
  recordProblemOpen,
  setProblemSaved,
  type ProblemPreview,
  type ProblemSubject,
} from '../../data/problems'

interface SubjectCapability {
  id: ProblemSubject | 'biology'
  name: string
  topic: string
  description: string
  mark: string
  tone: string
  status: 'ready' | 'planned'
}

const capabilities: SubjectCapability[] = [
  {
    id: 'math',
    name: '数学',
    topic: '函数 · 几何',
    description: '拖动关键点，让公式、曲线与空间关系同步变化。',
    mark: 'ƒ(x)',
    tone: 'blue',
    status: 'ready',
  },
  {
    id: 'physics',
    name: '物理',
    topic: '受力 · 运动',
    description: '拆分力与运动过程，逐帧核对方向和数量关系。',
    mark: 'F',
    tone: 'orange',
    status: 'ready',
  },
  {
    id: 'chemistry',
    name: '化学',
    topic: '结构 · 反应',
    description: '观察粒子连接与反应进程，把微观变化画出来。',
    mark: 'CH₃',
    tone: 'rose',
    status: 'ready',
  },
  {
    id: 'biology',
    name: '生物',
    topic: '细胞 · 遗传',
    description: '用过程图串联物质流动、能量转化和遗传关系。',
    mark: 'DNA',
    tone: 'green',
    status: 'planned',
  },
]

const search = ref('')
const selectedSubject = ref<ProblemSubject | 'all'>('all')
const savedIds = ref<string[]>([])
const pageStyle = { paddingTop: resolveCustomNavigationTop() }

const normalizedSearch = computed(() => search.value.trim().toLocaleLowerCase())
const filteredProblems = computed(() => PUBLIC_PROBLEMS.filter((problem) => {
  const subjectMatches = selectedSubject.value === 'all' || problem.subject === selectedSubject.value
  const keywordMatches = !normalizedSearch.value || [
    problem.title,
    problem.excerpt,
    problem.subjectLabel,
    problem.grade,
  ].join(' ').toLocaleLowerCase().includes(normalizedSearch.value)
  return subjectMatches && keywordMatches
}))

const isSaved = (problemId: string) => savedIds.value.includes(problemId)

const refreshSaved = () => {
  savedIds.value = getSavedProblemIds()
}

const toggleSave = (problem: ProblemPreview) => {
  const nextSaved = !isSaved(problem.id)
  savedIds.value = setProblemSaved(problem.id, nextSaved)
  uni.showToast({
    title: nextSaved ? '已加入收藏' : '已取消收藏',
    icon: 'none',
    duration: 1200,
  })
}

const openProblem = (problem: ProblemPreview) => {
  recordProblemOpen(problem.id)
  uni.navigateTo({ url: buildSolverUrl(problem) })
}

const selectCapability = (capability: SubjectCapability) => {
  if (capability.status === 'planned' || capability.id === 'biology') {
    uni.showToast({ title: '生物动态图解正在规划中', icon: 'none' })
    return
  }
  selectedSubject.value = capability.id
}

const clearFilters = () => {
  search.value = ''
  selectedSubject.value = 'all'
}

onShow(refreshSaved)
onPullDownRefresh(() => {
  refreshSaved()
  uni.stopPullDownRefresh()
})
</script>

<template>
  <view class="plaza-page" :style="pageStyle">
    <view class="page-header">
      <view class="page-eyebrow">
        <view class="eyebrow-dot" />
        <text>可交互例题库</text>
      </view>
      <text class="page-title">题目广场</text>
      <text class="page-intro">从一道准备好的例题开始，边看推理，边操作图解。</text>
    </view>

    <view class="section-heading">
      <view>
        <text class="section-title">学科动态图解</text>
        <text class="section-subtitle">先了解每个学科的画板能做什么</text>
      </view>
      <text class="section-count">4 个学科</text>
    </view>

    <scroll-view class="capability-scroll" scroll-x :show-scrollbar="false">
      <view class="capability-track">
        <view
          v-for="capability in capabilities"
          :key="capability.id"
          :class="[
            'capability-card',
            `capability-card--${capability.tone}`,
            { 'capability-card--selected': selectedSubject === capability.id },
          ]"
          role="button"
          :aria-label="`${capability.name}：${capability.description}`"
          hover-class="capability-card--pressed"
          @tap="selectCapability(capability)"
        >
          <view class="capability-top">
            <view class="capability-mark"><text>{{ capability.mark }}</text></view>
            <text v-if="capability.status === 'planned'" class="planned-tag">规划中</text>
            <view v-else class="ready-tag"><view />可操作</view>
          </view>
          <text class="capability-name">{{ capability.name }}</text>
          <text class="capability-topic">{{ capability.topic }}</text>
          <text class="capability-description">{{ capability.description }}</text>
          <view class="capability-action">
            <text>{{ capability.status === 'ready' ? '筛选例题' : '敬请期待' }}</text>
            <text v-if="capability.status === 'ready'">→</text>
          </view>
        </view>
      </view>
    </scroll-view>

    <view class="library-panel">
      <view class="search-field">
        <view class="search-icon" />
        <input
          v-model="search"
          class="search-input"
          type="text"
          confirm-type="search"
          placeholder="搜索题目或知识点"
          placeholder-class="search-placeholder"
        >
        <text v-if="search" class="clear-search" role="button" @tap="search = ''">清除</text>
      </view>

      <scroll-view class="filter-scroll" scroll-x :show-scrollbar="false">
        <view class="filter-track">
          <view
            v-for="subject in SUBJECT_OPTIONS"
            :key="subject.value"
            :class="['filter-chip', { 'filter-chip--active': selectedSubject === subject.value }]"
            role="button"
            @tap="selectedSubject = subject.value"
          >
            <text>{{ subject.label }}</text>
          </view>
        </view>
      </scroll-view>
    </view>

    <view class="result-heading">
      <view>
        <text class="result-title">公开例题</text>
        <text class="result-description">每道题都准备了完整步骤与对应画板</text>
      </view>
      <text class="result-count">{{ filteredProblems.length }} 道</text>
    </view>

    <view v-if="filteredProblems.length" class="problem-grid">
      <view v-for="problem in filteredProblems" :key="problem.id" class="problem-grid__item">
        <ProblemCard
          :problem="problem"
          :saved="isSaved(problem.id)"
          @open="openProblem"
          @toggle-save="toggleSave"
        />
      </view>
    </view>

    <view v-else class="empty-state">
      <view class="empty-illustration">
        <view class="empty-search-ring" />
        <view class="empty-search-handle" />
        <view class="empty-line empty-line--one" />
        <view class="empty-line empty-line--two" />
      </view>
      <text class="empty-title">没有匹配的例题</text>
      <text class="empty-description">试试其他关键词，或清除当前学科筛选。</text>
      <button class="empty-button" hover-class="empty-button--pressed" @tap="clearFilters">查看全部题目</button>
    </view>

    <view class="page-bottom-space" />
  </view>
</template>

<style scoped>
.plaza-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 0 28rpx;
  color: #1f2937;
  background: #f7f8fa;
}

.page-header { padding: 5rpx 2rpx 34rpx; }

.page-eyebrow {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 13rpx;
  color: #3974e8;
  font-size: 22rpx;
  font-weight: 750;
  letter-spacing: 1.5rpx;
}

.eyebrow-dot {
  width: 12rpx;
  height: 12rpx;
  border: 5rpx solid #dce9ff;
  border-radius: 50%;
  background: #3974e8;
}

.page-title {
  display: block;
  color: #182234;
  font-size: 52rpx;
  font-weight: 780;
  line-height: 1.16;
  letter-spacing: -1.5rpx;
}

.page-intro {
  display: block;
  margin-top: 15rpx;
  color: #758194;
  font-size: 26rpx;
  line-height: 1.65;
}

.section-heading,
.result-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20rpx;
  padding: 0 2rpx;
}

.section-title,
.result-title {
  display: block;
  color: #253144;
  font-size: 31rpx;
  font-weight: 760;
  line-height: 1.3;
}

.section-subtitle,
.result-description {
  display: block;
  margin-top: 7rpx;
  color: #929ba8;
  font-size: 22rpx;
  line-height: 1.4;
}

.section-count,
.result-count {
  flex: none;
  padding-bottom: 3rpx;
  color: #9aa3b0;
  font-size: 21rpx;
}

.capability-scroll {
  width: calc(100% + 56rpx);
  margin: 22rpx -28rpx 34rpx;
  white-space: nowrap;
}

.capability-track {
  display: inline-flex;
  gap: 18rpx;
  padding: 0 28rpx 8rpx;
}

.capability-card {
  width: 300rpx;
  min-height: 302rpx;
  display: inline-flex;
  flex-direction: column;
  box-sizing: border-box;
  padding: 22rpx;
  overflow: hidden;
  white-space: normal;
  border: 2rpx solid #dce7f9;
  border-radius: 28rpx;
  background: linear-gradient(145deg, #edf4ff, #fff);
  box-shadow: 0 12rpx 28rpx rgba(41, 67, 103, .045);
  transition: transform 100ms ease;
}

.capability-card--orange { border-color: #f3dfd2; background: linear-gradient(145deg, #fff1e8, #fff); }
.capability-card--rose { border-color: #f1dce3; background: linear-gradient(145deg, #fff0f4, #fff); }
.capability-card--green { border-color: #d7e9e3; background: linear-gradient(145deg, #ebf8f3, #fff); }
.capability-card--selected { border-color: #83aaf0; box-shadow: 0 12rpx 30rpx rgba(57, 116, 232, .11); }
.capability-card--pressed { transform: scale(.975); }

.capability-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18rpx;
}

.capability-mark {
  min-width: 62rpx;
  height: 54rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 0 10rpx;
  color: #3974e8;
  font-size: 23rpx;
  font-weight: 800;
  border: 2rpx solid rgba(57, 116, 232, .12);
  border-radius: 16rpx;
  background: rgba(255, 255, 255, .78);
}

.capability-card--orange .capability-mark { color: #c46834; border-color: rgba(232, 121, 61, .15); }
.capability-card--rose .capability-mark { color: #c14c69; border-color: rgba(216, 93, 117, .15); }
.capability-card--green .capability-mark { color: #27816f; border-color: rgba(43, 159, 136, .15); }

.ready-tag,
.planned-tag {
  display: flex;
  align-items: center;
  gap: 7rpx;
  padding: 8rpx 12rpx;
  color: #517092;
  font-size: 19rpx;
  font-weight: 700;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, .72);
}

.ready-tag view {
  width: 9rpx;
  height: 9rpx;
  border-radius: 50%;
  background: #35aa82;
}

.planned-tag { color: #8c7e93; }

.capability-name {
  color: #243044;
  font-size: 30rpx;
  font-weight: 780;
}

.capability-topic {
  margin-top: 5rpx;
  color: #66748a;
  font-size: 22rpx;
  font-weight: 650;
}

.capability-description {
  display: -webkit-box;
  margin-top: 14rpx;
  overflow: hidden;
  color: #7f8a9a;
  font-size: 22rpx;
  line-height: 1.52;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.capability-action {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-top: auto;
  padding-top: 14rpx;
  color: #3974e8;
  font-size: 21rpx;
  font-weight: 750;
}

.capability-card--orange .capability-action { color: #ca6934; }
.capability-card--rose .capability-action { color: #c14e69; }
.capability-card--green .capability-action { color: #27816f; }

.library-panel {
  overflow: hidden;
  padding: 14rpx;
  border: 2rpx solid #e5e9ef;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, .94);
  box-shadow: 0 12rpx 30rpx rgba(31, 41, 55, .045);
}

.search-field {
  height: 76rpx;
  display: flex;
  align-items: center;
  padding: 0 19rpx;
  border-radius: 19rpx;
  background: #f5f7f9;
}

.search-icon {
  position: relative;
  width: 24rpx;
  height: 24rpx;
  flex: none;
  box-sizing: border-box;
  margin-right: 18rpx;
  border: 4rpx solid #8d98a8;
  border-radius: 50%;
}

.search-icon::after {
  position: absolute;
  right: -10rpx;
  bottom: -7rpx;
  width: 12rpx;
  height: 4rpx;
  content: '';
  border-radius: 99rpx;
  background: #8d98a8;
  transform: rotate(45deg);
}

.search-input {
  min-width: 0;
  height: 76rpx;
  flex: 1;
  color: #2d394b;
  font-size: 25rpx;
}

.search-placeholder { color: #a1a9b4; }

.clear-search {
  flex: none;
  padding: 13rpx 4rpx 13rpx 18rpx;
  color: #3974e8;
  font-size: 21rpx;
  font-weight: 700;
}

.filter-scroll {
  width: 100%;
  margin-top: 12rpx;
  white-space: nowrap;
}

.filter-track {
  display: inline-flex;
  gap: 8rpx;
  padding: 2rpx;
}

.filter-chip {
  min-width: 92rpx;
  height: 60rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 0 23rpx;
  color: #7f8998;
  font-size: 23rpx;
  font-weight: 680;
  border-radius: 17rpx;
}

.filter-chip--active {
  color: #1769da;
  background: #edf4ff;
}

.result-heading { margin: 36rpx 0 20rpx; }

.problem-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 22rpx;
}

.problem-grid__item { width: 100%; }

.empty-state {
  display: flex;
  align-items: center;
  flex-direction: column;
  margin-top: 18rpx;
  padding: 65rpx 32rpx 60rpx;
  text-align: center;
  border: 2rpx dashed #d6dde7;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, .68);
}

.empty-illustration {
  position: relative;
  width: 126rpx;
  height: 112rpx;
}

.empty-search-ring {
  position: absolute;
  top: 6rpx;
  left: 19rpx;
  width: 65rpx;
  height: 65rpx;
  box-sizing: border-box;
  border: 9rpx solid #8bb1f0;
  border-radius: 50%;
}

.empty-search-handle {
  position: absolute;
  top: 68rpx;
  left: 78rpx;
  width: 42rpx;
  height: 9rpx;
  border-radius: 99rpx;
  background: #8bb1f0;
  transform: rotate(46deg);
}

.empty-line {
  position: absolute;
  left: 7rpx;
  height: 6rpx;
  border-radius: 99rpx;
  background: #dce6f5;
}

.empty-line--one { bottom: 12rpx; width: 48rpx; }
.empty-line--two { bottom: 0; width: 75rpx; }

.empty-title {
  margin-top: 10rpx;
  color: #2b3749;
  font-size: 31rpx;
  font-weight: 760;
}

.empty-description {
  margin-top: 12rpx;
  color: #8d97a5;
  font-size: 24rpx;
  line-height: 1.6;
}

.empty-button {
  height: 72rpx;
  margin: 26rpx 0 0;
  padding: 0 28rpx;
  color: #fff;
  font-size: 24rpx;
  font-weight: 750;
  line-height: 72rpx;
  border-radius: 18rpx;
  background: #3974e8;
  box-shadow: 0 10rpx 22rpx rgba(57, 116, 232, .19);
}

.empty-button::after { border: 0; }
.empty-button--pressed { opacity: .86; }

.page-bottom-space { height: calc(150rpx + env(safe-area-inset-bottom)); }

@media (min-width: 768px) {
  .plaza-page { padding-right: 44rpx; padding-left: 44rpx; }
  .capability-scroll { width: calc(100% + 88rpx); margin-right: -44rpx; margin-left: -44rpx; }
  .capability-track { padding-right: 44rpx; padding-left: 44rpx; }
  .capability-card { width: 270rpx; }
  .problem-grid__item { width: calc(50% - 11rpx); }
}
</style>
