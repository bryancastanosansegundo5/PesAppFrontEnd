import { ApiError } from '../http/apiClient'
import { obtenerCatalogoEjerciciosGuardado } from '../storage/exerciseCatalogStorage'
import {
  guardarEntrenamientoActualGuardado,
  guardarHistorialEntrenamientosGuardado,
  obtenerEntrenamientoActualGuardado,
  obtenerHistorialEntrenamientosGuardado,
  obtenerSesionesGuardadas,
} from '../storage/trainingStorage'
import { sincronizarCatalogoEjerciciosPendientes } from '../exercises/exerciseCatalogDataService'
import { sincronizarSesionesPendientes } from './trainingSessionDataService'
import { normalizarSesion, obtenerErrorValidacionSesion } from './trainingModel'
import {
  eliminarEntrenamientoEnServidor,
  guardarEntrenamientoEnServidor,
  obtenerEntrenamientosDesdeServidor,
} from '../../pages/Entreno/services/entrenoApiService'
import {
  adquirirLockQueueItem,
  crearLockOwner,
  eliminarQueueItem,
  listarQueueItemsPorTipo,
  marcarQueueItemComoFallido,
} from '../sync/syncQueueStorage'

let sincronizacionEntrenamientosActiva = null
const ERROR_CONFLICTO_VERSION = 'Conflicto de version'

function esErrorRecuperable(error) {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500)
}

function esConflictoDeVersion(error) {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    (error.backendError === ERROR_CONFLICTO_VERSION ||
      String(error.backendMessage || error.message || '').toLowerCase().includes('version'))
  )
}

function normalizarTexto(valor) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function marcarEntrenamientoPendiente(entrenamiento) {
  return normalizarSesion({
    ...entrenamiento,
    updatedAt: new Date().toISOString(),
    lastSyncAttemptAt: entrenamiento?.lastSyncAttemptAt || '',
    syncError: '',
    syncFieldErrors: {},
    syncStatus: 'pending',
    pendingAction: entrenamiento?.pendingAction === 'delete' ? 'delete' : 'upsert',
    ejercicios: (entrenamiento?.ejercicios || []).map((ejercicio) => ({
      ...ejercicio,
      syncError: '',
      syncFieldErrors: {},
      syncStatus: 'pending',
    })),
  })
}

function crearMensajeErrorSincronizacion(error) {
  return (
    error?.backendMessage ||
    error?.backendError ||
    error?.message ||
    'No se pudo sincronizar este entreno.'
  )
}

function crearErroresCampoEntrenamiento(entrenamiento, mensajeError) {
  const erroresEntrenamiento = {}
  const erroresEjercicios = (entrenamiento?.ejercicios || []).map(() => ({}))
  const mensajeNormalizado = mensajeError.toLowerCase()

  if (
    entrenamiento?.idSesion &&
    mensajeNormalizado.includes(`idsesion ${String(entrenamiento.idSesion).toLowerCase()} no existe`)
  ) {
    erroresEntrenamiento.idSesion = mensajeError
  }

  ;(entrenamiento?.ejercicios || []).forEach((ejercicio, indice) => {
    if (
      ejercicio?.catalogoEjercicioId &&
      mensajeNormalizado.includes(
        `catalogoejercicioid ${String(ejercicio.catalogoEjercicioId).toLowerCase()} no existe`,
      )
    ) {
      erroresEjercicios[indice].catalogoEjercicioId = mensajeError
    }

    if (
      ejercicio?.plantillaEjercicioId &&
      mensajeNormalizado.includes(
        `plantillaejercicioid ${String(ejercicio.plantillaEjercicioId).toLowerCase()} no existe`,
      )
    ) {
      erroresEjercicios[indice].plantillaEjercicioId = mensajeError
    }
  })

  return {
    entrenamiento: erroresEntrenamiento,
    ejercicios: erroresEjercicios,
  }
}

function marcarEntrenamientoConError(entrenamiento, error) {
  const esConflictoVersion = esConflictoDeVersion(error)
  const mensajeError = crearMensajeErrorSincronizacion(error)
  const erroresCampo = crearErroresCampoEntrenamiento(entrenamiento, mensajeError)

  return normalizarSesion({
    ...entrenamiento,
    updatedAt: new Date().toISOString(),
    lastSyncAttemptAt: new Date().toISOString(),
    syncStatus: 'pending',
    pendingAction: entrenamiento?.pendingAction === 'delete' ? 'delete' : 'upsert',
    syncError: esConflictoVersion
      ? error.backendMessage ||
        'La version enviada no coincide con la version actual. Recarga el historial antes de reintentar.'
      : mensajeError,
    syncFieldErrors: esConflictoVersion
      ? { ...erroresCampo.entrenamiento, version: true }
      : erroresCampo.entrenamiento,
    ejercicios: (entrenamiento?.ejercicios || []).map((ejercicio, indice) => {
      const erroresEjercicio = erroresCampo.ejercicios[indice] || {}

      return {
        ...ejercicio,
        syncStatus: 'pending',
        syncError:
          esConflictoVersion || Object.keys(erroresEjercicio).length > 0
            ? esConflictoVersion
              ? error.backendMessage ||
                'La version enviada no coincide con la version actual. Recarga el historial antes de reintentar.'
              : mensajeError
            : '',
        syncFieldErrors: esConflictoVersion ? { ...erroresEjercicio, version: true } : erroresEjercicio,
      }
    }),
  })
}

function reemplazarEntrenamiento(historial, entrenamiento) {
  return [
    entrenamiento,
    ...historial.filter(
      (item) => item.clientId !== entrenamiento.clientId && item.id !== entrenamiento.id,
    ),
  ]
}

function quitarEntrenamientoDeHistorial(historial, entrenamiento) {
  return historial.filter(
    (item) => item.clientId !== entrenamiento.clientId && item.id !== entrenamiento.id,
  )
}

function encontrarEntrenamientoRelacionado(entrenamiento, historial) {
  const clavesEntrenamiento = new Set(
    [
      entrenamiento?.persistedId,
      entrenamiento?.clientId,
      entrenamiento?.id,
      entrenamiento?.idSesion,
    ]
      .filter(Boolean)
      .map(String),
  )

  if (clavesEntrenamiento.size > 0) {
    const relacionadoPorId = (historial || []).find((item) =>
      [
        item?.persistedId,
        item?.clientId,
        item?.id,
        item?.idSesion,
      ]
        .filter(Boolean)
        .map(String)
        .some((clave) => clavesEntrenamiento.has(clave)),
    )

    if (relacionadoPorId) {
      return relacionadoPorId
    }
  }

  return (
    (historial || []).find(
      (item) =>
        normalizarTexto(item?.nombreSesion) === normalizarTexto(entrenamiento?.nombreSesion) &&
        String(item?.fechaInicio || '') === String(entrenamiento?.fechaInicio || ''),
    ) || null
  )
}

function encontrarEjercicioRelacionado(ejercicio, ejercicios) {
  const clavesEjercicio = new Set(
    [
      ejercicio?.persistedId,
      ejercicio?.clientId,
      ejercicio?.idEjercicio,
      ejercicio?.id,
      ejercicio?.catalogoEjercicioId,
      ejercicio?.plantillaEjercicioId,
    ]
      .filter(Boolean)
      .map(String),
  )

  if (clavesEjercicio.size > 0) {
    const relacionadoPorId = (ejercicios || []).find((item) =>
      [
        item?.persistedId,
        item?.clientId,
        item?.idEjercicio,
        item?.id,
        item?.catalogoEjercicioId,
        item?.plantillaEjercicioId,
      ]
        .filter(Boolean)
        .map(String)
        .some((clave) => clavesEjercicio.has(clave)),
    )

    if (relacionadoPorId) {
      return relacionadoPorId
    }
  }

  return (
    (ejercicios || []).find(
      (item) => normalizarTexto(item?.nombre) === normalizarTexto(ejercicio?.nombre),
    ) || null
  )
}

function reconciliarIdentificadoresEntrenamiento(entrenamiento, historial) {
  const entrenamientoNormalizado = normalizarSesion(entrenamiento)
  const entrenamientoRelacionado = encontrarEntrenamientoRelacionado(
    entrenamientoNormalizado,
    historial,
  )

  if (!entrenamientoRelacionado) {
    return entrenamientoNormalizado
  }

  const ejerciciosDisponibles = [...(entrenamientoRelacionado.ejercicios || [])]
  const ejerciciosReconciliados = entrenamientoNormalizado.ejercicios.map((ejercicio) => {
    const relacionado = encontrarEjercicioRelacionado(ejercicio, ejerciciosDisponibles)

    if (!relacionado) {
      return ejercicio
    }

    const indiceRelacionado = ejerciciosDisponibles.indexOf(relacionado)
    if (indiceRelacionado >= 0) {
      ejerciciosDisponibles.splice(indiceRelacionado, 1)
    }

    return {
      ...ejercicio,
      persistedId: ejercicio.persistedId || relacionado.persistedId || '',
      id: relacionado.id || ejercicio.id,
      clientId: relacionado.clientId || ejercicio.clientId,
      idEjercicio: relacionado.idEjercicio || ejercicio.idEjercicio,
      version: Math.max(Number(ejercicio.version) || 0, Number(relacionado.version) || 0) || 1,
    }
  })

  return normalizarSesion({
    ...entrenamientoNormalizado,
    persistedId: entrenamientoNormalizado.persistedId || entrenamientoRelacionado.persistedId || '',
    id: entrenamientoRelacionado.id || entrenamientoNormalizado.id,
    clientId: entrenamientoRelacionado.clientId || entrenamientoNormalizado.clientId,
    idSesion: entrenamientoRelacionado.idSesion || entrenamientoNormalizado.idSesion,
    version:
      Math.max(
        Number(entrenamientoNormalizado.version) || 0,
        Number(entrenamientoRelacionado.version) || 0,
      ) || 1,
    ejercicios: ejerciciosReconciliados,
  })
}

function actualizarEntrenamientoActualSiCoincide(entrenamientoActualizado) {
  const entrenamientoActual = obtenerEntrenamientoActualGuardado()

  if (!entrenamientoActual) {
    return
  }

  const coincide =
    entrenamientoActual.clientId === entrenamientoActualizado.clientId ||
    entrenamientoActual.id === entrenamientoActualizado.id

  if (!coincide) {
    return
  }

  guardarEntrenamientoActualGuardado(entrenamientoActualizado)
}

function marcarEntrenamientoSincronizado(entrenamiento) {
  return normalizarSesion({
    ...entrenamiento,
    updatedAt: new Date().toISOString(),
    lastSyncAttemptAt: '',
    syncStatus: 'synced',
    pendingAction: 'upsert',
    deletedAt: '',
    syncError: '',
    syncFieldErrors: {},
    ejercicios: (entrenamiento?.ejercicios || []).map((ejercicio) => ({
      ...ejercicio,
      syncStatus: 'synced',
      syncError: '',
      syncFieldErrors: {},
    })),
  })
}

function crearCopiaEditableEntrenamiento(entrenamiento) {
  const entrenamientoNormalizado = normalizarSesion(entrenamiento)

  return normalizarSesion({
    ...entrenamientoNormalizado,
    updatedAt: new Date().toISOString(),
    pendingAction: 'upsert',
    deletedAt: '',
  })
}

function obtenerIdPersistidoEntrenamiento(entrenamiento) {
  const candidato =
    entrenamiento?.persistedId ||
    entrenamiento?.serverId ||
    entrenamiento?.idPersistido ||
    entrenamiento?.idServidor ||
    entrenamiento?.id

  return /^\d+$/.test(String(candidato || '')) ? String(candidato) : ''
}

function crearCopiaEliminadaEntrenamiento(entrenamiento) {
  const entrenamientoNormalizado = normalizarSesion(entrenamiento)
  const instante = new Date().toISOString()

  return normalizarSesion({
    ...entrenamientoNormalizado,
    updatedAt: instante,
    deletedAt: instante,
    pendingAction: 'delete',
  })
}

function reemplazarEntrenamientoSincronizado(
  historial,
  entrenamientoPendiente,
  entrenamientoServidor,
) {
  const entrenamientoSincronizado = marcarEntrenamientoSincronizado(entrenamientoServidor)
  const clientIdsAEliminar = new Set(
    [entrenamientoPendiente?.clientId, entrenamientoSincronizado.clientId].filter(Boolean),
  )
  const idsAEliminar = new Set(
    [entrenamientoPendiente?.id, entrenamientoSincronizado.id].filter(Boolean),
  )

  return [
    entrenamientoSincronizado,
    ...historial.filter(
      (item) => !clientIdsAEliminar.has(item.clientId) && !idsAEliminar.has(item.id),
    ),
  ]
}

function obtenerSesionRelacionada(entrenamiento, sesiones) {
  const idsPosibles = new Set(
    [entrenamiento?.idSesion, entrenamiento?.clientId, entrenamiento?.id]
      .filter(Boolean)
      .map(String),
  )

  return (
    sesiones.find((sesion) => idsPosibles.has(String(sesion.idSesion || ''))) ||
    sesiones.find((sesion) => idsPosibles.has(String(sesion.clientId || ''))) ||
    sesiones.find(
      (sesion) =>
        normalizarTexto(sesion.nombreSesion) === normalizarTexto(entrenamiento?.nombreSesion),
    ) ||
    null
  )
}

function obtenerEjercicioSesionRelacionado(ejercicio, sesionRelacionada) {
  if (!sesionRelacionada?.ejercicios?.length) {
    return null
  }

  const idsPosibles = new Set(
    [
      ejercicio?.plantillaEjercicioId,
      ejercicio?.catalogoEjercicioId,
      ejercicio?.idEjercicio,
      ejercicio?.clientId,
      ejercicio?.id,
    ]
      .filter(Boolean)
      .map(String),
  )

  return (
    sesionRelacionada.ejercicios.find(
      (ejercicioSesion) =>
        idsPosibles.has(String(ejercicioSesion.plantillaEjercicioId || '')) ||
        idsPosibles.has(String(ejercicioSesion.catalogoEjercicioId || '')) ||
        idsPosibles.has(String(ejercicioSesion.idEjercicio || '')) ||
        idsPosibles.has(String(ejercicioSesion.clientId || '')),
    ) ||
    sesionRelacionada.ejercicios.find(
      (ejercicioSesion) => normalizarTexto(ejercicioSesion.nombre) === normalizarTexto(ejercicio?.nombre),
    ) ||
    null
  )
}

function obtenerEjercicioCatalogoRelacionado(ejercicio, catalogoEjercicios) {
  const idsPosibles = new Set(
    [ejercicio?.catalogoEjercicioId, ejercicio?.idEjercicio, ejercicio?.clientId, ejercicio?.id]
      .filter(Boolean)
      .map(String),
  )

  return (
    catalogoEjercicios.find((ejercicioCatalogo) =>
      idsPosibles.has(String(ejercicioCatalogo.catalogoEjercicioId || '')),
    ) ||
    catalogoEjercicios.find(
      (ejercicioCatalogo) =>
        ejercicio?.clientId && ejercicioCatalogo.clientId === ejercicio.clientId,
    ) ||
    catalogoEjercicios.find(
      (ejercicioCatalogo) =>
        normalizarTexto(ejercicioCatalogo.nombre) === normalizarTexto(ejercicio?.nombre),
    ) ||
    null
  )
}

function reconciliarEntrenamientoPendiente(entrenamiento, sesiones, catalogoEjercicios) {
  const sesionRelacionada = obtenerSesionRelacionada(entrenamiento, sesiones)

  return normalizarSesion({
    ...entrenamiento,
    idSesion: sesionRelacionada?.idSesion || entrenamiento.idSesion,
    nombreSesion: sesionRelacionada?.nombreSesion || entrenamiento.nombreSesion,
    ejercicios: (entrenamiento?.ejercicios || []).map((ejercicio) => {
      const ejercicioSesion = obtenerEjercicioSesionRelacionado(ejercicio, sesionRelacionada)
      const ejercicioCatalogo =
        obtenerEjercicioCatalogoRelacionado(ejercicio, catalogoEjercicios) ||
        obtenerEjercicioCatalogoRelacionado(ejercicioSesion, catalogoEjercicios)

      return {
        ...ejercicio,
        plantillaEjercicioId:
          ejercicioSesion?.plantillaEjercicioId || ejercicio.plantillaEjercicioId || null,
        catalogoEjercicioId:
          ejercicioCatalogo?.catalogoEjercicioId ||
          ejercicioSesion?.catalogoEjercicioId ||
          ejercicio.catalogoEjercicioId,
        nombre: ejercicioCatalogo?.nombre || ejercicioSesion?.nombre || ejercicio.nombre,
        descripcion:
          ejercicio.descripcion ||
          ejercicioSesion?.descripcion ||
          ejercicioCatalogo?.descripcion ||
          '',
        grupoMuscular:
          ejercicio.grupoMuscular ||
          ejercicioSesion?.grupoMuscular ||
          ejercicioCatalogo?.grupoMuscular ||
          '',
        patronMovimiento:
          ejercicio.patronMovimiento ||
          ejercicioSesion?.patronMovimiento ||
          ejercicioCatalogo?.patronMovimiento ||
          '',
        equipamiento:
          ejercicio.equipamiento ||
          ejercicioSesion?.equipamiento ||
          ejercicioCatalogo?.equipamiento ||
          '',
        agarre: ejercicio.agarre || ejercicioSesion?.agarre || ejercicioCatalogo?.agarre || '',
      }
    }),
  })
}

function crearErrorDependenciaSesion(message) {
  const error = new Error(message)
  error.status = 400
  error.backendError = 'Validacion no valida'
  error.backendMessage = message
  return error
}

function validarSesionRelacionadaParaEntrenamiento(entrenamiento, sesiones) {
  const sesionRelacionada = obtenerSesionRelacionada(entrenamiento, sesiones)

  if (!sesionRelacionada) {
    return
  }

  const errorValidacion = obtenerErrorValidacionSesion(sesionRelacionada)

  if (!errorValidacion) {
    return
  }

  throw crearErrorDependenciaSesion(
    `La sesion "${sesionRelacionada.nombreSesion || entrenamiento?.nombreSesion || 'sin nombre'}" no se puede sincronizar todavia: ${errorValidacion}`,
  )
}

async function prepararDependenciasEntrenamientos() {
  await sincronizarCatalogoEjerciciosPendientes()
  await sincronizarSesionesPendientes()

  return {
    sesiones: obtenerSesionesGuardadas(),
    catalogoEjercicios: obtenerCatalogoEjerciciosGuardado(),
  }
}

export async function guardarEntrenamientoConRespaldo(entrenamiento) {
  const historialPrevio = obtenerHistorialEntrenamientosGuardado()
  const entrenamientoReconciliadoConHistorial = reconciliarIdentificadoresEntrenamiento(
    entrenamiento,
    historialPrevio,
  )
  const entrenamientoPendiente = marcarEntrenamientoPendiente(
    entrenamientoReconciliadoConHistorial,
  )
  guardarHistorialEntrenamientosGuardado(
    reemplazarEntrenamiento(historialPrevio, entrenamientoPendiente),
  )

  try {
    const dependencias = await prepararDependenciasEntrenamientos()
    validarSesionRelacionadaParaEntrenamiento(entrenamientoPendiente, dependencias.sesiones)
    const entrenamientoReconciliado = reconciliarEntrenamientoPendiente(
      entrenamientoPendiente,
      dependencias.sesiones,
      dependencias.catalogoEjercicios,
    )
    const historialConReferenciasActualizadas = guardarHistorialEntrenamientosGuardado(
      reemplazarEntrenamiento(obtenerHistorialEntrenamientosGuardado(), entrenamientoReconciliado),
    )
    actualizarEntrenamientoActualSiCoincide(entrenamientoReconciliado)
    const entrenamientoServidor = await guardarEntrenamientoEnServidor(entrenamientoReconciliado)
    const historial = guardarHistorialEntrenamientosGuardado(
      reemplazarEntrenamientoSincronizado(
        historialConReferenciasActualizadas,
        entrenamientoReconciliado,
        entrenamientoServidor,
      ),
    )
    actualizarEntrenamientoActualSiCoincide(entrenamientoServidor)

    return {
      historial,
      online: true,
      error: null,
      entrenamientosSincronizados: [entrenamientoServidor],
    }
  } catch (error) {
    if (!esErrorRecuperable(error)) {
      const entrenamientoConError = marcarEntrenamientoConError(entrenamientoPendiente, error)
      const historialConError = guardarHistorialEntrenamientosGuardado(
        reemplazarEntrenamiento(historialPrevio, entrenamientoConError),
      )

      throw Object.assign(error, { historial: historialConError })
    }

    return {
      historial: guardarHistorialEntrenamientosGuardado(
        reemplazarEntrenamiento(
          historialPrevio,
          marcarEntrenamientoConError(entrenamientoPendiente, error),
        ),
      ),
      online: false,
      error,
      entrenamientosSincronizados: [],
    }
  }
}

export async function actualizarEntrenamientoConRespaldo(entrenamiento) {
  return guardarEntrenamientoConRespaldo(crearCopiaEditableEntrenamiento(entrenamiento))
}

export async function eliminarEntrenamientoConRespaldo(entrenamiento) {
  const historialPrevio = obtenerHistorialEntrenamientosGuardado()
  let entrenamientoReconciliadoConHistorial = reconciliarIdentificadoresEntrenamiento(
    entrenamiento,
    historialPrevio,
  )
  console.log('[trainingDataService] eliminarEntrenamientoConRespaldo:inicio', {
    original: {
      id: entrenamiento?.id,
      persistedId: entrenamiento?.persistedId,
      clientId: entrenamiento?.clientId,
      version: entrenamiento?.version,
      nombreSesion: entrenamiento?.nombreSesion,
    },
    reconciliadoLocal: {
      id: entrenamientoReconciliadoConHistorial?.id,
      persistedId: entrenamientoReconciliadoConHistorial?.persistedId,
      clientId: entrenamientoReconciliadoConHistorial?.clientId,
      version: entrenamientoReconciliadoConHistorial?.version,
      nombreSesion: entrenamientoReconciliadoConHistorial?.nombreSesion,
    },
    historialPrevioLength: historialPrevio.length,
  })

  if (!obtenerIdPersistidoEntrenamiento(entrenamientoReconciliadoConHistorial)) {
    try {
      const historialServidor = await obtenerEntrenamientosDesdeServidor()
      entrenamientoReconciliadoConHistorial = reconciliarIdentificadoresEntrenamiento(
        entrenamientoReconciliadoConHistorial,
        historialServidor,
      )
      console.log('[trainingDataService] eliminarEntrenamientoConRespaldo:reconciliado-servidor', {
        id: entrenamientoReconciliadoConHistorial?.id,
        persistedId: entrenamientoReconciliadoConHistorial?.persistedId,
        clientId: entrenamientoReconciliadoConHistorial?.clientId,
        version: entrenamientoReconciliadoConHistorial?.version,
        nombreSesion: entrenamientoReconciliadoConHistorial?.nombreSesion,
        historialServidorLength: historialServidor.length,
      })
    } catch {
      console.log(
        '[trainingDataService] eliminarEntrenamientoConRespaldo:sin-reconciliacion-servidor',
      )
      // Si el servidor no responde, mantenemos el flujo offline con la mejor referencia local disponible.
    }
  }

  const entrenamientoPendiente = marcarEntrenamientoPendiente(
    crearCopiaEliminadaEntrenamiento(entrenamientoReconciliadoConHistorial),
  )
  console.log('[trainingDataService] eliminarEntrenamientoConRespaldo:pendiente-delete', {
    id: entrenamientoPendiente?.id,
    persistedId: entrenamientoPendiente?.persistedId,
    clientId: entrenamientoPendiente?.clientId,
    version: entrenamientoPendiente?.version,
    pendingAction: entrenamientoPendiente?.pendingAction,
    deletedAt: entrenamientoPendiente?.deletedAt,
  })
  guardarHistorialEntrenamientosGuardado(
    reemplazarEntrenamiento(historialPrevio, entrenamientoPendiente),
  )

  try {
    await eliminarEntrenamientoEnServidor(entrenamientoPendiente)
    console.log('[trainingDataService] eliminarEntrenamientoConRespaldo:delete-ok', {
      id: entrenamientoPendiente?.id,
      persistedId: entrenamientoPendiente?.persistedId,
      clientId: entrenamientoPendiente?.clientId,
      version: entrenamientoPendiente?.version,
    })
    const historial = guardarHistorialEntrenamientosGuardado(
      quitarEntrenamientoDeHistorial(obtenerHistorialEntrenamientosGuardado(), entrenamientoPendiente),
    )
    actualizarEntrenamientoActualSiCoincide(entrenamientoPendiente)

    return {
      historial,
      online: true,
      error: null,
    }
  } catch (error) {
    console.log('[trainingDataService] eliminarEntrenamientoConRespaldo:delete-error', {
      id: entrenamientoPendiente?.id,
      persistedId: entrenamientoPendiente?.persistedId,
      clientId: entrenamientoPendiente?.clientId,
      version: entrenamientoPendiente?.version,
      status: error?.status || 0,
      message: error?.message || 'unknown-error',
      backendError: error?.backendError || '',
      backendMessage: error?.backendMessage || '',
      payload: error?.payload || null,
    })
    if (!esErrorRecuperable(error)) {
      const entrenamientoConError = marcarEntrenamientoConError(entrenamientoPendiente, error)
      const historialConError = guardarHistorialEntrenamientosGuardado(
        reemplazarEntrenamiento(historialPrevio, entrenamientoConError),
      )

      throw Object.assign(error, { historial: historialConError })
    }

    return {
      historial: guardarHistorialEntrenamientosGuardado(
        reemplazarEntrenamiento(
          historialPrevio,
          marcarEntrenamientoConError(entrenamientoPendiente, error),
        ),
      ),
      online: false,
      error,
    }
  }
}

export async function sincronizarEntrenamientosPendientes(clientIds = []) {
  if (sincronizacionEntrenamientosActiva) {
    return sincronizacionEntrenamientosActiva
  }

  sincronizacionEntrenamientosActiva = (async () => {
    let historialActual = obtenerHistorialEntrenamientosGuardado()
    const clientIdsObjetivo = Array.isArray(clientIds) ? clientIds.filter(Boolean) : []
    const dependencias = await prepararDependenciasEntrenamientos()
    const pendientes = listarQueueItemsPorTipo('training', { clientIds: clientIdsObjetivo })
    let sincronizados = 0
    const entrenamientosSincronizados = []
    const entrenamientosFallidos = []

    for (const pendiente of pendientes) {
      const entrenamientoPendiente =
        historialActual.find((entrenamiento) => entrenamiento.clientId === pendiente.clientId) || null

      if (!entrenamientoPendiente) {
        eliminarQueueItem('training', pendiente.clientId)
        continue
      }

      const lockOwner = crearLockOwner('training', pendiente.clientId)
      const lock = adquirirLockQueueItem('training', pendiente.clientId, lockOwner)

      if (!lock) {
        continue
      }

      const entrenamientoReconciliado = reconciliarEntrenamientoPendiente(
        entrenamientoPendiente,
        dependencias.sesiones,
        dependencias.catalogoEjercicios,
      )

      historialActual = guardarHistorialEntrenamientosGuardado(
        reemplazarEntrenamiento(historialActual, entrenamientoReconciliado),
      )
      actualizarEntrenamientoActualSiCoincide(entrenamientoReconciliado)

      try {
        validarSesionRelacionadaParaEntrenamiento(entrenamientoReconciliado, dependencias.sesiones)

        if (entrenamientoReconciliado.pendingAction === 'delete') {
          await eliminarEntrenamientoEnServidor(entrenamientoReconciliado)
          historialActual = guardarHistorialEntrenamientosGuardado(
            quitarEntrenamientoDeHistorial(historialActual, entrenamientoReconciliado),
          )
          actualizarEntrenamientoActualSiCoincide(entrenamientoReconciliado)
        } else {
          const entrenamientoServidor =
            await guardarEntrenamientoEnServidor(entrenamientoReconciliado)
          historialActual = guardarHistorialEntrenamientosGuardado(
            reemplazarEntrenamientoSincronizado(
              historialActual,
              entrenamientoReconciliado,
              entrenamientoServidor,
            ),
          )
          actualizarEntrenamientoActualSiCoincide(entrenamientoServidor)
          entrenamientosSincronizados.push(entrenamientoServidor)
        }
        sincronizados += 1
      } catch (error) {
        marcarQueueItemComoFallido('training', pendiente.clientId, lockOwner, error)
        const entrenamientoConError = marcarEntrenamientoConError(entrenamientoReconciliado, error)
        historialActual = guardarHistorialEntrenamientosGuardado(
          reemplazarEntrenamiento(historialActual, entrenamientoConError),
        )
        actualizarEntrenamientoActualSiCoincide(entrenamientoConError)
        entrenamientosFallidos.push({
          entrenamiento: entrenamientoConError,
          error,
        })
      }
    }

    return {
      historial: historialActual,
      sincronizados,
      entrenamientosSincronizados,
      entrenamientosFallidos,
      pendientesRestantes: historialActual.filter(
        (entrenamiento) => entrenamiento.syncStatus === 'pending',
      ).length,
      online: entrenamientosFallidos.every(({ error }) => !esErrorRecuperable(error)),
      error: entrenamientosFallidos[0]?.error || null,
    }
  })().finally(() => {
    sincronizacionEntrenamientosActiva = null
  })

  return sincronizacionEntrenamientosActiva
}
