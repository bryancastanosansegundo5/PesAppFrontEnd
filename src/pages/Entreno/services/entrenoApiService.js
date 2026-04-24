import {
  crearPayloadEntrenamiento,
  normalizarListaSesiones,
} from '../../../services/training/trainingModel'
import { apiRequest } from '../../../services/http/apiClient'

export function guardarEntrenamientoEnServidor(entrenamiento) {
  return apiRequest('/api/entrenamientos', {
    method: 'POST',
    auth: true,
    body: crearPayloadEntrenamiento(entrenamiento),
  })
}

export async function obtenerEntrenamientosDesdeServidor() {
  const payload = await apiRequest('/api/entrenamientos', {
    method: 'GET',
    auth: true,
  })

  return normalizarListaSesiones(payload, [])
}

export async function obtenerSesionesEntrenoDesdeServidor() {
  const payload = await apiRequest('/api/sesiones-entrenamiento', {
    method: 'GET',
    auth: true,
  })

  return normalizarListaSesiones(payload, [])
}
