import {
  crearPayloadEntrenamiento,
  normalizarListaSesiones,
  normalizarSesion,
} from '../../../services/training/trainingModel'
import { ApiError, apiRequest } from '../../../services/http/apiClient'

const peticionesEntrenamientoEnVuelo = new Map()

function esIdPersistido(valor) {
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

function obtenerIdPersistidoEntrenamiento(entrenamiento) {
  const candidato =
    entrenamiento?.persistedId ||
    entrenamiento?.serverId ||
    entrenamiento?.idPersistido ||
    entrenamiento?.idServidor ||
    entrenamiento?.id

  return esIdPersistido(candidato) ? String(candidato) : ''
}

function obtenerIdentificadorEliminacionEntrenamiento(entrenamiento) {
  const idPersistido = obtenerIdPersistidoEntrenamiento(entrenamiento)

  if (idPersistido) {
    return idPersistido
  }

  return String(entrenamiento?.clientId || '')
}

function reconciliarEntrenamientoConOriginal(entrenamientoOriginal, payload) {
  const entrenamientoNormalizado = normalizarSesion(payload || entrenamientoOriginal)

  return normalizarSesion({
    ...entrenamientoNormalizado,
    persistedId: entrenamientoNormalizado.persistedId || entrenamientoOriginal?.persistedId || '',
    clientId: entrenamientoOriginal?.clientId || entrenamientoNormalizado.clientId,
    idSesion: entrenamientoOriginal?.idSesion || entrenamientoNormalizado.idSesion,
    ejercicios: reconciliarEjerciciosConOriginales(
      entrenamientoOriginal?.ejercicios,
      entrenamientoNormalizado.ejercicios,
    ),
  })
}

export async function guardarEntrenamientoEnServidor(entrenamiento) {
  const claveEntrenamiento = String(entrenamiento?.clientId || entrenamiento?.id || '')

  if (claveEntrenamiento && peticionesEntrenamientoEnVuelo.has(claveEntrenamiento)) {
    return peticionesEntrenamientoEnVuelo.get(claveEntrenamiento)
  }

  const body = crearPayloadEntrenamiento(entrenamiento)
  const idPersistido = obtenerIdPersistidoEntrenamiento(entrenamiento)

  const peticion = (async () => {
    try {
      const payload = await apiRequest(idPersistido ? `/api/entrenamientos/${idPersistido}` : '/api/entrenamientos', {
        method: idPersistido ? 'PUT' : 'POST',
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

export async function eliminarEntrenamientoEnServidor(entrenamiento) {
  const idPersistido = obtenerIdPersistidoEntrenamiento(entrenamiento)
  const identificadorEliminacion = obtenerIdentificadorEliminacionEntrenamiento(entrenamiento)
  const payload = {
    clientId: entrenamiento?.clientId || '',
    version: Number(entrenamiento?.version) || 1,
    ...(idPersistido ? { id: idPersistido } : {}),
  }

  if (!identificadorEliminacion) {
    return { ok: true, localOnly: true }
  }

  try {
    return await apiRequest(`/api/entrenamientos/${identificadorEliminacion}`, {
      method: 'DELETE',
      auth: true,
      body: payload,
      skip_global_sync: true,
    })
  } catch (error) {
    if (!idPersistido && error instanceof ApiError && error.status === 404) {
      return { ok: true, localOnly: true, notFound: true }
    }

    throw error
  }
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
