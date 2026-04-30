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

function normalizarTexto(valor) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function encontrarIndiceEjercicioRelacionado(ejercicioObjetivo, ejerciciosDisponibles) {
  if (!ejercicioObjetivo || !Array.isArray(ejerciciosDisponibles) || ejerciciosDisponibles.length === 0) {
    return -1
  }

  const persistedIdObjetivo = String(ejercicioObjetivo.persistedId || '')
  if (persistedIdObjetivo) {
    const indice = ejerciciosDisponibles.findIndex(
      (ejercicio) => String(ejercicio?.persistedId || '') === persistedIdObjetivo,
    )

    if (indice >= 0) {
      return indice
    }
  }

  const idsLocalesObjetivo = [
    ejercicioObjetivo.clientId,
    ejercicioObjetivo.idEjercicio,
    ejercicioObjetivo.id,
  ]
    .filter(Boolean)
    .map(String)

  if (idsLocalesObjetivo.length) {
    const indice = ejerciciosDisponibles.findIndex((ejercicio) => {
      const idsLocalesDisponibles = [ejercicio?.clientId, ejercicio?.idEjercicio, ejercicio?.id]
        .filter(Boolean)
        .map(String)

      return idsLocalesObjetivo.some((idLocal) => idsLocalesDisponibles.includes(idLocal))
    })

    if (indice >= 0) {
      return indice
    }
  }

  const catalogoObjetivo = String(ejercicioObjetivo.catalogoEjercicioId || '')
  const plantillaObjetivo = String(ejercicioObjetivo.plantillaEjercicioId || '')
  if (catalogoObjetivo || plantillaObjetivo) {
    const indice = ejerciciosDisponibles.findIndex(
      (ejercicio) =>
        (catalogoObjetivo &&
          String(ejercicio?.catalogoEjercicioId || '') === catalogoObjetivo) ||
        (plantillaObjetivo &&
          String(ejercicio?.plantillaEjercicioId || '') === plantillaObjetivo),
    )

    if (indice >= 0) {
      return indice
    }
  }

  const nombreObjetivo = normalizarTexto(ejercicioObjetivo.nombre)
  if (!nombreObjetivo) {
    return -1
  }

  return ejerciciosDisponibles.findIndex(
    (ejercicio) => normalizarTexto(ejercicio?.nombre) === nombreObjetivo,
  )
}

function reconciliarEjerciciosConOriginales(ejerciciosOriginales, ejerciciosNormalizados) {
  const originales = Array.isArray(ejerciciosOriginales) ? ejerciciosOriginales : []
  const disponibles = Array.isArray(ejerciciosNormalizados) ? [...ejerciciosNormalizados] : []
  const reconciliados = originales.map((ejercicioOriginal) => {
    const indiceRelacionado = encontrarIndiceEjercicioRelacionado(ejercicioOriginal, disponibles)
    const ejercicioNormalizado =
      indiceRelacionado >= 0 ? disponibles.splice(indiceRelacionado, 1)[0] : null

    return {
      ...(ejercicioNormalizado || ejercicioOriginal),
      persistedId: ejercicioNormalizado?.persistedId || ejercicioOriginal?.persistedId || '',
      clientId: ejercicioOriginal?.clientId || ejercicioNormalizado?.clientId || '',
      idEjercicio: ejercicioOriginal?.idEjercicio || ejercicioNormalizado?.idEjercicio || '',
    }
  })

  return [...reconciliados, ...disponibles]
}

function obtenerIdPersistidoSesion(sesion) {
  const candidato =
    sesion?.persistedId ||
    sesion?.serverId ||
    sesion?.idPersistido ||
    sesion?.idServidor ||
    sesion?.id

  return esIdNumerico(candidato) ? String(candidato) : ''
}

const peticionesSesionEnVuelo = new Map()

function reconciliarSesionConOriginal(sesionOriginal, payload) {
  const sesionNormalizada = normalizarSesion(payload || sesionOriginal)

  return normalizarSesion({
    ...sesionNormalizada,
    persistedId: sesionNormalizada.persistedId || sesionOriginal?.persistedId || '',
    clientId: sesionOriginal?.clientId || sesionNormalizada.clientId,
    idSesion: sesionOriginal?.idSesion || sesionNormalizada.idSesion,
    ejercicios: reconciliarEjerciciosConOriginales(
      sesionOriginal?.ejercicios,
      sesionNormalizada.ejercicios,
    ),
  })
}

export async function guardarSesionEnServidor(sesion) {
  const claveSesion = String(sesion?.clientId || sesion?.id || sesion?.idSesion || '')

  if (claveSesion && peticionesSesionEnVuelo.has(claveSesion)) {
    return peticionesSesionEnVuelo.get(claveSesion)
  }

  const body = crearPayloadSesion(sesion)
  const idPersistido = obtenerIdPersistidoSesion(sesion)
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
