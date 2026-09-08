const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const defaultBaseUrl = import.meta.env.DEV
  ? 'http://localhost:8002'
  : 'https://uniprism.cn/api'

export const API_BASE_URL = (configuredBaseUrl || defaultBaseUrl).replace(/\/$/, '')

export const MINIAPP_CLIENT_HEADERS = {
  'X-Miniapp-Client': 'graphtutor-weapp',
} as const

export class MiniappApiError extends Error {
  readonly statusCode: number

  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'MiniappApiError'
    this.statusCode = statusCode
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

interface RequestOptions {
  path: string
  method?: HttpMethod
  data?: UniNamespace.RequestOptions['data']
  timeout?: number
}

const readErrorMessage = (data: unknown) => {
  if (data && typeof data === 'object') {
    const body = data as { message?: unknown; error?: { message?: unknown } }
    if (typeof body.message === 'string') return body.message
    if (typeof body.error?.message === 'string') return body.error.message
  }
  return '请求未能完成，请稍后再试。'
}

export const request = <T>({ path, method = 'GET', data, timeout = 15000 }: RequestOptions) => (
  new Promise<T>((resolve, reject) => {
    uni.request({
      url: `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`,
      method,
      data,
      timeout,
      header: {
        'Content-Type': 'application/json',
        ...MINIAPP_CLIENT_HEADERS,
      },
      success(response) {
        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(response.data as T)
          return
        }
        reject(new MiniappApiError(readErrorMessage(response.data), response.statusCode))
      },
      fail(error) {
        reject(new MiniappApiError(error.errMsg || '网络连接失败，请检查后重试。', 0))
      },
    })
  })
)

export const uploadProblemImage = (filePath: string) => (
  new Promise<{ url: string; key?: string }>((resolve, reject) => {
    uni.uploadFile({
      url: `${API_BASE_URL}/resource/image`,
      filePath,
      name: 'file',
      header: MINIAPP_CLIENT_HEADERS,
      success(response) {
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new MiniappApiError('题图上传失败，请稍后再试。', response.statusCode))
          return
        }
        try {
          const parsed = JSON.parse(response.data) as { url?: string; key?: string }
          if (!parsed.url) throw new Error('missing upload url')
          resolve({ url: parsed.url, key: parsed.key })
        } catch {
          reject(new MiniappApiError('题图上传结果无法识别。', response.statusCode))
        }
      },
      fail(error) {
        reject(new MiniappApiError(error.errMsg || '题图上传失败。', 0))
      },
    })
  })
)
