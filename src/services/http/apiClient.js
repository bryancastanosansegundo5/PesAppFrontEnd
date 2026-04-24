import { API_BASE_URL } from '../../config/env'

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

let refreshPromise = null

function construirUrl(path) {
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  const rutaNormalizada = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${rutaNormalizada}`
}

async function extraerPayload(response) {
  if (response.status === 204) {
    return null
  }

  const contentType = response.headers.get('content-type') || ''

  if (contentType.includes('application/json')) {
    return response.json()
  }

  const text = await response.text()
  return text || null
}

function construirMensajeError(payload, fallbackMessage) {
  if (!payload) {
    return fallbackMessage
  }

  if (typeof payload === 'string') {
    return payload
  }

  if (Array.isArray(payload.mensajes) && payload.mensajes.length > 0) {
    return payload.mensajes.join(' ')
  }

  return payload.error || fallbackMessage
}

function esEndpointAuth(path) {
  return (
    path === '/api/auth/login' ||
    path === '/api/auth/logout' ||
    path === '/api/auth/refresh' ||
    path === '/api/auth/me'
  )
}

async function solicitarRefresh() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(construirUrl('/api/auth/refresh'), {
        method: 'POST',
        credentials: 'include',
      })

      const payload = await extraerPayload(response)

      if (!response.ok) {
        throw new ApiError(
          construirMensajeError(payload, 'No se pudo refrescar la sesion.'),
          response.status,
          payload,
        )
      }

      return payload
    })().finally(() => {
      refreshPromise = null
    })
  }

  return refreshPromise
}

async function ejecutarRequest(path, options = {}, intentoRefresh = true) {
  const {
    auth = false,
    body,
    headers = {},
    credentials_mode,
    skip_refresh = false,
    ...restOptions
  } = options
  const requestHeaders = new Headers(headers)
  const isFormData = body instanceof FormData
  const credentials = credentials_mode || (auth ? 'include' : 'same-origin')

  if (body !== undefined && !isFormData && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  const response = await fetch(construirUrl(path), {
    ...restOptions,
    headers: requestHeaders,
    credentials,
    body:
      body === undefined || isFormData || typeof body === 'string'
        ? body
        : JSON.stringify(body),
  })

  const payload = await extraerPayload(response)

  if (response.ok) {
    return payload
  }

  if (
    auth &&
    response.status === 401 &&
    intentoRefresh &&
    !skip_refresh &&
    !esEndpointAuth(path)
  ) {
    try {
      await solicitarRefresh()
      return ejecutarRequest(path, options, false)
    } catch {
      window.dispatchEvent(
        new CustomEvent('pesapp:auth-invalid', {
          detail: {
            path,
            status: response.status,
          },
        }),
      )
    }
  }

  if (auth && response.status === 401 && !esEndpointAuth(path)) {
    window.dispatchEvent(
      new CustomEvent('pesapp:auth-invalid', {
        detail: {
          path,
          status: response.status,
        },
      }),
    )
  }

  throw new ApiError(
    construirMensajeError(payload, 'No se pudo completar la peticion.'),
    response.status,
    payload,
  )
}

export function apiRequest(path, options = {}) {
  return ejecutarRequest(path, options, true)
}
