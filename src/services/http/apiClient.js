import { API_BASE_URL } from '../../config/env'

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.payload = payload
    this.backendError = payload?.error || ''
    this.backendMessage = payload?.mensaje || ''
    this.backendStatusCode = payload?.statusCode || status
    this.backendTimestamp = payload?.timestamp || ''
  }
}

let refreshPromise = null
let servidorDisponible = true

function publicarServidorNoDisponible(message, detail = {}) {
  const haCambiado = servidorDisponible !== false
  servidorDisponible = false

  if (!haCambiado) {
    return
  }

  window.dispatchEvent(
    new CustomEvent('pesapp:server-unreachable', {
      detail: {
        message,
        ...detail,
      },
    }),
  )
}

function publicarServidorDisponible(detail = {}) {
  const haCambiado = servidorDisponible !== true
  servidorDisponible = true

  if (!haCambiado) {
    return
  }

  window.dispatchEvent(
    new CustomEvent('pesapp:server-reachable', {
      detail,
    }),
  )
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

  return payload.mensaje || payload.error || fallbackMessage
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
      let response

      try {
        response = await fetch(construirUrl('/api/auth/refresh'), {
          method: 'POST',
          credentials: 'include',
        })
      } catch (errorCapturado) {
        publicarServidorNoDisponible(
          'No se pudo refrescar la sesion porque el servidor no responde.',
          {
            path: '/api/auth/refresh',
            cause: errorCapturado?.message || 'network-error',
          },
        )

        throw new ApiError(
          'No se pudo refrescar la sesion porque el servidor no responde.',
          0,
          null,
        )
      }

      const payload = await extraerPayload(response)

      if (!response.ok) {
        if (response.status >= 500) {
          publicarServidorNoDisponible(
            'No se pudo refrescar la sesion porque el servidor no responde.',
            {
              path: '/api/auth/refresh',
              status: response.status,
            },
          )
        }

        throw new ApiError(
          construirMensajeError(payload, 'No se pudo refrescar la sesion.'),
          response.status,
          payload,
        )
      }

      publicarServidorDisponible({ path: '/api/auth/refresh', status: response.status })

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

  let response

  try {
    response = await fetch(construirUrl(path), {
      ...restOptions,
      headers: requestHeaders,
      credentials,
      body:
        body === undefined || isFormData || typeof body === 'string'
          ? body
          : JSON.stringify(body),
    })
  } catch (errorCapturado) {
    publicarServidorNoDisponible(
      'No se pudo conectar con el servidor. La app seguira funcionando con los datos locales disponibles.',
      {
        path,
        cause: errorCapturado?.message || 'network-error',
      },
    )

    throw new ApiError(
      'No se pudo conectar con el servidor. Revisa la conexion o usa el modo local.',
      0,
      null,
    )
  }

  const payload = await extraerPayload(response)

  if (response.ok) {
    publicarServidorDisponible({ path, status: response.status })
    return payload
  }

  if (response.status >= 500) {
    publicarServidorNoDisponible(
      'El servidor no responde correctamente. Seguimos mostrando la informacion guardada en local.',
      {
        path,
        status: response.status,
      },
    )
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
