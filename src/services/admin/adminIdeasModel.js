import { crearIdLocal, normalizarIdTexto, normalizarVersion } from '../data/syncModel'

function preferirValor(...valores) {
  const encontrado = valores.find(
    (valor) => valor !== null && valor !== undefined && String(valor).trim() !== '',
  )

  return encontrado === undefined ? '' : String(encontrado)
}

function normalizarFechaIso(valor) {
  if (!valor) {
    return ''
  }

  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? '' : fecha.toISOString()
}

export function crearIdeaAdminVacia() {
  const clientId = crearIdLocal('idea-admin')
  const ahora = new Date().toISOString()

  return {
    id: clientId,
    ideaId: '',
    clientId,
    titulo: '',
    descripcion: '',
    completada: false,
    activo: true,
    createdAt: ahora,
    updatedAt: ahora,
    version: 0,
    syncStatus: 'pending',
    syncError: '',
    lastSyncAttemptAt: '',
  }
}

export function normalizarIdeaAdmin(idea, indice = 0) {
  const ideaId = normalizarIdTexto(idea?.ideaId)
  const clientId = normalizarIdTexto(idea?.clientId) || crearIdLocal(`idea-admin-${indice + 1}`)
  const id = preferirValor(idea?.id, clientId, ideaId, crearIdLocal(`idea-admin-${indice + 1}`))
  const createdAt = normalizarFechaIso(idea?.createdAt) || new Date().toISOString()
  const updatedAt = normalizarFechaIso(idea?.updatedAt) || createdAt

  return {
    id,
    ideaId,
    clientId,
    titulo: String(idea?.titulo || ''),
    descripcion: String(idea?.descripcion || ''),
    completada: Boolean(idea?.completada),
    activo: idea?.activo !== false,
    createdAt,
    updatedAt,
    version: normalizarVersion(idea?.version),
    syncStatus: idea?.syncStatus === 'pending' ? 'pending' : 'synced',
    syncError: idea?.syncError ? String(idea.syncError) : '',
    lastSyncAttemptAt: normalizarFechaIso(idea?.lastSyncAttemptAt),
  }
}

function fusionarIdeas(existente, candidata) {
  const ideaExistente = normalizarIdeaAdmin(existente)
  const ideaCandidata = normalizarIdeaAdmin(candidata)

  const prioridadPendiente =
    ideaCandidata.syncStatus === 'pending' && ideaExistente.syncStatus !== 'pending'
      ? ideaCandidata
      : ideaExistente

  const prioridadReciente =
    new Date(ideaCandidata.updatedAt).getTime() >= new Date(ideaExistente.updatedAt).getTime()
      ? ideaCandidata
      : ideaExistente

  const base = prioridadPendiente.syncStatus === 'pending' ? prioridadPendiente : prioridadReciente

  return {
    ...ideaExistente,
    ...ideaCandidata,
    ...base,
    id: preferirValor(ideaExistente.id, ideaCandidata.id, ideaExistente.clientId, ideaCandidata.clientId),
    ideaId: preferirValor(ideaCandidata.ideaId, ideaExistente.ideaId),
    clientId: preferirValor(ideaExistente.clientId, ideaCandidata.clientId, ideaExistente.ideaId),
    syncStatus:
      ideaExistente.syncStatus === 'pending' || ideaCandidata.syncStatus === 'pending'
        ? 'pending'
        : 'synced',
    syncError: base.syncError || '',
    lastSyncAttemptAt: base.lastSyncAttemptAt || '',
    version: Math.max(ideaExistente.version || 0, ideaCandidata.version || 0),
    updatedAt:
      new Date(ideaExistente.updatedAt).getTime() >= new Date(ideaCandidata.updatedAt).getTime()
        ? ideaExistente.updatedAt
        : ideaCandidata.updatedAt,
  }
}

function encontrarIndiceCoincidente(lista, candidata) {
  const clientId = String(candidata.clientId || '')
  const ideaId = String(candidata.ideaId || '')
  const id = String(candidata.id || '')

  return lista.findIndex((existente) => {
    const coincideId = id && String(existente.id || '') === id
    const coincideClientId = clientId && String(existente.clientId || '') === clientId
    const coincideIdeaId = ideaId && String(existente.ideaId || '') === ideaId

    return coincideId || coincideClientId || coincideIdeaId
  })
}

export function combinarIdeasAdminGuardadas(baseIdeas = [], nuevasIdeas = []) {
  const acumulado = []

  ;[...(Array.isArray(baseIdeas) ? baseIdeas : []), ...(Array.isArray(nuevasIdeas) ? nuevasIdeas : [])]
    .map((idea, indice) => normalizarIdeaAdmin(idea, indice))
    .forEach((ideaNormalizada) => {
      const indiceCoincidente = encontrarIndiceCoincidente(acumulado, ideaNormalizada)

      if (indiceCoincidente < 0) {
        acumulado.push(ideaNormalizada)
        return
      }

      acumulado[indiceCoincidente] = fusionarIdeas(acumulado[indiceCoincidente], ideaNormalizada)
    })

  return acumulado
}
