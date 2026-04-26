import {
  crearPayloadSesion,
  normalizarListaSesiones,
  normalizarSesion,
} from '../../../services/training/trainingModel'
import { apiRequest } from '../../../services/http/apiClient'

function esIdNumerico(valor) {
  return /^\d+$/.test(String(valor || ''))
}

export async function guardarSesionEnServidor(sesion) {
  const body = crearPayloadSesion(sesion)
  const idPersistido = esIdNumerico(sesion?.id) ? String(sesion.id) : ''

  if (!idPersistido) {
    delete body.id
    delete body.idSesion
  }

  const payload = await apiRequest(
    idPersistido ? `/api/sesiones-entrenamiento/${idPersistido}` : '/api/sesiones-entrenamiento',
    {
      method: idPersistido ? 'PUT' : 'POST',
      auth: true,
      body,
    },
  )

  return normalizarSesion(payload || sesion)
}

export async function obtenerSesionesDesdeServidor() {
  const payload = await apiRequest('/api/sesiones-entrenamiento', {
    method: 'GET',
    auth: true,
  })

  return normalizarListaSesiones(payload, [])
}

export function eliminarSesionEnServidor(idSesion) {
  return apiRequest(`/api/sesiones-entrenamiento/${idSesion}`, {
    method: 'DELETE',
    auth: true,
  })
}
