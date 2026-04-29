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
import { normalizarSesion } from './trainingModel'
import { guardarEntrenamientoEnServidor } from '../../pages/Entreno/services/entrenoApiService'
import {
  adquirirLockQueueItem,
  crearLockOwner,
  eliminarQueueItem,
  listarQueueItemsPorTipo,
  marcarQueueItemComoFallido,
} from '../sync/syncQueueStorage'

let sincronizacionEntrenamientosActiva = null

function esErrorRecuperable(error) {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500)
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
  const mensajeError = crearMensajeErrorSincronizacion(error)
  const erroresCampo = crearErroresCampoEntrenamiento(entrenamiento, mensajeError)

  return normalizarSesion({
    ...entrenamiento,
    updatedAt: new Date().toISOString(),
    lastSyncAttemptAt: new Date().toISOString(),
    syncStatus: 'pending',
    syncError: mensajeError,
    syncFieldErrors: erroresCampo.entrenamiento,
    ejercicios: (entrenamiento?.ejercicios || []).map((ejercicio, indice) => {
      const erroresEjercicio = erroresCampo.ejercicios[indice] || {}

      return {
        ...ejercicio,
        syncStatus: 'pending',
        syncError: Object.keys(erroresEjercicio).length > 0 ? mensajeError : '',
        syncFieldErrors: erroresEjercicio,
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
  const entrenamientoPendiente = marcarEntrenamientoPendiente(entrenamiento)
  guardarHistorialEntrenamientosGuardado(
    reemplazarEntrenamiento(historialPrevio, entrenamientoPendiente),
  )

  try {
    const dependencias = await prepararDependenciasEntrenamientos()
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
        const entrenamientoServidor = await guardarEntrenamientoEnServidor(entrenamientoReconciliado)
        historialActual = guardarHistorialEntrenamientosGuardado(
          reemplazarEntrenamientoSincronizado(
            historialActual,
            entrenamientoReconciliado,
            entrenamientoServidor,
          ),
        )
        actualizarEntrenamientoActualSiCoincide(entrenamientoServidor)
        sincronizados += 1
        entrenamientosSincronizados.push(entrenamientoServidor)
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
