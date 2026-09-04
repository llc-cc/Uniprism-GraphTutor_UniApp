import {
  DEFAULT_PRISM_CAMERA,
  WEB_PRISM_FRAMES,
  viewDirection,
  type OrbitCamera,
  type PerspectiveFrame,
} from './camera'
import { dot, type Vec3 } from './vec3'

export type PrismObjectId = 'prism' | 'points' | 'section' | 'perpendicular' | 'angle'

export type EdgeStyle = 'solid' | 'dashed' | 'highlight' | 'auxiliary'

export interface PrismEdge {
  from: string
  to: string
  style: EdgeStyle
  label?: string
  objectId: PrismObjectId
}

export interface PrismFace {
  points: string[]
  fill: 'section' | 'dihedral' | 'surface'
  objectId: PrismObjectId
}

export interface PrismMark {
  kind: 'point' | 'label' | 'right-angle' | 'angle'
  id: string
  objectId: PrismObjectId
  at: string
  from?: string
  to?: string
  text?: string
  emphasis?: boolean
}

export interface PrismSolidScene {
  points: Record<string, Vec3>
  labels: Record<string, string>
  edges: PrismEdge[]
  faces: PrismFace[]
  marks: PrismMark[]
  frame: PerspectiveFrame
}

const BOX_NAMES = ['A', 'B', 'C', 'D', 'A1', 'B1', 'C1', 'D1'] as const
const BOX_CORNERS: Vec3[] = [
  [0, 0, 0], [2, 0, 0], [2, 2, 0], [0, 2, 0],
  [0, 0, 4], [2, 0, 4], [2, 2, 4], [0, 2, 4],
]
const BOX_FACES: Array<{ corners: [number, number, number, number], normal: Vec3 }> = [
  { corners: [0, 1, 2, 3], normal: [0, 0, -1] },
  { corners: [4, 5, 6, 7], normal: [0, 0, 1] },
  { corners: [0, 1, 5, 4], normal: [0, -1, 0] },
  { corners: [2, 3, 7, 6], normal: [0, 1, 0] },
  { corners: [1, 2, 6, 5], normal: [1, 0, 0] },
  { corners: [3, 0, 4, 7], normal: [-1, 0, 0] },
]
const BOX_EDGES: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
]

export const PRISM_POINTS: Record<string, Vec3> = {
  A: [0, 0, 0],
  B: [2, 0, 0],
  C: [2, 2, 0],
  D: [0, 2, 0],
  A1: [0, 0, 4],
  B1: [2, 0, 4],
  C1: [2, 2, 4],
  D1: [0, 2, 4],
  A2: [0, 0, 1],
  B2: [2, 0, 2],
  C2: [2, 2, 3],
  D2: [0, 2, 2],
  P: [2, 0, 1],
  M: [1, 1, 2],
  Rp: [1.735, 0.633, 1.633],
  Rd: [0.364, 1.636, 2],
}

export const PRISM_LABELS: Record<string, string> = {
  A: 'A', B: 'B', C: 'C', D: 'D',
  A1: 'A₁', B1: 'B₁', C1: 'C₁', D1: 'D₁',
  A2: 'A₂', B2: 'B₂', C2: 'C₂', D2: 'D₂',
  P: 'P',
}

export const hiddenBoxEdges = (camera: OrbitCamera = DEFAULT_PRISM_CAMERA) => {
  const view = viewDirection(camera)
  const facing = BOX_FACES.map((face) => dot(face.normal, view) > 0)
  return BOX_EDGES.map(([a, b]) => {
    const touching = BOX_FACES
      .map((face, index) => ({ face, index }))
      .filter(({ face }) => face.corners.includes(a) && face.corners.includes(b))
    const visible = touching.some(({ index }) => facing[index])
    return {
      from: BOX_NAMES[a]!,
      to: BOX_NAMES[b]!,
      style: (visible ? 'solid' : 'dashed') as EdgeStyle,
    }
  })
}

export const buildPrismSolidScene = (
  step: number,
  camera: OrbitCamera = DEFAULT_PRISM_CAMERA,
): PrismSolidScene => {
  const bounded = Math.max(0, Math.min(2, step))
  const frame = hiddenBoxEdges(camera).map((edge) => ({
    ...edge,
    objectId: 'prism' as const,
    label: edge.from === 'A' && edge.to === 'B'
      ? 'AB=2'
      : edge.from === 'A' && edge.to === 'A1'
        ? 'AA₁=4'
        : undefined,
  }))

  const edges: PrismEdge[] = [...frame]
  const faces: PrismFace[] = []
  const marks: PrismMark[] = BOX_NAMES.map((id) => ({
    kind: 'point' as const,
    id,
    objectId: 'prism' as const,
    at: id,
    text: PRISM_LABELS[id],
  }))

  marks.push(
    { kind: 'point', id: 'A2', objectId: 'points', at: 'A2', text: 'A₂', emphasis: true },
    { kind: 'point', id: 'B2', objectId: 'points', at: 'B2', text: 'B₂', emphasis: true },
    { kind: 'point', id: 'C2', objectId: 'points', at: 'C2', text: 'C₂', emphasis: true },
    { kind: 'point', id: 'D2', objectId: 'points', at: 'D2', text: 'D₂', emphasis: true },
  )

  if (bounded === 0) {
    edges.push(
      { from: 'A', to: 'A2', style: 'highlight', label: 'AA₂=1', objectId: 'points' },
      { from: 'B', to: 'B2', style: 'highlight', label: 'BB₂=2', objectId: 'points' },
      { from: 'C', to: 'C2', style: 'highlight', label: 'CC₂=3', objectId: 'points' },
      { from: 'D', to: 'D2', style: 'highlight', label: 'DD₂=2', objectId: 'points' },
    )
    marks.push(
      { kind: 'right-angle', id: 'ra-base', objectId: 'prism', at: 'A', from: 'B', to: 'D' },
      { kind: 'right-angle', id: 'ra-vert', objectId: 'prism', at: 'A', from: 'B', to: 'A1' },
    )
  }

  if (bounded === 1) {
    faces.push({ points: ['A2', 'B2', 'C2', 'D2'], fill: 'section', objectId: 'section' })
    edges.push(
      { from: 'A2', to: 'B2', style: 'solid', objectId: 'section' },
      { from: 'B2', to: 'C2', style: 'highlight', label: 'B₂C₂', objectId: 'section' },
      { from: 'C2', to: 'D2', style: 'solid', objectId: 'section' },
      { from: 'D2', to: 'A2', style: 'highlight', label: 'A₂D₂', objectId: 'section' },
    )
  }

  if (bounded >= 2) {
    faces.push(
      { points: ['A2', 'C2', 'D2'], fill: 'surface', objectId: 'angle' },
      { points: ['A2', 'C2', 'P'], fill: 'dihedral', objectId: 'angle' },
    )
    edges.push(
      { from: 'A2', to: 'C2', style: 'highlight', objectId: 'angle' },
      { from: 'A2', to: 'D2', style: 'solid', objectId: 'angle' },
      { from: 'C2', to: 'D2', style: 'solid', objectId: 'angle' },
      { from: 'A2', to: 'P', style: 'solid', objectId: 'angle' },
      { from: 'C2', to: 'P', style: 'solid', objectId: 'angle' },
      { from: 'B2', to: 'P', style: 'highlight', label: 'B₂P=1', objectId: 'angle' },
      { from: 'M', to: 'Rp', style: 'auxiliary', objectId: 'angle' },
      { from: 'M', to: 'Rd', style: 'auxiliary', objectId: 'angle' },
    )
    marks.push(
      { kind: 'point', id: 'P', objectId: 'angle', at: 'P', text: 'P', emphasis: true },
      { kind: 'angle', id: 'dihedral', objectId: 'angle', at: 'M', from: 'Rp', to: 'Rd', text: '150°' },
    )
  }

  return {
    points: PRISM_POINTS,
    labels: PRISM_LABELS,
    edges,
    faces,
    marks,
    frame: WEB_PRISM_FRAMES[bounded]!,
  }
}

export const pickPrismObject = (
  scene: PrismSolidScene,
  projected: Record<string, { x: number, y: number }>,
  x: number,
  y: number,
  maxDistance = 36,
): PrismObjectId | null => {
  let bestId: PrismObjectId | null = null
  let bestDistance = maxDistance
  const consider = (id: PrismObjectId, px: number, py: number) => {
    const distance = Math.hypot(px - x, py - y)
    if (distance > bestDistance) return
    bestId = id
    bestDistance = distance
  }

  for (const mark of scene.marks) {
    const point = projected[mark.at]
    if (point) consider(mark.objectId, point.x, point.y)
  }
  for (const edge of scene.edges) {
    const from = projected[edge.from]
    const to = projected[edge.to]
    if (!from || !to) continue
    consider(edge.objectId, (from.x + to.x) / 2, (from.y + to.y) / 2)
  }
  for (const face of scene.faces) {
    const pts = face.points
      .map((id) => projected[id])
      .filter((point): point is { x: number, y: number } => Boolean(point))
    if (pts.length === 0) continue
    const cx = pts.reduce((sum, point) => sum + point.x, 0) / pts.length
    const cy = pts.reduce((sum, point) => sum + point.y, 0) / pts.length
    consider(face.objectId, cx, cy)
  }
  return bestId
}
