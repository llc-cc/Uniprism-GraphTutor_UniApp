<script setup lang="ts">
import { getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  sceneCenter,
  sceneRadius,
  type GeometryScene,
  type Vec3,
} from '../../data/geometry-scene'

const props = defineProps<{
  scene: GeometryScene
  canvasId: string
}>()

interface Vec {
  x: number
  y: number
  z: number
}

interface ScreenPoint {
  x: number
  y: number
  depth: number
}

const COLORS = {
  ink: '#2f4a6a',
  line: '#3d6aa8',
  dashed: '#8aa0b8',
  highlight: '#2f6fdb',
  auxiliary: '#9aa7b6',
  point: '#2f4a6a',
  emphasis: '#2f6fdb',
  label: '#2a3d56',
  face: 'rgba(61, 126, 232, 0.22)',
  faceMuted: 'rgba(90, 140, 168, 0.18)',
  angle: '#d04f7b',
}

const instance = getCurrentInstance()
const component = instance?.proxy
let canvasNode: { width: number; height: number } | null = null
let ctx: CanvasRenderingContext2D | null = null
let cssWidth = 0
let cssHeight = 0
let dpr = 1
let azimuth = props.scene.camera.azimuth
let elevation = props.scene.camera.elevation
let distanceScale = 1
let framed = false

type Gesture =
  | { kind: 'orbit'; x: number; y: number; azimuth: number; elevation: number }
  | { kind: 'pinch'; distance: number; scale: number }
  | null

let gesture: Gesture = null
let drawQueued = false
let initAttempts = 0
let initTimer: ReturnType<typeof setTimeout> | undefined
let destroyed = false
const zoomLabel = ref('100%')
const canvasError = ref('')

const toVec = (value: Vec3): Vec => ({ x: value[0], y: value[1], z: value[2] })
const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z })
const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
const scale = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s, z: a.z * s })
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y + a.z * b.z
const cross = (a: Vec, b: Vec): Vec => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
})
const length = (a: Vec) => Math.hypot(a.x, a.y, a.z)
const normalize = (a: Vec): Vec => {
  const len = length(a) || 1
  return scale(a, 1 / len)
}

const syncZoomLabel = () => {
  zoomLabel.value = `${Math.round((1 / distanceScale) * 100)}%`
}

const requestDraw = () => {
  syncZoomLabel()
  if (drawQueued) return
  drawQueued = true
  setTimeout(() => {
    drawQueued = false
    draw()
  }, 16)
}

const resetView = () => {
  azimuth = props.scene.camera.azimuth
  elevation = props.scene.camera.elevation
  distanceScale = 1
  requestDraw()
}

const zoomBy = (factor: number) => {
  distanceScale = Math.min(2.4, Math.max(0.42, distanceScale * factor))
  requestDraw()
}

const projectPoint = (point: Vec, center: Vec, radius: number): ScreenPoint | null => {
  const az = (azimuth * Math.PI) / 180
  const el = (elevation * Math.PI) / 180
  const distance = Math.max(radius * 3.25 * distanceScale, 0.8)
  const eye: Vec = {
    x: center.x + Math.sin(az) * Math.cos(el) * distance,
    y: center.y + Math.cos(az) * Math.cos(el) * distance,
    z: center.z + Math.sin(el) * distance,
  }
  const forward = normalize(sub(center, eye))
  const worldUp: Vec = { x: 0, y: 0, z: 1 }
  let right = cross(forward, worldUp)
  if (length(right) < 1e-5) right = { x: 1, y: 0, z: 0 }
  right = normalize(right)
  const up = normalize(cross(right, forward))
  const rel = sub(point, eye)
  const camX = dot(rel, right)
  const camY = dot(rel, up)
  const camZ = dot(rel, forward)
  if (camZ <= 0.12) return null
  const focal = Math.min(cssWidth, cssHeight) * 0.92
  return {
    x: cssWidth / 2 + (camX * focal) / camZ,
    y: cssHeight / 2 - (camY * focal) / camZ,
    depth: camZ,
  }
}

const pointMap = (scene: GeometryScene, center: Vec, radius: number) => {
  const map = new Map<string, { world: Vec; screen: ScreenPoint | null; source: GeometryScene['points'][number] }>()
  for (const point of scene.points) {
    const world = toVec(point.position)
    map.set(point.id, {
      world,
      screen: projectPoint(world, center, radius),
      source: point,
    })
  }
  return map
}

const drawLine = (
  from: ScreenPoint,
  to: ScreenPoint,
  style: GeometryScene['edges'][number]['style'],
) => {
  if (!ctx) return
  const highlight = style === 'highlight'
  const dashed = style === 'dashed'
  const auxiliary = style === 'auxiliary'
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.strokeStyle = highlight ? COLORS.highlight : dashed ? COLORS.dashed : auxiliary ? COLORS.auxiliary : COLORS.line
  ctx.lineWidth = highlight ? 3.2 : auxiliary ? 1.4 : 2.1
  ctx.setLineDash(dashed ? [7, 6] : auxiliary ? [4, 5] : [])
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.setLineDash([])
}

const draw = () => {
  if (!ctx || !cssWidth || !cssHeight) return
  const scene = props.scene
  const center = toVec(sceneCenter(scene))
  const radius = sceneRadius(scene, [center.x, center.y, center.z])
  const projected = pointMap(scene, center, radius)

  ctx.clearRect(0, 0, cssWidth, cssHeight)

  const faces = [...(scene.faces ?? [])].sort((a, b) => {
    const depthOf = (ids: string[]) => {
      const depths = ids.map((id) => projected.get(id)?.screen?.depth ?? 0)
      return depths.reduce((sum, value) => sum + value, 0) / Math.max(depths.length, 1)
    }
    return depthOf(b.points) - depthOf(a.points)
  })

  for (const face of faces) {
    const screens = face.points.map((id) => projected.get(id)?.screen).filter(Boolean) as ScreenPoint[]
    if (screens.length < 3) continue
    ctx.beginPath()
    ctx.moveTo(screens[0]!.x, screens[0]!.y)
    for (let index = 1; index < screens.length; index += 1) ctx.lineTo(screens[index]!.x, screens[index]!.y)
    ctx.closePath()
    ctx.fillStyle = face.style === 'highlight' ? COLORS.face : COLORS.faceMuted
    ctx.fill()
  }

  const edges = [...scene.edges].sort((a, b) => {
    const depth = (edge: GeometryScene['edges'][number]) => {
      const from = projected.get(edge.from)?.screen?.depth ?? 0
      const to = projected.get(edge.to)?.screen?.depth ?? 0
      return (from + to) / 2
    }
    return depth(b) - depth(a)
  })

  for (const edge of edges) {
    const from = projected.get(edge.from)?.screen
    const to = projected.get(edge.to)?.screen
    if (!from || !to) continue
    drawLine(from, to, edge.style)
  }

  for (const edge of scene.edges) {
    if (!edge.label) continue
    const from = projected.get(edge.from)?.screen
    const to = projected.get(edge.to)?.screen
    if (!from || !to) continue
    ctx.font = '600 11px sans-serif'
    ctx.fillStyle = edge.style === 'highlight' ? COLORS.highlight : COLORS.label
    ctx.textAlign = 'center'
    ctx.fillText(edge.label, (from.x + to.x) / 2, (from.y + to.y) / 2 - 8)
  }

  for (const annotation of scene.annotations ?? []) {
    const at = projected.get(annotation.at)
    const a = projected.get(annotation.points[0])
    const b = projected.get(annotation.points[1])
    if (!at?.screen || !a?.world || !b?.world || !at.world) continue
    if (annotation.kind === 'right-angle') {
      const dirA = normalize(sub(a.world, at.world))
      const dirB = normalize(sub(b.world, at.world))
      const size = 0.22
      const p1 = projectPoint(add(at.world, scale(dirA, size)), center, radius)
      const p2 = projectPoint(add(add(at.world, scale(dirA, size)), scale(dirB, size)), center, radius)
      const p3 = projectPoint(add(at.world, scale(dirB, size)), center, radius)
      if (!p1 || !p2 || !p3) continue
      ctx.beginPath()
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
      ctx.lineTo(p3.x, p3.y)
      ctx.strokeStyle = COLORS.ink
      ctx.lineWidth = 1.6
      ctx.stroke()
    }
    if (annotation.kind === 'angle' && a.screen && b.screen) {
      ctx.beginPath()
      ctx.arc(at.screen.x, at.screen.y, 16, 0, Math.PI * 0.7)
      ctx.strokeStyle = COLORS.angle
      ctx.lineWidth = 2
      ctx.stroke()
      ctx.fillStyle = COLORS.angle
      ctx.font = '700 12px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(annotation.text || '', at.screen.x + 14, at.screen.y - 8)
    }
  }

  for (const point of scene.points) {
    if (point.role === 'construction') continue
    const screen = projected.get(point.id)?.screen
    if (!screen) continue
    const radiusPx = point.emphasis ? 5.2 : 4
    ctx.beginPath()
    ctx.arc(screen.x, screen.y, radiusPx, 0, Math.PI * 2)
    ctx.fillStyle = point.emphasis ? COLORS.emphasis : COLORS.point
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = '#ffffff'
    ctx.stroke()
    ctx.fillStyle = COLORS.label
    ctx.font = point.emphasis ? '700 13px "Times New Roman", serif' : '600 12px "Times New Roman", serif'
    ctx.textAlign = 'left'
    ctx.fillText(point.label || point.id, screen.x + 7, screen.y - 7)
  }
}

const initCanvas = () => {
  if (destroyed) return
  if (!component) {
    canvasError.value = '图形组件尚未就绪，点击重试'
    return
  }
  const query = uni.createSelectorQuery().in(component as never)
  query
    .select(`#${props.canvasId}`)
    .fields({ node: true, size: true })
    .exec((res) => {
      if (destroyed) return
      const target = res?.[0]
      const measuredWidth = Number(target?.width ?? 0)
      const measuredHeight = Number(target?.height ?? 0)
      if (!target?.node || measuredWidth <= 0 || measuredHeight <= 0) {
        if (initAttempts < 20) {
          initAttempts += 1
          if (initTimer) clearTimeout(initTimer)
          initTimer = setTimeout(initCanvas, 80)
        } else {
          canvasError.value = '图形加载失败，点击重试'
        }
        return
      }
      const node = target.node as HTMLCanvasElement & { width: number; height: number }
      cssWidth = measuredWidth
      cssHeight = measuredHeight
      dpr = Math.min(uni.getSystemInfoSync().pixelRatio || 2, 2)
      node.width = cssWidth * dpr
      node.height = cssHeight * dpr
      const context = node.getContext('2d') as CanvasRenderingContext2D | null
      if (!context) {
        canvasError.value = '无法建立绘图环境，点击重试'
        return
      }
      context.scale(dpr, dpr)
      initAttempts = 0
      canvasError.value = ''
      canvasNode = node
      ctx = context
      if (!framed) {
        azimuth = props.scene.camera.azimuth
        elevation = props.scene.camera.elevation
        framed = true
      }
      draw()
    })
}

const retryCanvas = () => {
  if (initTimer) clearTimeout(initTimer)
  initAttempts = 0
  canvasError.value = ''
  void nextTick(() => initCanvas())
}

const touchDistance = (event: { touches: Array<{ clientX?: number; x?: number; clientY?: number; y?: number }> }) => {
  const [first, second] = event.touches
  if (!first || !second) return 0
  const ax = first.x ?? first.clientX ?? 0
  const ay = first.y ?? first.clientY ?? 0
  const bx = second.x ?? second.clientX ?? 0
  const by = second.y ?? second.clientY ?? 0
  return Math.hypot(ax - bx, ay - by)
}

const onTouchStart = (event: { touches: Array<{ clientX?: number; x?: number; clientY?: number; y?: number }> }) => {
  if (event.touches.length >= 2) {
    gesture = {
      kind: 'pinch',
      distance: Math.max(touchDistance(event), 1),
      scale: distanceScale,
    }
    return
  }
  const touch = event.touches[0]
  if (!touch) return
  gesture = {
    kind: 'orbit',
    x: touch.x ?? touch.clientX ?? 0,
    y: touch.y ?? touch.clientY ?? 0,
    azimuth,
    elevation,
  }
}

const onTouchMove = (event: { touches: Array<{ clientX?: number; x?: number; clientY?: number; y?: number }> }) => {
  if (!gesture) return
  if (gesture.kind === 'pinch' && event.touches.length >= 2) {
    const next = Math.max(touchDistance(event), 1)
    distanceScale = Math.min(2.4, Math.max(0.42, gesture.scale * (gesture.distance / next)))
    requestDraw()
    return
  }
  if (gesture.kind !== 'orbit') return
  const touch = event.touches[0]
  if (!touch) return
  const x = touch.x ?? touch.clientX ?? 0
  const y = touch.y ?? touch.clientY ?? 0
  azimuth = gesture.azimuth - (x - gesture.x) * 0.45
  elevation = Math.max(-12, Math.min(82, gesture.elevation + (y - gesture.y) * 0.32))
  requestDraw()
}

const onTouchEnd = () => {
  gesture = null
}

watch(() => props.scene, (scene) => {
  azimuth = scene.camera.azimuth
  elevation = scene.camera.elevation
  distanceScale = 1
  framed = true
  void nextTick(() => {
    if (ctx) requestDraw()
    else initCanvas()
  })
}, { deep: true, flush: 'post' })

onMounted(() => {
  void nextTick(() => initCanvas())
})

onBeforeUnmount(() => {
  destroyed = true
  if (initTimer) clearTimeout(initTimer)
  ctx = null
  canvasNode = null
})

defineExpose({
  resetView,
  zoomIn: () => zoomBy(0.82),
  zoomOut: () => zoomBy(1.22),
})
</script>

<template>
  <view class="scene-shell">
    <canvas
      :id="canvasId"
      :canvas-id="canvasId"
      class="scene-canvas"
      type="2d"
      :disable-scroll="true"
      @touchstart="onTouchStart"
      @touchmove.stop.prevent="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
    />
    <button
      v-if="canvasError"
      class="scene-retry"
      hover-class="scene-retry--pressed"
      @tap="retryCanvas"
    >
      {{ canvasError }}
    </button>
    <view class="scene-hint">
      <text>单指旋转 · 双指缩放</text>
    </view>
    <view class="viewport-controls">
      <button class="viewport-controls__btn" hover-class="viewport-controls__btn--pressed" @tap="zoomBy(1.22)">−</button>
      <button class="viewport-controls__scale" hover-class="viewport-controls__btn--pressed" @tap="resetView">
        <text>{{ zoomLabel }}</text>
        <text class="viewport-controls__caption">复位视角</text>
      </button>
      <button class="viewport-controls__btn" hover-class="viewport-controls__btn--pressed" @tap="zoomBy(0.82)">+</button>
    </view>
  </view>
</template>

<style scoped>
.scene-shell {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #ffffff;
}

.scene-canvas {
  width: 100%;
  height: 100%;
  display: block;
}

.scene-hint {
  position: absolute;
  left: 18rpx;
  top: 16rpx;
  padding: 6rpx 14rpx;
  color: #6b7a8d;
  font-size: 20rpx;
  font-weight: 650;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.88);
}

.scene-retry {
  position: absolute;
  left: 50%;
  top: 50%;
  width: auto;
  margin: 0;
  padding: 12rpx 24rpx;
  color: #3974e8;
  font-size: 22rpx;
  line-height: 1.4;
  border: 1rpx solid #bfd4f2;
  border-radius: 999rpx;
  background: #f4f8ff;
  transform: translate(-50%, -50%);
}

.scene-retry::after {
  border: 0;
}

.scene-retry--pressed {
  opacity: 0.76;
}

.viewport-controls {
  position: absolute;
  right: 16rpx;
  bottom: 16rpx;
  display: flex;
  align-items: center;
  overflow: hidden;
  border: 1rpx solid #dbe2ea;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: 0 8rpx 20rpx rgba(31, 41, 55, 0.08);
}

.viewport-controls__btn,
.viewport-controls__scale {
  height: 64rpx;
  margin: 0;
  padding: 0;
  color: #31445c;
  font-size: 32rpx;
  font-weight: 600;
  line-height: 64rpx;
  border: 0;
  background: transparent;
}

.viewport-controls__btn {
  width: 64rpx;
}

.viewport-controls__scale {
  min-width: 132rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 64rpx;
  padding: 0 12rpx;
  color: #1f2b3d;
  font-size: 20rpx;
  font-weight: 750;
  line-height: 1.05;
  border-left: 1rpx solid #e6ebf1;
  border-right: 1rpx solid #e6ebf1;
}

.viewport-controls__caption {
  color: #8a96a6;
  font-size: 16rpx;
  font-weight: 600;
}

.viewport-controls__btn--pressed {
  background: #f3f6fa;
}
</style>
