<script setup lang="ts">
const props = defineProps<{
  stepIndex: number
}>()

const roughTicks = [12, 23, 34, 45, 56, 67, 78, 89]
</script>

<template>
  <view class="incline-diagram">
    <view class="incline-diagram__grid" />
    <view class="incline-plane__fill" />
    <view class="incline-plane__base" />
    <view class="incline-plane__leg" />
    <view class="incline-plane__surface">
      <view
        v-for="position in roughTicks"
        :key="position"
        class="incline-plane__rough-mark"
        :style="{ left: `${position}%` }"
      />
    </view>
    <view class="incline-plane__angle-mark" />
    <text class="incline-plane__angle-label">θ = 30°</text>
    <text class="incline-plane__material">粗糙木板</text>

    <view class="incline-block"><text>m</text></view>
    <view class="incline-block__center" />

    <view v-if="props.stepIndex >= 1" class="force-arrow force-arrow--gravity">
      <view class="force-arrow__shaft" />
      <view class="force-arrow__head" />
    </view>
    <text v-if="props.stepIndex >= 1" class="force-label force-label--gravity">G = mg</text>

    <view v-if="props.stepIndex >= 2" class="force-arrow force-arrow--normal">
      <view class="force-arrow__shaft" />
      <view class="force-arrow__head" />
    </view>
    <text v-if="props.stepIndex >= 2" class="force-label force-label--normal">FN = mg cos θ</text>

    <view v-if="props.stepIndex >= 3" class="force-arrow force-arrow--friction">
      <view class="force-arrow__shaft" />
      <view class="force-arrow__head" />
    </view>
    <text v-if="props.stepIndex >= 3" class="force-label force-label--friction">Ff = mg sin θ</text>
  </view>
</template>

<style scoped>
.incline-diagram {
  position: relative;
  width: 100%;
  height: 430rpx;
  overflow: hidden;
  background: linear-gradient(180deg, #fbfdff 0%, #f6faff 100%);
}

.incline-diagram__grid {
  position: absolute;
  inset: 0;
  opacity: 0.7;
  background-image:
    linear-gradient(rgba(104, 147, 202, 0.08) 1rpx, transparent 1rpx),
    linear-gradient(90deg, rgba(104, 147, 202, 0.08) 1rpx, transparent 1rpx);
  background-size: 32rpx 32rpx;
}

.incline-plane__fill {
  position: absolute;
  z-index: 1;
  right: 10%;
  bottom: 102rpx;
  left: 9%;
  height: 205rpx;
  clip-path: polygon(0 100%, 100% 0, 100% 100%);
  background: linear-gradient(145deg, rgba(154, 223, 234, 0.08), rgba(97, 191, 214, 0.22));
}

.incline-plane__base {
  position: absolute;
  z-index: 2;
  right: 10%;
  bottom: 100rpx;
  left: 9%;
  height: 4rpx;
  border-radius: 4rpx;
  background: #55b8cd;
}

.incline-plane__leg {
  position: absolute;
  z-index: 2;
  right: 10%;
  bottom: 102rpx;
  width: 4rpx;
  height: 202rpx;
  border-radius: 4rpx;
  background: #55b8cd;
}

.incline-plane__surface {
  position: absolute;
  z-index: 3;
  bottom: 100rpx;
  left: 9%;
  width: 88%;
  height: 5rpx;
  border-radius: 5rpx;
  background: #39a9c2;
  transform: rotate(-26deg);
  transform-origin: left center;
}

.incline-plane__rough-mark {
  position: absolute;
  top: -7rpx;
  width: 3rpx;
  height: 18rpx;
  border-radius: 2rpx;
  background: #2d8da6;
  transform: rotate(28deg);
}

.incline-plane__angle-mark {
  position: absolute;
  z-index: 3;
  bottom: 102rpx;
  left: 10%;
  width: 74rpx;
  height: 41rpx;
  border-top: 3rpx solid #5aaec2;
  border-radius: 100% 100% 0 0;
  transform: rotate(-13deg);
  transform-origin: left bottom;
}

.incline-plane__angle-label {
  position: absolute;
  z-index: 4;
  bottom: 109rpx;
  left: 19%;
  color: #29849a;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 22rpx;
  font-weight: 700;
}

.incline-plane__material {
  position: absolute;
  z-index: 4;
  right: 13%;
  bottom: 72rpx;
  color: #7190a2;
  font-size: 18rpx;
  font-weight: 650;
}

.incline-block {
  position: absolute;
  z-index: 5;
  top: 129rpx;
  left: 49%;
  display: flex;
  width: 102rpx;
  height: 70rpx;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 28rpx;
  font-weight: 800;
  border: 3rpx solid #316fd4;
  border-radius: 15rpx;
  box-sizing: border-box;
  background: linear-gradient(145deg, #76a9ff, #3d75dc);
  box-shadow: 0 9rpx 18rpx rgba(52, 102, 190, 0.2);
  transform: rotate(-26deg);
}

.incline-block__center {
  position: absolute;
  z-index: 7;
  top: 160rpx;
  left: calc(49% + 48rpx);
  width: 9rpx;
  height: 9rpx;
  border: 3rpx solid #ffffff;
  border-radius: 50%;
  background: #284a78;
  box-shadow: 0 0 0 2rpx rgba(40, 74, 120, 0.35);
}

.force-arrow {
  position: absolute;
  z-index: 6;
  width: 116rpx;
  height: 24rpx;
  color: #d95d48;
  transform-origin: 0 center;
}

.force-arrow__shaft {
  position: absolute;
  top: 10rpx;
  left: 0;
  width: 105rpx;
  height: 5rpx;
  border-radius: 999rpx;
  background: currentColor;
}

.force-arrow__head {
  position: absolute;
  top: 2rpx;
  right: 0;
  width: 0;
  height: 0;
  border-top: 10rpx solid transparent;
  border-bottom: 10rpx solid transparent;
  border-left: 15rpx solid currentColor;
}

.force-arrow--gravity {
  top: 164rpx;
  left: calc(49% + 53rpx);
  color: #e86f3c;
  transform: rotate(90deg);
}

.force-arrow--normal {
  top: 164rpx;
  left: calc(49% + 52rpx);
  color: #3775df;
  transform: rotate(-116deg);
}

.force-arrow--friction {
  top: 163rpx;
  left: calc(49% + 53rpx);
  color: #2c9b7c;
  transform: rotate(-26deg);
}

.force-label {
  position: absolute;
  z-index: 7;
  padding: 2rpx 7rpx;
  font-family: Georgia, "Times New Roman", serif;
  font-size: 22rpx;
  font-weight: 800;
  border-radius: 7rpx;
  background: rgba(255, 255, 255, 0.88);
}

.force-label--gravity {
  top: 263rpx;
  left: calc(49% + 64rpx);
  color: #c9572d;
}

.force-label--normal {
  top: 70rpx;
  left: 27%;
  color: #275fbd;
}

.force-label--friction {
  top: 104rpx;
  left: 62%;
  color: #257e67;
}
</style>
