import { API_BASE_URL } from '../../config/env'
import { obtenerTokenAuth } from '../auth/tokenStorage'

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
  }
}

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

export async function apiRequest(path, options = {}) {
  const { auth = false, body, headers = {}, token, ...restOptions } = options
  const requestHeaders = new Headers(headers)
  const bearerToken = token || (auth ? obtenerTokenAuth() : null)
  const isFormData = body instanceof FormData

  if (body !== undefined && !isFormData && !requestHeaders.has('Content-Type')) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  if (bearerToken && !requestHeaders.has('Authorization')) {
    requestHeaders.set('Authorization', `Bearer ${bearerToken}`)
  }

  const response = await fetch(construirUrl(path), {
    ...restOptions,
    headers: requestHeaders,
    body:
      body === undefined || isFormData || typeof body === 'string'
        ? body
        : JSON.stringify(body),
  })

  const payload = await extraerPayload(response)

  if (!response.ok) {
    const error = new ApiError(
      construirMensajeError(payload, 'No se pudo completar la peticion.'),
      response.status,
      payload,
    )

    if (auth && response.status === 403) {
      window.dispatchEvent(
        new CustomEvent('pesapp:auth-invalid', {
          detail: {
            path,
            status: response.status,
          },
        }),
      )
    }

    throw error
  }

  return payload
}
