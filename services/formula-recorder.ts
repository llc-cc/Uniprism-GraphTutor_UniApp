import { SPOKEN_FORMULA_MAX_SECONDS } from '../utils/miniapp-wav'

interface RecorderStopResult {
  tempFilePath?: string
  duration?: number
  fileSize?: number
}

interface RecorderErrorResult {
  errMsg?: string
}

interface PendingRecording {
  resolve: (filePath: string) => void
  reject: (error: Error) => void
  onStarted?: () => void
  cancelled: boolean
}

const recorder = uni.getRecorderManager()
let pending: PendingRecording | null = null
let authorizationGeneration = 0

export class RecordingPermissionError extends Error {
  constructor(message = '无法使用麦克风，请开启录音权限后重试。') {
    super(message)
    this.name = 'RecordingPermissionError'
  }
}

export const isRecordingPermissionError = (error: unknown): error is RecordingPermissionError => (
  error instanceof RecordingPermissionError
  || (error instanceof Error && error.name === 'RecordingPermissionError')
)

const rejectPending = (message: string) => {
  const current = pending
  pending = null
  current?.reject(new Error(message))
}

recorder.onStart(() => {
  pending?.onStarted?.()
})

recorder.onStop((result: RecorderStopResult) => {
  const current = pending
  pending = null
  if (!current) return
  if (current.cancelled) {
    current.reject(new Error('已取消语音输入。'))
    return
  }
  const filePath = result.tempFilePath?.trim()
  if (!filePath) {
    current.reject(new Error('没有生成有效录音，请重新说一次。'))
    return
  }
  current.resolve(filePath)
})

recorder.onError((result: RecorderErrorResult) => {
  const detail = result?.errMsg?.trim() ?? ''
  const normalized = detail.toLowerCase()
  if (normalized.includes('auth') || normalized.includes('permission') || normalized.includes('privacy')) {
    const current = pending
    pending = null
    current?.reject(new RecordingPermissionError())
    return
  }

  const platform = (() => {
    try {
      return uni.getSystemInfoSync().platform
    } catch {
      return ''
    }
  })()
  const message = platform === 'devtools'
    ? '开发者工具未能启动电脑麦克风。请检查 Windows 的麦克风隐私权限，或改用“真机调试”测试录音。'
    : `录音启动失败${detail ? `：${detail}` : '，请检查系统麦克风权限后重试。'}`
  rejectPending(message)
})

const getRecordingPermission = () => new Promise<boolean | undefined>((resolve, reject) => {
  uni.getSetting({
    success: (result) => resolve(result.authSetting?.['scope.record']),
    fail: (error) => reject(new Error(error.errMsg || '无法读取录音权限状态。')),
  })
})

const ensurePrivacyAuthorization = () => new Promise<void>((resolve, reject) => {
  if (typeof uni.requirePrivacyAuthorize !== 'function') {
    resolve()
    return
  }

  uni.requirePrivacyAuthorize({
    success: () => resolve(),
    fail: (error) => {
      const detail = error.errMsg?.trim() ?? ''
      const normalized = detail.toLowerCase()
      if (normalized.includes('privacy api banned') || normalized.includes('not configured')) {
        reject(new Error('当前小程序尚未在微信公众平台声明麦克风用途，请管理员先更新“用户隐私保护指引”。'))
        return
      }
      reject(new Error('使用语音公式前，需要先同意小程序隐私保护指引。'))
    },
  })
})

const authorizeRecording = async () => {
  await ensurePrivacyAuthorization()
  const permission = await getRecordingPermission()
  if (permission === true) return
  if (permission === false) {
    throw new RecordingPermissionError('录音权限已关闭，请点击“去开启”并允许使用麦克风。')
  }

  await new Promise<void>((resolve, reject) => {
    uni.authorize({
      scope: 'scope.record',
      success: () => resolve(),
      fail: (error) => {
        const detail = error.errMsg?.toLowerCase() ?? ''
        if (detail.includes('privacy api banned')) {
          reject(new Error('小程序尚未完成录音隐私权限配置，请先在微信公众平台完善隐私保护指引。'))
          return
        }
        reject(new RecordingPermissionError('未取得录音权限，请点击“去开启”并允许使用麦克风。'))
      },
    })
  })
}

export const openFormulaRecordingSettings = () => new Promise<boolean>((resolve, reject) => {
  uni.openSetting({
    success: (result) => {
      const permission = result.authSetting?.['scope.record']
      if (permission === undefined) {
        reject(new Error('设置页没有麦克风开关：当前 AppID 尚未注册录音权限，请先在微信公众平台补充“用户隐私保护指引”。'))
        return
      }
      resolve(permission === true)
    },
    fail: (error) => reject(new Error(error.errMsg || '无法打开小程序权限设置。')),
  })
})

export const beginFormulaRecording = async (onStarted?: () => void) => {
  if (pending) throw new Error('上一轮语音输入尚未结束。')
  const generation = ++authorizationGeneration
  await authorizeRecording()
  if (generation !== authorizationGeneration) {
    throw new Error('已取消语音输入。')
  }

  return new Promise<string>((resolve, reject) => {
    pending = { resolve, reject, onStarted, cancelled: false }
    try {
      recorder.start({
        duration: SPOKEN_FORMULA_MAX_SECONDS * 1000,
        sampleRate: 16_000,
        numberOfChannels: 1,
        encodeBitRate: 48_000,
        format: 'mp3',
      })
    } catch {
      rejectPending('无法启动录音，请稍后重试。')
    }
  })
}

export const finishFormulaRecording = () => {
  if (!pending) return
  recorder.stop()
}

export const cancelFormulaRecording = () => {
  ++authorizationGeneration
  if (!pending) return
  pending.cancelled = true
  recorder.stop()
}
