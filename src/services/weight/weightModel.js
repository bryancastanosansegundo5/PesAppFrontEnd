import { aFechaRegistro, aIsoString, esMismoDiaLocal, parseFechaIso } from '../data/dateUtils'
import { crearIdLocal, normalizarIdTexto, normalizarVersion } from '../data/syncModel'

function normalizarPesoNumero(valor) {
  const peso = Number(valor)
  return Number.isFinite(peso) ? Number(peso.toFixed(1)) : 0
}

function crearClientIdPeso(fechaRegistro, clientIdExistente) {
  if (clientIdExistente) {
    return String(clientIdExistente)
  }

  if (fechaRegistro) {
    return `peso-${fechaRegistro}`
  }

  return crearIdLocal('peso')
}

export function normalizarRegistroPeso(registro, indice = 0) {
  const fechaRegistro = aFechaRegistro(
    registro?.fechaRegistro ?? registro?.fecha ?? registro?.date ?? new Date(),
  )
  const clientId = crearClientIdPeso(
    fechaRegistro,
    registro?.clientId ?? registro?.clienteId ?? registro?.localId,
  )
  const id = normalizarIdTexto(registro?.id, clientId || `peso-${indice + 1}`) || clientId
  const createdAt = aIsoString(
    registro?.createdAt ?? registro?.fechaCreacion ?? registro?.fecha ?? fechaRegistro,
    new Date().toISOString(),
  )
  const updatedAt = aIsoString(
    registro?.updatedAt ?? registro?.fechaActualizacion ?? registro?.fecha ?? createdAt,
    createdAt,
  )
  const syncStatus = registro?.syncStatus || (registro?.pendienteSync ? 'pending' : 'synced')

  return {
    id,
    userId: registro?.userId ?? registro?.usuarioId ?? null,
    clientId,
    peso: normalizarPesoNumero(registro?.peso),
    fechaRegistro,
    fecha: aIsoString(registro?.fecha ?? registro?.fechaRegistro ?? fechaRegistro, createdAt),
    createdAt,
    updatedAt,
    version: normalizarVersion(registro?.version, 1),
    syncStatus,
  }
}

export function normalizarListaPeso(registros) {
  if (!Array.isArray(registros)) {
    return []
  }

  return registros
    .map(normalizarRegistroPeso)
    .filter((registro) => registro.peso > 0)
    .sort((primero, segundo) => {
      const fechaSegundo = parseFechaIso(segundo.fechaRegistro)?.getTime() || 0
      const fechaPrimero = parseFechaIso(primero.fechaRegistro)?.getTime() || 0
      return fechaSegundo - fechaPrimero
    })
}

export function crearPayloadPesoHoy(registro) {
  const registroNormalizado = normalizarRegistroPeso(registro)

  return {
    peso: registroNormalizado.peso,
    clientId: registroNormalizado.clientId,
    version: registroNormalizado.version,
  }
}

export function crearPayloadPeso(registro) {
  const registroNormalizado = normalizarRegistroPeso(registro)

  return {
    peso: registroNormalizado.peso,
    fechaRegistro: registroNormalizado.fechaRegistro,
    clientId: registroNormalizado.clientId,
    version: registroNormalizado.version,
  }
}

export function combinarRegistrosPeso(locales, remotos) {
  const mapa = new Map()

  ;[...normalizarListaPeso(locales), ...normalizarListaPeso(remotos)].forEach((registro) => {
    const clave = registro.clientId || registro.fechaRegistro || registro.id
    const existente = mapa.get(clave)

    if (!existente) {
      mapa.set(clave, registro)
      return
    }

    if (registro.syncStatus === 'pending' && existente.syncStatus !== 'pending') {
      mapa.set(clave, registro)
      return
    }

    if (registro.version > existente.version) {
      mapa.set(clave, registro)
      return
    }

    if (registro.version === existente.version && registro.updatedAt > existente.updatedAt) {
      mapa.set(clave, registro)
    }
  })

  return normalizarListaPeso(Array.from(mapa.values()))
}

export function crearRegistroPesoLocal({
  peso,
  fecha = new Date(),
  registroExistente = null,
  syncStatus = 'pending',
}) {
  const fechaRegistro = aFechaRegistro(fecha)
  const createdAt = registroExistente?.createdAt || aIsoString(fecha, new Date().toISOString())

  return normalizarRegistroPeso({
    ...registroExistente,
    id: registroExistente?.id || crearClientIdPeso(fechaRegistro),
    clientId: crearClientIdPeso(fechaRegistro, registroExistente?.clientId),
    peso,
    fechaRegistro,
    fecha: aIsoString(fecha, createdAt),
    createdAt,
    updatedAt: new Date().toISOString(),
    version: normalizarVersion(registroExistente?.version, 0) + 1,
    syncStatus,
  })
}

export function esRegistroDeHoy(registro) {
  return esMismoDiaLocal(registro?.fechaRegistro, new Date())
}
