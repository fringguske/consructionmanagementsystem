export type ApiMode = 'demo' | 'live'

function resolveApiMode(value: string | undefined): ApiMode {
  const normalized = value?.trim().toLowerCase()

  if (!normalized || normalized === 'demo') {
    return 'demo'
  }

  if (normalized === 'live') {
    return 'live'
  }

  throw new Error(`Unsupported VITE_API_MODE "${value}". Use "demo" or "live".`)
}

function resolveApiBaseUrl(value: string | undefined): string {
  const configuredValue = value?.trim() || '/api/v1'
  return configuredValue.endsWith('/')
    ? configuredValue.slice(0, -1)
    : configuredValue
}

export const apiConfig = Object.freeze({
  mode: resolveApiMode(import.meta.env.VITE_API_MODE),
  baseUrl: resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
})

export const isLiveApiMode = apiConfig.mode === 'live'
