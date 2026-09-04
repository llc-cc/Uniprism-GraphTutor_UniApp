<script setup lang="ts">
import { computed, ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import ProblemCard from '../../components/library/ProblemCard.vue'
import { resolveCustomNavigationTop } from '../../utils/layout'
import {
  DEMO_RECORD_PROBLEMS,
  PUBLIC_PROBLEMS,
  SUBJECT_OPTIONS,
  buildSolverUrl,
  formatOpenedAt,
  getLocalProblemPreviews,
  getRecentProblemRecords,
  getSavedProblemIds,
  recordProblemOpen,
  setProblemSaved,
  type ProblemPreview,
  type ProblemSubject,
  type RecentProblemRecord,
} from '../../data/problems'

type HistoryTab = 'saved' | 'recent'

interface RecordRow {
  problem: ProblemPreview
  openedLabel: string
  demo: boolean
}

const historyTab = ref<HistoryTab>('saved')
const search = ref('')
const selectedSubject = ref<ProblemSubject | 'all'>('all')
const showDemo = ref(false)
const savedIds = ref<string[]>([])
const recentRecords = ref<RecentProblemRecord[]>([])
const localProblems = ref<ProblemPreview[]>([])
const pageStyle = { paddingTop: resolveCustomNavigationTop() }

const problemById = computed(() => new Map(
  [...localProblems.value, ...PUBLIC_PROBLEMS].map((problem) => [problem.id, problem]),
))

const savedRows = computed<RecordRow[]>(() => savedIds.value
  .map((id) => problemById.value.get(id))
  .filter((problem): problem is ProblemPreview => Boolean(problem))
  .map((problem) => ({
    problem,
    openedLabel: '已收藏到本机',
    demo: false,
  })))

const recentRows = computed<RecordRow[]>(() => recentRecords.value
  .map((record) => {
    const problem = problemById.value.get(record.id)
    return problem ? {
      problem,
      openedLabel: formatOpenedAt(record.openedAt),
      demo: false,
    } : undefined
  })
  .filter((row): row is RecordRow => Boolean(row)))

const demoSavedRows = computed<RecordRow[]>(() => DEMO_RECORD_PROBLEMS.slice(0, 2).map((problem) => ({
  problem,
  openedLabel: '演示收藏记录',
  demo: true,
})))

const demoRecentLabels = ['刚刚查看（演示）', '昨天查看（演示）', '3 天前查看（演示）']
const demoRecentRows = computed<RecordRow[]>(() => DEMO_RECORD_PROBLEMS.map((problem, index) => ({
  problem,
  openedLabel: demoRecentLabels[index] || '最近查看（演示）',
  demo: true,
})))

const personalRows = computed(() => historyTab.value === 'saved' ? savedRows.value : recentRows.value)
const sourceRows = computed(() => {
  if (!showDemo.value) return personalRows.value
  return historyTab.value === 'saved' ? demoSavedRows.value : demoRecentRows.value
})

const normalizedSearch = computed(() => search.value.trim().toLocaleLowerCase())
const filteredRows = computed(() => sourceRows.value.filter(({ problem }) => {
  const subjectMatches = selectedSubject.value === 'all' || problem.subject === selectedSubject.value
  const keywordMatches = !normalizedSearch.value || [
    problem.title,
    problem.excerpt,
    problem.subjectLabel,
    problem.grade,
  ].join(' ').toLocaleLowerCase().includes(normalizedSearch.value)
  return subjectMatches && keywordMatches
}))

const savedCount = computed(() => savedRows.value.length)
const recentCount = computed(() => recentRows.value.length)
const hasFilters = computed(() => Boolean(search.value.trim()) || selectedSubject.value !== 'all')
const isSaved = (problemId: string) => savedIds.value.includes(problemId)

const refreshRecords = () => {
  localProblems.value = getLocalProblemPreviews()
  savedIds.value = getSavedProblemIds()
  recentRecords.value = getRecentProblemRecords()
}

const toggleDemo = () => {
  showDemo.value = !showDemo.value
  search.value = ''
  selectedSubject.value = 'all'
}

const toggleSave = (problem: ProblemPreview) => {
  if (showDemo.value) {
    uni.showToast({ title: '演示记录不会修改本机收藏', icon: 'none' })
    return
  }

  const nextSaved = !isSaved(problem.id)
  savedIds.value = setProblemSaved(problem.id, nextSaved)
  uni.showToast({
    title: nextSaved ? '已加入收藏' : '已取消收藏',
    icon: 'none',
    duration: 1200,
  })
}

const openProblem = (problem: ProblemPreview) => {
  if (!showDemo.value) recentRecords.value = recordProblemOpen(problem.id)
  uni.navigateTo({ url: buildSolverUrl(problem) })
}

const clearFilters = () => {
  search.value = ''
  selectedSubject.value = 'all'
}

const goToPlaza = () => {
  uni.switchTab({ url: '/pages/plaza/index' })
}

onShow(refreshRecords)
onPullDownRefresh(() => {
  refreshRecords()
  uni.stopPullDownRefresh()
})
</script>

<template>
  <view class="records-page" :style="pageStyle">
    <view class="page-header">
      <view class="header-copy">
        <view class="page-eyebrow">
          <view class="eyebrow-dot" />
          <text>保存在当前设备</text>
        </view>
        <text class="page-title">我的记录</text>
        <text class="page-intro">重新打开收藏或最近看过的题，继续上次的思路。</text>
      </view>
      <button
        class="demo-toggle"
        :class="{ 'demo-toggle--active': showDemo }"
        hover-class="demo-toggle--pressed"
        @tap="toggleDemo"
      >
        {{ showDemo ? '返回我的记录' : '查看演示记录' }}
      </button>
    </view>

    <view v-if="showDemo" class="demo-notice">
      <view class="notice-mark"><text>i</text></view>
      <view class="notice-copy">
        <text class="notice-title">当前正在查看演示数据</text>
        <text class="notice-description">它只用于预览记录页效果，不会冒充你的个人历史。</text>
      </view>
      <text class="notice-close" role="button" aria-label="关闭演示记录" @tap="toggleDemo">×</text>
    </view>

    <view class="records-panel">
      <view class="history-tabs">
        <view
          :class="['history-tab', { 'history-tab--active': historyTab === 'saved' }]"
          role="button"
          @tap="historyTab = 'saved'"
        >
          <text>收藏</text>
          <text class="tab-count">{{ showDemo ? demoSavedRows.length : savedCount }}</text>
        </view>
        <view
          :class="['history-tab', { 'history-tab--active': historyTab === 'recent' }]"
          role="button"
          @tap="historyTab = 'recent'"
        >
          <text>最近浏览</text>
          <text class="tab-count">{{ showDemo ? demoRecentRows.length : recentCount }}</text>
        </view>
      </view>

      <view class="search-field">
        <view class="search-icon" />
        <input
          v-model="search"
          class="search-input"
          type="text"
          confirm-type="search"
          placeholder="搜索我的题目"
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
        <text class="result-title">{{ historyTab === 'saved' ? '收藏的题目' : '最近看过' }}</text>
        <text class="result-description">
          {{ showDemo ? '演示记录不会写入你的历史' : historyTab === 'saved' ? '收藏后可从这里快速返回' : '按最近打开时间排列' }}
        </text>
      </view>
      <text class="result-count">{{ filteredRows.length }} 道</text>
    </view>

    <view v-if="filteredRows.length" class="problem-grid">
      <view v-for="row in filteredRows" :key="row.problem.id" class="problem-grid__item">
        <ProblemCard
          :problem="row.problem"
          :saved="isSaved(row.problem.id)"
          :show-difficulty="false"
          :opened-label="row.openedLabel"
          :demo="row.demo"
          @open="openProblem"
          @toggle-save="toggleSave"
        />
      </view>
    </view>

    <view v-else class="empty-state">
      <view class="empty-visual" :class="{ 'empty-visual--recent': historyTab === 'recent' }">
        <view v-if="historyTab === 'saved'" class="empty-bookmark" />
        <template v-else>
          <view class="empty-clock-ring" />
          <view class="empty-clock-hand empty-clock-hand--hour" />
          <view class="empty-clock-hand empty-clock-hand--minute" />
        </template>
        <view class="empty-spark empty-spark--one" />
        <view class="empty-spark empty-spark--two" />
      </view>

      <template v-if="hasFilters || showDemo">
        <text class="empty-title">没有匹配的记录</text>
        <text class="empty-description">换一个关键词，或清除当前的学科筛选。</text>
        <button class="primary-button" hover-class="primary-button--pressed" @tap="clearFilters">清除筛选</button>
      </template>
      <template v-else-if="historyTab === 'recent'">
        <text class="empty-title">还没有浏览记录</text>
        <text class="empty-description">从题目广场打开一个例题后，它会真实地出现在这里。</text>
        <button class="primary-button" hover-class="primary-button--pressed" @tap="goToPlaza">去题目广场</button>
        <text class="secondary-action" role="button" @tap="toggleDemo">先看演示效果</text>
      </template>
      <template v-else>
        <text class="empty-title">还没有收藏题目</text>
        <text class="empty-description">在题目广场点亮收藏，就能在这里继续学习。</text>
        <button class="primary-button" hover-class="primary-button--pressed" @tap="goToPlaza">发现例题</button>
        <text class="secondary-action" role="button" @tap="toggleDemo">查看演示记录</text>
      </template>
    </view>

    <view class="privacy-note">
      <view class="privacy-shield"><view /></view>
      <text>登录服务接入前，收藏与浏览记录仅保存在这台设备。</text>
    </view>

    <view class="page-bottom-space" />
  </view>
</template>

<style scoped>
.records-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding: 0 28rpx;
  color: #1f2937;
  background: #f7f8fa;
}

.page-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20rpx;
  padding: 5rpx 2rpx 30rpx;
}

.header-copy { min-width: 0; }

.page-eyebrow {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 13rpx;
  color: #3974e8;
  font-size: 22rpx;
  font-weight: 750;
  letter-spacing: 1rpx;
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
  max-width: 500rpx;
  margin-top: 15rpx;
  color: #758194;
  font-size: 25rpx;
  line-height: 1.6;
}

.demo-toggle {
  min-width: 172rpx;
  height: 65rpx;
  flex: none;
  margin: 0 0 4rpx;
  padding: 0 18rpx;
  color: #3974e8;
  font-size: 22rpx;
  font-weight: 750;
  line-height: 65rpx;
  border: 2rpx solid #d9e5fa;
  border-radius: 18rpx;
  background: #fff;
}

.demo-toggle::after { border: 0; }
.demo-toggle--active { color: #6b56b6; border-color: #e1daf7; background: #f7f4ff; }
.demo-toggle--pressed { opacity: .78; }

.demo-notice {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-bottom: 20rpx;
  padding: 19rpx 20rpx;
  border: 2rpx solid #e3dcf7;
  border-radius: 22rpx;
  background: #f7f4ff;
}

.notice-mark {
  width: 42rpx;
  height: 42rpx;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-family: serif;
  font-size: 23rpx;
  font-weight: 800;
  border-radius: 50%;
  background: #8065d4;
}

.notice-copy { min-width: 0; flex: 1; }
.notice-title { display: block; color: #554681; font-size: 23rpx; font-weight: 750; }
.notice-description { display: block; margin-top: 4rpx; color: #85799f; font-size: 20rpx; line-height: 1.45; }
.notice-close { flex: none; padding: 12rpx 3rpx 12rpx 15rpx; color: #958aaa; font-size: 36rpx; line-height: 1; }

.records-panel {
  padding: 14rpx;
  overflow: hidden;
  border: 2rpx solid #e5e9ef;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, .94);
  box-shadow: 0 12rpx 30rpx rgba(31, 41, 55, .045);
}

.history-tabs {
  display: flex;
  gap: 8rpx;
  margin-bottom: 12rpx;
  padding: 7rpx;
  border-radius: 20rpx;
  background: #eef4fc;
}

.history-tab {
  height: 66rpx;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  color: #748196;
  font-size: 24rpx;
  font-weight: 700;
  border-radius: 15rpx;
}

.history-tab--active {
  color: #1769da;
  background: #fff;
  box-shadow: 0 5rpx 15rpx rgba(44, 76, 119, .08);
}

.tab-count {
  min-width: 29rpx;
  height: 29rpx;
  box-sizing: border-box;
  padding: 0 7rpx;
  color: #8b96a7;
  font-size: 18rpx;
  line-height: 29rpx;
  text-align: center;
  border-radius: 999rpx;
  background: #e5eaf1;
}

.history-tab--active .tab-count { color: #3974e8; background: #eaf2ff; }

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

.filter-scroll { width: 100%; margin-top: 12rpx; white-space: nowrap; }

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

.filter-chip--active { color: #1769da; background: #edf4ff; }

.result-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20rpx;
  margin: 36rpx 2rpx 20rpx;
}

.result-title { display: block; color: #253144; font-size: 31rpx; font-weight: 760; line-height: 1.3; }
.result-description { display: block; margin-top: 7rpx; color: #929ba8; font-size: 22rpx; line-height: 1.4; }
.result-count { flex: none; padding-bottom: 3rpx; color: #9aa3b0; font-size: 21rpx; }

.problem-grid { display: flex; flex-wrap: wrap; gap: 22rpx; }
.problem-grid__item { width: 100%; }

.empty-state {
  display: flex;
  align-items: center;
  flex-direction: column;
  margin-top: 18rpx;
  padding: 60rpx 36rpx 52rpx;
  text-align: center;
  border: 2rpx dashed #d6dde7;
  border-radius: 30rpx;
  background: rgba(255, 255, 255, .68);
}

.empty-visual {
  position: relative;
  width: 118rpx;
  height: 112rpx;
  margin-bottom: 7rpx;
  border-radius: 34rpx;
  background: #edf4ff;
}

.empty-bookmark {
  position: absolute;
  top: 24rpx;
  left: 41rpx;
  width: 36rpx;
  height: 51rpx;
  box-sizing: border-box;
  border: 8rpx solid #79a3eb;
  border-bottom: 0;
  border-radius: 7rpx 7rpx 0 0;
}

.empty-bookmark::after {
  position: absolute;
  left: 4rpx;
  bottom: -12rpx;
  width: 19rpx;
  height: 19rpx;
  box-sizing: border-box;
  content: '';
  border-right: 8rpx solid #79a3eb;
  border-bottom: 8rpx solid #79a3eb;
  transform: rotate(45deg);
}

.empty-visual--recent { background: #eef8f5; }

.empty-clock-ring {
  position: absolute;
  top: 23rpx;
  left: 30rpx;
  width: 59rpx;
  height: 59rpx;
  box-sizing: border-box;
  border: 7rpx solid #5db39d;
  border-radius: 50%;
}

.empty-clock-hand {
  position: absolute;
  z-index: 2;
  height: 5rpx;
  border-radius: 99rpx;
  background: #5db39d;
  transform-origin: left center;
}

.empty-clock-hand--hour { top: 53rpx; left: 59rpx; width: 20rpx; transform: rotate(-90deg); }
.empty-clock-hand--minute { top: 53rpx; left: 59rpx; width: 25rpx; transform: rotate(25deg); }

.empty-spark {
  position: absolute;
  width: 9rpx;
  height: 9rpx;
  border-radius: 50%;
  background: #beaaf2;
}

.empty-spark--one { top: 15rpx; right: 9rpx; }
.empty-spark--two { bottom: 17rpx; left: 12rpx; width: 6rpx; height: 6rpx; }

.empty-title { margin-top: 15rpx; color: #2b3749; font-size: 31rpx; font-weight: 760; }

.empty-description {
  max-width: 510rpx;
  margin-top: 12rpx;
  color: #8d97a5;
  font-size: 24rpx;
  line-height: 1.62;
}

.primary-button {
  min-width: 190rpx;
  height: 72rpx;
  margin: 27rpx 0 0;
  padding: 0 29rpx;
  color: #fff;
  font-size: 24rpx;
  font-weight: 750;
  line-height: 72rpx;
  border-radius: 18rpx;
  background: #3974e8;
  box-shadow: 0 10rpx 22rpx rgba(57, 116, 232, .19);
}

.primary-button::after { border: 0; }
.primary-button--pressed { opacity: .86; }

.secondary-action {
  margin-top: 24rpx;
  padding: 8rpx 18rpx;
  color: #3974e8;
  font-size: 23rpx;
  font-weight: 700;
}

.privacy-note {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  margin-top: 29rpx;
  color: #9aa3af;
  font-size: 20rpx;
  line-height: 1.5;
  text-align: center;
}

.privacy-shield {
  position: relative;
  width: 24rpx;
  height: 27rpx;
  flex: none;
  box-sizing: border-box;
  border: 3rpx solid #aab3be;
  border-radius: 8rpx 8rpx 11rpx 11rpx;
}

.privacy-shield view {
  position: absolute;
  top: 8rpx;
  left: 7rpx;
  width: 5rpx;
  height: 5rpx;
  border-radius: 50%;
  background: #aab3be;
}

.page-bottom-space { height: calc(150rpx + env(safe-area-inset-bottom)); }

@media (max-width: 380px) {
  .page-header { align-items: flex-start; flex-direction: column; }
  .demo-toggle { align-self: flex-start; margin-top: -5rpx; }
}

@media (min-width: 768px) {
  .records-page { padding-right: 44rpx; padding-left: 44rpx; }
  .problem-grid__item { width: calc(50% - 11rpx); }
}
</style>
