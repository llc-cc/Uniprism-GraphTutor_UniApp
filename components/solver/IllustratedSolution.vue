<script setup lang="ts">
import { computed } from 'vue'
import ChemistryEthanolDiagram from './ChemistryEthanolDiagram.vue'
import PhysicsInclineDiagram from './PhysicsInclineDiagram.vue'

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
  'focus-figure': []
}>()

const current = computed(() => props.steps[props.stepIndex] ?? props.steps[0])

const go = (index: number) => {
  const lastIndex = Math.max(0, props.steps.length - 1)
  emit('update:stepIndex', Math.max(0, Math.min(index, lastIndex)))
  emit('focus-figure')
}
</script>

<template>
  <view class="workspace">
    <view class="question-card">
      <text class="question-card__label">题干</text>
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
        <PhysicsInclineDiagram v-if="subject === 'physics'" class="board-card__diagram" :step-index="stepIndex" />
        <ChemistryEthanolDiagram v-else class="board-card__diagram" :step-index="stepIndex" />
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
.workspace {
  display: flex;
  flex-direction: column;
  gap: 18rpx;
}

.question-card,
.board-card,
.strategy-box,
.reasoning-section,
.answer-box {
  border: 1rpx solid #e1e6ed;
  border-radius: 22rpx;
  background: #ffffff;
}

.question-card {
  padding: 18rpx 22rpx 20rpx;
}

.question-card__label,
.board-card__chip {
  color: #6b7c90;
  font-size: 20rpx;
  font-weight: 750;
}

.question-card__full {
  display: block;
  margin-top: 10rpx;
  color: #314257;
  font-size: 24rpx;
  line-height: 1.55;
  white-space: pre-wrap;
}

.strategy-box {
  padding: 22rpx 24rpx;
  border-color: #d7e6fb;
  background: #f4f8ff;
}

.strategy-box__label,
.answer-box__label {
  display: block;
  color: #3d6bb8;
  font-size: 20rpx;
  font-weight: 750;
}

.strategy-box__text,
.reasoning-section__summary,
.reasoning-section__detail,
.answer-box__text {
  display: block;
  margin-top: 10rpx;
  color: #314257;
  font-size: 26rpx;
  line-height: 1.65;
}

.reasoning-section {
  display: flex;
  padding: 28rpx 26rpx;
  flex-direction: column;
  align-items: flex-start;
}

.reasoning-section--active {
  border-color: #8db7f2;
  box-shadow: 0 8rpx 20rpx rgba(57, 116, 232, 0.08);
}

.reasoning-section__title {
  display: block;
  color: #245fbf;
  font-size: 34rpx;
  font-weight: 750;
  line-height: 1.35;
}

.reasoning-section__summary {
  color: #1d2c40;
  font-weight: 650;
}

.reasoning-section__formula {
  width: 100%;
  margin-top: 16rpx;
  padding: 18rpx 16rpx;
  color: #245fbf;
  text-align: center;
  border-radius: 16rpx;
  box-sizing: border-box;
  background: #eef5ff;
}

.reasoning-section__formula-text {
  font-size: 24rpx;
  line-height: 1.55;
}

.figure-link {
  display: inline-flex;
  width: auto;
  max-width: 100%;
  height: 64rpx;
  margin: 18rpx 0 0;
  padding: 0 22rpx;
  align-items: center;
  color: #d4653c;
  font-size: 24rpx;
  font-weight: 700;
  line-height: 64rpx;
  border: 1rpx solid #f0b49a;
  border-radius: 999rpx;
  background: #ffffff;
}

.figure-link::after {
  border: none;
}

.figure-link--active {
  color: #ffffff;
  border-color: #e8793d;
  background: #e8793d;
}

.figure-link--pressed {
  transform: scale(0.98);
}

.answer-box {
  padding: 28rpx 26rpx;
  border-color: #f0b49a;
  background: #fff8f4;
}

.answer-box__label {
  color: #c45b32;
}

.answer-box__text {
  color: #7a3a22;
  font-weight: 650;
}

.board-card__header {
  display: flex;
  padding: 16rpx 20rpx 0;
  align-items: center;
  gap: 12rpx;
}

.board-card__chip {
  flex: 0 0 auto;
  padding: 4rpx 12rpx;
  color: #3d5a78;
  border: 1rpx solid #d9e2ee;
  border-radius: 999rpx;
  background: #f4f7fb;
}

.board-card__title {
  min-width: 0;
  overflow: hidden;
  color: #24344a;
  font-size: 24rpx;
  font-weight: 750;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.board-card__canvas {
  position: relative;
  height: 430rpx;
  margin: 14rpx 14rpx 16rpx;
  overflow: hidden;
  border: 1rpx solid #e7edf4;
  border-radius: 18rpx;
  background: #ffffff;
}

.board-card__diagram {
  display: block;
  width: 100%;
  height: 430rpx;
}

.board-card__caption {
  display: block;
  margin: 0 20rpx 20rpx;
  color: #6b7c90;
  font-size: 22rpx;
  line-height: 1.5;
}
</style>
