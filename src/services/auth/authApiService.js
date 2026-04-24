import { apiRequest } from '../http/apiClient'

function normalizarUsuario(usuario) {
  if (!usuario) {
    return null
  }

  return {
    id: usuario.id,
    nombre: usuario.nombre || '',
    email: usuario.email ?? null,
    username: usuario.username || '',
    rol: usuario.rol || '',
    activo: Boolean(usuario.activo),
    createdAt: usuario.createdAt || '',
    updatedAt: usuario.updatedAt || '',
  }
}

function normalizarSesion(payload) {
  if (!payload) {
    return null
  }

  return {
    tokenType: payload.tokenType || 'Cookie',
    accessTokenExpiresIn: Number(payload.accessTokenExpiresIn) || 0,
    refreshTokenExpiresIn: Number(payload.refreshTokenExpiresIn) || 0,
    authenticated: Boolean(payload.authenticated),
    usuario: normalizarUsuario(payload.usuario),
  }
}

export async function iniciarSesion({ username, password }) {
  const payload = await apiRequest('/api/auth/login', {
    method: 'POST',
    credentials_mode: 'include',
    body: {
      username,
      password,
    },
  })

  return normalizarSesion(payload)
}

export async function refrescarSesion() {
  const payload = await apiRequest('/api/auth/refresh', {
    method: 'POST',
    credentials_mode: 'include',
  })

  return normalizarSesion(payload)
}

export async function obtenerUsuarioActual() {
  const payload = await apiRequest('/api/auth/me', {
    method: 'GET',
    auth: true,
  })

  return normalizarUsuario(payload)
}

export async function cerrarSesion() {
  const payload = await apiRequest('/api/auth/logout', {
    method: 'POST',
    credentials_mode: 'include',
  })

  return {
    logout: Boolean(payload?.logout),
    mensaje: payload?.mensaje || '',
  }
}
