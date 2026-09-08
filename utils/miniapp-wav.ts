export const SPOKEN_FORMULA_SAMPLE_RATE = 16_000
export const SPOKEN_FORMULA_MAX_SECONDS = 15

const WAV_HEADER_BYTES = 44

interface WechatAudioBuffer {
  length: number
  numberOfChannels: number
  sampleRate: number
  getChannelData(channel: number): Float32Array
}

interface WechatWebAudioContext {
  decodeAudioData(
    audioData: ArrayBuffer,
    success: (buffer: WechatAudioBuffer) => void,
    fail: (error: unknown) => void,
  ): void
  close?: () => Promise<void> | void
}

interface WechatFileSystemManager {
  readFile(options: {
    filePath: string
    success: (result: { data: string | ArrayBuffer }) => void
    fail: (error: unknown) => void
  }): void
  writeFile(options: {
    filePath: string
    data: ArrayBuffer
    success: () => void
    fail: (error: unknown) => void
  }): void
  unlink(options: {
    filePath: string
    success?: () => void
    fail?: () => void
  }): void
}

interface WechatMiniProgramApi {
  env: { USER_DATA_PATH: string }
  createWebAudioContext?: () => WechatWebAudioContext
  getFileSystemManager: () => WechatFileSystemManager
}

declare const wx: WechatMiniProgramApi

const requireWechatApi = () => {
  if (typeof wx === 'undefined' || !wx.getFileSystemManager) {
    throw new Error('当前环境不支持微信录音转换，请在微信小程序中使用。')
  }
  return wx
}

const readFileBytes = (filePath: string) => new Promise<ArrayBuffer>((resolve, reject) => {
  requireWechatApi().getFileSystemManager().readFile({
    filePath,
    success: ({ data }) => {
      if (data instanceof ArrayBuffer) {
        resolve(data)
        return
      }
      reject(new Error('录音文件读取结果无效。'))
    },
    fail: () => reject(new Error('无法读取录音文件，请重新录制。')),
  })
})

const decodeAudio = async (bytes: ArrayBuffer) => {
  const context = requireWechatApi().createWebAudioContext?.()
  if (!context) {
    throw new Error('当前微信基础库不支持音频转换，请升级微信后重试。')
  }
  try {
    return await new Promise<WechatAudioBuffer>((resolve, reject) => {
      context.decodeAudioData(
        bytes,
        resolve,
        () => reject(new Error('录音解码失败，请重新录制。')),
      )
    })
  } finally {
    await context.close?.()
  }
}

const downmixToMono = (buffer: WechatAudioBuffer) => {
  const channels = Math.max(1, buffer.numberOfChannels)
  if (channels === 1) return Float32Array.from(buffer.getChannelData(0))

  const mono = new Float32Array(buffer.length)
  for (let channel = 0; channel < channels; channel += 1) {
    const samples = buffer.getChannelData(channel)
    for (let index = 0; index < mono.length; index += 1) {
      mono[index] = (mono[index] ?? 0) + (samples[index] ?? 0) / channels
    }
  }
  return mono
}

const writeAscii = (view: DataView, offset: number, value: string) => {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index))
  }
}

/** 与 Web 端相同的面积加权降采样：统一为 16kHz、单声道、PCM16。 */
export const normalizeFloatPcm16 = (
  chunks: readonly Float32Array[],
  inputSampleRate: number,
  outputSampleRate = SPOKEN_FORMULA_SAMPLE_RATE,
) => {
  if (!Number.isInteger(inputSampleRate) || inputSampleRate <= 0) {
    throw new Error('麦克风采样率无效。')
  }
  if (!Number.isInteger(outputSampleRate) || outputSampleRate <= 0) {
    throw new Error('目标采样率无效。')
  }

  const samples: number[] = []
  let outputWeight = 0
  let weightedSampleSum = 0

  for (const chunk of chunks) {
    for (const rawSample of chunk) {
      const sample = Math.max(-1, Math.min(1, Number.isFinite(rawSample) ? rawSample : 0))
      let remainingWeight = outputSampleRate
      while (remainingWeight > 0) {
        const availableWeight = inputSampleRate - outputWeight
        const consumedWeight = Math.min(remainingWeight, availableWeight)
        weightedSampleSum += sample * consumedWeight
        outputWeight += consumedWeight
        remainingWeight -= consumedWeight
        if (outputWeight === inputSampleRate) {
          const normalized = weightedSampleSum / inputSampleRate
          samples.push(normalized < 0
            ? Math.round(normalized * 32_768)
            : Math.round(normalized * 32_767))
          outputWeight = 0
          weightedSampleSum = 0
        }
      }
    }
  }

  const bytes = new Uint8Array(samples.length * 2)
  const view = new DataView(bytes.buffer)
  samples.forEach((sample, index) => view.setInt16(index * 2, sample, true))
  return bytes
}

export const encodePcm16MonoWav = (
  pcm: Uint8Array,
  sampleRate = SPOKEN_FORMULA_SAMPLE_RATE,
) => {
  if (pcm.byteLength % 2 !== 0) throw new Error('PCM16 数据不完整。')
  const output = new Uint8Array(WAV_HEADER_BYTES + pcm.byteLength)
  const view = new DataView(output.buffer)
  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + pcm.byteLength, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, pcm.byteLength, true)
  output.set(pcm, WAV_HEADER_BYTES)
  return output
}

const writeCanonicalWav = (bytes: Uint8Array) => new Promise<string>((resolve, reject) => {
  const api = requireWechatApi()
  const filePath = `${api.env.USER_DATA_PATH}/spoken-formula-${Date.now()}.wav`
  const exactBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  api.getFileSystemManager().writeFile({
    filePath,
    data: exactBuffer,
    success: () => resolve(filePath),
    fail: () => reject(new Error('无法生成语音文件，请检查小程序存储空间。')),
  })
})

export const convertRecordingToCanonicalWav = async (recordingPath: string) => {
  const encoded = await readFileBytes(recordingPath)
  const decoded = await decodeAudio(encoded)
  const durationSeconds = decoded.length / decoded.sampleRate
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error('没有录到有效语音，请重新说一次。')
  }
  if (durationSeconds > SPOKEN_FORMULA_MAX_SECONDS + 0.5) {
    throw new Error('语音不能超过 15 秒，请缩短后重试。')
  }
  const pcm = normalizeFloatPcm16([downmixToMono(decoded)], decoded.sampleRate)
  if (pcm.byteLength < SPOKEN_FORMULA_SAMPLE_RATE / 5) {
    throw new Error('录音时间太短，请完整说出一个公式。')
  }
  return writeCanonicalWav(encodePcm16MonoWav(pcm))
}

export const removeMiniappTempFile = (filePath: string) => {
  if (!filePath) return
  try {
    requireWechatApi().getFileSystemManager().unlink({ filePath })
  } catch {
    // 临时文件清理失败不影响本轮公式识别结果。
  }
}
