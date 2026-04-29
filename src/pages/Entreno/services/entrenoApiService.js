import {
  crearPayloadEntrenamiento,
  normalizarListaSesiones,
  normalizarSesion,
} from '../../../services/training/trainingModel'
import { apiRequest } from '../../../services/http/apiClient'

const peticionesEntrenamientoEnVuelo = new Map()

function reconciliarEntrenamientoConOriginal(entrenamientoOriginal, payload) {
  const entrenamientoNormalizado = normalizarSesion(payload || entrenamientoOriginal)

  return normalizarSesion({
    ...entrenamientoNormalizado,
    clientId: entrenamientoOriginal?.clientId || entrenamientoNormalizado.clientId,
    idSesion: entrenamientoOriginal?.idSesion || entrenamientoNormalizado.idSesion,
    ejercicios: (entrenamientoNormalizado.ejercicios || []).map((ejercicioNormalizado, indice) => {
      const ejercicioOriginal = entrenamientoOriginal?.ejercicios?.[indice] || null

      return {
        ...ejercicioNormalizado,
        clientId: ejercicioOriginal?.clientId || ejercicioNormalizado.clientId,
        idEjercicio: ejercicioOriginal?.idEjercicio || ejercicioNormalizado.idEjercicio,
      }
    }),
  })
}

export async function guardarEntrenamientoEnServidor(entrenamiento) {
  const claveEntrenamiento = String(entrenamiento?.clientId || entrenamiento?.id || '')

  if (claveEntrenamiento && peticionesEntrenamientoEnVuelo.has(claveEntrenamiento)) {
    return peticionesEntrenamientoEnVuelo.get(claveEntrenamiento)
  }

  const body = crearPayloadEntrenamiento(entrenamiento)

  const peticion = (async () => {
    try {
      const payload = await apiRequest('/api/entrenamientos', {
        method: 'POST',
        auth: true,
        body,
        skip_global_sync: true,
      })

      return reconciliarEntrenamientoConOriginal(entrenamiento, payload)
    } finally {
      if (claveEntrenamiento) {
        peticionesEntrenamientoEnVuelo.delete(claveEntrenamiento)
      }
    }
  })()

  if (claveEntrenamiento) {
    peticionesEntrenamientoEnVuelo.set(claveEntrenamiento, peticion)
  }

  return peticion
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
