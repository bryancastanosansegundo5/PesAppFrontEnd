import { apiRequest } from '../http/apiClient'

function normalizarIdeaRemota(idea) {
  if (!idea) {
    return null
  }

  return {
    ideaId: idea.id ? String(idea.id) : '',
    clientId: idea.clientId ? String(idea.clientId) : '',
    titulo: idea.titulo || '',
    descripcion: idea.descripcion || '',
    completada: Boolean(idea.completada),
    activo: idea.activo !== false,
    createdAt: idea.createdAt || '',
    updatedAt: idea.updatedAt || '',
    version: Number.isFinite(Number(idea.version)) ? Number(idea.version) : 0,
  }
}

export async function obtenerIdeasAdmin() {
  const payload = await apiRequest('/api/admin/ideas', {
    method: 'GET',
    auth: true,
    skip_global_sync: true,
    suppress_auth_invalid: true,
  })

  return Array.isArray(payload) ? payload.map(normalizarIdeaRemota).filter(Boolean) : []
}

export async function crearIdeaAdmin(idea) {
  const payload = await apiRequest('/api/admin/ideas', {
    method: 'POST',
    auth: true,
    body: {
      clientId: idea.clientId,
      titulo: idea.titulo,
      descripcion: idea.descripcion,
      completada: Boolean(idea.completada),
      activo: idea.activo !== false,
    },
    skip_global_sync: true,
    suppress_auth_invalid: true,
  })

  return normalizarIdeaRemota(payload)
}

export async function actualizarIdeaAdmin(ideaId, idea) {
  const payload = await apiRequest(`/api/admin/ideas/${ideaId}`, {
    method: 'PATCH',
    auth: true,
    body: {
      titulo: idea.titulo,
      descripcion: idea.descripcion,
      completada: Boolean(idea.completada),
      activo: idea.activo !== false,
      version: Number.isFinite(Number(idea.version)) ? Number(idea.version) : 0,
    },
    skip_global_sync: true,
    suppress_auth_invalid: true,
  })

  return normalizarIdeaRemota(payload)
}

export async function cambiarEstadoIdeaAdmin(ideaId, activo, version = 0) {
  const payload = await apiRequest(`/api/admin/ideas/${ideaId}/estado`, {
    method: 'PATCH',
    auth: true,
    body: {
      activo: Boolean(activo),
      version: Number.isFinite(Number(version)) ? Number(version) : 0,
    },
    skip_global_sync: true,
    suppress_auth_invalid: true,
  })

  return normalizarIdeaRemota(payload)
}
