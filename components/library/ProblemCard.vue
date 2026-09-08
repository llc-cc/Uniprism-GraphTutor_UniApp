<script setup lang="ts">
import { computed } from 'vue'
import {
  difficultyPresentation,
  problemSubjectName,
  resolveProblemArtwork,
  type ProblemPreview,
} from '../../data/problems'

const props = withDefaults(defineProps<{
  problem: ProblemPreview
  saved?: boolean
  showSave?: boolean
  showDelete?: boolean
  showDifficulty?: boolean
  openedLabel?: string
  demo?: boolean
}>(), {
  saved: false,
  showSave: true,
  showDelete: false,
  showDifficulty: true,
  openedLabel: '',
  demo: false,
})

const emit = defineEmits<{
  open: [problem: ProblemPreview]
  'toggle-save': [problem: ProblemPreview]
  remove: [problem: ProblemPreview]
}>()

const artworkSrc = computed(() => resolveProblemArtwork(props.problem))
const subjectName = computed(() => problemSubjectName(props.problem.subject))
const difficulty = computed(() => difficultyPresentation(props.problem.difficulty))

const openProblem = () => emit('open', props.problem)
const toggleSave = () => emit('toggle-save', props.problem)
const removeProblem = () => emit('remove', props.problem)
</script>

<template>
  <view
    :class="['problem-card', `problem-card--${problem.subject}`]"
    role="button"
    :aria-label="`打开题目：${problem.title}`"
    hover-class="problem-card--pressed"
    hover-stay-time="80"
    @tap="openProblem"
  >
    <view class="problem-card__visual">
      <image
        class="problem-card__artwork"
        :src="artworkSrc"
        mode="aspectFill"
      />
      <view class="problem-card__wash" />
      <view class="problem-card__labels">
        <view class="problem-card__subject-name"><text>{{ subjectName }}</text></view>
        <view class="problem-card__topic-name"><text>{{ problem.subjectLabel }}</text></view>
        <view v-if="demo" class="problem-card__demo-name"><text>演示</text></view>
      </view>
      <button
        v-if="showSave"
        class="save-button"
        :class="{ 'save-button--active': saved }"
        hover-class="save-button--pressed"
        :aria-label="saved ? '取消收藏' : '收藏题目'"
        @tap.stop="toggleSave"
      >
        <view class="bookmark-mark" />
      </button>
      <button
        v-if="showDelete"
        :class="['delete-button', { 'delete-button--solo': !showSave }]"
        hover-class="delete-button--pressed"
        :aria-label="`删除记录：${problem.title}`"
        @tap.stop="removeProblem"
      >
        <view class="trash-mark">
          <view class="trash-mark__lid" />
          <view class="trash-mark__body">
            <view class="trash-mark__slot" />
            <view class="trash-mark__slot" />
          </view>
        </view>
      </button>
    </view>

    <view
      :class="[
        'problem-card__body',
        { 'problem-card__body--with-difficulty': showDifficulty },
      ]"
    >
      <view
        v-if="showDifficulty"
        :class="[
          'problem-card__difficulty-tag',
          `problem-card__difficulty-tag--${difficulty.tone}`,
        ]"
        :aria-label="`难度星级：${difficulty.ariaLabel}`"
      >
        <view class="problem-card__difficulty-label"><text>难度</text></view>
        <view class="problem-card__difficulty-stars" aria-hidden="true">
          <text
            v-for="(active, starIndex) in difficulty.activeStars"
            :key="starIndex"
            :class="['star', { 'star--active': active }]"
          >★</text>
        </view>
        <view class="problem-card__difficulty-name"><text>{{ problem.difficulty }}</text></view>
      </view>
      <text class="problem-card__title">{{ problem.title }}</text>
      <text v-if="openedLabel" class="problem-card__opened">{{ openedLabel }}</text>
    </view>
  </view>
</template>

<style scoped>
.problem-card {
  --card-accent: #3974e8;
  --card-soft: #edf4ff;
  width: 100%;
  overflow: hidden;
  box-sizing: border-box;
  border: 2rpx solid #e1e6ed;
  border-radius: 48rpx;
  background: #fff;
  box-shadow: 0 24rpx 64rpx rgba(31, 41, 55, .065);
}

.problem-card--physics {
  --card-accent: #e8793d;
  --card-soft: #fff2e9;
}

.problem-card--chemistry {
  --card-accent: #e85e57;
  --card-soft: #fff0ef;
}

.problem-card--worksheet {
  --card-accent: #2b9f88;
  --card-soft: #eaf8f4;
}

.problem-card--pressed {
  transform: translateY(-2rpx);
  box-shadow: 0 28rpx 68rpx rgba(38, 55, 81, .1);
}

.problem-card__visual {
  position: relative;
  height: 352rpx;
  overflow: hidden;
  background: var(--card-soft);
}

.problem-card__artwork {
  width: 100%;
  height: 100%;
  display: block;
}

.problem-card__wash {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(255, 255, 255, .02) 55%, rgba(19, 35, 55, .07));
}

.problem-card__labels {
  position: absolute;
  z-index: 2;
  left: 28rpx;
  bottom: 28rpx;
  display: flex;
  align-items: center;
}

.problem-card__subject-name,
.problem-card__topic-name,
.problem-card__demo-name {
  min-height: 56rpx;
  display: flex;
  align-items: center;
  padding: 0 20rpx;
  font-size: 24rpx;
  font-weight: 800;
  line-height: 1;
  border-radius: 999rpx;
  box-shadow: 0 10rpx 30rpx rgba(31, 41, 55, .09);
}

.problem-card__subject-name {
  color: #4f5d70;
  border: 2rpx solid rgba(255, 255, 255, .74);
  background: rgba(255, 255, 255, .9);
}

.problem-card__topic-name,
.problem-card__demo-name {
  margin-left: 14rpx;
  color: var(--card-accent);
  border: 2rpx solid rgba(57, 116, 232, .18);
  background: rgba(237, 244, 255, .92);
}

.problem-card--physics .problem-card__topic-name {
  border-color: rgba(232, 121, 61, .2);
  background: rgba(255, 242, 233, .94);
}

.problem-card--chemistry .problem-card__topic-name {
  border-color: rgba(232, 94, 87, .2);
  background: rgba(255, 240, 239, .94);
}

.problem-card--worksheet .problem-card__topic-name {
  border-color: rgba(43, 159, 136, .2);
  background: rgba(234, 248, 244, .94);
}

.problem-card__demo-name {
  color: #7b62c9;
  background: rgba(248, 245, 255, .94);
}

.save-button {
  position: absolute;
  z-index: 3;
  top: 28rpx;
  right: 28rpx;
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 2rpx solid rgba(146, 158, 176, .25);
  border-radius: 26rpx;
  background: rgba(255, 255, 255, .92);
  box-shadow: 0 12rpx 32rpx rgba(35, 47, 63, .1);
}

.save-button::after { border: 0; }
.save-button--pressed { transform: scale(.92); }

.save-button--active {
  border-color: #2674de;
  background: #2674de;
}

.delete-button {
  position: absolute;
  z-index: 3;
  top: 28rpx;
  right: 116rpx;
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  color: #9a6874;
  border: 2rpx solid rgba(185, 123, 138, .24);
  border-radius: 24rpx;
  background: rgba(255, 255, 255, .92);
  box-shadow: 0 10rpx 28rpx rgba(35, 47, 63, .09);
}

.delete-button--solo { right: 28rpx; }
.delete-button::after { border: 0; }
.delete-button--pressed { transform: scale(.92); }

.trash-mark {
  position: relative;
  width: 28rpx;
  height: 32rpx;
}

.trash-mark__lid {
  position: absolute;
  top: 3rpx;
  left: 2rpx;
  width: 24rpx;
  height: 4rpx;
  border-radius: 99rpx;
  background: currentColor;
}

.trash-mark__lid::before {
  position: absolute;
  top: -6rpx;
  left: 8rpx;
  width: 9rpx;
  height: 6rpx;
  box-sizing: border-box;
  content: '';
  border: 3rpx solid currentColor;
  border-bottom: 0;
  border-radius: 4rpx 4rpx 0 0;
}

.trash-mark__body {
  position: absolute;
  top: 10rpx;
  left: 5rpx;
  width: 18rpx;
  height: 20rpx;
  display: flex;
  justify-content: center;
  gap: 4rpx;
  box-sizing: border-box;
  padding-top: 5rpx;
  border: 3rpx solid currentColor;
  border-top: 0;
  border-radius: 0 0 5rpx 5rpx;
}

.trash-mark__slot {
  width: 2rpx;
  height: 10rpx;
  border-radius: 99rpx;
  background: currentColor;
}

.bookmark-mark {
  position: relative;
  width: 23rpx;
  height: 29rpx;
  box-sizing: border-box;
  border: 4rpx solid #728096;
  border-bottom: 0;
  border-radius: 5rpx 5rpx 0 0;
}

.bookmark-mark::after {
  position: absolute;
  left: 2rpx;
  bottom: -8rpx;
  width: 12rpx;
  height: 12rpx;
  box-sizing: border-box;
  content: '';
  border-right: 4rpx solid #728096;
  border-bottom: 4rpx solid #728096;
  background: transparent;
  transform: rotate(45deg);
}

.save-button--active .bookmark-mark,
.save-button--active .bookmark-mark::after {
  border-color: #fff;
}

.problem-card__body {
  min-width: 0;
  min-height: 238rpx;
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  justify-content: center;
  padding: 32rpx 40rpx 36rpx;
  border-top: 2rpx solid rgba(225, 230, 237, .82);
}

.problem-card__body--with-difficulty {
  gap: 20rpx;
  padding: 28rpx 40rpx 32rpx;
}

.problem-card__difficulty-tag {
  --difficulty-color: #d38a1d;
  --difficulty-soft: #fff6df;
  min-height: 76rpx;
  display: flex;
  align-items: center;
  padding: 8rpx 22rpx 8rpx 10rpx;
  color: var(--difficulty-color);
  border: 2rpx solid rgba(211, 138, 29, .24);
  border-radius: 999rpx;
  background: var(--difficulty-soft);
}

.problem-card__difficulty-tag--starter {
  --difficulty-color: #3474d9;
  --difficulty-soft: #edf4ff;
  border-color: rgba(52, 116, 217, .24);
}

.problem-card__difficulty-tag--intermediate {
  --difficulty-color: #7958d6;
  --difficulty-soft: #f3efff;
  border-color: rgba(121, 88, 214, .24);
}

.problem-card__difficulty-tag--challenge {
  --difficulty-color: #d04f7b;
  --difficulty-soft: #fff0f5;
  border-color: rgba(208, 79, 123, .24);
}

.problem-card__difficulty-label {
  min-height: 56rpx;
  display: flex;
  align-items: center;
  padding: 0 18rpx;
  color: #fff;
  font-size: 22rpx;
  font-weight: 850;
  line-height: 1;
  letter-spacing: .06em;
  border-radius: 999rpx;
  background: var(--difficulty-color);
}

.problem-card__difficulty-stars {
  display: inline-flex;
  align-items: center;
  margin: 0 12rpx 0 16rpx;
  font-size: 32rpx;
  line-height: 1;
}

.star {
  margin-right: 4rpx;
  color: #d9dee6;
}

.star--active { color: var(--difficulty-color); }

.problem-card__difficulty-name {
  font-size: 26rpx;
  font-weight: 850;
  line-height: 1;
}

.problem-card__title {
  display: -webkit-box;
  width: 100%;
  overflow: hidden;
  color: #202c3d;
  font-size: 36rpx;
  font-weight: 740;
  line-height: 1.35;
  letter-spacing: -.018em;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.problem-card__opened {
  margin-top: 8rpx;
  color: #6f7b8d;
  font-size: 22rpx;
  line-height: 1.4;
}

@media (min-width: 768px) {
  .problem-card__visual { height: 352rpx; }
}
</style>
