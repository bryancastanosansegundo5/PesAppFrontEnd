import { crearPayloadSesion, normalizarListaSesiones } from '../../../services/training/trainingModel'
import { apiRequest } from '../../../services/http/apiClient'

export function guardarSesionEnServidor(sesion) {
  return apiRequest('/api/sesiones-entrenamiento', {
    method: 'POST',
    auth: true,
    body: crearPayloadSesion(sesion),
  })
}

export async function obtenerSesionesDesdeServidor() {
  const payload = await apiRequest('/api/sesiones-entrenamiento', {
    method: 'GET',
    auth: true,
  })

  return normalizarListaSesiones(payload, [])
}
