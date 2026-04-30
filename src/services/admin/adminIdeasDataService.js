import {
  cambiarEstadoIdeaAdmin,
  crearIdeaAdmin,
  actualizarIdeaAdmin,
  obtenerIdeasAdmin,
} from './adminIdeasApiService'
import {
  guardarIdeasAdminGuardadas,
  obtenerIdeasAdminGuardadas,
  reemplazarIdeasAdminDesdeRemotoConPendientesLocales,
} from '../storage/adminIdeasStorage'
import {
  adquirirLockQueueItem,
  crearLockOwner,
  eliminarQueueItem,
  listarQueueItemsPorTipo,
  marcarQueueItemComoFallido,
} from '../sync/syncQueueStorage'

let sincronizacionIdeasAdminActiva = null

function reemplazarIdeaGuardada(ideasActuales, ideaOriginal, ideaGuardada) {
  return ideasActuales.map((ideaActual) => {
    const coincidePorId = ideaActual.id === ideaOriginal.id
    const coincidePorClientId =
      ideaOriginal.clientId && ideaActual.clientId === ideaOriginal.clientId

    return coincidePorId || coincidePorClientId ? ideaGuardada : ideaActual
  })
}

function marcarIdeaConError(idea, error) {
  return {
    ...idea,
    syncStatus: 'pending',
    syncError: error?.message || 'No se pudo sincronizar la idea.',
    lastSyncAttemptAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

function crearIdeaSincronizada(ideaLocal, ideaServidor) {
  return {
    ...ideaLocal,
    ...ideaServidor,
    id: ideaLocal.id,
    clientId: ideaLocal.clientId,
    syncStatus: 'synced',
    syncError: '',
    lastSyncAttemptAt: '',
    updatedAt: ideaServidor.updatedAt || new Date().toISOString(),
  }
}

export async function sincronizarIdeasAdminPendientes() {
  if (sincronizacionIdeasAdminActiva) {
    return sincronizacionIdeasAdminActiva
  }

  sincronizacionIdeasAdminActiva = (async () => {
    let ideasActuales = obtenerIdeasAdminGuardadas()
    const pendientes = listarQueueItemsPorTipo('adminIdea')
    let sincronizados = 0
    let ultimoError = null

    for (const pendiente of pendientes) {
      const ideaPendiente =
        ideasActuales.find((idea) => idea.clientId === pendiente.clientId) || null

      if (!ideaPendiente) {
        eliminarQueueItem('adminIdea', pendiente.clientId)
        continue
      }

      const lockOwner = crearLockOwner('adminIdea', pendiente.clientId)
      const lock = adquirirLockQueueItem('adminIdea', pendiente.clientId, lockOwner)

      if (!lock) {
        continue
      }

      try {
        const ideaServidor = ideaPendiente.ideaId
          ? await actualizarIdeaAdmin(ideaPendiente.ideaId, ideaPendiente)
          : await crearIdeaAdmin(ideaPendiente)

        ideasActuales = reemplazarIdeaGuardada(
          ideasActuales,
          ideaPendiente,
          crearIdeaSincronizada(ideaPendiente, ideaServidor),
        )
        sincronizados += 1
      } catch (errorCapturado) {
        marcarQueueItemComoFallido('adminIdea', pendiente.clientId, lockOwner, errorCapturado)
        ideasActuales = reemplazarIdeaGuardada(
          ideasActuales,
          ideaPendiente,
          marcarIdeaConError(ideaPendiente, errorCapturado),
        )
        ultimoError = errorCapturado
      }
    }

    guardarIdeasAdminGuardadas(ideasActuales)

    return {
      ideas: ideasActuales,
      sincronizados,
      error: ultimoError,
    }
  })().finally(() => {
    sincronizacionIdeasAdminActiva = null
  })

  return sincronizacionIdeasAdminActiva
}

export async function recargarIdeasAdminConSincronizacion() {
  let resultadoSincronizacion

  try {
    resultadoSincronizacion = await sincronizarIdeasAdminPendientes()
  } catch (errorCapturado) {
    resultadoSincronizacion = {
      ideas: obtenerIdeasAdminGuardadas(),
      sincronizados: 0,
      error: errorCapturado,
    }
  }

  try {
    const ideasServidor = await obtenerIdeasAdmin()
    const ideasFusionadas = reemplazarIdeasAdminDesdeRemotoConPendientesLocales(ideasServidor)

    return {
      ideas: ideasFusionadas,
      sincronizados: resultadoSincronizacion?.sincronizados || 0,
      error: resultadoSincronizacion?.error || null,
      online: true,
    }
  } catch (errorCapturado) {
    return {
      ideas: obtenerIdeasAdminGuardadas(),
      sincronizados: resultadoSincronizacion?.sincronizados || 0,
      error: errorCapturado || resultadoSincronizacion?.error || null,
      online: false,
    }
  }
}

export async function cambiarEstadoIdeaAdminConRespaldo(idea) {
  if (!idea?.ideaId) {
    const ideasActuales = obtenerIdeasAdminGuardadas()
    const ideasActualizadas = reemplazarIdeaGuardada(ideasActuales, idea, {
      ...idea,
      syncStatus: 'pending',
      syncError: '',
      lastSyncAttemptAt: '',
      updatedAt: new Date().toISOString(),
    })
    guardarIdeasAdminGuardadas(ideasActualizadas)

    return {
      idea: ideasActualizadas.find((item) => item.clientId === idea.clientId) || idea,
      online: false,
      pendiente: true,
    }
  }

  try {
    const ideaServidor = await cambiarEstadoIdeaAdmin(idea.ideaId, idea.activo, idea.version)
    const ideasActuales = obtenerIdeasAdminGuardadas()
    const ideaSincronizada = crearIdeaSincronizada(idea, ideaServidor)
    const ideasActualizadas = reemplazarIdeaGuardada(ideasActuales, idea, ideaSincronizada)
    guardarIdeasAdminGuardadas(ideasActualizadas)

    return {
      idea: ideaSincronizada,
      online: true,
      pendiente: false,
    }
  } catch (errorCapturado) {
    const ideasActuales = obtenerIdeasAdminGuardadas()
    const ideaPendiente = marcarIdeaConError(idea, errorCapturado)
    const ideasActualizadas = reemplazarIdeaGuardada(ideasActuales, idea, ideaPendiente)
    guardarIdeasAdminGuardadas(ideasActualizadas)

    return {
      idea: ideaPendiente,
      online: false,
      pendiente: true,
      error: errorCapturado,
    }
  }
}
