import {
  crearEntrenamientoDesdeSesion,
  obtenerUltimoRegistroEjercicio,
} from '../../../services/training/trainingModel'
import {
  guardarEntrenamientoActualGuardado,
  guardarHistorialEntrenamientosGuardado,
  guardarSesionesGuardadas,
  limpiarEntrenamientoActualGuardado,
  obtenerEntrenamientoActualGuardado,
  obtenerHistorialEntrenamientosGuardado,
  obtenerSesionesGuardadas,
} from '../../../services/storage/trainingStorage'
import {
  guardarCatalogoEjerciciosGuardado,
  obtenerCatalogoEjerciciosGuardado,
} from '../../../services/storage/exerciseCatalogStorage'

export function obtenerSesionesEntreno() {
  return obtenerSesionesGuardadas()
}

export function obtenerEntrenamientoBorrador() {
  return obtenerEntrenamientoActualGuardado()
}

export function guardarEntrenamientoBorrador(entrenamiento) {
  guardarEntrenamientoActualGuardado(entrenamiento)
}

export function limpiarEntrenamientoBorrador() {
  limpiarEntrenamientoActualGuardado()
}

export function obtenerHistorialEntrenos() {
  return obtenerHistorialEntrenamientosGuardado()
}

export function guardarHistorialEntrenos(historial) {
  guardarHistorialEntrenamientosGuardado(historial)
}

export function obtenerCatalogoEjerciciosEntreno() {
  return obtenerCatalogoEjerciciosGuardado()
}

export function guardarSesionesEntreno(sesiones) {
  guardarSesionesGuardadas(sesiones)
}

export function guardarCatalogoEjerciciosEntreno(catalogo) {
  guardarCatalogoEjerciciosGuardado(catalogo)
}

export { crearEntrenamientoDesdeSesion, obtenerUltimoRegistroEjercicio }
