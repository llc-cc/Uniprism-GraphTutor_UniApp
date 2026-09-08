export type Vec3 = [number, number, number]
export interface VectorOp {
  kind: 'polygon' | 'polyline' | 'line' | 'circle' | 'text' | 'rect'
  id: string
  matrix: [number, number, number, number, number, number]
  fill: string; stroke: string; fillOpacity: number; strokeOpacity: number
  opacity: number; width: number; cap: CanvasLineCap; join: CanvasLineJoin
  dash: number[]; nonScaling: boolean
  points?: number[][]; at?: number[]; size?: number[]; radius?: number
  text?: string; font?: string; fontSize?: number; fontFamily?: string
  fontWeight?: string; fontStyle?: string; anchor?: string; baseline?: string; paintOrder?: string
}
export interface Primitive {
  kind: 'dot'|'text'|'path'|'arc'|'face'|'hull'|'glyph'
  id: string; objectId: string; pickId?: string; state: string
  points?: Vec3[]; at?: Vec3; from?: Vec3; to?: Vec3
  label?: string; text?: string; strong?: boolean; structural?: boolean
  right?: boolean; radiusScale?: number; scale?: number; opacity?: number
  inspectionTarget?: boolean; widthScale?: number; away?: Vec3; visualTone?: string
  arrow?: string; style?: string
}
export type VectorCommand = Partial<VectorOp> & Pick<VectorOp,'kind'|'id'> & {styleRef:number}
export interface CatalogScene {
  dimension: 2|3
  operations?: VectorCommand[]
  primitives?: Primitive[]
  center: Vec3; radius: number
  camera: {azimuth: number; elevation: number}
}
export interface CatalogStep {
  id: string; title: string; summary: string; detail: string; formula: string
  caption: string; pageId: string; expect: string[]; scene: CatalogScene
}
export interface CatalogProblem {
  id: string; webId: string; title: string; subject: 'math'|'physics'|'chemistry'|'worksheet'
  statement: string; overview: string; problemType: string; givens: string[]
  target: string[]; answer: string; steps: CatalogStep[]
  figure?: {imagePath: string; alt: string; caption?: string}
  equilibrium?: { status: string; equations: string[] }
}
