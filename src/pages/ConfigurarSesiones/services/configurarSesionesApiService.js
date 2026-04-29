import {
  crearPayloadSesion,
  normalizarListaSesiones,
  normalizarSesion,
} from '../../../services/training/trainingModel'
import { apiRequest } from '../../../services/http/apiClient'
import { debugSesion, resumirSesionParaLog } from '../../../services/debug/sessionSyncDebug'

function esIdNumerico(valor) {
  return /^\d+$/.test(String(valor || ''))
}

const peticionesSesionEnVuelo = new Map()

function reconciliarSesionConOriginal(sesionOriginal, payload) {
  const sesionNormalizada = normalizarSesion(payload || sesionOriginal)

  return normalizarSesion({
    ...sesionNormalizada,
    clientId: sesionOriginal?.clientId || sesionNormalizada.clientId,
    idSesion: sesionOriginal?.idSesion || sesionNormalizada.idSesion,
    ejercicios: (sesionNormalizada.ejercicios || []).map((ejercicioNormalizado, indice) => {
      const ejercicioOriginal = sesionOriginal?.ejercicios?.[indice] || null

      return {
        ...ejercicioNormalizado,
        clientId: ejercicioOriginal?.clientId || ejercicioNormalizado.clientId,
        idEjercicio: ejercicioOriginal?.idEjercicio || ejercicioNormalizado.idEjercicio,
      }
    }),
  })
}

export async function guardarSesionEnServidor(sesion) {
  const claveSesion = String(sesion?.clientId || sesion?.id || sesion?.idSesion || '')

  if (claveSesion && peticionesSesionEnVuelo.has(claveSesion)) {
    return peticionesSesionEnVuelo.get(claveSesion)
  }

  const body = crearPayloadSesion(sesion)
  const idPersistido = esIdNumerico(sesion?.id) ? String(sesion.id) : ''
  const metodo = idPersistido ? 'PUT' : 'POST'
  const endpoint = idPersistido
    ? `/api/sesiones-entrenamiento/${idPersistido}`
    : '/api/sesiones-entrenamiento'

  if (!idPersistido) {
    delete body.id
    delete body.idSesion
  }

  debugSesion('request guardarSesionEnServidor', {
    metodo,
    endpoint,
    sesionOriginal: resumirSesionParaLog(sesion),
    body,
  })

  const peticion = (async () => {
    try {
      const payload = await apiRequest(endpoint, {
        method: metodo,
        auth: true,
        body,
        skip_global_sync: true,
      })

      const sesionNormalizada = reconciliarSesionConOriginal(sesion, payload)

      debugSesion('response guardarSesionEnServidor', {
        metodo,
        endpoint,
        payload,
        sesionNormalizada: resumirSesionParaLog(sesionNormalizada),
      })

      return sesionNormalizada
    } catch (errorCapturado) {
      debugSesion('error guardarSesionEnServidor', {
        metodo,
        endpoint,
        body,
        status: errorCapturado?.status || 0,
        message: errorCapturado?.message || 'unknown-error',
        backendError: errorCapturado?.backendError || '',
        backendMessage: errorCapturado?.backendMessage || '',
        backendStatusCode: errorCapturado?.backendStatusCode || '',
        payload: errorCapturado?.payload || null,
      })
      throw errorCapturado
    } finally {
      if (claveSesion) {
        peticionesSesionEnVuelo.delete(claveSesion)
      }
    }
  })()

  if (claveSesion) {
    peticionesSesionEnVuelo.set(claveSesion, peticion)
  }

  return peticion
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
