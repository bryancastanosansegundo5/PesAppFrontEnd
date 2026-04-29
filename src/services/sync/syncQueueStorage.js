const CLAVE_SYNC_QUEUE = 'pesapp-sync-queue'
const LOCK_TTL_MS = 60_000
const RETRY_DELAYS_MS = [0, 2_000, 5_000, 15_000, 30_000]

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

function normalizarFechaIso(valor) {
  if (!valor) {
    return ''
  }

  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? '' : fecha.toISOString()
}

function crearQueueKey(resourceType, clientId) {
  return `${resourceType}:${String(clientId || '')}`
}

function normalizarQueueItem(item) {
  const queueKey = String(item?.queueKey || crearQueueKey(item?.resourceType, item?.clientId))

  return {
    queueKey,
    resourceType: String(item?.resourceType || ''),
    clientId: String(item?.clientId || ''),
    entityLocalId: String(item?.entityLocalId || item?.clientId || ''),
    operation: 'upsert',
    status: ['pending', 'in_flight', 'failed'].includes(item?.status) ? item.status : 'pending',
    localRevision: Math.max(1, Number(item?.localRevision) || 1),
    attemptCount: Math.max(0, Number(item?.attemptCount) || 0),
    lockedBy: item?.lockedBy ? String(item.lockedBy) : '',
    lockedAt: normalizarFechaIso(item?.lockedAt),
    nextAttemptAt: normalizarFechaIso(item?.nextAttemptAt),
    lastError: item?.lastError ? String(item.lastError) : '',
    updatedAt: normalizarFechaIso(item?.updatedAt) || new Date().toISOString(),
  }
}

export function obtenerSyncQueueGuardada() {
  const queue = leerJson(CLAVE_SYNC_QUEUE, [])

  if (!Array.isArray(queue)) {
    escribirJson(CLAVE_SYNC_QUEUE, [])
    return []
  }

  const normalizada = queue.map(normalizarQueueItem)
  escribirJson(CLAVE_SYNC_QUEUE, normalizada)
  return normalizada
}

function guardarSyncQueue(queue) {
  const normalizada = Array.isArray(queue) ? queue.map(normalizarQueueItem) : []
  escribirJson(CLAVE_SYNC_QUEUE, normalizada)
  return normalizada
}

function upsertEnQueue(queue, item) {
  const normalizado = normalizarQueueItem(item)
  const indice = queue.findIndex((queueItem) => queueItem.queueKey === normalizado.queueKey)

  if (indice < 0) {
    queue.push(normalizado)
    return
  }

  queue[indice] = normalizado
}

export function sincronizarQueueConRecursos(resourceType, recursos, obtenerIds) {
  const queueActual = obtenerSyncQueueGuardada()
  const recursosArray = Array.isArray(recursos) ? recursos : []
  const recursosPendientes = recursosArray.filter((recurso) => recurso?.syncStatus === 'pending')
  const pendientesPorClave = new Map()

  recursosPendientes.forEach((recurso) => {
    const { clientId, entityLocalId } = obtenerIds(recurso)

    if (!clientId) {
      return
    }

    const queueKey = crearQueueKey(resourceType, clientId)
    const existente = queueActual.find((item) => item.queueKey === queueKey) || null

    pendientesPorClave.set(
      queueKey,
      normalizarQueueItem({
        ...existente,
        queueKey,
        resourceType,
        clientId,
        entityLocalId,
        localRevision: (Number(existente?.localRevision) || 0) + 1,
        updatedAt: new Date().toISOString(),
      }),
    )
  })

  const queueFiltrada = queueActual.filter((item) => {
    if (item.resourceType !== resourceType) {
      return true
    }

    return pendientesPorClave.has(item.queueKey)
  })

  pendientesPorClave.forEach((item) => upsertEnQueue(queueFiltrada, item))

  return guardarSyncQueue(queueFiltrada)
}

function esLockExpirado(item, ahora = Date.now()) {
  if (!item?.lockedAt) {
    return true
  }

  return ahora - new Date(item.lockedAt).getTime() > LOCK_TTL_MS
}

function puedeReintentarse(item, ahora = Date.now()) {
  if (!item?.nextAttemptAt) {
    return true
  }

  return new Date(item.nextAttemptAt).getTime() <= ahora
}

export function listarQueueItemsPorTipo(resourceType, opciones = {}) {
  const { clientIds = [], incluirBloqueados = false } = opciones
  const idsObjetivo = new Set((clientIds || []).filter(Boolean).map(String))
  const ahora = Date.now()

  return obtenerSyncQueueGuardada()
    .filter((item) => item.resourceType === resourceType)
    .filter((item) => idsObjetivo.size === 0 || idsObjetivo.has(item.clientId))
    .filter((item) => item.status === 'pending' || item.status === 'failed' || item.status === 'in_flight')
    .filter((item) => incluirBloqueados || item.status !== 'in_flight' || esLockExpirado(item, ahora))
    .filter((item) => item.status !== 'failed' || puedeReintentarse(item, ahora))
    .sort((primero, segundo) => new Date(primero.updatedAt).getTime() - new Date(segundo.updatedAt).getTime())
}

export function adquirirLockQueueItem(resourceType, clientId, lockOwner) {
  const queueActual = obtenerSyncQueueGuardada()
  const queueKey = crearQueueKey(resourceType, clientId)
  const indice = queueActual.findIndex((item) => item.queueKey === queueKey)

  if (indice < 0) {
    return null
  }

  const actual = queueActual[indice]

  if (actual.status === 'in_flight' && !esLockExpirado(actual)) {
    return null
  }

  const actualizado = normalizarQueueItem({
    ...actual,
    status: 'in_flight',
    lockedBy: lockOwner,
    lockedAt: new Date().toISOString(),
    attemptCount: (Number(actual.attemptCount) || 0) + 1,
    nextAttemptAt: '',
    updatedAt: new Date().toISOString(),
  })

  queueActual[indice] = actualizado
  guardarSyncQueue(queueActual)

  return actualizado
}

export function marcarQueueItemComoFallido(resourceType, clientId, lockOwner, error) {
  const queueActual = obtenerSyncQueueGuardada()
  const queueKey = crearQueueKey(resourceType, clientId)
  const indice = queueActual.findIndex((item) => item.queueKey === queueKey)

  if (indice < 0) {
    return null
  }

  const actual = queueActual[indice]

  if (actual.lockedBy && actual.lockedBy !== lockOwner && !esLockExpirado(actual)) {
    return actual
  }

  const delay = RETRY_DELAYS_MS[Math.min(Number(actual.attemptCount) || 0, RETRY_DELAYS_MS.length - 1)]
  const actualizado = normalizarQueueItem({
    ...actual,
    status: 'failed',
    lockedBy: '',
    lockedAt: '',
    nextAttemptAt: new Date(Date.now() + delay).toISOString(),
    lastError: error?.message || String(error || 'sync-error'),
    updatedAt: new Date().toISOString(),
  })

  queueActual[indice] = actualizado
  guardarSyncQueue(queueActual)

  return actualizado
}

export function marcarQueueItemComoPendiente(resourceType, clientId, lockOwner = '') {
  const queueActual = obtenerSyncQueueGuardada()
  const queueKey = crearQueueKey(resourceType, clientId)
  const indice = queueActual.findIndex((item) => item.queueKey === queueKey)

  if (indice < 0) {
    return null
  }

  const actual = queueActual[indice]

  if (lockOwner && actual.lockedBy && actual.lockedBy !== lockOwner && !esLockExpirado(actual)) {
    return actual
  }

  const actualizado = normalizarQueueItem({
    ...actual,
    status: 'pending',
    lockedBy: '',
    lockedAt: '',
    nextAttemptAt: '',
    lastError: '',
    updatedAt: new Date().toISOString(),
  })

  queueActual[indice] = actualizado
  guardarSyncQueue(queueActual)

  return actualizado
}

export function eliminarQueueItem(resourceType, clientId) {
  const queueKey = crearQueueKey(resourceType, clientId)
  const siguienteQueue = obtenerSyncQueueGuardada().filter((item) => item.queueKey !== queueKey)
  guardarSyncQueue(siguienteQueue)
}

export function crearLockOwner(resourceType, clientId) {
  return `${resourceType}:${clientId}:${Date.now()}`
}
