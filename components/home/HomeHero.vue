<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'

const activeScene = ref(0)
const sceneImages = [
  '/static/hero-scene-math.png',
  '/static/hero-scene-physics.png',
  '/static/hero-scene-chemistry.png',
]
let fallbackTimer: ReturnType<typeof setInterval> | undefined

const startFallbackAnimation = () => {
  if (fallbackTimer) clearInterval(fallbackTimer)
  activeScene.value = 0
  fallbackTimer = setInterval(() => {
    activeScene.value = (activeScene.value + 1) % 3
  }, 2300)
}

onMounted(startFallbackAnimation)
onUnmounted(() => {
  if (fallbackTimer) clearInterval(fallbackTimer)
})
</script>

<template>
  <view class="home-hero">
    <view class="brand-row">
      <image
        class="brand-logo"
        src="/static/prism-brand.png"
        mode="aspectFit"
        aria-hidden="true"
      />
      <view class="brand-copy">
        <text class="brand-name">万有棱镜</text>
        <text class="brand-tagline">交互白板解题助手</text>
      </view>
    </view>

    <view class="hero-scene" aria-label="指针依次选择数学、物理与化学题目并切换对应图解的演示动画">
      <view class="notebook">
        <view class="notebook__page" />
        <view class="notebook__tabs">
          <view class="notebook__tab notebook__tab--blue" />
          <view class="notebook__tab notebook__tab--orange" />
          <view class="notebook__tab notebook__tab--gray" />
        </view>

        <view :class="['note-card', 'note-card--math', { 'note-card--active': activeScene === 0 }]">
          <text class="note-card__title">数学 · 二次函数</text>
          <text class="note-card__body">已知 y = (x − 2)² − 1</text>
          <text class="note-card__body">求顶点、对称轴和零点</text>
        </view>

        <view :class="['note-card', 'note-card--physics', { 'note-card--active': activeScene === 1 }]">
          <text class="note-card__title">物理 · 斜面受力</text>
          <text class="note-card__body">m = 2 kg，θ = 30°</text>
          <text class="note-card__body">画出受力，判断摩擦方向</text>
        </view>

        <view :class="['note-card', 'note-card--chemistry', { 'note-card--active': activeScene === 2 }]">
          <text class="note-card__title">化学 · 分子结构</text>
          <text class="note-card__body">CH₃CH₂OH</text>
          <text class="note-card__body">观察原子连接与空间构型</text>
        </view>

        <view :class="['demo-cursor', `demo-cursor--${activeScene}`]">
          <view class="demo-cursor__arrow" />
          <view class="demo-cursor__pulse" />
        </view>
      </view>

      <view class="graph-board">
        <image
          v-for="(sceneImage, sceneIndex) in sceneImages"
          :key="sceneImage"
          :class="['graph-scene-image', { 'graph-scene-image--active': activeScene === sceneIndex }]"
          :src="sceneImage"
          mode="aspectFit"
          aria-hidden="true"
        />
      </view>
    </view>

    <text class="hero-title">把难题变成看得见的步骤</text>
  </view>
</template>

<style scoped>
.home-hero {
  width: 100%;
}

.brand-row {
  display: flex;
  align-items: center;
  min-height: 80rpx;
}

.brand-logo {
  width: 80rpx;
  height: 80rpx;
  flex: 0 0 80rpx;
  border-radius: 20rpx;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-left: 18rpx;
}

.brand-name {
  color: #111827;
  font-size: 32rpx;
  font-weight: 800;
  line-height: 1.1;
}

.brand-tagline {
  margin-top: 6rpx;
  color: #6b7280;
  font-size: 20rpx;
  font-weight: 600;
  line-height: 1.1;
}

.hero-scene {
  position: relative;
  display: flex;
  align-items: stretch;
  height: 360rpx;
  margin-top: 18rpx;
}

.notebook {
  position: relative;
  width: 46%;
  height: 100%;
  transform: translateY(15rpx) scale(.84);
  transform-origin: top left;
}

.notebook__page {
  position: absolute;
  left: 8rpx;
  top: 18rpx;
  width: 86%;
  height: 88%;
  border: 3rpx solid #2d4563;
  border-radius: 18rpx 8rpx 18rpx 8rpx;
  background: #f7fbff;
  box-shadow: 8rpx 10rpx 0 #dbe7f5;
}

.notebook__tabs {
  position: absolute;
  right: 6%;
  top: 46rpx;
  z-index: 1;
  width: 18rpx;
}

.notebook__tab {
  width: 18rpx;
  height: 36rpx;
  margin-bottom: 10rpx;
  border-radius: 0 8rpx 8rpx 0;
}

.notebook__tab--blue { background: #5b9cf0; }
.notebook__tab--orange { background: #f0a15b; }
.notebook__tab--gray { background: #c5ced8; }

.note-card {
  position: absolute;
  left: 22rpx;
  z-index: 2;
  width: 78%;
  padding: 12rpx 16rpx 14rpx;
  border-radius: 16rpx;
  background: #ffffff;
  box-sizing: border-box;
  transition: transform 360ms ease, box-shadow 360ms ease;
}

.note-card--active { transform: translateX(7rpx) scale(1.025); }

.note-card--math {
  top: 32rpx;
  border: 3rpx solid #3d7ee8;
  box-shadow: 0 8rpx 18rpx rgba(61, 126, 232, 0.12);
}

.note-card--math.note-card--active { box-shadow: 0 10rpx 24rpx rgba(61, 126, 232, .25); }

.note-card--physics {
  top: 128rpx;
  border: 3rpx solid #2f9f88;
  box-shadow: 0 8rpx 18rpx rgba(47, 159, 136, 0.12);
}

.note-card--physics.note-card--active { box-shadow: 0 10rpx 24rpx rgba(47, 159, 136, .25); }

.note-card--chemistry {
  top: 236rpx;
  border: 3rpx solid #e25b4c;
  box-shadow: 0 8rpx 18rpx rgba(226, 91, 76, 0.12);
}

.note-card--chemistry.note-card--active { box-shadow: 0 10rpx 24rpx rgba(226, 91, 76, .25); }

.demo-cursor {
  position: absolute;
  z-index: 8;
  left: 126rpx;
  top: 74rpx;
  width: 34rpx;
  height: 42rpx;
  transition: top 460ms cubic-bezier(.22, .9, .35, 1), left 460ms cubic-bezier(.22, .9, .35, 1);
}

.demo-cursor--1 { top: 172rpx; left: 116rpx; }
.demo-cursor--2 { top: 278rpx; left: 130rpx; }

.demo-cursor__arrow {
  position: absolute;
  z-index: 2;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
  border-top: 24rpx solid #1f2937;
  border-right: 16rpx solid transparent;
  filter: drop-shadow(0 3rpx 3rpx rgba(255, 255, 255, .9));
  transform: rotate(-18deg);
}

.demo-cursor__pulse {
  position: absolute;
  top: 12rpx;
  left: 4rpx;
  width: 24rpx;
  height: 24rpx;
  box-sizing: border-box;
  border: 3rpx solid rgba(38, 116, 222, .52);
  border-radius: 50%;
  animation: cursor-pulse 1150ms ease-out infinite;
}

@keyframes cursor-pulse {
  0% { opacity: .85; transform: scale(.35); }
  75%, 100% { opacity: 0; transform: scale(1.45); }
}

.note-card__title {
  display: block;
  font-size: 20rpx;
  font-weight: 800;
  line-height: 1.25;
}

.note-card--math .note-card__title { color: #2f6fdb; }
.note-card--physics .note-card__title { color: #1f8a74; }
.note-card--chemistry .note-card__title { color: #d24b3d; }

.note-card__body {
  display: block;
  margin-top: 4rpx;
  color: #334155;
  font-size: 18rpx;
  font-weight: 600;
  line-height: 1.3;
}

.graph-board {
  position: relative;
  width: 54%;
  height: 100%;
  overflow: hidden;
  background: transparent;
}

.graph-scene-image {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transform: scale(.985);
  transition: opacity 320ms ease, transform 420ms ease;
}

.graph-scene-image--active {
  opacity: 1;
  transform: scale(1);
}

.hero-title {
  display: block;
  margin-top: 22rpx;
  color: #111827;
  font-size: 48rpx;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -1rpx;
  text-align: center;
}
</style>
