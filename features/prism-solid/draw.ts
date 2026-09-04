import { projectPoints, type OrbitCamera, type ScreenPoint } from './camera'
import type { PrismFace, PrismObjectId, PrismSolidScene } from './scene'

export interface PrismDrawContext {
  clearRect(x: number, y: number, w: number, h: number): void
  beginPath(): void
  moveTo(x: number, y: number): void
  lineTo(x: number, y: number): void
  closePath(): void
  stroke(): void
  fill(): void
  arc(x: number, y: number, r: number, start: number, end: number, ccw?: boolean): void
  fillText(text: string, x: number, y: number): void
  setLineDash(segments: number[]): void
  save(): void
  restore(): void
  scale?(x: number, y: number): void
  setTransform?(a: number, b: number, c: number, d: number, e: number, f: number): void
  fillStyle: string
  strokeStyle: string
  lineWidth: number
  lineCap: string
  lineJoin: string
  font: string
  textAlign: CanvasTextAlign
  textBaseline: CanvasTextBaseline
  globalAlpha: number
}

const COLOR = {
  edge: '#2f72bd',
  hidden: '#2f72bd',
  highlight: '#175da8',
  selected: '#d85b35',
  auxiliary: '#9da7b4',
  section: 'rgba(23, 93, 168, 0.20)',
  surface: 'rgba(47, 114, 189, 0.12)',
  dihedral: 'rgba(23, 93, 168, 0.20)',
  point: '#175da8',
  vertex: '#2f72bd',
  label: '#175da8',
  angle: '#a56200',
}

const selectedPaint = (selected: boolean, paint: string) => (selected ? COLOR.selected : paint)

export const drawPrismSolid = (
  ctx: PrismDrawContext,
  scene: PrismSolidScene,
  camera: OrbitCamera,
  width: number,
  height: number,
  options: { selectedId?: string, zoom?: number } = {},
) => {
  const projected = projectPoints(scene.points, camera, width, height, scene.frame, options.zoom ?? 1)
  ctx.clearRect(0, 0, width, height)

  const selected = options.selectedId ?? ''
  const faces = [...scene.faces].sort((left, right) => (
    faceDepth(left, projected) - faceDepth(right, projected)
  ))
  for (const face of faces) {
    drawFace(ctx, face, projected, face.objectId === selected)
  }

  const edges = [...scene.edges].sort((left, right) => {
    const order = { dashed: 0, solid: 1, auxiliary: 2, highlight: 3 }
    return order[left.style] - order[right.style]
  })
  for (const edge of edges) {
    const from = projected[edge.from]
    const to = projected[edge.to]
    if (!from || !to) continue
    drawEdge(ctx, from, to, edge.style, edge.objectId === selected)
    if (edge.label) {
      drawLabel(ctx, (from.x + to.x) / 2, (from.y + to.y) / 2 - 8, edge.label, edge.style === 'highlight')
    }
  }

  for (const mark of scene.marks) {
    const at = projected[mark.at]
    if (!at) continue
    if (mark.kind === 'right-angle') {
      const from = mark.from ? projected[mark.from] : undefined
      const to = mark.to ? projected[mark.to] : undefined
      if (from && to) drawRightAngle(ctx, at, from, to, mark.objectId === selected)
      continue
    }
    if (mark.kind === 'angle') {
      const from = mark.from ? projected[mark.from] : undefined
      const to = mark.to ? projected[mark.to] : undefined
      if (from && to) drawAngle(ctx, at, from, to, mark.text ?? '', mark.objectId === selected)
      continue
    }
    if (mark.kind === 'point') {
      drawPoint(ctx, at, Boolean(mark.emphasis), mark.objectId === selected)
      if (mark.text) drawVertexLabel(ctx, at, mark.at, mark.text, mark.emphasis)
    }
  }

  return projected
}

const faceDepth = (face: PrismFace, projected: Record<string, ScreenPoint>) => {
  const depths = face.points.map((id) => projected[id]?.depth ?? 0)
  return depths.reduce((sum, value) => sum + value, 0) / Math.max(1, depths.length)
}

const drawFace = (
  ctx: PrismDrawContext,
  face: PrismFace,
  projected: Record<string, ScreenPoint>,
  selected: boolean,
) => {
  const pts = face.points.map((id) => projected[id]).filter(Boolean) as ScreenPoint[]
  if (pts.length < 3) return
  ctx.beginPath()
  ctx.moveTo(pts[0]!.x, pts[0]!.y)
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i]!.x, pts[i]!.y)
  ctx.closePath()
  ctx.fillStyle = selected
    ? 'rgba(57, 116, 232, 0.28)'
    : COLOR[face.fill]
  ctx.fill()
}

const drawEdge = (
  ctx: PrismDrawContext,
  from: ScreenPoint,
  to: ScreenPoint,
  style: PrismSolidScene['edges'][number]['style'],
  selected: boolean,
) => {
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  if (style === 'dashed') {
    ctx.setLineDash([6, 5])
    ctx.strokeStyle = selectedPaint(selected, COLOR.hidden)
    ctx.lineWidth = selected ? 2.2 : 1.4
    ctx.globalAlpha = selected ? 1 : 0.36
  } else if (style === 'highlight') {
    ctx.setLineDash([])
    ctx.strokeStyle = selectedPaint(selected, COLOR.highlight)
    ctx.lineWidth = selected ? 3.4 : 3.2
    ctx.globalAlpha = 1
  } else if (style === 'auxiliary') {
    ctx.setLineDash([4, 4])
    ctx.strokeStyle = selectedPaint(selected, COLOR.auxiliary)
    ctx.lineWidth = 1.45
    ctx.globalAlpha = 0.72
  } else {
    ctx.setLineDash([])
    ctx.strokeStyle = selectedPaint(selected, COLOR.edge)
    ctx.lineWidth = selected ? 3.2 : 2.2
    ctx.globalAlpha = 1
  }
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.setLineDash([])
}

const drawPoint = (ctx: PrismDrawContext, at: ScreenPoint, emphasis: boolean, selected: boolean) => {
  const radius = emphasis ? 5.2 : 4.1
  ctx.beginPath()
  ctx.arc(at.x, at.y, radius * 1.42, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(at.x, at.y, radius, 0, Math.PI * 2)
  ctx.fillStyle = selected ? COLOR.selected : emphasis ? COLOR.point : COLOR.vertex
  ctx.fill()
}

const LABEL_OFFSETS: Record<string, readonly [number, number]> = {
  A: [-14, -8], B: [8, -17], C: [14, -17], D: [-8, -18],
  A1: [-16, 0], B1: [5, -17], C1: [11, -18], D1: [-9, -18],
  A2: [-16, 2], B2: [6, -18], C2: [10, -18], D2: [-8, -18],
  P: [8, -16],
}

const drawVertexLabel = (
  ctx: PrismDrawContext,
  at: ScreenPoint,
  id: string,
  text: string,
  emphasis?: boolean,
) => {
  const [offsetX, offsetY] = LABEL_OFFSETS[id] ?? [10, -13]
  const x = at.x + offsetX
  const y = at.y + offsetY
  ctx.font = `italic ${emphasis ? '600' : '600'} 13px Georgia, "Times New Roman", serif`
  ctx.textAlign = offsetX < 0 ? 'right' : 'left'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = COLOR.label
  ctx.fillText(text, x, y)
}

const drawLabel = (ctx: PrismDrawContext, x: number, y: number, text: string, highlight: boolean) => {
  ctx.font = '500 11px Georgia, "Times New Roman", serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'bottom'
  ctx.fillStyle = highlight ? COLOR.highlight : COLOR.edge
  ctx.fillText(text, x, y)
}

const drawRightAngle = (
  ctx: PrismDrawContext,
  at: ScreenPoint,
  from: ScreenPoint,
  to: ScreenPoint,
  selected: boolean,
) => {
  const a = normalize2(from.x - at.x, from.y - at.y)
  const b = normalize2(to.x - at.x, to.y - at.y)
  const size = 10
  const p1 = { x: at.x + a.x * size, y: at.y + a.y * size }
  const p2 = { x: p1.x + b.x * size, y: p1.y + b.y * size }
  const p3 = { x: at.x + b.x * size, y: at.y + b.y * size }
  ctx.beginPath()
  ctx.moveTo(p1.x, p1.y)
  ctx.lineTo(p2.x, p2.y)
  ctx.lineTo(p3.x, p3.y)
  ctx.strokeStyle = selectedPaint(selected, COLOR.highlight)
  ctx.lineWidth = 1.6
  ctx.setLineDash([])
  ctx.stroke()
}

const drawAngle = (
  ctx: PrismDrawContext,
  at: ScreenPoint,
  from: ScreenPoint,
  to: ScreenPoint,
  text: string,
  selected: boolean,
) => {
  const a1 = Math.atan2(from.y - at.y, from.x - at.x)
  const a2 = Math.atan2(to.y - at.y, to.x - at.x)
  ctx.beginPath()
  ctx.arc(at.x, at.y, 18, a1, a2, sweepCounterClockwise(a1, a2))
  ctx.strokeStyle = selectedPaint(selected, COLOR.angle)
  ctx.lineWidth = 2
  ctx.setLineDash([])
  ctx.stroke()
  const mid = (a1 + shortestDelta(a1, a2) / 2)
  ctx.font = 'bold 12px Georgia, serif'
  ctx.fillStyle = COLOR.angle
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, at.x + Math.cos(mid) * 28, at.y + Math.sin(mid) * 28)
}

const normalize2 = (x: number, y: number) => {
  const mag = Math.hypot(x, y) || 1
  return { x: x / mag, y: y / mag }
}

const shortestDelta = (from: number, to: number) => {
  let delta = to - from
  while (delta > Math.PI) delta -= Math.PI * 2
  while (delta < -Math.PI) delta += Math.PI * 2
  return delta
}

const sweepCounterClockwise = (from: number, to: number) => shortestDelta(from, to) < 0

export type { PrismObjectId }
