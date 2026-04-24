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

function normalizarDisponibilidadUsername(payload) {
  if (typeof payload === 'boolean') {
    return payload
  }

  if (!payload || typeof payload !== 'object') {
    return false
  }

  if (typeof payload.disponible === 'boolean') {
    return payload.disponible
  }

  if (typeof payload.available === 'boolean') {
    return payload.available
  }

  return false
}

export async function obtenerPerfilUsuario() {
  const payload = await apiRequest('/api/usuarios/me', {
    method: 'GET',
    auth: true,
  })

  return normalizarUsuario(payload)
}

export async function comprobarDisponibilidadUsername(username) {
  const parametro = encodeURIComponent(username)
  const payload = await apiRequest(`/api/usuarios/disponibilidad-username?username=${parametro}`, {
    method: 'GET',
    auth: true,
  })

  return normalizarDisponibilidadUsername(payload)
}

export async function actualizarPerfilUsuario({ nombre, username, email }) {
  const payload = await apiRequest('/api/usuarios/me', {
    method: 'PATCH',
    auth: true,
    body: {
      nombre,
      username,
      email: email || null,
    },
  })

  return normalizarUsuario(payload)
}
