import {
  combinarSesionesGuardadas,
  combinarHistorialEntrenamientos,
  historialPredeterminado,
  normalizarListaSesiones,
  normalizarSesion,
  sesionesPredeterminadas,
} from '../training/trainingModel'
import { sincronizarQueueConRecursos } from '../sync/syncQueueStorage'

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

function conservarSoloPendientes(sesiones) {
  return (sesiones || []).filter((sesion) => sesion?.syncStatus === 'pending')
}

export function obtenerSesionesGuardadas() {
  const sesiones = normalizarListaSesiones(leerJson(CLAVE_SESIONES, null), sesionesPredeterminadas)
  escribirJson(CLAVE_SESIONES, sesiones)
  return sesiones
}

export function guardarSesionesGuardadas(sesiones) {
  const sesionesNormalizadas = combinarSesionesGuardadas([], sesiones).map(normalizarSesion)
  escribirJson(CLAVE_SESIONES, sesionesNormalizadas)
  sincronizarQueueConRecursos('session', sesionesNormalizadas, (sesion) => ({
    clientId: sesion?.clientId || sesion?.id || sesion?.idSesion,
    entityLocalId: sesion?.id || sesion?.idSesion || sesion?.clientId,
  }))
  return sesionesNormalizadas
}

export function fusionarSesionesGuardadas(sesionesRemotas) {
  const sesionesFusionadas = combinarSesionesGuardadas(obtenerSesionesGuardadas(), sesionesRemotas)
  escribirJson(CLAVE_SESIONES, sesionesFusionadas)
  return sesionesFusionadas
}

export function reemplazarSesionesDesdeRemotoConPendientesLocales(sesionesRemotas) {
  const sesionesLocalesPendientes = conservarSoloPendientes(obtenerSesionesGuardadas())
  const sesionesFusionadas = combinarSesionesGuardadas(sesionesLocalesPendientes, sesionesRemotas)
  escribirJson(CLAVE_SESIONES, sesionesFusionadas)
  sincronizarQueueConRecursos('session', sesionesFusionadas, (sesion) => ({
    clientId: sesion?.clientId || sesion?.id || sesion?.idSesion,
    entityLocalId: sesion?.id || sesion?.idSesion || sesion?.clientId,
  }))
  return sesionesFusionadas
}

export function obtenerEntrenamientoActualGuardado() {
  const entrenamiento = leerJson(CLAVE_ENTRENAMIENTO_ACTUAL, null)
  return entrenamiento ? normalizarSesion(entrenamiento) : null
}

export function guardarEntrenamientoActualGuardado(entrenamiento) {
  const entrenamientoNormalizado = normalizarSesion(entrenamiento)
  escribirJson(CLAVE_ENTRENAMIENTO_ACTUAL, entrenamientoNormalizado)
  return entrenamientoNormalizado
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
  const historialNormalizado = combinarHistorialEntrenamientos([], historial).map(normalizarSesion)
  escribirJson(CLAVE_HISTORIAL, historialNormalizado)
  sincronizarQueueConRecursos('training', historialNormalizado, (entrenamiento) => ({
    clientId: entrenamiento?.clientId || entrenamiento?.id,
    entityLocalId: entrenamiento?.id || entrenamiento?.clientId,
  }))
  return historialNormalizado
}

export function fusionarHistorialEntrenamientosGuardado(historialRemoto) {
  const historialFusionado = combinarHistorialEntrenamientos(
    obtenerHistorialEntrenamientosGuardado(),
    historialRemoto,
  )

  escribirJson(CLAVE_HISTORIAL, historialFusionado)
  return historialFusionado
}

export function reemplazarHistorialDesdeRemotoConPendientesLocales(historialRemoto) {
  const historialLocalPendiente = conservarSoloPendientes(obtenerHistorialEntrenamientosGuardado())
  const historialFusionado = combinarHistorialEntrenamientos(historialLocalPendiente, historialRemoto)
  escribirJson(CLAVE_HISTORIAL, historialFusionado)
  sincronizarQueueConRecursos('training', historialFusionado, (entrenamiento) => ({
    clientId: entrenamiento?.clientId || entrenamiento?.id,
    entityLocalId: entrenamiento?.id || entrenamiento?.clientId,
  }))
  return historialFusionado
}
