export type Vec3 = [number, number, number]

export type GeometryEdgeStyle = 'solid' | 'dashed' | 'highlight' | 'auxiliary'
export type GeometryFaceStyle = 'surface' | 'highlight' | 'muted'
export type GeometryPointRole = 'vertex' | 'construction'

export interface GeometryPoint {
  id: string
  position: Vec3
  label?: string
  emphasis?: boolean
  role?: GeometryPointRole
}

export interface GeometryEdge {
  from: string
  to: string
  style?: GeometryEdgeStyle
  label?: string
}

export interface GeometryFace {
  points: string[]
  style?: GeometryFaceStyle
  opacity?: number
}

export interface GeometryAnnotation {
  id: string
  kind: 'right-angle' | 'angle'
  at: string
  points: [string, string]
  text?: string
}

export interface GeometryScene {
  title: string
  description: string
  dimension: 2 | 3
  camera: { azimuth: number; elevation: number }
  points: GeometryPoint[]
  edges: GeometryEdge[]
  faces?: GeometryFace[]
  annotations?: GeometryAnnotation[]
}

export interface GeometrySolutionStep {
  id: string
  eyebrow: string
  title: string
  summary: string
  detail: string
  formula: string
  scene: GeometryScene
}

export const sceneCenter = (scene: GeometryScene): Vec3 => {
  const visible = scene.points.filter((point) => point.role !== 'construction')
  const source = visible.length ? visible : scene.points
  const sum = source.reduce(
    (acc, point) => [acc[0] + point.position[0], acc[1] + point.position[1], acc[2] + point.position[2]] as Vec3,
    [0, 0, 0] as Vec3,
  )
  const count = Math.max(source.length, 1)
  return [sum[0] / count, sum[1] / count, sum[2] / count]
}

export const sceneRadius = (scene: GeometryScene, center: Vec3): number => {
  const visible = scene.points.filter((point) => point.role !== 'construction')
  const source = visible.length ? visible : scene.points
  return Math.max(
    1,
    ...source.map((point) => {
      const dx = point.position[0] - center[0]
      const dy = point.position[1] - center[1]
      const dz = point.position[2] - center[2]
      return Math.hypot(dx, dy, dz)
    }),
  )
}
