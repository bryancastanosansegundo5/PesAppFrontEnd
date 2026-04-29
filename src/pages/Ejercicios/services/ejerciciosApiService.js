import {
  crearPayloadEjercicioCatalogo,
  normalizarListaEjercicios,
  normalizarPlantillaEjercicio,
} from '../../../services/exercises/exerciseCatalogModel'
import { normalizarUltimoRegistroEjercicioApi } from '../../../services/training/trainingModel'
import { apiRequest } from '../../../services/http/apiClient'

const peticionesEjercicioEnVuelo = new Map()

function obtenerClaveEjercicio(ejercicio, idEjercicio = '') {
  return String(ejercicio?.clientId || ejercicio?.idEjercicio || ejercicio?.catalogoEjercicioId || idEjercicio || '')
}

function reconciliarEjercicioConOriginal(ejercicioOriginal, payload) {
  const ejercicioNormalizado = normalizarPlantillaEjercicio(payload || ejercicioOriginal)

  return normalizarPlantillaEjercicio({
    ...ejercicioNormalizado,
    clientId: ejercicioOriginal?.clientId || ejercicioNormalizado.clientId,
    idEjercicio: ejercicioOriginal?.idEjercicio || ejercicioNormalizado.idEjercicio,
  })
}

export async function obtenerEjerciciosDesdeServidor() {
  const payload = await apiRequest('/api/ejercicios', {
    method: 'GET',
    auth: true,
  })

  return normalizarListaEjercicios(payload)
}

export async function obtenerEjercicioDesdeServidor(idEjercicio) {
  const payload = await apiRequest(`/api/ejercicios/${idEjercicio}`, {
    method: 'GET',
    auth: true,
  })

  return normalizarPlantillaEjercicio(payload)
}

export async function crearEjercicioEnServidor(ejercicio) {
  const claveEjercicio = obtenerClaveEjercicio(ejercicio)

  if (claveEjercicio && peticionesEjercicioEnVuelo.has(claveEjercicio)) {
    return peticionesEjercicioEnVuelo.get(claveEjercicio)
  }

  const peticion = (async () => {
    try {
      const payload = await apiRequest('/api/ejercicios', {
        method: 'POST',
        auth: true,
        body: crearPayloadEjercicioCatalogo(ejercicio),
        skip_global_sync: true,
      })

      return reconciliarEjercicioConOriginal(ejercicio, payload)
    } finally {
      if (claveEjercicio) {
        peticionesEjercicioEnVuelo.delete(claveEjercicio)
      }
    }
  })()

  if (claveEjercicio) {
    peticionesEjercicioEnVuelo.set(claveEjercicio, peticion)
  }

  return peticion
}

export async function actualizarEjercicioEnServidor(idEjercicio, ejercicio) {
  const claveEjercicio = obtenerClaveEjercicio(ejercicio, idEjercicio)

  if (claveEjercicio && peticionesEjercicioEnVuelo.has(claveEjercicio)) {
    return peticionesEjercicioEnVuelo.get(claveEjercicio)
  }

  const peticion = (async () => {
    try {
      const payload = await apiRequest(`/api/ejercicios/${idEjercicio}`, {
        method: 'PUT',
        auth: true,
        body: crearPayloadEjercicioCatalogo(ejercicio),
        skip_global_sync: true,
      })

      return reconciliarEjercicioConOriginal(ejercicio, payload)
    } finally {
      if (claveEjercicio) {
        peticionesEjercicioEnVuelo.delete(claveEjercicio)
      }
    }
  })()

  if (claveEjercicio) {
    peticionesEjercicioEnVuelo.set(claveEjercicio, peticion)
  }

  return peticion
}

export function eliminarEjercicioEnServidor(idEjercicio) {
  return apiRequest(`/api/ejercicios/${idEjercicio}`, {
    method: 'DELETE',
    auth: true,
  })
}

export async function obtenerUltimoRegistroEjercicioDesdeServidor(idEjercicio) {
  const payload = await apiRequest(`/api/ejercicios/${idEjercicio}/ultimo-registro`, {
    method: 'GET',
    auth: true,
  })

  return normalizarUltimoRegistroEjercicioApi(payload)
}
