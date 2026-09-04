import { reactive, readonly } from 'vue'

const SESSION_KEY = 'uniprism:miniapp:session'

interface VisitorSession {
  visitorId: string
  mode: 'guest'
  createdAt: string
}

const state = reactive<VisitorSession>({
  visitorId: '',
  mode: 'guest',
  createdAt: '',
})

const createVisitorId = () => {
  const random = Math.random().toString(36).slice(2, 10)
  return `UP-MP-${Date.now().toString(36)}-${random}`
}

export const ensureVisitorSession = (): VisitorSession => {
  const stored = uni.getStorageSync(SESSION_KEY) as Partial<VisitorSession> | ''
  if (stored && typeof stored === 'object' && typeof stored.visitorId === 'string') {
    Object.assign(state, stored, { mode: 'guest' as const })
    return { ...state }
  }

  const next: VisitorSession = {
    visitorId: createVisitorId(),
    mode: 'guest',
    createdAt: new Date().toISOString(),
  }
  Object.assign(state, next)
  uni.setStorageSync(SESSION_KEY, next)
  return next
}

export const getVisitorId = () => ensureVisitorSession().visitorId
export const sessionState = readonly(state)
