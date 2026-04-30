import {
  guardarEntrenamientoActualGuardado,
  guardarHistorialEntrenamientosGuardado,
  guardarSesionesGuardadas,
  obtenerEntrenamientoActualGuardado,
  obtenerHistorialEntrenamientosGuardado,
  obtenerSesionesGuardadas,
  reemplazarSesionesDesdeRemotoConPendientesLocales,
} from '../storage/trainingStorage'
import { ApiError } from '../http/apiClient'
import {
  guardarSesionEnServidor,
  obtenerSesionesDesdeServidor,
} from '../../pages/ConfigurarSesiones/services/configurarSesionesApiService'
import { sincronizarCatalogoEjerciciosPendientes } from '../exercises/exerciseCatalogDataService'
import { obtenerCatalogoEjerciciosGuardado } from '../storage/exerciseCatalogStorage'
import { debugSesion, resumirSesionParaLog } from '../debug/sessionSyncDebug'
import { obtenerErrorValidacionSesion } from './trainingModel'
import {
  adquirirLockQueueItem,
  crearLockOwner,
  eliminarQueueItem,
  listarQueueItemsPorTipo,
  marcarQueueItemComoFallido,
} from '../sync/syncQueueStorage'

let sincronizacionSesionesActiva = null
const ERROR_CONFLICTO_VERSION = 'Conflicto de version'

function normalizarTexto(valor) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function reemplazarSesionGuardada(sesionesActuales, sesionOriginal, sesionGuardada) {
  return sesionesActuales.map((sesionActual) => {
    const coincidePorId = sesionActual.id === sesionOriginal.id
    const coincidePorClientId =
      sesionOriginal.clientId && sesionActual.clientId === sesionOriginal.clientId

    return coincidePorId || coincidePorClientId ? sesionGuardada : sesionActual
  })
}

function remapearEntrenamientoSesion(entrenamiento, idsAntiguos, sesionGuardada) {
  if (!entrenamiento || !idsAntiguos.has(String(entrenamiento.idSesion || ''))) {
    return entrenamiento
  }

  return {
    ...entrenamiento,
    idSesion: sesionGuardada.persistedId || sesionGuardada.idSesion || sesionGuardada.id,
    nombreSesion: sesionGuardada.nombreSesion || entrenamiento.nombreSesion,
  }
}

function actualizarReferenciasSesionEnEntrenos(sesionOriginal, sesionGuardada) {
  const idsAntiguos = new Set(
    [sesionOriginal?.id, sesionOriginal?.idSesion, sesionOriginal?.clientId]
      .filter(Boolean)
      .map(String),
  )

  if (idsAntiguos.size === 0) {
    return
  }

  const historialActual = obtenerHistorialEntrenamientosGuardado()
  const historialActualizado = historialActual.map((entrenamiento) =>
    remapearEntrenamientoSesion(entrenamiento, idsAntiguos, sesionGuardada),
  )
  guardarHistorialEntrenamientosGuardado(historialActualizado)

  const entrenamientoActual = obtenerEntrenamientoActualGuardado()
  if (entrenamientoActual) {
    guardarEntrenamientoActualGuardado(
      remapearEntrenamientoSesion(entrenamientoActual, idsAntiguos, sesionGuardada),
    )
  }
}

function obtenerEjercicioCatalogoRelacionado(ejercicioSesion, catalogoEjercicios) {
  const idsPosibles = new Set(
    [
      ejercicioSesion?.catalogoEjercicioId,
      ejercicioSesion?.idEjercicio,
      ejercicioSesion?.clientId,
      ejercicioSesion?.id,
    ]
      .filter(Boolean)
      .map(String),
  )

  return (
    catalogoEjercicios.find((ejercicioCatalogo) =>
      idsPosibles.has(String(ejercicioCatalogo.catalogoEjercicioId || '')),
    ) ||
    catalogoEjercicios.find(
      (ejercicioCatalogo) =>
        ejercicioSesion?.clientId && ejercicioCatalogo.clientId === ejercicioSesion.clientId,
    ) ||
    catalogoEjercicios.find(
      (ejercicioCatalogo) =>
        normalizarTexto(ejercicioCatalogo.nombre) === normalizarTexto(ejercicioSesion?.nombre),
    ) ||
    null
  )
}

function reconciliarSesionPendienteConCatalogo(sesionPendiente, catalogoEjercicios) {
  return {
    ...sesionPendiente,
    ejercicios: (sesionPendiente?.ejercicios || []).map((ejercicioSesion) => {
      const ejercicioCatalogo = obtenerEjercicioCatalogoRelacionado(
        ejercicioSesion,
        catalogoEjercicios,
      )

      if (!ejercicioCatalogo?.catalogoEjercicioId) {
        return ejercicioSesion
      }

      return {
        ...ejercicioSesion,
        catalogoEjercicioId: ejercicioCatalogo.catalogoEjercicioId,
        nombre: ejercicioCatalogo.nombre || ejercicioSesion.nombre,
        descripcion: ejercicioCatalogo.descripcion || ejercicioSesion.descripcion,
        grupoMuscular: ejercicioCatalogo.grupoMuscular || ejercicioSesion.grupoMuscular,
        patronMovimiento: ejercicioCatalogo.patronMovimiento || ejercicioSesion.patronMovimiento,
        equipamiento: ejercicioCatalogo.equipamiento || ejercicioSesion.equipamiento,
        agarre: ejercicioCatalogo.agarre || ejercicioSesion.agarre,
      }
    }),
  }
}

function esConflictoDeVersion(error) {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    (error.backendError === ERROR_CONFLICTO_VERSION ||
      String(error.backendMessage || error.message || '').toLowerCase().includes('version'))
  )
}

function crearErrorValidacionSesion(message) {
  const error = new Error(message)
  error.status = 400
  error.backendError = 'Validacion no valida'
  error.backendMessage = message
  return error
}

function marcarSesionConError(sesion, error) {
  const esConflictoVersion = esConflictoDeVersion(error)
  const mensajeError =
    error?.backendMessage || error?.message || 'No se pudo sincronizar la sesion.'
  const esValidacionEjercicios = mensajeError
    .toLowerCase()
    .includes('la sesion debe tener al menos un ejercicio')

  return {
    ...sesion,
    syncStatus: 'pending',
    syncError: esConflictoVersion
      ? error.backendMessage ||
        'La version enviada no coincide con la version actual del backend.'
      : mensajeError,
    lastSyncAttemptAt: new Date().toISOString(),
    syncFieldErrors: esConflictoVersion
      ? { version: true }
      : esValidacionEjercicios
        ? { ejercicios: mensajeError }
        : {},
    ejercicios: (sesion?.ejercicios || []).map((ejercicio) => ({
      ...ejercicio,
      syncStatus: 'pending',
      syncError: esConflictoVersion
        ? error.backendMessage ||
          'La version enviada no coincide con la version actual del backend.'
        : mensajeError,
      syncFieldErrors: esConflictoVersion ? { version: true } : {},
    })),
  }
}

export async function sincronizarSesionesPendientes() {
  if (sincronizacionSesionesActiva) {
    debugSesion('sincronizacion ya activa, reutilizando promesa')
    return sincronizacionSesionesActiva
  }

  sincronizacionSesionesActiva = (async () => {
    await sincronizarCatalogoEjerciciosPendientes()
    let sesionesActuales = obtenerSesionesGuardadas()
    const catalogoEjercicios = obtenerCatalogoEjerciciosGuardado()
    const pendientes = listarQueueItemsPorTipo('session')
    let sincronizados = 0
    let ultimoError = null

    debugSesion('inicio sincronizarSesionesPendientes', {
      totalSesiones: sesionesActuales.length,
      totalCatalogo: catalogoEjercicios.length,
      pendientes: pendientes.map((item) => item.clientId),
    })

    for (const pendiente of pendientes) {
      const sesionPendiente =
        sesionesActuales.find((sesion) => sesion.clientId === pendiente.clientId) || null

      if (!sesionPendiente) {
        eliminarQueueItem('session', pendiente.clientId)
        continue
      }

      const lockOwner = crearLockOwner('session', pendiente.clientId)
      const lock = adquirirLockQueueItem('session', pendiente.clientId, lockOwner)

      if (!lock) {
        continue
      }

      try {
        const sesionReconciliada = reconciliarSesionPendienteConCatalogo(
          sesionPendiente,
          catalogoEjercicios,
        )
        const errorValidacion = obtenerErrorValidacionSesion(sesionReconciliada)

        if (errorValidacion) {
          throw crearErrorValidacionSesion(errorValidacion)
        }

        debugSesion('sincronizando sesion pendiente', {
          original: resumirSesionParaLog(sesionPendiente),
          reconciliada: resumirSesionParaLog(sesionReconciliada),
        })
        const sesionGuardada = await guardarSesionEnServidor(sesionReconciliada)
        actualizarReferenciasSesionEnEntrenos(sesionPendiente, sesionGuardada)
        sesionesActuales = reemplazarSesionGuardada(
          sesionesActuales,
          sesionPendiente,
          sesionGuardada,
        )
        sincronizados += 1
        debugSesion('sesion sincronizada correctamente', {
          original: resumirSesionParaLog(sesionPendiente),
          guardada: resumirSesionParaLog(sesionGuardada),
          sincronizados,
        })
      } catch (errorCapturado) {
        marcarQueueItemComoFallido('session', pendiente.clientId, lockOwner, errorCapturado)
        sesionesActuales = reemplazarSesionGuardada(
          sesionesActuales,
          sesionPendiente,
          marcarSesionConError(sesionPendiente, errorCapturado),
        )
        ultimoError = errorCapturado
        debugSesion('error al sincronizar sesion pendiente', {
          sesion: resumirSesionParaLog(sesionPendiente),
          status: errorCapturado?.status || 0,
          message: errorCapturado?.message || 'unknown-error',
          backendError: errorCapturado?.backendError || '',
          backendMessage: errorCapturado?.backendMessage || '',
          payload: errorCapturado?.payload || null,
        })
      }
    }

    guardarSesionesGuardadas(sesionesActuales)

    debugSesion('fin sincronizarSesionesPendientes', {
      sincronizados,
      ultimoError: ultimoError
        ? {
            status: ultimoError?.status || 0,
            message: ultimoError?.message || 'unknown-error',
            backendError: ultimoError?.backendError || '',
            backendMessage: ultimoError?.backendMessage || '',
          }
        : null,
      sesionesFinales: sesionesActuales.map(resumirSesionParaLog),
    })

    return {
      sesiones: sesionesActuales,
      sincronizados,
      error: ultimoError,
    }
  })().finally(() => {
    sincronizacionSesionesActiva = null
  })

  return sincronizacionSesionesActiva
}

export async function recargarSesionesConSincronizacion() {
  const resultadoSincronizacion = await sincronizarSesionesPendientes()
  const sesionesServidor = await obtenerSesionesDesdeServidor()
  const sesionesFusionadas = reemplazarSesionesDesdeRemotoConPendientesLocales(sesionesServidor)

  return {
    sesiones: sesionesFusionadas,
    sincronizados: resultadoSincronizacion?.sincronizados || 0,
    error: resultadoSincronizacion?.error || null,
  }
}
