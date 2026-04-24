import {
  historialPredeterminado,
  normalizarListaSesiones,
  normalizarSesion,
  sesionesPredeterminadas,
} from '../training/trainingModel'

const CLAVE_SESIONES = 'pesapp-training-sessions'
const CLAVE_ENTRENAMIENTO_ACTUAL = 'pesapp-current-workout'
const CLAVE_HISTORIAL = 'pesapp-training-history'

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

export function obtenerSesionesGuardadas() {
  const sesiones = normalizarListaSesiones(leerJson(CLAVE_SESIONES, null), sesionesPredeterminadas)
  escribirJson(CLAVE_SESIONES, sesiones)
  return sesiones
}

export function guardarSesionesGuardadas(sesiones) {
  escribirJson(CLAVE_SESIONES, sesiones.map(normalizarSesion))
}

export function obtenerEntrenamientoActualGuardado() {
  const entrenamiento = leerJson(CLAVE_ENTRENAMIENTO_ACTUAL, null)
  return entrenamiento ? normalizarSesion(entrenamiento) : null
}

export function guardarEntrenamientoActualGuardado(entrenamiento) {
  escribirJson(CLAVE_ENTRENAMIENTO_ACTUAL, normalizarSesion(entrenamiento))
}

export function limpiarEntrenamientoActualGuardado() {
  window.localStorage.removeItem(CLAVE_ENTRENAMIENTO_ACTUAL)
}

export function obtenerHistorialEntrenamientosGuardado() {
  const historial = normalizarListaSesiones(leerJson(CLAVE_HISTORIAL, null), historialPredeterminado)
  escribirJson(CLAVE_HISTORIAL, historial)
  return historial
}

export function guardarHistorialEntrenamientosGuardado(historial) {
  escribirJson(CLAVE_HISTORIAL, historial.map(normalizarSesion))
}
