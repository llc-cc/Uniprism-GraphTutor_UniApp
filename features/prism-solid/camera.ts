import { cross, dot, normalize, sub, type Vec3 } from './vec3'

export interface OrbitCamera {
  azimuth: number
  elevation: number
}

export interface ScreenPoint {
  x: number
  y: number
  depth: number
}

export interface PerspectiveFrame {
  center: Vec3
  radius: number
}

/** Same default as the web 2023 新课标Ⅰ·18 figure. */
export const DEFAULT_PRISM_CAMERA: OrbitCamera = { azimuth: -136, elevation: 38 }

/**
 * Exact framing values produced by the Web whiteboard compiler for the three
 * prism figures. Keeping these here makes the mini-program use the same look-at
 * target and `scene.radius * 3.25` camera distance as Whiteboard3D.
 */
export const WEB_PRISM_FRAMES: readonly PerspectiveFrame[] = [
  {
    center: [0.972972972972973, 0.9459459459459459, 1.7837837837837838],
    radius: 2.6603437334546607,
  },
  {
    center: [1, 1, 2],
    radius: 2.449489742783178,
  },
  {
    center: [1.0582087912087914, 0.9539230769230768, 1.910978021978022],
    radius: 2.5647798344973998,
  },
] as const

export const PRISM_VIEW_PRESETS: Record<'正视' | '俯视' | '等轴测', OrbitCamera> = {
  正视: { azimuth: 0, elevation: 8 },
  俯视: { azimuth: -90, elevation: 86 },
  等轴测: DEFAULT_PRISM_CAMERA,
}

/**
 * Direction from the origin toward the camera. Matches
 * `packages/shared/src/geometry-expand.ts` so hidden-line style stays consistent.
 */
export const viewDirection = (camera: OrbitCamera): Vec3 => {
  const azimuth = (camera.azimuth * Math.PI) / 180
  const elevation = (camera.elevation * Math.PI) / 180
  const cosE = Math.cos(elevation)
  return [Math.sin(azimuth) * cosE, Math.cos(azimuth) * cosE, Math.sin(elevation)]
}

export const cameraAxes = (camera: OrbitCamera) => {
  const z = normalize(viewDirection(camera))
  const worldUp: Vec3 = Math.abs(z[2]) > 0.94 ? [0, 1, 0] : [0, 0, 1]
  const x = normalize(cross(worldUp, z))
  const y = cross(z, x)
  return { x, y, z }
}

export const clampZoom = (value: number) => Math.max(0.42, Math.min(2.4, value))

export const projectPoints = (
  points: Record<string, Vec3>,
  camera: OrbitCamera,
  width: number,
  height: number,
  frame: PerspectiveFrame,
  zoom = 1,
): Record<string, ScreenPoint> => {
  const axes = cameraAxes(camera)
  const focalLength = height / (2 * Math.tan((38 * Math.PI) / 360))
  const cameraDistance = (frame.radius * 3.25) / clampZoom(zoom)
  const projected: Record<string, ScreenPoint> = {}

  for (const [id, point] of Object.entries(points)) {
    const relative = sub(point, frame.center)
    const u = dot(relative, axes.x)
    const v = dot(relative, axes.y)
    const depth = dot(relative, axes.z)
    const distanceToPoint = Math.max(0.01, cameraDistance - depth)
    projected[id] = {
      x: width / 2 + (u * focalLength) / distanceToPoint,
      y: height / 2 - (v * focalLength) / distanceToPoint,
      depth,
    }
  }
  return projected
}

export const clampElevation = (value: number) => Math.max(-82, Math.min(82, value))
export const wrapAzimuth = (value: number) => {
  const wrapped = value % 360
  return wrapped <= -180 ? wrapped + 360 : wrapped > 180 ? wrapped - 360 : wrapped
}
