<script setup lang="ts">
const props = defineProps<{
  stepIndex: number
}>()
</script>

<template>
  <view class="ethanol-diagram">
    <!-- 碳骨架与普通共价键。位置和构型与 Web 白板使用同一组原子坐标。 -->
    <view class="structure-bond structure-bond--c1-c2" />
    <view v-if="props.stepIndex < 2" :class="['structure-bond', 'structure-bond--c2-o', { 'structure-bond--emphasis': props.stepIndex === 1 }]" />
    <view v-else class="double-bond double-bond--c2-o">
      <view class="double-bond__line double-bond__line--upper" />
      <view class="double-bond__line double-bond__line--lower" />
    </view>

    <view class="structure-bond structure-bond--c1-h1" />
    <view class="wedge-bond wedge-bond--c1-h2" />
    <view class="hash-bond hash-bond--c1-h3">
      <view class="hash-bond__tick hash-bond__tick--one" />
      <view class="hash-bond__tick hash-bond__tick--two" />
      <view class="hash-bond__tick hash-bond__tick--three" />
      <view class="hash-bond__tick hash-bond__tick--four" />
      <view class="hash-bond__tick hash-bond__tick--five" />
    </view>
    <view class="structure-bond structure-bond--c2-h4" />
    <view v-if="props.stepIndex < 2" class="structure-bond structure-bond--c2-h5" />
    <view v-if="props.stepIndex < 2" :class="['structure-bond', 'structure-bond--o-h6', { 'structure-bond--emphasis': props.stepIndex === 1 }]" />

    <!-- Web 端的原子是蓝色数学字体，不使用带阴影的原子球。 -->
    <text class="atom-label atom-label--c1">C</text>
    <text :class="['atom-label', 'atom-label--c2', { 'atom-label--derived': props.stepIndex >= 2 }]">C</text>
    <text :class="['atom-label', 'atom-label--o', { 'atom-label--emphasis': props.stepIndex === 1, 'atom-label--derived': props.stepIndex >= 2 }]">O</text>
    <text class="atom-label atom-label--h1">H</text>
    <text class="atom-label atom-label--h2">H</text>
    <text class="atom-label atom-label--h3">H</text>
    <text class="atom-label atom-label--h4">H</text>
    <text v-if="props.stepIndex < 2" class="atom-label atom-label--h5">H</text>
    <text v-if="props.stepIndex < 2" :class="['atom-label', 'atom-label--h6', { 'atom-label--emphasis': props.stepIndex === 1 }]">H</text>

    <view :class="['lone-pair', 'lone-pair--left', { 'lone-pair--emphasis': props.stepIndex === 1, 'lone-pair--derived': props.stepIndex >= 2 }]">
      <view class="lone-pair__dot" />
      <view class="lone-pair__dot" />
    </view>
    <view :class="['lone-pair', 'lone-pair--right', { 'lone-pair--emphasis': props.stepIndex === 1, 'lone-pair--derived': props.stepIndex >= 2 }]">
      <view class="lone-pair__dot" />
      <view class="lone-pair__dot" />
    </view>

    <text v-if="props.stepIndex === 1" class="group-name group-name--hydroxyl">羟基 —OH</text>
    <text v-if="props.stepIndex >= 2" class="group-name group-name--aldehyde">醛基 —CHO</text>
  </view>
</template>

<style scoped>
.ethanol-diagram {
  position: relative;
  width: 100%;
  height: 430rpx;
  overflow: hidden;
  background: #ffffff;
}

.structure-bond,
.double-bond {
  position: absolute;
  z-index: 1;
  height: 4rpx;
  transform-origin: left center;
}

.structure-bond {
  border-radius: 2rpx;
  background: #2f72bd;
}

.structure-bond--emphasis {
  height: 6rpx;
  background: #175da8;
}

.structure-bond--c1-c2 {
  top: 225rpx;
  left: 31%;
  width: 29%;
  transform: rotate(-16deg);
}

.structure-bond--c2-o,
.double-bond--c2-o {
  top: 173rpx;
  left: 58%;
  width: 25%;
  transform: rotate(17deg);
}

.structure-bond--c1-h1 {
  top: 225rpx;
  left: 31%;
  width: 190rpx;
  transform: rotate(-116deg);
}

.structure-bond--c2-h4 {
  top: 173rpx;
  left: 58%;
  width: 162rpx;
  transform: rotate(-110deg);
}

.structure-bond--c2-h5 {
  top: 173rpx;
  left: 58%;
  width: 218rpx;
  transform: rotate(73deg);
}

.structure-bond--o-h6 {
  top: 220rpx;
  left: 82%;
  width: 150rpx;
  transform: rotate(-54deg);
}

.double-bond__line {
  position: absolute;
  right: 0;
  left: 0;
  height: 4rpx;
  border-radius: 2rpx;
  background: #16849f;
}

.double-bond__line--upper {
  top: -7rpx;
}

.double-bond__line--lower {
  top: 7rpx;
}

.wedge-bond {
  position: absolute;
  z-index: 1;
  height: 30rpx;
  transform-origin: left center;
  clip-path: polygon(0 44%, 100% 0, 100% 100%, 0 56%);
  background: #2f72bd;
}

.wedge-bond--c1-h2 {
  top: 211rpx;
  left: 31%;
  width: 180rpx;
  transform: rotate(138deg);
}

.hash-bond {
  position: absolute;
  z-index: 1;
  height: 36rpx;
  transform-origin: left center;
}

.hash-bond--c1-h3 {
  top: 208rpx;
  left: 31%;
  width: 180rpx;
  transform: rotate(72deg);
}

.hash-bond__tick {
  position: absolute;
  top: 50%;
  width: 4rpx;
  border-radius: 2rpx;
  background: #2f72bd;
  transform: translate(-50%, -50%);
}

.hash-bond__tick--one {
  left: 22%;
  height: 8rpx;
}

.hash-bond__tick--two {
  left: 40%;
  height: 13rpx;
}

.hash-bond__tick--three {
  left: 58%;
  height: 18rpx;
}

.hash-bond__tick--four {
  left: 76%;
  height: 23rpx;
}

.hash-bond__tick--five {
  left: 94%;
  height: 28rpx;
}

.atom-label {
  position: absolute;
  z-index: 4;
  min-width: 34rpx;
  color: #2f72bd;
  font-family: Cambria, Georgia, "Times New Roman", serif;
  font-size: 30rpx;
  font-style: italic;
  font-weight: 700;
  line-height: 38rpx;
  text-align: center;
  text-shadow: -4rpx 0 #ffffff, 0 4rpx #ffffff, 4rpx 0 #ffffff, 0 -4rpx #ffffff;
  transform: translate(-50%, -50%);
}

.atom-label--emphasis {
  color: #175da8;
}

.atom-label--derived {
  color: #16849f;
}

.atom-label--c1 {
  top: 225rpx;
  left: 31%;
}

.atom-label--c2 {
  top: 173rpx;
  left: 58%;
}

.atom-label--o {
  top: 220rpx;
  left: 82%;
}

.atom-label--h1 {
  top: 54rpx;
  left: 18%;
}

.atom-label--h2 {
  top: 350rpx;
  left: 8%;
}

.atom-label--h3 {
  top: 395rpx;
  left: 39%;
}

.atom-label--h4 {
  top: 42rpx;
  left: 50%;
}

.atom-label--h5 {
  top: 394rpx;
  left: 68%;
}

.atom-label--h6 {
  top: 92rpx;
  left: 95%;
}

.lone-pair {
  position: absolute;
  z-index: 5;
  display: flex;
  align-items: center;
  color: #2f72bd;
  transform: translate(-50%, -50%);
}

.lone-pair--left {
  top: 220rpx;
  left: 75.5%;
}

.lone-pair--right {
  top: 220rpx;
  left: 88.5%;
}

.lone-pair__dot {
  width: 8rpx;
  height: 8rpx;
  margin: 0 3rpx;
  border-radius: 50%;
  background: #2f72bd;
}

.lone-pair--emphasis .lone-pair__dot {
  background: #175da8;
}

.lone-pair--derived .lone-pair__dot {
  background: #16849f;
}

.group-name {
  position: absolute;
  z-index: 7;
  padding: 2rpx 8rpx;
  color: #175da8;
  font-size: 20rpx;
  font-weight: 700;
  line-height: 30rpx;
  border-radius: 8rpx;
  background: rgba(255, 255, 255, 0.94);
}

.group-name--hydroxyl {
  top: 118rpx;
  right: 0;
}

.group-name--aldehyde {
  top: 126rpx;
  right: 70rpx;
  color: #16849f;
}
</style>
