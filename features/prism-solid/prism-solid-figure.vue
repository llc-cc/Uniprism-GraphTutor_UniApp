<script setup lang="ts">
import { computed, ref } from 'vue'

type TouchPoint = {
  x?: number
  y?: number
  clientX?: number
  clientY?: number
  pageX?: number
  pageY?: number
}

type OrbitGesture = {
  kind: 'orbit'
  x: number
  y: number
  azimuth: number
  elevation: number
}

type PinchGesture = {
  kind: 'pinch'
  distance: number
  zoom: number
}

type OrbitFrameSet = readonly (readonly (readonly string[])[])[]

const props = defineProps<{
  step: number
  frames?: OrbitFrameSet
}>()

const AZIMUTH_FRAME_COUNT = 18
const ELEVATION_FRAME_COUNT = 3
const DEFAULT_AZIMUTH_FRAME = 0
const DEFAULT_ELEVATION_FRAME = 1
const FRAME_DRAG_DISTANCE = 42
const ELEVATION_DRAG_DISTANCE = 76

const azimuthPosition = ref(DEFAULT_AZIMUTH_FRAME)
const elevationPosition = ref(DEFAULT_ELEVATION_FRAME)
const zoom = ref(1)
const orbitStarted = ref(false)
const gesture = ref<OrbitGesture | PinchGesture | null>(null)
const moved = ref(false)
let lastTapAt = 0

const clamp = (value: number, minimum: number, maximum: number) => (
  Math.max(minimum, Math.min(maximum, value))
)

const wrapFrame = (value: number) => {
  const rounded = Math.round(value) % AZIMUTH_FRAME_COUNT
  return rounded < 0 ? rounded + AZIMUTH_FRAME_COUNT : rounded
}

const stepIndex = computed(() => clamp(Math.trunc(props.step), 0, 2))
const azimuthFrame = computed(() => wrapFrame(azimuthPosition.value))
const elevationFrame = computed(() => clamp(
  Math.round(elevationPosition.value),
  0,
  ELEVATION_FRAME_COUNT - 1,
))
const zoomPercent = computed(() => Math.round(zoom.value * 100))

const sourceFor = (azimuth: number, elevation = elevationFrame.value) => {
  const frame = wrapFrame(azimuth)
  return props.frames?.[stepIndex.value]?.[elevation]?.[frame]
    ?? `/static/geometry/prism-step-${stepIndex.value + 1}.png`
}

const currentSource = computed(() => (
  orbitStarted.value
    ? sourceFor(azimuthFrame.value)
    : `/static/geometry/prism-step-${stepIndex.value + 1}.png`
))
const preloadSources = computed(() => {
  const candidates = [
    sourceFor(azimuthFrame.value - 1),
    sourceFor(azimuthFrame.value + 1),
    sourceFor(azimuthFrame.value, clamp(elevationFrame.value - 1, 0, ELEVATION_FRAME_COUNT - 1)),
    sourceFor(azimuthFrame.value, clamp(elevationFrame.value + 1, 0, ELEVATION_FRAME_COUNT - 1)),
  ]
  return [...new Set(candidates)].filter((source) => source !== currentSource.value)
})

const toPoints = (list?: ArrayLike<TouchPoint> | TouchList | null): TouchPoint[] => (
  list ? Array.from(list as ArrayLike<TouchPoint>) : []
)

const touchXY = (touch: TouchPoint) => ({
  x: touch.x ?? touch.clientX ?? touch.pageX ?? 0,
  y: touch.y ?? touch.clientY ?? touch.pageY ?? 0,
})

const touchDistance = (touches: TouchPoint[]) => {
  const first = touches[0]
  const second = touches[1]
  if (!first || !second) return 0
  const a = touchXY(first)
  const b = touchXY(second)
  return Math.hypot(a.x - b.x, a.y - b.y)
}

const resetView = () => {
  azimuthPosition.value = DEFAULT_AZIMUTH_FRAME
  elevationPosition.value = DEFAULT_ELEVATION_FRAME
  zoom.value = 1
  orbitStarted.value = false
}

const zoomIn = () => {
  zoom.value = clamp(zoom.value * 1.16, 0.72, 2.4)
}

const zoomOut = () => {
  zoom.value = clamp(zoom.value / 1.16, 0.72, 2.4)
}

const cancelGesture = () => {
  gesture.value = null
}

const onTouchStart = (event: TouchEvent) => {
  const touches = toPoints(event.touches)
  if (touches.length >= 2) {
    gesture.value = {
      kind: 'pinch',
      distance: Math.max(1, touchDistance(touches)),
      zoom: zoom.value,
    }
    moved.value = true
    return
  }

  const touch = touches[0]
  if (!touch) return
  const point = touchXY(touch)
  gesture.value = {
    kind: 'orbit',
    x: point.x,
    y: point.y,
    azimuth: azimuthPosition.value,
    elevation: elevationPosition.value,
  }
  moved.value = false
}

const onTouchMove = (event: TouchEvent) => {
  const active = gesture.value
  if (!active) return
  const touches = toPoints(event.touches)

  if (active.kind === 'pinch' && touches.length >= 2) {
    zoom.value = clamp(
      active.zoom * (Math.max(1, touchDistance(touches)) / active.distance),
      0.72,
      2.4,
    )
    return
  }

  if (active.kind !== 'orbit') return
  const touch = touches[0]
  if (!touch) return
  const point = touchXY(touch)
  const deltaX = point.x - active.x
  const deltaY = point.y - active.y
  if (Math.hypot(deltaX, deltaY) > 5) {
    moved.value = true
    orbitStarted.value = true
  }
  azimuthPosition.value = active.azimuth - deltaX / FRAME_DRAG_DISTANCE
  elevationPosition.value = clamp(
    active.elevation + deltaY / ELEVATION_DRAG_DISTANCE,
    0,
    ELEVATION_FRAME_COUNT - 1,
  )
}

const onTouchEnd = (event: TouchEvent) => {
  if (event.touches.length >= 2) return
  const wasTap = gesture.value?.kind === 'orbit' && !moved.value
  gesture.value = null
  if (!wasTap) return

  const now = Date.now()
  if (now - lastTapAt < 320) {
    resetView()
    lastTapAt = 0
    return
  }
  lastTapAt = now
}
</script>

<template>
  <view
    class="prism-orbit"
    @touchstart="onTouchStart"
    @touchmove.stop.prevent="onTouchMove"
    @touchend="onTouchEnd"
    @touchcancel="onTouchEnd"
  >
    <image
      class="prism-orbit__image"
      :src="currentSource"
      mode="aspectFit"
      :show-menu-by-longpress="false"
      :style="{ transform: `scale(${zoom})` }"
    />

    <image
      v-for="source in preloadSources"
      :key="source"
      class="prism-orbit__preload"
      :src="source"
      mode="aspectFit"
    />

    <view
      class="prism-orbit__zoom-controls"
      @touchstart.stop="cancelGesture"
      @touchmove.stop="cancelGesture"
      @touchend.stop="cancelGesture"
    >
      <button class="prism-orbit__zoom-button" @tap.stop="zoomOut">−</button>
      <button class="prism-orbit__reset-button" @tap.stop="resetView">
        <text class="prism-orbit__zoom-value">{{ zoomPercent }}%</text>
        <text class="prism-orbit__reset-label">复位</text>
      </button>
      <button class="prism-orbit__zoom-button prism-orbit__zoom-button--plus" @tap.stop="zoomIn">+</button>
    </view>

    <view class="prism-orbit__hints">
      <text class="prism-orbit__hint">拖动旋转</text>
      <text class="prism-orbit__hint">双指缩放</text>
      <text class="prism-orbit__hint">双击复位</text>
    </view>
  </view>
</template>

<style scoped>
.prism-orbit {
  position: relative;
  width: 100%;
  height: 620rpx;
  overflow: hidden;
  background: #ffffff;
}

.prism-orbit__image {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: center center;
  transition: transform 120ms ease-out;
}

.prism-orbit__preload {
  position: absolute;
  left: -4rpx;
  bottom: -4rpx;
  width: 2rpx;
  height: 2rpx;
  opacity: 0.01;
  pointer-events: none;
}

.prism-orbit__zoom-controls {
  position: absolute;
  left: 14rpx;
  bottom: 14rpx;
  display: flex;
  align-items: stretch;
  overflow: hidden;
  border: 1rpx solid #dfe5ec;
  border-radius: 14rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 5rpx 16rpx rgba(31, 55, 82, 0.09);
}

.prism-orbit__zoom-button,
.prism-orbit__reset-button {
  min-height: 54rpx;
  margin: 0;
  padding: 0;
  color: #657286;
  line-height: 1;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.prism-orbit__zoom-button::after,
.prism-orbit__reset-button::after {
  border: 0;
}

.prism-orbit__zoom-button {
  width: 54rpx;
  font-size: 30rpx;
}

.prism-orbit__zoom-button--plus,
.prism-orbit__reset-button {
  border-left: 1rpx solid #e5eaf0;
}

.prism-orbit__reset-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 94rpx;
}

.prism-orbit__zoom-value {
  color: #5f6d80;
  font-size: 17rpx;
  font-weight: 750;
}

.prism-orbit__reset-label {
  margin-top: 2rpx;
  color: #9aa4b3;
  font-size: 13rpx;
  font-weight: 700;
}

.prism-orbit__hints {
  position: absolute;
  right: 14rpx;
  bottom: 14rpx;
  display: flex;
  align-items: center;
}

.prism-orbit__hint {
  margin-left: 8rpx;
  padding: 10rpx 12rpx;
  color: #8290a0;
  font-size: 16rpx;
  font-weight: 700;
  border: 1rpx solid #e2e7ed;
  border-radius: 12rpx;
  background: rgba(255, 255, 255, 0.94);
}
</style>
