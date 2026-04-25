import {
  crearPayloadSesion,
  normalizarListaSesiones,
  normalizarSesion,
} from '../../../services/training/trainingModel'
import { apiRequest } from '../../../services/http/apiClient'

export async function guardarSesionEnServidor(sesion) {
  const payload = await apiRequest('/api/sesiones-entrenamiento', {
    method: 'POST',
    auth: true,
    body: crearPayloadSesion(sesion),
  })

  return normalizarSesion(payload || sesion)
}

export async function obtenerSesionesDesdeServidor() {
  const payload = await apiRequest('/api/sesiones-entrenamiento', {
    method: 'GET',
    auth: true,
  })

  return normalizarListaSesiones(payload, [])
}
