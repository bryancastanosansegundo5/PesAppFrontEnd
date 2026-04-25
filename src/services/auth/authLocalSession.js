const CLAVE_SESION_OFFLINE = 'pesapp-offline-session'

function leerJson(clave, valorPorDefecto) {
  try {
    const valor = window.localStorage.getItem(clave)
    return valor ? JSON.parse(valor) : valorPorDefecto
  } catch {
    return valorPorDefecto
  }
}

function escribirJson(clave, valor) {
  window.localStorage.setItem(clave, JSON.stringify(valor))
}

async function calcularHashCredenciales(username, password) {
  const texto = `${String(username || '').trim().toLowerCase()}::${String(password || '')}`
  const datos = new TextEncoder().encode(texto)
  const hash = await window.crypto.subtle.digest('SHA-256', datos)
  return Array.from(new Uint8Array(hash))
    .map((valor) => valor.toString(16).padStart(2, '0'))
    .join('')
}

export function obtenerSesionOfflineGuardada() {
  return leerJson(CLAVE_SESION_OFFLINE, null)
}

export function guardarSesionOfflineDesdeServidor(sesion) {
  if (!sesion?.usuario) {
    return
  }

  const sesionActual = obtenerSesionOfflineGuardada()

  escribirJson(CLAVE_SESION_OFFLINE, {
    username:
      sesionActual?.username ||
      String(sesion.usuario.username || sesion.usuario.nombre || sesion.usuario.email || '').trim(),
    hashCredenciales: sesionActual?.hashCredenciales || '',
    sesion,
    updatedAt: new Date().toISOString(),
  })
}

export async function guardarSesionOffline({ username, password, sesion }) {
  const hashCredenciales = await calcularHashCredenciales(username, password)

  escribirJson(CLAVE_SESION_OFFLINE, {
    username: String(username || '').trim(),
    hashCredenciales,
    sesion,
    updatedAt: new Date().toISOString(),
  })
}

export function limpiarSesionOffline() {
  window.localStorage.removeItem(CLAVE_SESION_OFFLINE)
}

export async function validarInicioOffline({ username, password }) {
  const sesionOffline = obtenerSesionOfflineGuardada()

  if (!sesionOffline?.sesion?.usuario) {
    return null
  }

  const hashCredenciales = await calcularHashCredenciales(username, password)

  if (
    hashCredenciales !== sesionOffline.hashCredenciales ||
    String(username || '').trim().toLowerCase() !==
      String(sesionOffline.username || '').trim().toLowerCase()
  ) {
    return null
  }

  return {
    ...sesionOffline.sesion,
    authenticated: true,
    offline: true,
  }
}
