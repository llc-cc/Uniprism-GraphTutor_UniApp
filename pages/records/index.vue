<script setup lang="ts">
import { computed, ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import ProblemCard from '../../components/library/ProblemCard.vue'
import { resolveCustomNavigationTop } from '../../utils/layout'
import {
  PUBLIC_PROBLEMS,
  buildSolverUrl,
  deleteProblemRecord,
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
type HistorySubject = Exclude<ProblemSubject, 'worksheet'> | 'all'

interface RecordRow {
  problem: ProblemPreview
  openedLabel: string
}

const subjectFilters: Array<{ value: HistorySubject, label: string }> = [
  { value: 'all', label: '全部学科' },
  { value: 'math', label: '数学' },
  { value: 'physics', label: '物理' },
  { value: 'chemistry', label: '化学' },
]

const historyTab = ref<HistoryTab>('saved')
const search = ref('')
const selectedSubject = ref<HistorySubject>('all')
const savedIds = ref<string[]>([])
const recentRecords = ref<RecentProblemRecord[]>([])
const localProblems = ref<ProblemPreview[]>([])
const pageStyle = { paddingTop: resolveCustomNavigationTop() }

const problemById = computed(() => new Map(
  [...localProblems.value, ...PUBLIC_PROBLEMS].map((problem) => [problem.id, problem]),
))

const savedRows = computed<RecordRow[]>(() => {
  const localIds = new Set(localProblems.value.map((problem) => problem.id))
  const submittedRows = localProblems.value.map((problem) => ({
    problem,
    openedLabel: '保存在当前设备',
  }))
  const savedPublicRows = savedIds.value
    .filter((id) => !localIds.has(id))
    .map((id) => problemById.value.get(id))
    .filter((problem): problem is ProblemPreview => Boolean(problem))
    .map((problem) => ({ problem, openedLabel: '已收藏到当前设备' }))
  return [...submittedRows, ...savedPublicRows]
})

const recentRows = computed<RecordRow[]>(() => recentRecords.value
  .map((record) => {
    const problem = problemById.value.get(record.id)
    return problem ? {
      problem,
      openedLabel: formatOpenedAt(record.openedAt),
    } : undefined
  })
  .filter((row): row is RecordRow => Boolean(row)))

const sourceRows = computed(() => historyTab.value === 'saved' ? savedRows.value : recentRows.value)
const normalizedSearch = computed(() => search.value.trim().toLocaleLowerCase())
const filteredRows = computed(() => sourceRows.value.filter(({ problem }) => {
  const subjectMatches = selectedSubject.value === 'all'
    || problem.subject === selectedSubject.value
    || (selectedSubject.value === 'math' && problem.subject === 'worksheet')
  const keywordMatches = !normalizedSearch.value || [
    problem.title,
    problem.excerpt,
    problem.subjectLabel,
    problem.grade,
  ].join(' ').toLocaleLowerCase().includes(normalizedSearch.value)
  return subjectMatches && keywordMatches
}))
const pristineHistory = computed(() => (
  !sourceRows.value.length
  && !search.value.trim()
  && selectedSubject.value === 'all'
))
const emptyTitle = computed(() => {
  if (pristineHistory.value) return '还没有个人记录'
  return historyTab.value === 'recent' ? '还没有浏览记录' : '没有找到匹配的题目'
})
const emptyDescription = computed(() => {
  if (pristineHistory.value) return '提交一道题，或在题目广场收藏、打开内容后再回来。'
  if (historyTab.value === 'recent') return '从题目广场打开一个示例，它会出现在这里。'
  return '换一个关键词，或清除当前学科筛选。'
})

const isSaved = (problemId: string) => savedIds.value.includes(problemId)

const refreshRecords = () => {
  localProblems.value = getLocalProblemPreviews()
  savedIds.value = getSavedProblemIds()
  recentRecords.value = getRecentProblemRecords()
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
  recentRecords.value = recordProblemOpen(problem.id)
  uni.navigateTo({ url: buildSolverUrl(problem) })
}

const removeProblem = (problem: ProblemPreview) => {
  uni.showModal({
    title: '删除记录',
    content: `确定删除“${problem.title}”这条记录吗？`,
    confirmColor: '#c24053',
    success: (result) => {
      if (!result.confirm) return
      const next = deleteProblemRecord(problem.id)
      localProblems.value = next.localProblems
      savedIds.value = next.savedIds
      recentRecords.value = next.recentRecords
      uni.showToast({ title: '记录已删除', icon: 'none' })
    },
  })
}

const clearFilters = () => {
  search.value = ''
  selectedSubject.value = 'all'
}

const handleEmptyAction = () => {
  if (pristineHistory.value) {
    uni.switchTab({ url: '/pages/plaza/index' })
    return
  }
  clearFilters()
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
      <text class="page-title">我的记录</text>
    </view>

    <view class="library-toolbar">
      <view class="search-field">
        <view class="search-icon" aria-hidden="true" />
        <input
          v-model="search"
          class="search-input"
          type="text"
          confirm-type="search"
          placeholder="搜索题目、知识点或学科…"
          placeholder-class="search-placeholder"
        >
        <button v-if="search" class="clear-search" aria-label="清除搜索" @tap="search = ''">
          <view class="clear-search__line clear-search__line--one" />
          <view class="clear-search__line clear-search__line--two" />
        </button>
      </view>

      <view class="history-tabs">
        <button
          :class="['history-tab', { 'history-tab--active': historyTab === 'saved' }]"
          @tap="historyTab = 'saved'"
        >题目与收藏</button>
        <button
          :class="['history-tab', { 'history-tab--active': historyTab === 'recent' }]"
          @tap="historyTab = 'recent'"
        >最近浏览</button>
      </view>

      <scroll-view class="filter-scroll" scroll-x :show-scrollbar="false" enhanced>
        <view class="filter-track">
          <button
            v-for="subject in subjectFilters"
            :key="subject.value"
            :class="['filter-chip', { 'filter-chip--active': selectedSubject === subject.value }]"
            @tap="selectedSubject = subject.value"
          >{{ subject.label }}</button>
        </view>
      </scroll-view>
    </view>

    <view class="result-meta">
      <text class="result-count">{{ filteredRows.length }} 个解题过程</text>
      <text class="result-storage">数据保存在当前设备</text>
    </view>

    <view v-if="filteredRows.length" class="problem-grid">
      <view v-for="row in filteredRows" :key="row.problem.id" class="problem-grid__item">
        <ProblemCard
          :problem="row.problem"
          :saved="isSaved(row.problem.id)"
          :show-difficulty="false"
          show-delete
          :opened-label="row.openedLabel"
          @open="openProblem"
          @toggle-save="toggleSave"
          @remove="removeProblem"
        />
      </view>
    </view>

    <view v-else class="empty-state">
      <view :class="['empty-icon', { 'empty-icon--history': historyTab === 'recent' }]">
        <view v-if="historyTab === 'recent'" class="history-mark">
          <view class="history-mark__hand history-mark__hand--hour" />
          <view class="history-mark__hand history-mark__hand--minute" />
        </view>
        <view v-else class="search-mark" />
      </view>
      <text class="empty-title">{{ emptyTitle }}</text>
      <text class="empty-description">{{ emptyDescription }}</text>
      <button class="empty-button" @tap="handleEmptyAction">
        {{ pristineHistory ? '去题目广场' : '查看全部题目' }}
      </button>
    </view>

    <view class="page-bottom-space" />
  </view>
</template>

<style scoped>
.records-page {
  min-height: 100vh;
  box-sizing: border-box;
  padding-right: 28rpx;
  padding-left: 28rpx;
  color: #1f2937;
  background: #f7f8fa;
}

.page-header { padding: 42rpx 0 39rpx; }

.page-title {
  display: block;
  color: #182234;
  font-size: 56rpx;
  font-weight: 760;
  line-height: 1.15;
  letter-spacing: -1.5rpx;
}

.library-toolbar {
  display: flex;
  align-items: stretch;
  flex-direction: column;
  gap: 12rpx;
  padding: 20rpx;
  overflow: hidden;
  border: 2rpx solid #e7ebf1;
  border-radius: 34rpx;
  background: rgba(255, 255, 255, .94);
  box-shadow: 0 24rpx 60rpx rgba(31, 41, 55, .045);
}

.search-field {
  min-width: 0;
  min-height: 92rpx;
  display: flex;
  align-items: center;
  padding: 0 22rpx;
}

.search-icon {
  position: relative;
  width: 28rpx;
  height: 28rpx;
  flex: none;
  box-sizing: border-box;
  margin-right: 22rpx;
  border: 4rpx solid #96a0af;
  border-radius: 50%;
}

.search-icon::after {
  position: absolute;
  right: -10rpx;
  bottom: -7rpx;
  width: 13rpx;
  height: 4rpx;
  content: '';
  border-radius: 99rpx;
  background: #96a0af;
  transform: rotate(45deg);
}

.search-input {
  min-width: 0;
  height: 92rpx;
  flex: 1;
  color: #273244;
  font-size: 26rpx;
  font-weight: 600;
}

.search-placeholder { color: #a6aeba; }

.clear-search {
  position: relative;
  width: 54rpx;
  height: 54rpx;
  flex: none;
  margin: 0 -8rpx 0 8rpx;
  padding: 0;
  border-radius: 50%;
  background: #f1f3f6;
}

.clear-search::after,
.history-tab::after,
.filter-chip::after,
.empty-button::after { border: 0; }

.clear-search__line {
  position: absolute;
  top: 25rpx;
  left: 16rpx;
  width: 22rpx;
  height: 3rpx;
  border-radius: 99rpx;
  background: #8c97a7;
}

.clear-search__line--one { transform: rotate(45deg); }
.clear-search__line--two { transform: rotate(-45deg); }

.history-tabs {
  display: flex;
  gap: 8rpx;
  padding: 8rpx;
  border-radius: 22rpx;
  background: #eef5ff;
}

.history-tab {
  min-width: 0;
  min-height: 84rpx;
  flex: 1;
  margin: 0;
  padding: 0 16rpx;
  color: #7d8796;
  font-size: 23rpx;
  font-weight: 720;
  line-height: 84rpx;
  border-radius: 17rpx;
  background: transparent;
}

.history-tab--active {
  color: #1769da;
  background: #fff;
  box-shadow: 0 6rpx 18rpx rgba(36, 76, 128, .08);
}

.filter-scroll {
  width: 100%;
  white-space: nowrap;
  border-radius: 22rpx;
  background: #f4f6f8;
}

.filter-track {
  min-width: 100%;
  display: inline-flex;
  gap: 8rpx;
  box-sizing: border-box;
  padding: 8rpx;
}

.filter-chip {
  width: auto;
  min-width: 104rpx;
  height: 80rpx;
  flex: none;
  margin: 0;
  padding: 0 22rpx;
  color: #7d8796;
  font-size: 23rpx;
  font-weight: 720;
  line-height: 80rpx;
  border-radius: 17rpx;
  background: transparent;
}

.filter-chip--active {
  color: #1769da;
  background: #fff;
  box-shadow: 0 6rpx 18rpx rgba(36, 76, 128, .08);
}

.result-meta {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: 8rpx;
  margin: 44rpx 2rpx 30rpx;
  color: #687386;
}

.result-count { font-size: 26rpx; font-weight: 800; line-height: 1.4; }
.result-storage { color: #a0a8b4; font-size: 22rpx; line-height: 1.4; }

.problem-grid {
  display: flex;
  flex-direction: column;
  gap: 44rpx;
}

.problem-grid__item { width: 100%; }

.empty-state {
  display: flex;
  align-items: center;
  flex-direction: column;
  margin-top: 72rpx;
  padding: 76rpx 36rpx;
  text-align: center;
  border: 2rpx dashed #d6dde7;
  border-radius: 38rpx;
  background: rgba(255, 255, 255, .68);
}

.empty-icon {
  width: 112rpx;
  height: 112rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #2674de;
  border-radius: 36rpx;
  background: #edf5ff;
}

.empty-icon--history { color: #2b9f88; background: #eaf8f4; }

.search-mark {
  position: relative;
  width: 42rpx;
  height: 42rpx;
  box-sizing: border-box;
  border: 7rpx solid currentColor;
  border-radius: 50%;
}

.search-mark::after {
  position: absolute;
  right: -17rpx;
  bottom: -11rpx;
  width: 23rpx;
  height: 7rpx;
  content: '';
  border-radius: 99rpx;
  background: currentColor;
  transform: rotate(45deg);
}

.history-mark {
  position: relative;
  width: 52rpx;
  height: 52rpx;
  box-sizing: border-box;
  border: 7rpx solid currentColor;
  border-radius: 50%;
}

.history-mark__hand {
  position: absolute;
  top: 20rpx;
  left: 20rpx;
  height: 5rpx;
  border-radius: 99rpx;
  background: currentColor;
  transform-origin: left center;
}

.history-mark__hand--hour { width: 15rpx; transform: rotate(-90deg); }
.history-mark__hand--minute { width: 19rpx; transform: rotate(24deg); }

.empty-title {
  margin-top: 36rpx;
  color: #263245;
  font-size: 34rpx;
  font-weight: 760;
}

.empty-description {
  max-width: 520rpx;
  margin-top: 14rpx;
  color: #8993a2;
  font-size: 24rpx;
  line-height: 1.6;
}

.empty-button {
  min-width: 190rpx;
  height: 80rpx;
  margin: 40rpx 0 0;
  padding: 0 30rpx;
  color: #fff;
  font-size: 24rpx;
  font-weight: 800;
  line-height: 80rpx;
  border-radius: 20rpx;
  background: #2674de;
}

.page-bottom-space { height: calc(150rpx + env(safe-area-inset-bottom)); }

@media (min-width: 768px) {
  .records-page { padding-right: 44rpx; padding-left: 44rpx; }
  .result-meta { align-items: center; flex-direction: row; justify-content: space-between; }
  .problem-grid { flex-flow: row wrap; gap: 32rpx; }
  .problem-grid__item { width: calc(50% - 16rpx); }
}
</style>
