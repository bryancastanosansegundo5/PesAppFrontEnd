import {
  crearEjercicioDesdeCatalogo,
  crearSesionVacia,
} from '../../../services/training/trainingModel'
import {
  guardarSesionesGuardadas,
  obtenerSesionesGuardadas,
} from '../../../services/storage/trainingStorage'
import {
  guardarCatalogoEjerciciosGuardado,
  obtenerCatalogoEjerciciosGuardado,
} from '../../../services/storage/exerciseCatalogStorage'

export function obtenerSesionesConfiguracion() {
  return obtenerSesionesGuardadas()
}

export function guardarSesionesConfiguracion(sesiones) {
  guardarSesionesGuardadas(sesiones)
}

export function obtenerCatalogoEjerciciosConfiguracion() {
  return obtenerCatalogoEjerciciosGuardado()
}

export function guardarCatalogoEjerciciosConfiguracion(catalogo) {
  guardarCatalogoEjerciciosGuardado(catalogo)
}

export { crearEjercicioDesdeCatalogo, crearSesionVacia }
