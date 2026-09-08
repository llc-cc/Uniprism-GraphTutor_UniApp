<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import ProblemCard from '../../components/library/ProblemCard.vue'
import { resolveCustomNavigationTop } from '../../utils/layout'
import {
  PUBLIC_PROBLEMS,
  buildSolverUrl,
  getSavedProblemIds,
  recordProblemOpen,
  setProblemSaved,
  type ProblemPreview,
  type ProblemSubject,
} from '../../data/problems'

type PlazaSubject = Exclude<ProblemSubject, 'worksheet'> | 'all'

const PAGE_SIZE = 9
const subjectFilters: Array<{ value: PlazaSubject, label: string }> = [
  { value: 'all', label: '全部学科' },
  { value: 'math', label: '数学' },
  { value: 'physics', label: '物理' },
  { value: 'chemistry', label: '化学' },
]

const search = ref('')
const selectedSubject = ref<PlazaSubject>('all')
const currentPage = ref(1)
const savedIds = ref<string[]>([])
const pageStyle = { paddingTop: resolveCustomNavigationTop() }

const normalizedSearch = computed(() => search.value.trim().toLocaleLowerCase())
const filteredProblems = computed(() => PUBLIC_PROBLEMS.filter((problem) => {
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
const totalPages = computed(() => Math.max(1, Math.ceil(filteredProblems.value.length / PAGE_SIZE)))
const visibleProblems = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredProblems.value.slice(start, start + PAGE_SIZE)
})
const pageNumbers = computed(() => Array.from({ length: totalPages.value }, (_, index) => index + 1))

watch([search, selectedSubject], () => {
  currentPage.value = 1
})
watch(totalPages, (pages) => {
  if (currentPage.value > pages) currentPage.value = pages
})

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

const clearFilters = () => {
  search.value = ''
  selectedSubject.value = 'all'
}

const changePage = (page: number) => {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return
  currentPage.value = page
  uni.pageScrollTo({ scrollTop: 0, duration: 220 })
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
      <text class="page-title">题目广场</text>
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

      <scroll-view class="filter-scroll" scroll-x :show-scrollbar="false" enhanced>
        <view class="filter-track">
          <button
            v-for="subject in subjectFilters"
            :key="subject.value"
            :class="['filter-chip', { 'filter-chip--active': selectedSubject === subject.value }]"
            :aria-label="`筛选${subject.label}`"
            @tap="selectedSubject = subject.value"
          >
            <text>{{ subject.label }}</text>
          </button>
        </view>
      </scroll-view>
    </view>

    <view class="result-meta">
      <text class="result-count">{{ filteredProblems.length }} 个解题过程</text>
      <text class="result-page">第 {{ currentPage }} / {{ totalPages }} 页 · 每页 {{ PAGE_SIZE }} 题</text>
    </view>

    <view v-if="filteredProblems.length" class="problem-grid">
      <view v-for="problem in visibleProblems" :key="problem.id" class="problem-grid__item">
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
      <text class="empty-title">没有找到匹配的题目</text>
      <text class="empty-description">换一个关键词，或清除当前学科筛选。</text>
      <button class="empty-button" hover-class="empty-button--pressed" @tap="clearFilters">查看全部题目</button>
    </view>

    <view v-if="filteredProblems.length" class="pagination" aria-label="题目分页">
      <button
        :class="['pagination-button', 'pagination-button--wide', { 'pagination-button--disabled': currentPage === 1 }]"
        :disabled="currentPage === 1"
        @tap="changePage(currentPage - 1)"
      >上一页</button>
      <button
        v-for="page in pageNumbers"
        :key="page"
        :class="['pagination-button', { 'pagination-button--active': page === currentPage }]"
        @tap="changePage(page)"
      >{{ page }}</button>
      <button
        :class="['pagination-button', 'pagination-button--wide', { 'pagination-button--disabled': currentPage === totalPages }]"
        :disabled="currentPage === totalPages"
        @tap="changePage(currentPage + 1)"
      >下一页</button>
    </view>

    <view class="page-bottom-space" />
  </view>
</template>

<style scoped>
.plaza-page {
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
  color: #9aa3b1;
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
.filter-chip::after,
.pagination-button::after,
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  box-sizing: border-box;
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

.result-count {
  font-size: 26rpx;
  font-weight: 800;
  line-height: 1.4;
}

.result-page {
  color: #a0a8b4;
  font-size: 22rpx;
  line-height: 1.4;
}

.problem-grid {
  display: flex;
  flex-direction: column;
  gap: 44rpx;
}

.problem-grid__item { width: 100%; }

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 56rpx;
}

.pagination-button {
  width: 84rpx;
  min-width: 84rpx;
  height: 84rpx;
  margin: 0;
  padding: 0;
  color: #69758a;
  font-size: 23rpx;
  font-weight: 750;
  line-height: 84rpx;
  border: 2rpx solid #dfe5ed;
  border-radius: 20rpx;
  background: #fff;
}

.pagination-button--wide {
  width: auto;
  padding: 0 24rpx;
}

.pagination-button--active {
  color: #fff;
  border-color: #2674de;
  background: #2674de;
}

.pagination-button--disabled { opacity: .38; }

.empty-state {
  display: flex;
  align-items: center;
  flex-direction: column;
  margin-top: 40rpx;
  padding: 76rpx 36rpx;
  text-align: center;
  border: 2rpx dashed #d6dde7;
  border-radius: 38rpx;
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
  margin-top: 18rpx;
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
  height: 76rpx;
  margin: 28rpx 0 0;
  padding: 0 30rpx;
  color: #fff;
  font-size: 24rpx;
  font-weight: 750;
  line-height: 76rpx;
  border-radius: 20rpx;
  background: #3974e8;
  box-shadow: 0 10rpx 22rpx rgba(57, 116, 232, .19);
}

.empty-button--pressed { opacity: .86; }
.page-bottom-space { height: calc(150rpx + env(safe-area-inset-bottom)); }

@media (min-width: 768px) {
  .plaza-page { padding-right: 44rpx; padding-left: 44rpx; }
  .result-meta { align-items: center; flex-direction: row; justify-content: space-between; }
  .problem-grid { flex-flow: row wrap; gap: 32rpx; }
  .problem-grid__item { width: calc(50% - 16rpx); }
}
</style>
