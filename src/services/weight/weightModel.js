import {
  aFechaRegistro,
  aHoraRegistro,
  aIsoString,
  combinarFechaYHora,
  esMismoDiaLocal,
  parseFechaIso,
} from '../data/dateUtils'
import { crearIdLocal, normalizarIdTexto, normalizarVersion } from '../data/syncModel'

function normalizarPesoNumero(valor) {
  const peso = Number(valor)
  return Number.isFinite(peso) ? Number(peso.toFixed(1)) : 0
}

function obtenerMarcaTemporalClientId() {
  const ahora = new Date()
  const horas = String(ahora.getHours()).padStart(2, '0')
  const minutos = String(ahora.getMinutes()).padStart(2, '0')
  const segundos = String(ahora.getSeconds()).padStart(2, '0')
  const milisegundos = String(ahora.getMilliseconds()).padStart(3, '0')

  return `${horas}${minutos}${segundos}${milisegundos}`
}

function crearClientIdPeso(fechaRegistro, clientIdExistente) {
  if (clientIdExistente) {
    return String(clientIdExistente)
  }

  if (fechaRegistro) {
    return `peso-${fechaRegistro}-${obtenerMarcaTemporalClientId()}-${Math.random().toString(16).slice(2, 8)}`
  }

  return crearIdLocal('peso')
}

function obtenerMarcaTemporalRegistro(registro) {
  const fechaConHora =
    combinarFechaYHora(registro?.fechaRegistro, registro?.horaRegistro) ||
    parseFechaIso(registro?.fecha) ||
    parseFechaIso(registro?.updatedAt) ||
    parseFechaIso(registro?.createdAt)

  return fechaConHora?.getTime() || 0
}

const patronLineaSueno = /^Dorm(?:i|í)\s+((?:[01]\d|2[0-3]):[0-5]\d)$/i

function obtenerHorasSuenoDesdeComentario(comentario) {
  const lineas = String(comentario || '').split(/\r?\n/)
  const lineaSueno = lineas.find((linea) => patronLineaSueno.test(linea.trim()))

  return lineaSueno?.trim().match(patronLineaSueno)?.[1] || ''
}

function combinarComentarioConSueno(comentario, horasSueno) {
  const comentarioSinSueno = String(comentario || '')
    .split(/\r?\n/)
    .map((linea) => linea.trim())
    .filter((linea) => linea && !patronLineaSueno.test(linea))
    .join('\n')
  const horasSuenoFinal = String(horasSueno || obtenerHorasSuenoDesdeComentario(comentario)).trim()

  return [comentarioSinSueno, horasSuenoFinal ? `Dormí ${horasSuenoFinal}` : '']
    .filter(Boolean)
    .join('\n')
}

export function normalizarRegistroPeso(registro, indice = 0) {
  const fechaRegistro = aFechaRegistro(
    registro?.fechaRegistro ?? registro?.fecha ?? registro?.date ?? new Date(),
  )
  const horaRegistro = aHoraRegistro(
    registro?.horaRegistro ?? registro?.hora ?? registro?.time ?? registro?.fecha ?? registro?.createdAt,
  )
  const horaManual = Boolean(
    registro?.horaManual ?? registro?.timeTouched ?? registro?.horaFueEditada ?? false,
  )
  const clientId = crearClientIdPeso(
    fechaRegistro,
    registro?.clientId ?? registro?.clienteId ?? registro?.localId,
  )
  const id = normalizarIdTexto(registro?.id, clientId || `peso-${indice + 1}`) || clientId
  const fechaConHora =
    combinarFechaYHora(fechaRegistro, horaRegistro) ||
    parseFechaIso(registro?.fecha) ||
    parseFechaIso(registro?.createdAt) ||
    new Date()
  const createdAt = aIsoString(
    registro?.createdAt ?? registro?.fechaCreacion ?? registro?.fecha ?? fechaConHora,
    new Date().toISOString(),
  )
  const updatedAt = aIsoString(
    registro?.updatedAt ?? registro?.fechaActualizacion ?? registro?.fecha ?? fechaConHora ?? createdAt,
    createdAt,
  )
  const syncStatus = registro?.syncStatus || (registro?.pendienteSync ? 'pending' : 'synced')
  const comentarioOriginal = String(
    registro?.comentario ?? registro?.observacion ?? registro?.nota ?? registro?.notes ?? '',
  ).trim()
  const horasSueno = String(
    registro?.horasSueno ?? registro?.horas_sueno ?? registro?.sleepDuration ?? '',
  ).trim()
  const comentario = combinarComentarioConSueno(comentarioOriginal, horasSueno)

  return {
    id,
    userId: registro?.userId ?? registro?.usuarioId ?? null,
    clientId,
    peso: normalizarPesoNumero(registro?.peso),
    fechaRegistro,
    horaRegistro,
    horaManual,
    fecha: aIsoString(registro?.fecha ?? fechaConHora ?? registro?.fechaRegistro ?? fechaRegistro, createdAt),
    createdAt,
    updatedAt,
    version: normalizarVersion(registro?.version, 0),
    syncStatus,
    comentario,
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
      return obtenerMarcaTemporalRegistro(segundo) - obtenerMarcaTemporalRegistro(primero)
    })
}

export function crearPayloadPesoHoy(registro) {
  const registroNormalizado = normalizarRegistroPeso(registro)

  return {
    peso: registroNormalizado.peso,
    horaRegistro: registroNormalizado.horaRegistro,
    horaManual: registroNormalizado.horaManual,
    clientId: registroNormalizado.clientId,
    version: registroNormalizado.version,
    comentario: registroNormalizado.comentario,
  }
}

export function crearPayloadPeso(registro) {
  const registroNormalizado = normalizarRegistroPeso(registro)

  return {
    peso: registroNormalizado.peso,
    fechaRegistro: registroNormalizado.fechaRegistro,
    horaRegistro: registroNormalizado.horaRegistro,
    horaManual: registroNormalizado.horaManual,
    clientId: registroNormalizado.clientId,
    version: registroNormalizado.version,
    comentario: registroNormalizado.comentario,
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
  horaRegistro = '',
  horaManual = false,
  comentario = '',
  horasSueno = '',
  registroExistente = null,
  syncStatus = 'pending',
}) {
  const fechaBase = parseFechaIso(fecha) || new Date()
  const fechaRegistro = aFechaRegistro(fecha)
  const horaFinal = aHoraRegistro(horaRegistro, aHoraRegistro(fechaBase))
  const fechaFinal = combinarFechaYHora(fechaBase, horaFinal) || fechaBase
  const createdAt = registroExistente?.createdAt || aIsoString(fechaFinal, new Date().toISOString())

  return normalizarRegistroPeso({
    ...registroExistente,
    id: registroExistente?.id || crearClientIdPeso(fechaRegistro),
    clientId: crearClientIdPeso(fechaRegistro, registroExistente?.clientId),
    peso,
    fechaRegistro,
    horaRegistro: horaFinal,
    horaManual,
    comentario: combinarComentarioConSueno(comentario, horasSueno),
    fecha: aIsoString(fechaFinal, createdAt),
    createdAt,
    updatedAt: new Date().toISOString(),
    version: normalizarVersion(registroExistente?.version, 0),
    syncStatus,
  })
}

export function esRegistroDeHoy(registro) {
  return esMismoDiaLocal(registro?.fechaRegistro, new Date())
}
