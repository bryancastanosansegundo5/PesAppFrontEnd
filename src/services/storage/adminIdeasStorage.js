import {
  combinarIdeasAdminGuardadas,
  normalizarIdeaAdmin,
} from '../admin/adminIdeasModel'
import { sincronizarQueueConRecursos } from '../sync/syncQueueStorage'

const CLAVE_IDEAS_ADMIN = 'pesapp-admin-ideas'

function leerJson(clave, valorPorDefecto) {
  try {
    const valor = window.localStorage.getItem(clave)
    return valor ? JSON.parse(valor) : valorPorDefecto
  } catch {
    return valorPorDefecto
  }
}

function escribirJson(clave, valor) {
  window.localStorage.setItem(clave, JSON.stringify(valor))
}

function conservarSoloPendientes(ideas) {
  return (ideas || []).filter((idea) => idea?.syncStatus === 'pending')
}

export function obtenerIdeasAdminGuardadas() {
  const ideas = combinarIdeasAdminGuardadas([], leerJson(CLAVE_IDEAS_ADMIN, []))
  escribirJson(CLAVE_IDEAS_ADMIN, ideas)
  return ideas
}

export function guardarIdeasAdminGuardadas(ideas) {
  const ideasNormalizadas = combinarIdeasAdminGuardadas([], ideas).map(normalizarIdeaAdmin)
  escribirJson(CLAVE_IDEAS_ADMIN, ideasNormalizadas)
  sincronizarQueueConRecursos('adminIdea', ideasNormalizadas, (idea) => ({
    clientId: idea?.clientId || idea?.id,
    entityLocalId: idea?.id || idea?.clientId || idea?.ideaId,
  }))
  return ideasNormalizadas
}

export function reemplazarIdeasAdminDesdeRemotoConPendientesLocales(ideasRemotas) {
  const ideasLocalesPendientes = conservarSoloPendientes(obtenerIdeasAdminGuardadas())
  const ideasFusionadas = combinarIdeasAdminGuardadas(ideasLocalesPendientes, ideasRemotas)
  escribirJson(CLAVE_IDEAS_ADMIN, ideasFusionadas)
  sincronizarQueueConRecursos('adminIdea', ideasFusionadas, (idea) => ({
    clientId: idea?.clientId || idea?.id,
    entityLocalId: idea?.id || idea?.clientId || idea?.ideaId,
  }))
  return ideasFusionadas
}
