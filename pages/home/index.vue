<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import HomeHero from '../../components/home/HomeHero.vue'
import ProblemComposer from '../../components/home/ProblemComposer.vue'
import ProblemCard from '../../components/library/ProblemCard.vue'
import { resolveCustomNavigationTop } from '../../utils/layout'
import {
  buildSolverUrl,
  FEATURED_PROBLEMS,
  recordProblemOpen,
  saveLocalProblemDraft,
  type LocalProblemDraft,
  type ProblemPreview,
} from '../../data/problems'

interface ComposerPayload {
  question: string
  imagePath?: string
  imageName?: string
}

const featuredProblems = FEATURED_PROBLEMS.slice(0, 3)
const submitting = ref(false)
let navigationTimer: ReturnType<typeof setTimeout> | undefined

const contentStyle = { paddingTop: resolveCustomNavigationTop() }

const openProblem = (problem: ProblemPreview) => {
  recordProblemOpen(problem.id)
  uni.navigateTo({
    url: buildSolverUrl(problem),
    fail: () => {
      uni.showToast({ title: '解题页暂时无法打开', icon: 'none' })
    },
  })
}

const submitProblem = (payload: ComposerPayload) => {
  if (submitting.value) return

  submitting.value = true
  const draftId = `draft-${Date.now()}`
  const draft: LocalProblemDraft = {
    id: draftId,
    title: payload.question,
    question: payload.question,
    subject: payload.imagePath ? 'worksheet' : 'math',
    imagePath: payload.imagePath || '',
    imageName: payload.imageName || '',
    createdAt: new Date().toISOString(),
    source: 'home-demo',
  }

  try {
    uni.setStorageSync('uniprism:pendingProblem', draft)
  } catch {
    // The local demo can still enter the solver if storage is unavailable.
  }

  saveLocalProblemDraft(draft)
  recordProblemOpen(draftId)

  navigationTimer = setTimeout(() => {
    navigationTimer = undefined
    const url = [
      '/subpackages/solver/index',
      `?id=${encodeURIComponent(draftId)}`,
      `&subject=${payload.imagePath ? 'worksheet' : 'math'}`,
      '&source=home-demo',
    ].join('')

    uni.navigateTo({
      url,
      success: () => {
        submitting.value = false
      },
      fail: () => {
        submitting.value = false
        uni.showToast({ title: '解题页暂时无法打开', icon: 'none' })
      },
    })
  }, 650)
}

const openPlaza = () => {
  uni.switchTab({
    url: '/pages/plaza/index',
    fail: () => {
      uni.showToast({ title: '题目广场正在准备中', icon: 'none' })
    },
  })
}

onUnmounted(() => {
  if (navigationTimer) clearTimeout(navigationTimer)
})
</script>

<template>
  <view class="home-page">
    <view class="home-page__content" :style="contentStyle">
      <HomeHero />

      <ProblemComposer :loading="submitting" @submit="submitProblem" />

      <view class="featured-section">
        <view class="section-heading">
          <text class="section-heading__title">题目广场</text>
          <button class="section-heading__more" hover-class="more-button--hover" @tap="openPlaza">
            <text>查看全部</text>
            <view class="more-arrow">
              <view class="more-arrow__shaft" />
              <view class="more-arrow__head" />
            </view>
          </button>
        </view>

        <scroll-view
          class="featured-scroll"
          scroll-x
          enhanced
          :show-scrollbar="false"
          :enable-flex="true"
        >
          <view class="featured-row">
          <view
            v-for="problem in featuredProblems"
            :key="problem.id"
            class="featured-card"
          >
            <ProblemCard
              :problem="problem"
              :show-save="false"
              :show-difficulty="true"
              @open="openProblem"
            />
          </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.home-page {
  min-height: 100vh;
  color: #1f2937;
  background: #f7f8fa;
}

.home-page__content {
  width: 100%;
  padding: 0 32rpx calc(env(safe-area-inset-bottom) + 165rpx);
  box-sizing: border-box;
}

.featured-section {
  margin-top: 63rpx;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 26rpx;
}

.section-heading__title {
  color: #111827;
  font-size: 36rpx;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -1rpx;
}

.section-heading__more {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 56rpx;
  margin: 0;
  padding: 0 4rpx 0 18rpx;
  color: #3974e8;
  font-size: 21rpx;
  font-weight: 700;
  line-height: 56rpx;
  border: 0;
  border-radius: 14rpx;
  background: transparent;
}

.section-heading__more::after {
  border: 0;
}

.more-button--hover {
  background: #edf4ff;
}

.more-arrow {
  position: relative;
  width: 31rpx;
  height: 24rpx;
  margin-left: 6rpx;
}

.more-arrow__shaft {
  position: absolute;
  left: 3rpx;
  top: 11rpx;
  width: 22rpx;
  height: 3rpx;
  border-radius: 999rpx;
  background: currentColor;
}

.more-arrow__head {
  position: absolute;
  right: 3rpx;
  top: 7rpx;
  width: 9rpx;
  height: 9rpx;
  border: solid currentColor;
  border-width: 3rpx 3rpx 0 0;
  transform: rotate(45deg);
}

.featured-scroll {
  width: calc(100% + 32rpx);
  margin-right: -32rpx;
  white-space: nowrap;
}

.featured-row {
  display: inline-flex;
  align-items: stretch;
  padding: 4rpx 32rpx 28rpx 0;
}

.featured-card {
  width: 620rpx;
  flex: 0 0 620rpx;
  margin-right: 22rpx;
  white-space: normal;
}

.featured-card:last-child {
  margin-right: 0;
}

@media screen and (min-width: 768px) {
  .home-page__content {
    max-width: 980rpx;
    margin: 0 auto;
  }
}
</style>
