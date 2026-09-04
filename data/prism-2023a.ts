import type { GeometryEdge, GeometryPoint, GeometryScene, GeometrySolutionStep } from './geometry-scene'

export const PRISM_2023A_QUESTION =
  '如图，在正四棱柱 ABCD-A₁B₁C₁D₁ 中，AB=2，AA₁=4。点 A₂，B₂，C₂，D₂ 分别在棱 AA₁，BB₁，CC₁，DD₁ 上，AA₂=1，BB₂=DD₂=2，CC₂=3。\n(1) 证明：B₂C₂ ∥ A₂D₂；\n(2) 点 P 在棱 BB₁ 上，当二面角 P-A₂C₂-D₂ 为 150° 时，求 B₂P。'

export const PRISM_2023A_OVERVIEW =
  '三张图共用同一坐标与镜头：先把柱体和四个分点定位，再证明截面 A₂B₂C₂D₂ 是平行四边形，最后把二面角的两个半平面摊开、在公共棱上标出 150°。'

export const PRISM_2023A_ANSWER =
  'B₂C₂ ∥ A₂D₂；当二面角为 150° 时 B₂P = 1（P 在 B₂ 上下各一解）。'

const points = (): GeometryPoint[] => [
  { id: 'A', position: [0, 0, 0] },
  { id: 'B', position: [2, 0, 0] },
  { id: 'C', position: [2, 2, 0] },
  { id: 'D', position: [0, 2, 0] },
  { id: 'A1', position: [0, 0, 4], label: 'A₁' },
  { id: 'B1', position: [2, 0, 4], label: 'B₁' },
  { id: 'C1', position: [2, 2, 4], label: 'C₁' },
  { id: 'D1', position: [0, 2, 4], label: 'D₁' },
  { id: 'A2', position: [0, 0, 1], label: 'A₂', emphasis: true },
  { id: 'B2', position: [2, 0, 2], label: 'B₂', emphasis: true },
  { id: 'C2', position: [2, 2, 3], label: 'C₂', emphasis: true },
  { id: 'D2', position: [0, 2, 2], label: 'D₂', emphasis: true },
]

const frame = (): GeometryEdge[] => [
  { from: 'A', to: 'B', style: 'solid', label: 'AB=2' },
  { from: 'B', to: 'C', style: 'dashed' },
  { from: 'C', to: 'D', style: 'dashed' },
  { from: 'D', to: 'A', style: 'solid' },
  { from: 'A1', to: 'B1', style: 'solid' },
  { from: 'B1', to: 'C1', style: 'solid' },
  { from: 'C1', to: 'D1', style: 'solid' },
  { from: 'D1', to: 'A1', style: 'solid' },
  { from: 'A', to: 'A1', style: 'solid', label: 'AA₁=4' },
  { from: 'B', to: 'B1', style: 'solid' },
  { from: 'C', to: 'C1', style: 'dashed' },
  { from: 'D', to: 'D1', style: 'solid' },
]

const base = (title: string, description: string): Pick<GeometryScene, 'title' | 'description' | 'dimension' | 'camera'> => ({
  title,
  description,
  dimension: 3,
  camera: { azimuth: -136, elevation: 38 },
})

export const PRISM_2023A_STEPS: GeometrySolutionStep[] = [
  {
    id: 'prism2023a-setup',
    eyebrow: '步骤 01 · 建模',
    title: '建立坐标系与四个分点',
    summary: '以 A 为原点，标出题目给定的全部长度与分点高度。',
    detail:
      '取 A 为原点，AB、AD、AA₁ 分别为 x、y、z 轴。四个分点的高度依次为 1、2、3、2——注意 A₂ 与 C₂ 的高度和等于 B₂ 与 D₂ 的高度和，这正是下一步平行的来源。',
    formula: 'A₂(0,0,1)，B₂(2,0,2)，C₂(2,2,3)，D₂(0,2,2)',
    scene: {
      ...base('正四棱柱与四个分点', '柱体实线、隐藏棱虚线；四个分点用强调色标出，并标注已知棱长。'),
      points: points(),
      edges: [
        ...frame(),
        { from: 'A', to: 'A2', style: 'highlight', label: 'AA₂=1' },
        { from: 'B', to: 'B2', style: 'highlight', label: 'BB₂=2' },
        { from: 'C', to: 'C2', style: 'highlight', label: 'CC₂=3' },
        { from: 'D', to: 'D2', style: 'highlight', label: 'DD₂=2' },
      ],
      annotations: [
        { id: 'ra-base', kind: 'right-angle', at: 'A', points: ['B', 'D'] },
        { id: 'ra-vert', kind: 'right-angle', at: 'A', points: ['B', 'A1'] },
      ],
    },
  },
  {
    id: 'prism2023a-parallel',
    eyebrow: '步骤 02 · 第 (1) 问',
    title: '截面 A₂B₂C₂D₂ 是平行四边形',
    summary: '两个方向向量完全相等，因此 B₂C₂ ∥ A₂D₂。',
    detail:
      '直接算方向向量：B₂C₂ = C₂ − B₂ = (0,2,1)，A₂D₂ = D₂ − A₂ = (0,2,1)。两者相等，故 B₂C₂ ∥ A₂D₂，且长度相等——截面 A₂B₂C₂D₂ 是平行四边形。',
    formula: 'B₂C₂ = (0,2,1) = A₂D₂',
    scene: {
      ...base('截面 A₂B₂C₂D₂', '截面填色，两条平行棱高亮；柱体保持与第一张图相同的线型。'),
      points: points(),
      edges: [
        ...frame(),
        { from: 'A2', to: 'B2', style: 'solid' },
        { from: 'B2', to: 'C2', style: 'highlight', label: 'B₂C₂' },
        { from: 'C2', to: 'D2', style: 'solid' },
        { from: 'D2', to: 'A2', style: 'highlight', label: 'A₂D₂' },
      ],
      faces: [{ points: ['A2', 'B2', 'C2', 'D2'], style: 'highlight', opacity: 0.32 }],
    },
  },
  {
    id: 'prism2023a-dihedral',
    eyebrow: '步骤 03 · 第 (2) 问',
    title: '二面角 P-A₂C₂-D₂ = 150°',
    summary: '在公共棱中点作两条垂线，标出真实的二面角。',
    detail:
      '设 P(2,0,t)。以 A₂C₂ 为棱，把 P 与 D₂ 分别投影到垂直于棱的方向，夹角为 150° 得 t²−4t+3=0，即 t=1 或 t=3。两解关于 B₂ 对称，都给出 B₂P = |t−2| = 1。',
    formula: 't² − 4t + 3 = 0  ⇒  t = 1 或 3，B₂P = 1',
    scene: {
      ...base('二面角 P-A₂C₂-D₂', '两个半平面分别填色，公共棱 A₂C₂ 高亮，角标画在棱中点的两条真实垂线之间。'),
      points: [
        ...points(),
        { id: 'P', position: [2, 0, 1], label: 'P', emphasis: true },
        { id: 'M', position: [1, 1, 2], role: 'construction' },
        { id: 'Rp', position: [1.735, 0.633, 1.633], role: 'construction' },
        { id: 'Rd', position: [0.364, 1.636, 2], role: 'construction' },
      ],
      edges: [
        ...frame(),
        { from: 'A2', to: 'C2', style: 'highlight' },
        { from: 'A2', to: 'D2', style: 'solid' },
        { from: 'C2', to: 'D2', style: 'solid' },
        { from: 'A2', to: 'P', style: 'solid' },
        { from: 'C2', to: 'P', style: 'solid' },
        { from: 'B2', to: 'P', style: 'highlight', label: 'B₂P=1' },
        { from: 'M', to: 'Rp', style: 'auxiliary' },
        { from: 'M', to: 'Rd', style: 'auxiliary' },
      ],
      faces: [
        { points: ['A2', 'C2', 'D2'], style: 'surface', opacity: 0.34 },
        { points: ['A2', 'C2', 'P'], style: 'highlight', opacity: 0.34 },
      ],
      annotations: [
        { id: 'dihedral', kind: 'angle', at: 'M', points: ['Rp', 'Rd'], text: '150°' },
      ],
    },
  },
]
