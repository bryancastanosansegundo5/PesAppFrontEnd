import {
  crearEntrenamientoDesdeSesion,
  obtenerUltimoRegistroEjercicio,
} from '../../../services/training/trainingModel'
import {
  fusionarSesionesGuardadas,
  guardarEntrenamientoActualGuardado,
  guardarHistorialEntrenamientosGuardado,
  guardarSesionesGuardadas,
  limpiarEntrenamientoActualGuardado,
  obtenerEntrenamientoActualGuardado,
  obtenerHistorialEntrenamientosGuardado,
  obtenerSesionesGuardadas,
  reemplazarHistorialDesdeRemotoConPendientesLocales,
  reemplazarSesionesDesdeRemotoConPendientesLocales,
} from '../../../services/storage/trainingStorage'
import {
  fusionarCatalogoEjerciciosGuardado,
  guardarCatalogoEjerciciosGuardado,
  obtenerCatalogoEjerciciosGuardado,
  reemplazarCatalogoDesdeRemotoConPendientesLocales,
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

export function fusionarSesionesEntreno(sesiones) {
  return fusionarSesionesGuardadas(sesiones)
}

export function reemplazarSesionesEntrenoDesdeRemoto(sesiones) {
  return reemplazarSesionesDesdeRemotoConPendientesLocales(sesiones)
}

export function guardarCatalogoEjerciciosEntreno(catalogo) {
  guardarCatalogoEjerciciosGuardado(catalogo)
}

export function fusionarCatalogoEjerciciosEntreno(catalogo) {
  return fusionarCatalogoEjerciciosGuardado(catalogo)
}

export function reemplazarCatalogoEjerciciosEntrenoDesdeRemoto(catalogo) {
  return reemplazarCatalogoDesdeRemotoConPendientesLocales(catalogo)
}

export function reemplazarHistorialEntrenosDesdeRemoto(historial) {
  return reemplazarHistorialDesdeRemotoConPendientesLocales(historial)
}

export { crearEntrenamientoDesdeSesion, obtenerUltimoRegistroEjercicio }
