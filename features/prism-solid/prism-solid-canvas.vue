<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  clampElevation,
  clampZoom,
  DEFAULT_PRISM_CAMERA,
  wrapAzimuth,
  type OrbitCamera,
} from './camera'
import { drawPrismSolid, type PrismDrawContext } from './draw'
import { buildPrismSolidScene, pickPrismObject, type PrismObjectId } from './scene'

type TouchPoint = { x?: number, y?: number, clientX?: number, clientY?: number }
type Gesture =
  | { kind: 'orbit', x: number, y: number, azimuth: number, elevation: number }
  | { kind: 'pinch', distance: number, zoom: number }
  | null

type MiniProgramCanvas = {
  width: number
  height: number
  getContext: (type: '2d') => PrismDrawContext | null
  requestAnimationFrame?: (callback: () => void) => number
  cancelAnimationFrame?: (id: number) => void
}

const props = defineProps<{
  step: number
  selectedId?: string
}>()

const emit = defineEmits<{
  select: [id: PrismObjectId]
}>()

const canvasId = 'prismSolid'
const hint = ref('单指旋转 · 双指缩放')
const camera = ref<OrbitCamera>({ ...DEFAULT_PRISM_CAMERA })
const zoom = ref(1)
const zoomPercent = computed(() => Math.round(zoom.value * 100))
const cssSize = ref({ width: 300, height: 320 })

let canvasNode: MiniProgramCanvas | null = null
let ctx: PrismDrawContext | null = null
let dpr = 1
let gesture: Gesture = null
let moved = false
let attachAttempts = 0
let paintPending = false
let animationFrame: number | null = null
let paintTimer: ReturnType<typeof setTimeout> | null = null

const instance = getCurrentInstance()

const touchXY = (touch: TouchPoint) => ({
  x: touch.x ?? touch.clientX ?? 0,
  y: touch.y ?? touch.clientY ?? 0,
})

const touchDistance = (touches: TouchPoint[]) => {
  const [first, second] = touches
  if (!first || !second) return 0
  const a = touchXY(first)
  const b = touchXY(second)
  return Math.hypot(a.x - b.x, a.y - b.y)
}

const paint = () => {
  if (!ctx) return
  ctx.setTransform?.(dpr, 0, 0, dpr, 0, 0)
  const scene = buildPrismSolidScene(props.step, camera.value)
  drawPrismSolid(ctx, scene, camera.value, cssSize.value.width, cssSize.value.height, {
    selectedId: props.selectedId,
    zoom: zoom.value,
  })
}

/**
 * Touch events can arrive faster than the screen refresh rate. Drawing every
 * event blocks the mini-program JS thread; coalescing them into the canvas
 * refresh callback keeps orbiting locked to the latest finger position.
 */
const requestPaint = () => {
  if (!ctx || paintPending) return
  paintPending = true
  const render = () => {
    paintPending = false
    animationFrame = null
    paintTimer = null
    paint()
  }
  if (canvasNode?.requestAnimationFrame) {
    animationFrame = canvasNode.requestAnimationFrame(render)
    return
  }
  paintTimer = setTimeout(render, 16)
}

const cancelPendingPaint = () => {
  if (animationFrame !== null) canvasNode?.cancelAnimationFrame?.(animationFrame)
  if (paintTimer !== null) clearTimeout(paintTimer)
  animationFrame = null
  paintTimer = null
  paintPending = false
}

const toPoints = (list?: ArrayLike<TouchPoint> | TouchList | null): TouchPoint[] => (
  list ? Array.from(list as ArrayLike<TouchPoint>) : []
)

const attachCanvas = () => {
  const proxy = instance?.proxy
  const query = uni.createSelectorQuery()
  if (proxy) query.in(proxy)
  query
    .select(`#${canvasId}`)
    .fields({ node: true, size: true }, (result) => {
      const target = (Array.isArray(result) ? result[0] : result) as
        | { node?: typeof canvasNode, width?: number, height?: number }
        | undefined
      if (!target?.node) {
        if (attachAttempts < 12) {
          attachAttempts += 1
          setTimeout(attachCanvas, 80)
        }
        return
      }
      const width = Math.max(1, target.width ?? 300)
      const height = Math.max(1, target.height ?? 320)
      // The Web renderer also caps DPR at 2. A 3x backing store has 2.25x the
      // pixels of 2x but brings no visible gain at this viewport size.
      dpr = Math.min(uni.getWindowInfo().pixelRatio || 1, 2)
      canvasNode = target.node
      canvasNode.width = Math.round(width * dpr)
      canvasNode.height = Math.round(height * dpr)
      cssSize.value = { width, height }
      ctx = canvasNode.getContext('2d')
      if (!ctx) return
      attachAttempts = 0
      paint()
    })
    .exec()
}

const onTouchStart = (event: TouchEvent) => {
  const touches = toPoints(event.touches)
  if (touches.length >= 2) {
    gesture = {
      kind: 'pinch',
      distance: Math.max(touchDistance(touches), 1),
      zoom: zoom.value,
    }
    moved = true
    return
  }
  const touch = touches[0]
  if (!touch) return
  const point = touchXY(touch)
  gesture = {
    kind: 'orbit',
    x: point.x,
    y: point.y,
    azimuth: camera.value.azimuth,
    elevation: camera.value.elevation,
  }
  moved = false
}

const onTouchMove = (event: TouchEvent) => {
  if (!gesture) return
  const touches = toPoints(event.touches)
  if (gesture.kind === 'pinch' && touches.length >= 2) {
    const next = Math.max(touchDistance(touches), 1)
    zoom.value = clampZoom(gesture.zoom * (next / gesture.distance))
    hint.value = '双指缩放'
    requestPaint()
    return
  }
  if (gesture.kind !== 'orbit') return
  const touch = touches[0]
  if (!touch) return
  const point = touchXY(touch)
  const dx = point.x - gesture.x
  const dy = point.y - gesture.y
  if (Math.hypot(dx, dy) > 6) moved = true
  camera.value = {
    azimuth: wrapAzimuth(gesture.azimuth - dx * 0.45),
    elevation: clampElevation(gesture.elevation + dy * 0.32),
  }
  hint.value = '单指旋转 · 双指缩放'
  requestPaint()
}

const onTouchEnd = (event: TouchEvent) => {
  const stillPinching = event.touches.length >= 2
  if (stillPinching) return
  const wasOrbitTap = gesture?.kind === 'orbit' && !moved
  const touch = toPoints(event.changedTouches)[0]
  gesture = null
  if (!wasOrbitTap || !touch || !ctx) {
    hint.value = '单指旋转 · 双指缩放'
    return
  }
  const proxy = instance?.proxy
  const query = uni.createSelectorQuery()
  if (proxy) query.in(proxy)
  query.select(`#${canvasId}`).boundingClientRect((rect) => {
    const box = rect as { left?: number, top?: number } | undefined
    const x = touch.x ?? ((touch.clientX ?? 0) - (box?.left ?? 0))
    const y = touch.y ?? ((touch.clientY ?? 0) - (box?.top ?? 0))
    const scene = buildPrismSolidScene(props.step, camera.value)
    const projected = drawPrismSolid(ctx!, scene, camera.value, cssSize.value.width, cssSize.value.height, {
      selectedId: props.selectedId,
      zoom: zoom.value,
    })
    const hit = pickPrismObject(scene, projected, x, y)
    if (hit) emit('select', hit)
  }).exec()
}

const resetView = () => {
  camera.value = { ...DEFAULT_PRISM_CAMERA }
  zoom.value = 1
  hint.value = '单指旋转 · 双指缩放'
  requestPaint()
}

const zoomIn = () => {
  zoom.value = clampZoom(zoom.value * 1.12)
  requestPaint()
}

const zoomOut = () => {
  zoom.value = clampZoom(zoom.value / 1.12)
  requestPaint()
}

watch(() => [props.step, props.selectedId], () => {
  // Match the Web whiteboard: changing the explanation step updates geometry
  // while preserving the student's current camera and zoom.
  requestPaint()
})

onMounted(() => {
  void nextTick(() => attachCanvas())
})

onBeforeUnmount(() => {
  cancelPendingPaint()
  ctx = null
  canvasNode = null
})
</script>

<template>
  <view class="prism-solid">
    <canvas
      :id="canvasId"
      :canvas-id="canvasId"
      type="2d"
      class="prism-solid__canvas"
      :disable-scroll="true"
      @touchstart="onTouchStart"
      @touchmove.stop.prevent="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
    />
    <text class="prism-solid__hint">{{ hint }}</text>
    <view
      class="prism-solid__controls"
      @touchstart.stop
      @touchmove.stop.prevent
      @touchend.stop
    >
      <button class="prism-solid__control prism-solid__zoom" @tap.stop="zoomOut">−</button>
      <button class="prism-solid__control prism-solid__scale" @tap.stop="resetView">
        <text class="prism-solid__scale-value">{{ zoomPercent }}%</text>
        <text class="prism-solid__scale-label">复位视角</text>
      </button>
      <button class="prism-solid__control prism-solid__zoom prism-solid__zoom--in" @tap.stop="zoomIn">+</button>
    </view>
  </view>
</template>

<style scoped>
.prism-solid {
  position: relative;
  width: 100%;
  height: 620rpx;
  overflow: hidden;
  background: #ffffff;
  box-sizing: border-box;
}

.prism-solid__canvas {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 620rpx;
}

.prism-solid__hint {
  position: absolute;
  top: 16rpx;
  left: 18rpx;
  z-index: 3;
  color: #7a8798;
  font-size: 18rpx;
  pointer-events: none;
}

.prism-solid__controls {
  position: absolute;
  right: 14rpx;
  bottom: 14rpx;
  z-index: 4;
  display: flex;
  align-items: stretch;
  overflow: hidden;
  border: 1rpx solid #d2d9e2;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 6rpx 18rpx rgba(34, 49, 70, 0.09);
}

.prism-solid__control {
  min-height: 58rpx;
  margin: 0;
  padding: 0;
  color: #657286;
  line-height: 1;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.prism-solid__scale,
.prism-solid__zoom--in {
  border-left: 1rpx solid #e4e9f0;
}

.prism-solid__control::after {
  border: 0;
}

.prism-solid__zoom {
  width: 58rpx;
  font-size: 32rpx;
  font-weight: 500;
}

.prism-solid__scale {
  width: 112rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2rpx;
}

.prism-solid__scale-value {
  color: #657286;
  font-size: 18rpx;
  font-weight: 750;
}

.prism-solid__scale-label {
  color: #9aa4b3;
  font-size: 14rpx;
  font-weight: 700;
}
</style>
