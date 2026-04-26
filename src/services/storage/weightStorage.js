import { aFechaRegistro } from '../data/dateUtils'
import {
  combinarRegistrosPeso,
  crearRegistroPesoLocal,
  normalizarListaPeso,
  normalizarRegistroPeso,
} from '../weight/weightModel'

const CLAVE_REGISTROS_PESO = 'pesapp-weight-records'

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

export function obtenerRegistrosPesoGuardados() {
  const registros = leerJson(CLAVE_REGISTROS_PESO, [])

  if (!Array.isArray(registros)) {
    escribirJson(CLAVE_REGISTROS_PESO, [])
    return []
  }

  const registrosNormalizados = normalizarListaPeso(registros)

  escribirJson(CLAVE_REGISTROS_PESO, registrosNormalizados)
  return registrosNormalizados
}

export function guardarRegistrosPesoGuardados(registros) {
  const registrosNormalizados = normalizarListaPeso(registros)

  escribirJson(CLAVE_REGISTROS_PESO, registrosNormalizados)
  return registrosNormalizados
}

export function fusionarRegistrosPesoGuardados(registrosRemotos) {
  const registrosFusionados = combinarRegistrosPeso(
    obtenerRegistrosPesoGuardados(),
    registrosRemotos,
  )

  escribirJson(CLAVE_REGISTROS_PESO, registrosFusionados)
  return registrosFusionados
}

export function guardarPesoDelDia(
  peso,
  { fecha = new Date(), horaRegistro = '', horaManual = false, registroExistente = null } = {},
) {
  const registrosActuales = obtenerRegistrosPesoGuardados()
  const registroActualizado = crearRegistroPesoLocal({
    peso,
    fecha,
    horaRegistro,
    horaManual,
    registroExistente,
  })
  const restoRegistros = registroExistente?.clientId
    ? registrosActuales.filter((registro) => registro.clientId !== registroExistente.clientId)
    : registrosActuales

  return guardarRegistrosPesoGuardados([registroActualizado, ...restoRegistros])
}

export function reemplazarRegistroPesoGuardado(registro) {
  const registroNormalizado = normalizarRegistroPeso(registro)
  const restoRegistros = obtenerRegistrosPesoGuardados().filter(
    (item) => item.clientId !== registroNormalizado.clientId,
  )

  return guardarRegistrosPesoGuardados([registroNormalizado, ...restoRegistros])
}

export function obtenerRegistroPesoDeHoy() {
  const fechaHoy = aFechaRegistro(new Date())

  return (
    obtenerRegistrosPesoGuardados().find(
      (registro) => registro.fechaRegistro === fechaHoy,
    ) || null
  )
}

export function obtenerRegistroPesoPorFecha(fecha) {
  const fechaRegistro = aFechaRegistro(fecha)

  return (
    obtenerRegistrosPesoGuardados().find((registro) => registro.fechaRegistro === fechaRegistro) ||
    null
  )
}
