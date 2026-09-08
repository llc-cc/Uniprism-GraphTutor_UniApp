import { API_BASE_URL, MINIAPP_CLIENT_HEADERS, MiniappApiError, request } from './http'

export type SpokenFormulaOutcome = 'resolved' | 'candidates' | 'clarification'
export type SpokenFormulaClarificationAction =
  | 'selectCandidate'
  | 'continueRecording'
  | 'retryRecording'
  | 'useKeyboard'

export interface SpokenFormulaCandidate {
  id: string
  latex: string
  spokenBack: string
  matchKind: 'complete' | 'partial'
}

export interface SpokenFormulaClarificationOption {
  id: string
  label: string
  action: SpokenFormulaClarificationAction
  candidateId?: string
}

export interface SpokenFormulaResolution {
  resolutionId: string
  recognizedText: string
  normalizedText: string
  outcome: SpokenFormulaOutcome
  candidates: SpokenFormulaCandidate[]
  clarification: null | {
    question: string
    focusText: string
    options: SpokenFormulaClarificationOption[]
  }
  warnings: string[]
}

const publicErrorMessage = (data: unknown, fallback: string) => {
  if (data && typeof data === 'object') {
    const message = (data as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message.trim()
  }
  return fallback
}

const parseJson = (value: string) => {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

export const checkSpokenFormulaHealth = () => request<{ available: boolean }>({
  path: '/geometry/spoken-formula/asr-health',
  timeout: 2500,
})

export const transcribeFormulaAudio = (
  filePath: string,
  budgetMs = 3800,
) => new Promise<string>((resolve, reject) => {
  uni.uploadFile({
    url: `${API_BASE_URL}/geometry/spoken-formula/transcribe`,
    filePath,
    name: 'file',
    formData: {
      budgetMs: String(Math.max(1, Math.min(3800, Math.floor(budgetMs)))),
    },
    timeout: Math.max(1000, budgetMs + 500),
    header: MINIAPP_CLIENT_HEADERS,
    success(response) {
      const payload = parseJson(response.data)
      if (response.statusCode < 200 || response.statusCode >= 300) {
        reject(new MiniappApiError(
          publicErrorMessage(payload, '语音识别暂时不可用，请稍后重试。'),
          response.statusCode,
        ))
        return
      }
      const text = payload && typeof payload === 'object'
        ? String((payload as { text?: unknown }).text ?? '').trim()
        : ''
      if (!text) {
        reject(new MiniappApiError('没有识别到有效语音，请重新说一次。', 502))
        return
      }
      resolve(text)
    },
    fail(error) {
      reject(new MiniappApiError(
        error.errMsg || `无法连接公式服务（${API_BASE_URL}）。`,
        0,
      ))
    },
  })
})

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const requiredText = (value: unknown, maximum: number) => {
  if (typeof value !== 'string') throw new Error('invalid text')
  const text = value.trim()
  if (!text || text.length > maximum) throw new Error('invalid text')
  return text
}

const requiredId = (value: unknown) => {
  const id = requiredText(value, 80)
  if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('invalid id')
  return id
}

export const parseSpokenFormulaResolution = (payload: unknown): SpokenFormulaResolution => {
  if (!isRecord(payload) || !Array.isArray(payload.candidates) || !Array.isArray(payload.warnings)) {
    throw new Error('invalid resolution')
  }
  const outcome = payload.outcome
  if (outcome !== 'resolved' && outcome !== 'candidates' && outcome !== 'clarification') {
    throw new Error('invalid outcome')
  }
  if (payload.candidates.length > 3 || payload.warnings.length > 3) {
    throw new Error('invalid resolution limits')
  }
  const ids = new Set<string>()
  const candidates = payload.candidates.map((item): SpokenFormulaCandidate => {
    if (!isRecord(item)) throw new Error('invalid candidate')
    const id = requiredId(item.id)
    if (ids.has(id)) throw new Error('duplicate candidate')
    ids.add(id)
    const matchKind = item.matchKind ?? 'complete'
    if (matchKind !== 'complete' && matchKind !== 'partial') {
      throw new Error('invalid match kind')
    }
    return {
      id,
      latex: requiredText(item.latex, 512),
      spokenBack: requiredText(item.spokenBack, 240),
      matchKind,
    }
  })
  let clarification: SpokenFormulaResolution['clarification'] = null
  if (payload.clarification !== null && payload.clarification !== undefined) {
    if (!isRecord(payload.clarification) || !Array.isArray(payload.clarification.options)) {
      throw new Error('invalid clarification')
    }
    const optionIds = new Set<string>()
    const selectedCandidateIds = new Set<string>()
    const recoveryActions = new Set<SpokenFormulaClarificationAction>()
    const options = payload.clarification.options.map((item): SpokenFormulaClarificationOption => {
      if (!isRecord(item)) throw new Error('invalid clarification option')
      const action = item.action
      if (
        action !== 'selectCandidate'
        && action !== 'continueRecording'
        && action !== 'retryRecording'
        && action !== 'useKeyboard'
      ) throw new Error('invalid clarification action')
      const candidateId = item.candidateId === undefined
        ? undefined
        : requiredId(item.candidateId)
      if (action === 'selectCandidate' && (!candidateId || !ids.has(candidateId))) {
        throw new Error('invalid candidate reference')
      }
      if (action !== 'selectCandidate' && candidateId !== undefined) {
        throw new Error('unexpected candidate reference')
      }
      const id = requiredId(item.id)
      if (optionIds.has(id)) throw new Error('duplicate clarification option')
      optionIds.add(id)
      if (action === 'selectCandidate' && candidateId) {
        if (selectedCandidateIds.has(candidateId)) throw new Error('duplicate candidate selection')
        selectedCandidateIds.add(candidateId)
      } else if (action !== 'selectCandidate') {
        if (recoveryActions.has(action)) throw new Error('duplicate recovery action')
        recoveryActions.add(action)
      }
      return {
        id,
        label: requiredText(item.label, 120),
        action,
        ...(candidateId ? { candidateId } : {}),
      }
    })
    if (options.length < 2 || options.length > 5) {
      throw new Error('invalid clarification options')
    }
    clarification = {
      question: requiredText(payload.clarification.question, 240),
      focusText: requiredText(payload.clarification.focusText, 120),
      options,
    }
  }
  if (outcome === 'resolved' && (candidates.length !== 1 || clarification !== null)) {
    throw new Error('invalid resolved shape')
  }
  if (outcome === 'candidates' && (candidates.length < 2 || clarification !== null)) {
    throw new Error('invalid candidates shape')
  }
  if (outcome === 'clarification' && clarification === null) {
    throw new Error('invalid clarification shape')
  }
  return {
    resolutionId: requiredText(payload.resolutionId, 80),
    recognizedText: requiredText(payload.recognizedText, 300),
    normalizedText: requiredText(payload.normalizedText, 300),
    outcome,
    candidates,
    clarification,
    warnings: payload.warnings.map((warning) => requiredText(warning, 160)),
  }
}

export const resolveSpokenFormula = async (
  text: string,
  budgetMs = 4500,
) => parseSpokenFormulaResolution(await request<unknown>({
  path: '/geometry/spoken-formula',
  method: 'POST',
  timeout: Math.max(1000, budgetMs + 500),
  data: {
    text,
    locale: 'zh-CN',
    budgetMs: Math.max(1, Math.min(5000, Math.floor(budgetMs))),
    candidateMetadataVersion: 1,
  },
}))
