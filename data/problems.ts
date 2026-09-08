import webProblems from './web-problems.json'

export type ProblemSubject = 'math' | 'physics' | 'chemistry' | 'worksheet'

export type ProblemVisual = 'function' | 'geometry' | 'force' | 'molecule' | 'worksheet'

export type ProblemArtworkId =
  | 'math-solid-geometry'
  | 'physics-force-analysis'
  | 'chemistry-ethanol'
  | 'math-functions'
  | 'math-conic-sections'
  | 'math-permutations-combinations'
  | 'math-derivatives'
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
  webId?: string
  thumbnailPath?: string
  stepCount?: number
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
  'math-permutations-combinations': '/static/plaza/math-permutations-combinations.webp',
  'math-derivatives': '/static/plaza/math-derivatives.webp',
  'physics-kinematics': '/static/plaza/physics-kinematics.webp',
  'chemistry-equilibrium': '/static/plaza/chemistry-equilibrium.webp',
  'worksheet-quadratic': '/static/plaza/worksheet-quadratic.webp',
  'physics-electromagnetism': '/static/plaza/physics-electromagnetism.webp',
}

export const resolveProblemArtwork = (problem: Pick<ProblemPreview, 'artwork' | 'thumbnailPath'>) =>
  problem.thumbnailPath || PROBLEM_ARTWORK_SRC[problem.artwork]

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

// Generated from the Web public catalogue; do not substitute shared templates.
export const PUBLIC_PROBLEMS = webProblems as ProblemPreview[]

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

export const deleteProblemRecord = (problemId: string) => {
  const localDrafts = getLocalProblemDrafts().filter((problem) => problem.id !== problemId)
  const savedIds = getSavedProblemIds().filter((id) => id !== problemId)
  const recentRecords = getRecentProblemRecords().filter((record) => record.id !== problemId)

  try {
    uni.setStorageSync(STORAGE_KEYS.localProblems, localDrafts)
    uni.setStorageSync(STORAGE_KEYS.savedProblems, savedIds)
    uni.setStorageSync(STORAGE_KEYS.recentProblems, recentRecords)
  } catch {
    // Keep the in-memory page usable even if local storage is unavailable.
  }

  return {
    localProblems: localDrafts.map(localDraftToPreview),
    savedIds,
    recentRecords,
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
  const page = problem.webId ? 'catalog' : 'solver'
  return `/subpackages/${page}/index?${query}`
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
