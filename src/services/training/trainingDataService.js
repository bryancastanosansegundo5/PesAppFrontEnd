import { ApiError } from '../http/apiClient'
import {
  fusionarHistorialEntrenamientosGuardado,
  guardarHistorialEntrenamientosGuardado,
  obtenerHistorialEntrenamientosGuardado,
} from '../storage/trainingStorage'
import { normalizarSesion } from './trainingModel'
import { guardarEntrenamientoEnServidor } from '../../pages/Entreno/services/entrenoApiService'

function esErrorRecuperable(error) {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500)
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

export async function guardarEntrenamientoConRespaldo(entrenamiento) {
  const historialPrevio = obtenerHistorialEntrenamientosGuardado()
  const entrenamientoPendiente = marcarEntrenamientoPendiente(entrenamiento)
  guardarHistorialEntrenamientosGuardado(
    reemplazarEntrenamiento(historialPrevio, entrenamientoPendiente),
  )

  console.log('[EntrenoSync] Guardando entreno con respaldo', {
    clientId: entrenamientoPendiente.clientId,
    fechaFin: entrenamientoPendiente.fechaFin,
    nombreSesion: entrenamientoPendiente.nombreSesion,
    syncStatus: entrenamientoPendiente.syncStatus,
  })

  try {
    const entrenamientoServidor = await guardarEntrenamientoEnServidor(entrenamientoPendiente)
    const historial = fusionarHistorialEntrenamientosGuardado([entrenamientoServidor])

    console.log('[EntrenoSync] Entreno subido al servidor en guardado directo', {
      clientId: entrenamientoServidor.clientId,
      id: entrenamientoServidor.id,
      fechaFin: entrenamientoServidor.fechaFin,
      nombreSesion: entrenamientoServidor.nombreSesion,
    })

    return {
      historial,
      online: true,
      error: null,
      entrenamientosSincronizados: [entrenamientoServidor],
    }
  } catch (error) {
    console.log('[EntrenoSync] Error al guardar entreno con respaldo', {
      recoverable: esErrorRecuperable(error),
      message: error?.message,
      status: error?.status,
      clientId: entrenamientoPendiente.clientId,
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
      entrenamientosSincronizados: [],
    }
  }
}

export async function sincronizarEntrenamientosPendientes(clientIds = []) {
  let historialActual = obtenerHistorialEntrenamientosGuardado()
  const clientIdsObjetivo = Array.isArray(clientIds) ? clientIds.filter(Boolean) : []
  const pendientes = historialActual.filter(
    (entrenamiento) =>
      entrenamiento.syncStatus === 'pending' &&
      (clientIdsObjetivo.length === 0 || clientIdsObjetivo.includes(entrenamiento.clientId)),
  )
  let sincronizados = 0
  const entrenamientosSincronizados = []
  const entrenamientosFallidos = []

  console.log('[EntrenoSync] Inicio sincronizacion pendientes', {
    pendientes: pendientes.length,
    filtro: clientIdsObjetivo,
    clientIds: pendientes.map((entrenamiento) => entrenamiento.clientId),
  })

  for (const entrenamientoPendiente of pendientes) {
    try {
      console.log('[EntrenoSync] Enviando pendiente', {
        clientId: entrenamientoPendiente.clientId,
        fechaFin: entrenamientoPendiente.fechaFin,
        nombreSesion: entrenamientoPendiente.nombreSesion,
      })

      const entrenamientoServidor = await guardarEntrenamientoEnServidor(entrenamientoPendiente)
      historialActual = fusionarHistorialEntrenamientosGuardado([entrenamientoServidor])
      sincronizados += 1
      entrenamientosSincronizados.push(entrenamientoServidor)

      console.log('[EntrenoSync] Pendiente sincronizado', {
        clientId: entrenamientoServidor.clientId,
        id: entrenamientoServidor.id,
        fechaFin: entrenamientoServidor.fechaFin,
        nombreSesion: entrenamientoServidor.nombreSesion,
        sincronizados,
      })
    } catch (error) {
      console.log('[EntrenoSync] Error sincronizando pendiente', {
        recoverable: esErrorRecuperable(error),
        message: error?.message,
        status: error?.status,
        clientId: entrenamientoPendiente.clientId,
        sincronizados,
      })
      const entrenamientoConError = marcarEntrenamientoConError(entrenamientoPendiente, error)
      historialActual = guardarHistorialEntrenamientosGuardado(
        reemplazarEntrenamiento(historialActual, entrenamientoConError),
      )
      entrenamientosFallidos.push({
        entrenamiento: entrenamientoConError,
        error,
      })
    }
  }

  console.log('[EntrenoSync] Fin sincronizacion pendientes', {
    sincronizados,
    fallidos: entrenamientosFallidos.length,
    pendientesRestantes: historialActual.filter(
      (entrenamiento) => entrenamiento.syncStatus === 'pending',
    ).length,
  })

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
}
