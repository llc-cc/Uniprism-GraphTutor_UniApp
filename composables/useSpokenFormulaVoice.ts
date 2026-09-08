import { computed, onUnmounted, ref } from 'vue'
import {
  checkSpokenFormulaHealth,
  resolveSpokenFormula,
  transcribeFormulaAudio,
  type SpokenFormulaClarificationOption,
  type SpokenFormulaResolution,
} from '../services/spoken-formula'
import {
  beginFormulaRecording,
  cancelFormulaRecording,
  finishFormulaRecording,
  isRecordingPermissionError,
  openFormulaRecordingSettings,
} from '../services/formula-recorder'
import {
  convertRecordingToCanonicalWav,
  removeMiniappTempFile,
} from '../utils/miniapp-wav'

export type SpokenFormulaVoiceStatus =
  | 'idle'
  | 'checking'
  | 'requestingPermission'
  | 'listening'
  | 'preparing'
  | 'transcribing'
  | 'converting'
  | 'preview'
  | 'error'

const PROCESSING_DEADLINE_MS = 5_000
const RESPONSE_RESERVE_MS = 500

const messageOf = (error: unknown) => (
  error instanceof Error && error.message.trim()
    ? error.message.trim()
    : '语音公式处理失败，请重新说一次。'
)

export const useSpokenFormulaVoice = () => {
  const status = ref<SpokenFormulaVoiceStatus>('idle')
  const seconds = ref(0)
  const transcript = ref('')
  const resolution = ref<SpokenFormulaResolution | null>(null)
  const selectedCandidateIndex = ref(-1)
  const errorMessage = ref('')
  const permissionRecoveryRequired = ref(false)
  let timer: ReturnType<typeof setInterval> | undefined
  let processingDeadlineTimer: ReturnType<typeof setTimeout> | undefined
  let operationId = 0
  let canonicalWavPath = ''
  let continuationPrefix = ''
  let continuationTurn = 0

  const clearTimer = () => {
    if (timer) clearInterval(timer)
    timer = undefined
  }

  const clearProcessingDeadline = () => {
    if (processingDeadlineTimer) clearTimeout(processingDeadlineTimer)
    processingDeadlineTimer = undefined
  }

  const clearWav = () => {
    if (canonicalWavPath) removeMiniappTempFile(canonicalWavPath)
    canonicalWavPath = ''
  }

  const isBusy = computed(() => (
    status.value !== 'idle'
    && status.value !== 'preview'
    && status.value !== 'error'
  ))

  const isListening = computed(() => status.value === 'listening')
  const selectedLatex = computed(() => (
    resolution.value?.candidates[selectedCandidateIndex.value]?.latex ?? ''
  ))

  const resetState = () => {
    transcript.value = ''
    resolution.value = null
    selectedCandidateIndex.value = -1
    errorMessage.value = ''
    permissionRecoveryRequired.value = false
  }

  const showError = (error: unknown, id: number) => {
    if (id !== operationId) return
    clearTimer()
    clearProcessingDeadline()
    clearWav()
    permissionRecoveryRequired.value = isRecordingPermissionError(error)
    errorMessage.value = messageOf(error)
    status.value = 'error'
  }

  const processRecording = async (recordingPath: string, id: number) => {
    const processingStartedAt = Date.now()
    clearProcessingDeadline()
    processingDeadlineTimer = setTimeout(() => {
      if (id !== operationId) return
      ++operationId
      clearWav()
      errorMessage.value = '公式处理超过 5 秒，请重新说一次或使用公式键盘。'
      status.value = 'error'
    }, PROCESSING_DEADLINE_MS)
    status.value = 'preparing'
    try {
      canonicalWavPath = await convertRecordingToCanonicalWav(recordingPath)
      if (id !== operationId) {
        clearWav()
        return
      }

      status.value = 'transcribing'
      const elapsedBeforeAsr = Date.now() - processingStartedAt
      const asrBudget = Math.min(
        3800,
        PROCESSING_DEADLINE_MS - elapsedBeforeAsr - RESPONSE_RESERVE_MS - 150,
      )
      if (asrBudget <= 0) throw new Error('公式处理超过 5 秒，请重新说一次或使用公式键盘。')
      const recognized = await transcribeFormulaAudio(canonicalWavPath, asrBudget)
      if (id !== operationId) return
      clearWav()

      const combinedText = [continuationPrefix, recognized]
        .map((part) => part.trim())
        .filter(Boolean)
        .join('，')
        .slice(0, 300)
      continuationPrefix = ''
      transcript.value = combinedText
      status.value = 'converting'

      const elapsed = Date.now() - processingStartedAt
      const conversionBudget = PROCESSING_DEADLINE_MS - elapsed - RESPONSE_RESERVE_MS
      if (conversionBudget <= 0) {
        throw new Error('公式处理超过 5 秒，请重新说一次或使用公式键盘。')
      }
      const nextResolution = await resolveSpokenFormula(combinedText, conversionBudget)
      if (id !== operationId) return
      resolution.value = nextResolution
      selectedCandidateIndex.value = nextResolution.outcome === 'resolved' ? 0 : -1
      status.value = 'preview'
    } finally {
      if (id === operationId) clearProcessingDeadline()
    }
  }

  const start = async (prefix = '') => {
    if (isBusy.value) return
    const id = ++operationId
    clearTimer()
    clearWav()
    resetState()
    continuationPrefix = prefix.trim().slice(0, 260)
    if (!continuationPrefix) continuationTurn = 0
    seconds.value = 0
    status.value = 'checking'

    try {
      const health = await checkSpokenFormulaHealth()
      if (id !== operationId) return
      if (!health.available) throw new Error('SenseVoice 语音服务暂时不可用。')
      status.value = 'requestingPermission'
      const recordingPath = await beginFormulaRecording(() => {
        if (id !== operationId) return
        status.value = 'listening'
        timer = setInterval(() => {
          seconds.value += 1
        }, 1000)
      })
      if (id !== operationId) return
      clearTimer()
      await processRecording(recordingPath, id)
    } catch (error) {
      showError(error, id)
    }
  }

  const stop = () => {
    if (status.value === 'listening' || status.value === 'requestingPermission') {
      finishFormulaRecording()
    }
  }

  const cancel = () => {
    ++operationId
    clearTimer()
    clearProcessingDeadline()
    clearWav()
    cancelFormulaRecording()
    continuationPrefix = ''
    continuationTurn = 0
    seconds.value = 0
    resetState()
    status.value = 'idle'
  }

  const retry = async () => {
    if (permissionRecoveryRequired.value) {
      const id = ++operationId
      status.value = 'requestingPermission'
      errorMessage.value = ''
      try {
        const granted = await openFormulaRecordingSettings()
        if (id !== operationId) return
        if (!granted) {
          throw new Error('录音权限仍未开启，请允许使用麦克风后再继续。')
        }
        status.value = 'idle'
        await start()
      } catch (error) {
        if (id !== operationId) return
        permissionRecoveryRequired.value = true
        errorMessage.value = messageOf(error)
        status.value = 'error'
      }
      return
    }

    const text = transcript.value.trim()
    if (!text || isBusy.value) {
      await start()
      return
    }
    const id = ++operationId
    resolution.value = null
    selectedCandidateIndex.value = -1
    errorMessage.value = ''
    status.value = 'converting'
    try {
      resolution.value = await resolveSpokenFormula(text, 4500)
      if (id !== operationId || !resolution.value) return
      selectedCandidateIndex.value = resolution.value.outcome === 'resolved' ? 0 : -1
      status.value = 'preview'
    } catch (error) {
      showError(error, id)
    }
  }

  const continueRecording = async () => {
    const prefix = resolution.value?.normalizedText || transcript.value
    if (!prefix.trim() || continuationTurn >= 2) {
      cancel()
      await start()
      return
    }
    const nextContinuationTurn = continuationTurn + 1
    cancel()
    continuationTurn = nextContinuationTurn
    await start(prefix)
  }

  const answerClarification = async (option: SpokenFormulaClarificationOption) => {
    if (option.action === 'selectCandidate') {
      const index = resolution.value?.candidates.findIndex(
        (candidate) => candidate.id === option.candidateId,
      ) ?? -1
      selectCandidate(index)
      return option.action
    }
    if (option.action === 'continueRecording') {
      await continueRecording()
      return option.action
    }
    if (option.action === 'retryRecording') {
      cancel()
      await start()
      return option.action
    }
    cancel()
    return option.action
  }

  const selectCandidate = (index: number) => {
    if (!resolution.value?.candidates[index]) return
    selectedCandidateIndex.value = index
  }

  onUnmounted(cancel)

  return {
    status,
    seconds,
    transcript,
    resolution,
    selectedCandidateIndex,
    errorMessage,
    permissionRecoveryRequired,
    isBusy,
    isListening,
    selectedLatex,
    start,
    stop,
    cancel,
    retry,
    continueRecording,
    answerClarification,
    selectCandidate,
  }
}
