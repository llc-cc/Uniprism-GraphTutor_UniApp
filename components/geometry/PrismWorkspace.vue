<script setup lang="ts">
import { computed } from 'vue'
import {
  PRISM_2023A_ANSWER,
  PRISM_2023A_OVERVIEW,
  PRISM_2023A_QUESTION,
  PRISM_2023A_STEPS,
} from '../../data/prism-2023a'
import PrismSolidCanvas from '../../features/prism-solid/prism-solid-canvas.vue'

const props = defineProps<{
  stepIndex: number
}>()

const emit = defineEmits<{
  'update:stepIndex': [value: number]
}>()

const current = computed(() => PRISM_2023A_STEPS[props.stepIndex] ?? PRISM_2023A_STEPS[0]!)
const go = (index: number) => {
  const bounded = Math.max(0, Math.min(index, PRISM_2023A_STEPS.length - 1))
  emit('update:stepIndex', bounded)
}
</script>

<template>
  <view class="workspace">
    <view class="question-card">
      <text class="question-card__label">题干</text>
      <text class="question-card__full">{{ PRISM_2023A_QUESTION }}</text>
    </view>

    <view class="strategy-box">
      <text class="strategy-box__label">解题思路</text>
      <text class="strategy-box__text">{{ PRISM_2023A_OVERVIEW }}</text>
    </view>

    <view id="prism-figure" class="board-card">
      <view class="board-card__header">
        <text class="board-card__chip">插图 {{ stepIndex + 1 }} / {{ PRISM_2023A_STEPS.length }}</text>
        <text class="board-card__title">{{ current.title }}</text>
      </view>
      <view class="board-card__canvas">
        <PrismSolidCanvas
          class="board-card__solid"
          :step="stepIndex"
        />
      </view>
      <text class="board-card__caption">{{ current.scene.description }}</text>
    </view>

    <view
      v-for="(step, index) in PRISM_2023A_STEPS"
      :key="step.id"
      class="reasoning-section"
      :class="{ 'reasoning-section--active': index === stepIndex }"
    >
      <text class="reasoning-section__title">{{ step.title }}</text>
      <text class="reasoning-section__summary">{{ step.summary }}</text>
      <text class="reasoning-section__detail">{{ step.detail }}</text>
      <view class="reasoning-section__formula">
        <text class="reasoning-section__formula-text">{{ step.formula }}</text>
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
      <text class="answer-box__text">{{ PRISM_2023A_ANSWER }}</text>
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

.question-card__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.question-card__label,
.step-copy__eyebrow,
.board-card__chip {
  color: #6b7c90;
  font-size: 20rpx;
  font-weight: 750;
}

.question-card__toggle {
  color: #3974e8;
  font-size: 22rpx;
  font-weight: 700;
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
  flex-direction: column;
  align-items: flex-start;
  padding: 28rpx 26rpx;
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
  box-sizing: border-box;
  border-radius: 16rpx;
  background: #eef5ff;
}

.reasoning-section__formula-text {
  font-size: 24rpx;
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
  color: #d4653c;
  font-size: 24rpx;
  font-weight: 700;
  line-height: 64rpx;
  border: 1rpx solid #f0b49a;
  border-radius: 999rpx;
  background: #fff;
}

.figure-link::after {
  border: none;
}

.figure-link--active {
  color: #fff;
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
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx 0;
}

.board-card__chip {
  padding: 4rpx 12rpx;
  color: #3d5a78;
  border: 1rpx solid #d9e2ee;
  border-radius: 999rpx;
  background: #f4f7fb;
}

.board-card__title {
  color: #24344a;
  font-size: 24rpx;
  font-weight: 750;
}

.board-card__canvas {
  position: relative;
  height: 620rpx;
  margin: 14rpx 14rpx 16rpx;
  overflow: hidden;
  border: 1rpx solid #e7edf4;
  border-radius: 18rpx;
  background: #ffffff;
}

.board-card__solid {
  display: block;
  width: 100%;
  height: 620rpx;
}

.board-card__caption {
  display: block;
  margin: 0 20rpx 20rpx;
  color: #6b7c90;
  font-size: 22rpx;
  line-height: 1.5;
}

.step-strip {
  width: 100%;
  white-space: nowrap;
}

.step-strip__inner {
  display: inline-flex;
  padding-right: 8rpx;
}

.step-strip__item {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 280rpx;
  margin-right: 12rpx;
  padding: 16rpx 18rpx;
  text-align: left;
  border: 1rpx solid #e1e6ed;
  border-radius: 18rpx;
  background: #fff;
}

.step-strip__item--active {
  border-color: #9bb8e8;
  background: #eef4ff;
}

.step-strip__number {
  color: #7b8ba0;
  font-size: 18rpx;
  font-weight: 800;
}

.step-strip__title {
  margin-top: 6rpx;
  color: #24344a;
  font-size: 22rpx;
  font-weight: 750;
  white-space: normal;
}

.step-copy {
  padding: 22rpx 24rpx 24rpx;
}

.step-copy__title {
  display: block;
  margin-top: 8rpx;
  color: #182638;
  font-size: 34rpx;
  font-weight: 800;
  line-height: 1.3;
}

.step-copy__summary,
.step-copy__detail,
.step-copy__formula {
  display: block;
  margin-top: 12rpx;
  color: #3b4b5f;
  font-size: 26rpx;
  line-height: 1.6;
}

.step-copy__formula {
  padding: 12rpx 14rpx;
  color: #2f6fdb;
  font-weight: 700;
  border-radius: 12rpx;
  background: #f3f7ff;
}

</style>
