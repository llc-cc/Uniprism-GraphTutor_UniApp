<template>
  <view class="home-hero">
    <view class="brand-row">
      <image
        class="brand-logo"
        src="/static/prism-logo.png"
        mode="aspectFit"
        aria-hidden="true"
      />
      <view class="brand-copy">
        <text class="brand-name">万有棱镜</text>
        <text class="brand-tagline">交互白板解题助手</text>
      </view>
    </view>

    <view class="hero-scene" aria-label="题目卡片与二次函数图解">
      <view class="notebook">
        <view class="notebook__page" />
        <view class="notebook__tabs">
          <view class="notebook__tab notebook__tab--blue" />
          <view class="notebook__tab notebook__tab--orange" />
          <view class="notebook__tab notebook__tab--gray" />
        </view>

        <view class="note-card note-card--math">
          <text class="note-card__title">数学 · 二次函数</text>
          <text class="note-card__body">已知 y = (x − 2)² − 1</text>
          <text class="note-card__body">求顶点、对称轴和零点</text>
        </view>

        <view class="note-card note-card--physics">
          <text class="note-card__title">物理 · 斜面受力</text>
          <text class="note-card__body">m = 2 kg，θ = 30°</text>
          <text class="note-card__body">画出受力，判断摩擦方向</text>
        </view>

        <view class="note-card note-card--chemistry">
          <text class="note-card__title">化学 · 分子结构</text>
          <text class="note-card__body">CH₃CH₂OH</text>
          <text class="note-card__body">观察原子连接与空间构型</text>
        </view>
      </view>

      <view class="graph-board">
        <view class="graph-grid" />
        <view class="graph-axis graph-axis--y" />
        <view class="graph-axis graph-axis--x" />
        <view class="graph-arrow graph-arrow--y" />
        <view class="graph-arrow graph-arrow--x" />
        <view class="graph-dash graph-dash--left" />
        <view class="graph-dash graph-dash--right" />
        <view class="graph-curve graph-curve--left" />
        <view class="graph-curve graph-curve--right" />
        <view class="graph-point graph-point--zero-left" />
        <view class="graph-point graph-point--zero-right" />
        <view class="graph-point graph-point--vertex" />
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
  min-height: 72rpx;
}

.brand-logo {
  width: 64rpx;
  height: 64rpx;
  flex: 0 0 64rpx;
  border-radius: 16rpx;
}

.brand-copy {
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-left: 16rpx;
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
}

.note-card--math {
  top: 32rpx;
  border: 3rpx solid #3d7ee8;
  box-shadow: 0 8rpx 18rpx rgba(61, 126, 232, 0.12);
}

.note-card--physics {
  top: 128rpx;
  border: 3rpx solid #2f9f88;
  box-shadow: 0 8rpx 18rpx rgba(47, 159, 136, 0.12);
}

.note-card--chemistry {
  top: 236rpx;
  border: 3rpx solid #e25b4c;
  box-shadow: 0 8rpx 18rpx rgba(226, 91, 76, 0.12);
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
  border: 3rpx solid #2d4563;
  border-radius: 22rpx;
  background: #ffffff;
  box-shadow: 0 12rpx 28rpx rgba(45, 69, 99, 0.08);
}

.graph-grid {
  position: absolute;
  top: 18rpx;
  right: 18rpx;
  bottom: 18rpx;
  left: 18rpx;
  opacity: 0.9;
  background-image: linear-gradient(#e7edf5 2rpx, transparent 2rpx), linear-gradient(90deg, #e7edf5 2rpx, transparent 2rpx);
  background-size: 28rpx 28rpx;
}

.graph-axis {
  position: absolute;
  z-index: 1;
  background: #1f2b3d;
}

.graph-axis--x {
  left: 28rpx;
  right: 36rpx;
  top: 186rpx;
  height: 3rpx;
}

.graph-axis--y {
  left: 176rpx;
  top: 28rpx;
  bottom: 36rpx;
  width: 3rpx;
}

.graph-arrow {
  position: absolute;
  z-index: 2;
  width: 12rpx;
  height: 12rpx;
  border: solid #1f2b3d;
  box-sizing: border-box;
}

.graph-arrow--y {
  left: 171rpx;
  top: 24rpx;
  border-width: 3rpx 3rpx 0 0;
  transform: rotate(-45deg);
}

.graph-arrow--x {
  right: 28rpx;
  top: 181rpx;
  border-width: 3rpx 3rpx 0 0;
  transform: rotate(45deg);
}

.graph-dash,
.graph-curve {
  position: absolute;
  z-index: 2;
  box-sizing: border-box;
  border-radius: 0 0 55% 55%;
}

.graph-dash {
  top: 68rpx;
  width: 78rpx;
  height: 100rpx;
  border: dashed #94a3b8;
  border-width: 0 4rpx 4rpx;
}

.graph-dash--left {
  left: 102rpx;
  transform: rotate(18deg);
}

.graph-dash--right {
  left: 176rpx;
  transform: rotate(-18deg);
}

.graph-curve {
  top: 84rpx;
  width: 92rpx;
  height: 128rpx;
  border: solid #3474d9;
  border-width: 0 5rpx 5rpx;
}

.graph-curve--left {
  left: 88rpx;
  transform: rotate(16deg);
}

.graph-curve--right {
  left: 176rpx;
  transform: rotate(-16deg);
}

.graph-point {
  position: absolute;
  z-index: 3;
  width: 16rpx;
  height: 16rpx;
  border: 4rpx solid #ffffff;
  border-radius: 50%;
  box-sizing: border-box;
}

.graph-point--zero-left,
.graph-point--zero-right {
  background: #ffffff;
  border: 4rpx solid #3474d9;
}

.graph-point--zero-left {
  left: 118rpx;
  top: 179rpx;
}

.graph-point--zero-right {
  left: 226rpx;
  top: 179rpx;
}

.graph-point--vertex {
  left: 168rpx;
  top: 214rpx;
  background: #e87461;
  border-color: #ffffff;
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
