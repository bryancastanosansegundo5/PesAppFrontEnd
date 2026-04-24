import {
  guardarSesionAuth,
  limpiarSesionAuth,
  obtenerSesionAuth,
  sesionAuthExpirada,
} from './tokenStorage'
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

export function obtenerSesionPersistida() {
  const sesion = obtenerSesionAuth()

  if (!sesion || sesionAuthExpirada()) {
    return null
  }

  return {
    ...sesion,
    usuario: normalizarUsuario(sesion.usuario),
  }
}

export async function iniciarSesion({ email, password }) {
  const payload = await apiRequest('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  })

  const sesion = {
    token: payload.token,
    tokenType: payload.tokenType || 'Bearer',
    expiresIn: Number(payload.expiresIn) || 0,
    expiresAt: Date.now() + (Number(payload.expiresIn) || 0),
    usuario: normalizarUsuario(payload.usuario),
  }

  guardarSesionAuth(sesion)
  return sesion
}

export async function obtenerUsuarioActual() {
  const payload = await apiRequest('/api/auth/me', {
    method: 'GET',
    auth: true,
  })

  return normalizarUsuario(payload)
}

export function cerrarSesionLocal() {
  limpiarSesionAuth()
}
