import {
  crearPayloadEntrenamiento,
  normalizarListaSesiones,
  normalizarSesion,
} from '../../../services/training/trainingModel'
import { apiRequest } from '../../../services/http/apiClient'

export async function guardarEntrenamientoEnServidor(entrenamiento) {
  const body = crearPayloadEntrenamiento(entrenamiento)

  console.log('[EntrenoSync] POST /api/entrenamientos', {
    clientId: body.clientId,
    idSesion: body.idSesion,
    ejercicios: body.ejercicios?.length || 0,
    referenciasCatalogo: body.ejercicios
      ?.map((ejercicio) => ejercicio.catalogoEjercicioId)
      .filter(Boolean),
  })

  const payload = await apiRequest('/api/entrenamientos', {
    method: 'POST',
    auth: true,
    body,
  })

  return normalizarSesion(payload || entrenamiento)
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
