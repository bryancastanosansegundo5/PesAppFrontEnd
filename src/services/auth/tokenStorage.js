const AUTH_STORAGE_KEY = 'pesapp-auth-session'

function leerSesion() {
  try {
    const valor = window.localStorage.getItem(AUTH_STORAGE_KEY)
    return valor ? JSON.parse(valor) : null
  } catch {
    return null
  }
}

export function obtenerSesionAuth() {
  return leerSesion()
}

export function obtenerTokenAuth() {
  return leerSesion()?.token || null
}

export function obtenerUsuarioAuth() {
  return leerSesion()?.usuario || null
}

export function guardarSesionAuth(session) {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session))
}

export function guardarTokenAuth(token) {
  const sesionActual = leerSesion() || {}
  guardarSesionAuth({ ...sesionActual, token })
}

export function limpiarTokenAuth() {
  window.localStorage.removeItem(AUTH_STORAGE_KEY)
}

export const limpiarSesionAuth = limpiarTokenAuth

export function sesionAuthExpirada() {
  const sesion = leerSesion()

  if (!sesion?.expiresAt) {
    return false
  }

  return Date.now() >= Number(sesion.expiresAt)
}
