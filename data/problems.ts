export type ProblemSubject = 'math' | 'physics' | 'chemistry' | 'worksheet'

export type ProblemVisual = 'function' | 'geometry' | 'force' | 'molecule' | 'worksheet'

export type ProblemArtworkId =
  | 'math-solid-geometry'
  | 'physics-force-analysis'
  | 'chemistry-ethanol'
  | 'math-functions'
  | 'math-conic-sections'
  | 'physics-kinematics'
  | 'chemistry-equilibrium'
  | 'worksheet-quadratic'
  | 'physics-electromagnetism'

export type ProblemDifficulty = '入门' | '进阶' | '挑战'

export interface ProblemPreview {
  id: string
  title: string
  excerpt: string
  subject: ProblemSubject
  subjectLabel: string
  grade: string
  difficulty: ProblemDifficulty
  durationMinutes: number
  accent: string
  visual: ProblemVisual
  artwork: ProblemArtworkId
  featured?: boolean
}

export const SUBJECT_NAMES: Record<ProblemSubject, string> = {
  math: '数学',
  physics: '物理',
  chemistry: '化学',
  worksheet: '数学',
}

export const PROBLEM_ARTWORK_SRC: Record<ProblemArtworkId, string> = {
  'math-solid-geometry': '/static/plaza/math-solid-geometry.webp',
  'physics-force-analysis': '/static/plaza/physics-force-analysis.webp',
  'chemistry-ethanol': '/static/plaza/chemistry-ethanol.webp',
  'math-functions': '/static/plaza/math-functions.webp',
  'math-conic-sections': '/static/plaza/math-conic-sections.webp',
  'physics-kinematics': '/static/plaza/physics-kinematics.webp',
  'chemistry-equilibrium': '/static/plaza/chemistry-equilibrium.webp',
  'worksheet-quadratic': '/static/plaza/worksheet-quadratic.webp',
  'physics-electromagnetism': '/static/plaza/physics-electromagnetism.webp',
}

export const resolveProblemArtwork = (problem: Pick<ProblemPreview, 'artwork'>) =>
  PROBLEM_ARTWORK_SRC[problem.artwork]

export const problemSubjectName = (subject: ProblemSubject) => SUBJECT_NAMES[subject]

const difficultyCounts: Record<ProblemDifficulty, 1 | 3 | 5> = {
  入门: 1,
  进阶: 3,
  挑战: 5,
}

const difficultyTones: Record<ProblemDifficulty, 'starter' | 'intermediate' | 'challenge'> = {
  入门: 'starter',
  进阶: 'intermediate',
  挑战: 'challenge',
}

export const difficultyPresentation = (difficulty: ProblemDifficulty) => {
  const count = difficultyCounts[difficulty]
  return {
    count,
    tone: difficultyTones[difficulty],
    activeStars: [1, 2, 3, 4, 5].map((star) => star <= count) as [
      boolean,
      boolean,
      boolean,
      boolean,
      boolean,
    ],
    ariaLabel: `${difficulty}，${count} 星`,
  }
}

export interface RecentProblemRecord {
  id: string
  openedAt: string
}

export interface LocalProblemDraft {
  id: string
  title: string
  question: string
  subject: ProblemSubject
  imagePath?: string
  imageName?: string
  createdAt: string
  source: 'home-demo'
}

export const STORAGE_KEYS = {
  savedProblems: 'uniprism:miniapp:saved-problems',
  recentProblems: 'uniprism:miniapp:recent-problems',
  localProblems: 'uniprism:miniapp:local-problems',
} as const

export const SUBJECT_OPTIONS: Array<{
  value: ProblemSubject | 'all'
  label: string
}> = [
  { value: 'all', label: '全部' },
  { value: 'math', label: '数学' },
  { value: 'physics', label: '物理' },
  { value: 'chemistry', label: '化学' },
  { value: 'worksheet', label: '题图' },
]

export const PUBLIC_PROBLEMS: ProblemPreview[] = [
  {
    id: 'math-prism-section',
    title: '正四棱柱中的截面与二面角',
    excerpt: '建立空间坐标系，追踪四个分点，逐步验证截面平行关系。',
    subject: 'math',
    subjectLabel: '立体几何',
    grade: '高三',
    difficulty: '挑战',
    durationMinutes: 8,
    accent: '#3974E8',
    visual: 'geometry',
    artwork: 'math-solid-geometry',
    featured: true,
  },
  {
    id: 'physics-incline-force',
    title: '粗糙斜面 · 静止',
    excerpt: '分解重力并逐个核对支持力、摩擦力，建立沿斜面的动力学方程。',
    subject: 'physics',
    subjectLabel: '受力分析',
    grade: '高一',
    difficulty: '入门',
    durationMinutes: 5,
    accent: '#E8793D',
    visual: 'force',
    artwork: 'physics-force-analysis',
    featured: true,
  },
  {
    id: 'chemistry-ethanol-oxidation',
    title: '乙醇的结构与催化氧化',
    excerpt: '从结构式映射到空间构型，识别羟基并观察碳氧双键的形成。',
    subject: 'chemistry',
    subjectLabel: '有机化学',
    grade: '高一',
    difficulty: '入门',
    durationMinutes: 4,
    accent: '#D85D75',
    visual: 'molecule',
    artwork: 'chemistry-ethanol',
    featured: true,
  },
  {
    id: 'math-function-translation',
    title: '二次函数图像的平移与零点',
    excerpt: '拖动顶点观察参数变化，把代数式与函数图像逐步对应起来。',
    subject: 'math',
    subjectLabel: '函数',
    grade: '高一',
    difficulty: '入门',
    durationMinutes: 4,
    accent: '#3974E8',
    visual: 'function',
    artwork: 'math-functions',
  },
  {
    id: 'worksheet-quadratic-image',
    title: '题图中的抛物线与面积最值',
    excerpt: '先还原题图条件，再联动坐标图定位动点和面积的变化规律。',
    subject: 'worksheet',
    subjectLabel: '题图解析',
    grade: '九年级',
    difficulty: '进阶',
    durationMinutes: 7,
    accent: '#2B9F88',
    visual: 'worksheet',
    artwork: 'worksheet-quadratic',
  },
  {
    id: 'physics-projectile-motion',
    title: '平抛运动的轨迹与速度分解',
    excerpt: '同步查看水平、竖直分运动，理解位移轨迹与末速度方向。',
    subject: 'physics',
    subjectLabel: '运动学',
    grade: '高一',
    difficulty: '进阶',
    durationMinutes: 6,
    accent: '#E8793D',
    visual: 'force',
    artwork: 'physics-kinematics',
  },
  {
    id: 'math-ellipse-tangent',
    title: '椭圆切线与焦点三角形',
    excerpt: '联动切点、焦点和切线斜率，用数形结合验证代数推导。',
    subject: 'math',
    subjectLabel: '圆锥曲线',
    grade: '高二',
    difficulty: '挑战',
    durationMinutes: 8,
    accent: '#3974E8',
    visual: 'function',
    artwork: 'math-conic-sections',
  },
  {
    id: 'chemistry-equilibrium-shift',
    title: '浓度变化与化学平衡移动',
    excerpt: '改变反应物浓度，观察粒子数量和速率曲线如何趋向新平衡。',
    subject: 'chemistry',
    subjectLabel: '反应平衡原理',
    grade: '高二',
    difficulty: '进阶',
    durationMinutes: 6,
    accent: '#D85D75',
    visual: 'molecule',
    artwork: 'chemistry-equilibrium',
  },
  {
    id: 'worksheet-circuit-image',
    title: '电路题图中的动态电表示数',
    excerpt: '识别滑动变阻器接法，沿电流路径分析电表示数变化。',
    subject: 'worksheet',
    subjectLabel: '题图解析',
    grade: '九年级',
    difficulty: '进阶',
    durationMinutes: 7,
    accent: '#2B9F88',
    visual: 'worksheet',
    artwork: 'physics-electromagnetism',
  },
]

export const FEATURED_PROBLEMS = PUBLIC_PROBLEMS.filter((problem) => problem.featured)

export const DEMO_RECORD_PROBLEMS = [
  PUBLIC_PROBLEMS[0],
  PUBLIC_PROBLEMS[3],
  PUBLIC_PROBLEMS[1],
].filter((problem): problem is ProblemPreview => Boolean(problem))

const safeArray = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : []

const isProblemSubject = (value: unknown): value is ProblemSubject => (
  value === 'math' || value === 'physics' || value === 'chemistry' || value === 'worksheet'
)

export const getLocalProblemDrafts = (): LocalProblemDraft[] => {
  try {
    return safeArray<unknown>(uni.getStorageSync(STORAGE_KEYS.localProblems))
      .filter((entry): entry is LocalProblemDraft => Boolean(
        entry &&
        typeof entry === 'object' &&
        typeof (entry as LocalProblemDraft).id === 'string' &&
        typeof (entry as LocalProblemDraft).question === 'string' &&
        isProblemSubject((entry as LocalProblemDraft).subject),
      ))
  } catch {
    return []
  }
}

export const saveLocalProblemDraft = (draft: LocalProblemDraft): LocalProblemDraft[] => {
  const next = [
    draft,
    ...getLocalProblemDrafts().filter((item) => item.id !== draft.id),
  ].slice(0, 20)

  try {
    uni.setStorageSync(STORAGE_KEYS.localProblems, next)
  } catch {
    // The current solve can still continue when local history is unavailable.
  }
  return next
}

const summarize = (value: string, limit: number) => {
  const normalized = value.trim().replace(/\s+/g, ' ')
  return normalized.length > limit ? `${normalized.slice(0, limit - 1)}…` : normalized
}

export const localDraftToPreview = (draft: LocalProblemDraft): ProblemPreview => {
  const visual: ProblemVisual = draft.imagePath
    ? 'worksheet'
    : draft.subject === 'physics'
      ? 'force'
      : draft.subject === 'chemistry'
        ? 'molecule'
        : 'function'
  const artworkBySubject: Record<ProblemSubject, ProblemArtworkId> = {
    math: 'math-functions',
    physics: 'physics-force-analysis',
    chemistry: 'chemistry-ethanol',
    worksheet: 'worksheet-quadratic',
  }
  const labels: Record<ProblemSubject, string> = {
    math: '我的数学题',
    physics: '我的物理题',
    chemistry: '我的化学题',
    worksheet: '我的题图',
  }
  const accents: Record<ProblemSubject, string> = {
    math: '#3974E8',
    physics: '#E8793D',
    chemistry: '#D85D75',
    worksheet: '#2B9F88',
  }

  return {
    id: draft.id,
    title: summarize(draft.title || draft.question, 54) || '我的题目',
    excerpt: draft.imagePath
      ? `题图已保存在本机 · ${draft.imageName || '待识别题图'}`
      : summarize(draft.question, 88),
    subject: draft.subject,
    subjectLabel: labels[draft.subject],
    grade: '本机题目',
    difficulty: '进阶',
    durationMinutes: 5,
    accent: accents[draft.subject],
    visual,
    artwork: draft.imagePath ? 'worksheet-quadratic' : artworkBySubject[draft.subject],
  }
}

export const getLocalProblemPreviews = () => getLocalProblemDrafts().map(localDraftToPreview)

export const getSavedProblemIds = (): string[] => {
  try {
    return safeArray<unknown>(uni.getStorageSync(STORAGE_KEYS.savedProblems))
      .filter((id): id is string => typeof id === 'string')
  } catch {
    return []
  }
}

export const setProblemSaved = (problemId: string, saved: boolean): string[] => {
  const current = getSavedProblemIds().filter((id) => id !== problemId)
  const next = saved ? [problemId, ...current] : current
  try {
    uni.setStorageSync(STORAGE_KEYS.savedProblems, next)
  } catch {
    // A storage failure should not prevent browsing the public examples.
  }
  return next
}

export const toggleProblemSaved = (problemId: string): boolean => {
  const willSave = !getSavedProblemIds().includes(problemId)
  setProblemSaved(problemId, willSave)
  return willSave
}

export const getRecentProblemRecords = (): RecentProblemRecord[] => {
  try {
    return safeArray<unknown>(uni.getStorageSync(STORAGE_KEYS.recentProblems))
      .filter((entry): entry is RecentProblemRecord => Boolean(
        entry &&
        typeof entry === 'object' &&
        typeof (entry as RecentProblemRecord).id === 'string' &&
        typeof (entry as RecentProblemRecord).openedAt === 'string',
      ))
  } catch {
    return []
  }
}

export const recordProblemOpen = (
  problemId: string,
  openedAt = new Date().toISOString(),
): RecentProblemRecord[] => {
  const next = [
    { id: problemId, openedAt },
    ...getRecentProblemRecords().filter((entry) => entry.id !== problemId),
  ].slice(0, 30)

  try {
    uni.setStorageSync(STORAGE_KEYS.recentProblems, next)
  } catch {
    // Keep navigation available when storage is full or disabled.
  }
  return next
}

export const buildSolverUrl = (problem: ProblemPreview): string => {
  const query = [
    `id=${encodeURIComponent(problem.id)}`,
    `title=${encodeURIComponent(problem.title)}`,
    `subject=${encodeURIComponent(problem.subject)}`,
  ].join('&')
  return `/subpackages/solver/index?${query}`
}

export const formatOpenedAt = (openedAt: string): string => {
  const timestamp = new Date(openedAt).getTime()
  if (!Number.isFinite(timestamp)) return '最近查看'

  const elapsed = Date.now() - timestamp
  if (elapsed < 60_000) return '刚刚查看'
  if (elapsed < 3_600_000) return `${Math.max(1, Math.floor(elapsed / 60_000))} 分钟前`
  if (elapsed < 86_400_000) return `${Math.max(1, Math.floor(elapsed / 3_600_000))} 小时前`
  if (elapsed < 604_800_000) return `${Math.max(1, Math.floor(elapsed / 86_400_000))} 天前`

  const date = new Date(timestamp)
  return `${date.getMonth() + 1} 月 ${date.getDate()} 日`
}
