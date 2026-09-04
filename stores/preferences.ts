import { reactive, readonly } from 'vue'

export type AnswerDetail = '精简' | '标准' | '详细'
export type FontSizePreference = '紧凑' | '标准' | '舒适'
export type BoardView = '自动' | '正视' | '俯视' | '等轴测'

export interface MiniappPreferences {
  displayName: string
  grade: string
  defaultSubject: string
  stepMode: boolean
  autoOpenBoard: boolean
  showGrid: boolean
  defaultView: BoardView
  answerDetail: AnswerDetail
  fontSize: FontSizePreference
  reducedMotion: boolean
}

export const DEFAULT_PREFERENCES: MiniappPreferences = {
  displayName: '学习者',
  grade: '高中二年级',
  defaultSubject: '数学 · 立体几何',
  stepMode: true,
  autoOpenBoard: true,
  showGrid: true,
  defaultView: '自动',
  answerDetail: '标准',
  fontSize: '标准',
  reducedMotion: false,
}

const STORAGE_KEY = 'uniprism:miniapp:preferences'
const state = reactive<MiniappPreferences>({ ...DEFAULT_PREFERENCES })

export const loadPreferences = () => {
  const stored = uni.getStorageSync(STORAGE_KEY) as Partial<MiniappPreferences> | ''
  Object.assign(state, DEFAULT_PREFERENCES, stored && typeof stored === 'object' ? stored : {})
  return state
}

export const savePreferences = (next?: Partial<MiniappPreferences>) => {
  if (next) Object.assign(state, next)
  uni.setStorageSync(STORAGE_KEY, { ...state })
}

export const resetPreferences = () => {
  Object.assign(state, DEFAULT_PREFERENCES)
  savePreferences()
}

export const preferencesState = readonly(state)
export const mutablePreferences = state
