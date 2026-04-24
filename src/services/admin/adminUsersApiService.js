import { apiRequest } from '../http/apiClient'

function normalizarUsuario(usuario) {
  if (!usuario) {
    return null
  }

  return {
    id: usuario.id,
    nombre: usuario.nombre || '',
    email: usuario.email || '',
    rol: usuario.rol || '',
    activo: Boolean(usuario.activo),
    createdAt: usuario.createdAt || '',
    updatedAt: usuario.updatedAt || '',
  }
}

export async function obtenerUsuariosAdmin() {
  const payload = await apiRequest('/api/usuarios', {
    method: 'GET',
    auth: true,
  })

  return Array.isArray(payload) ? payload.map(normalizarUsuario) : []
}

export async function obtenerRolesUsuario() {
  const payload = await apiRequest('/api/usuarios/roles', {
    method: 'GET',
    auth: true,
  })

  return Array.isArray(payload) ? payload.filter(Boolean) : []
}

export async function crearUsuarioAdmin({ nombre, email, password, rol }) {
  const payload = await apiRequest('/api/usuarios', {
    method: 'POST',
    auth: true,
    body: { nombre, email, password, rol },
  })

  return normalizarUsuario(payload)
}

export async function cambiarRolUsuarioAdmin(id, rol) {
  const payload = await apiRequest(`/api/usuarios/${id}/rol`, {
    method: 'PATCH',
    auth: true,
    body: { rol },
  })

  return normalizarUsuario(payload)
}

export async function cambiarEstadoUsuarioAdmin(id, activo) {
  const payload = await apiRequest(`/api/usuarios/${id}/estado`, {
    method: 'PATCH',
    auth: true,
    body: { activo },
  })

  return normalizarUsuario(payload)
}
