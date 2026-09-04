<script setup lang="ts">
import { computed } from 'vue'

interface IllustratedStep {
  title: string
  basis: string
  derivation: string
  conclusion: string
  detail: string
  diagramCaption: string
}

const props = defineProps<{
  title: string
  statement: string
  artwork: string
  overview: string
  answer: string
  subject: 'physics' | 'chemistry'
  steps: IllustratedStep[]
  stepIndex: number
}>()

const emit = defineEmits<{
  'update:stepIndex': [value: number]
}>()

const current = computed(() => props.steps[props.stepIndex] ?? props.steps[0])

const go = (index: number) => {
  const lastIndex = Math.max(0, props.steps.length - 1)
  emit('update:stepIndex', Math.max(0, Math.min(index, lastIndex)))
}
</script>

<template>
  <view :class="['illustrated-workspace', `illustrated-workspace--${subject}`]">
    <view class="question-card">
      <view class="question-card__heading">
        <text class="question-card__label">题干</text>
        <text class="question-card__subject">{{ subject === 'physics' ? '物理' : '化学' }}</text>
      </view>
      <text class="question-card__title">{{ title }}</text>
      <text class="question-card__full">{{ statement }}</text>
    </view>

    <view class="strategy-box">
      <text class="strategy-box__label">解题思路</text>
      <text class="strategy-box__text">{{ overview }}</text>
    </view>

    <view id="illustrated-figure" class="board-card">
      <view class="board-card__header">
        <text class="board-card__chip">插图 {{ stepIndex + 1 }} / {{ steps.length }}</text>
        <text class="board-card__title">{{ current?.title }}</text>
      </view>
      <view class="board-card__canvas">
        <image
          class="board-card__image"
          :src="artwork"
          mode="widthFix"
        />
      </view>
      <text class="board-card__caption">{{ current?.diagramCaption }}</text>
    </view>

    <view
      v-for="(step, index) in steps"
      :key="`${subject}-${index}`"
      class="reasoning-section"
      :class="{ 'reasoning-section--active': index === stepIndex }"
    >
      <text class="reasoning-section__title">{{ step.title }}</text>
      <text class="reasoning-section__summary">{{ step.basis }}</text>
      <text class="reasoning-section__detail">{{ step.derivation }}</text>
      <text class="reasoning-section__extra">{{ step.detail }}</text>
      <view class="reasoning-section__formula">
        <text class="reasoning-section__formula-text">{{ step.conclusion }}</text>
      </view>
      <button
        class="figure-link"
        :class="{ 'figure-link--active': index === stepIndex }"
        hover-class="figure-link--pressed"
        @tap="go(index)"
      >
        ↗ 查看插图 · {{ step.title }}
      </button>
    </view>

    <view class="answer-box">
      <text class="answer-box__label">结论</text>
      <text class="answer-box__text">{{ answer }}</text>
    </view>
  </view>
</template>

<style scoped>
.illustrated-workspace {
  --article-accent: #3974e8;
  --article-accent-dark: #245fbf;
  --article-soft: #eef5ff;
  display: flex;
  flex-direction: column;
}

.illustrated-workspace--physics {
  --article-accent: #e8793d;
  --article-accent-dark: #b9582f;
  --article-soft: #fff2e9;
}

.illustrated-workspace--chemistry {
  --article-accent: #e85e57;
  --article-accent-dark: #b4475d;
  --article-soft: #fff0ef;
}

.question-card,
.board-card,
.strategy-box,
.reasoning-section,
.answer-box {
  margin-bottom: 18rpx;
  border: 1rpx solid #e1e6ed;
  border-radius: 22rpx;
  background: #fff;
  box-sizing: border-box;
}

.question-card {
  padding: 20rpx 22rpx 22rpx;
}

.question-card__heading,
.board-card__header {
  display: flex;
  align-items: center;
}

.question-card__heading {
  justify-content: space-between;
}

.question-card__label,
.question-card__subject,
.board-card__chip {
  color: #6b7c90;
  font-size: 20rpx;
  font-weight: 750;
}

.question-card__subject {
  padding: 5rpx 14rpx;
  color: var(--article-accent-dark);
  border-radius: 999rpx;
  background: var(--article-soft);
}

.question-card__title {
  display: block;
  margin-top: 12rpx;
  color: #1d2c40;
  font-size: 31rpx;
  font-weight: 760;
  line-height: 1.4;
}

.question-card__full {
  display: block;
  margin-top: 10rpx;
  color: #536176;
  font-size: 24rpx;
  line-height: 1.65;
}

.strategy-box {
  padding: 22rpx 24rpx;
  border-color: #d7e6fb;
  background: #f4f8ff;
}

.illustrated-workspace--physics .strategy-box,
.illustrated-workspace--chemistry .strategy-box {
  border-color: #f0d8ca;
  background: var(--article-soft);
}

.strategy-box__label,
.answer-box__label {
  display: block;
  color: var(--article-accent-dark);
  font-size: 20rpx;
  font-weight: 750;
}

.strategy-box__text,
.reasoning-section__summary,
.reasoning-section__detail,
.reasoning-section__extra,
.answer-box__text {
  display: block;
  margin-top: 10rpx;
  color: #314257;
  font-size: 26rpx;
  line-height: 1.65;
}

.board-card {
  overflow: hidden;
}

.board-card__header {
  padding: 16rpx 20rpx 0;
}

.board-card__chip {
  flex-shrink: 0;
  padding: 4rpx 12rpx;
  color: var(--article-accent-dark);
  border: 1rpx solid #d9e2ee;
  border-radius: 999rpx;
  background: var(--article-soft);
}

.board-card__title {
  min-width: 0;
  margin-left: 12rpx;
  overflow: hidden;
  color: #24344a;
  font-size: 24rpx;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.board-card__canvas {
  width: auto;
  min-height: 300rpx;
  margin: 14rpx 14rpx 0;
  overflow: hidden;
  border: 1rpx solid #e7edf4;
  border-radius: 18rpx;
  background: #f8fafc;
}

.board-card__image {
  display: block;
  width: 100%;
}

.board-card__caption {
  display: block;
  padding: 14rpx 20rpx 18rpx;
  color: #718096;
  font-size: 21rpx;
  line-height: 1.55;
}

.reasoning-section {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 28rpx 26rpx;
}

.reasoning-section--active {
  border-color: var(--article-accent);
  box-shadow: 0 8rpx 20rpx rgba(57, 116, 232, 0.08);
}

.reasoning-section__title {
  display: block;
  color: var(--article-accent-dark);
  font-size: 34rpx;
  font-weight: 750;
  line-height: 1.35;
}

.reasoning-section__summary {
  color: #1d2c40;
  font-weight: 650;
}

.reasoning-section__extra {
  color: #6b7788;
  font-size: 23rpx;
}

.reasoning-section__formula {
  width: 100%;
  margin-top: 16rpx;
  padding: 18rpx 16rpx;
  color: var(--article-accent-dark);
  text-align: center;
  border-radius: 16rpx;
  background: var(--article-soft);
  box-sizing: border-box;
}

.reasoning-section__formula-text {
  font-size: 24rpx;
  font-weight: 650;
  line-height: 1.55;
}

.figure-link {
  display: inline-flex;
  align-items: center;
  width: auto;
  max-width: 100%;
  height: 64rpx;
  margin: 18rpx 0 0;
  padding: 0 22rpx;
  color: var(--article-accent-dark);
  font-size: 24rpx;
  font-weight: 700;
  line-height: 64rpx;
  border: 1rpx solid var(--article-accent);
  border-radius: 999rpx;
  background: #fff;
}

.figure-link::after {
  border: none;
}

.figure-link--active {
  color: #fff;
  background: var(--article-accent);
}

.figure-link--pressed {
  transform: scale(0.98);
}

.answer-box {
  padding: 28rpx 26rpx;
  border-color: var(--article-accent);
  background: var(--article-soft);
}

.answer-box__text {
  color: #334155;
  font-weight: 650;
}
</style>
