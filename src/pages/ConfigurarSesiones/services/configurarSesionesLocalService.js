import {
  crearEjercicioDesdeCatalogo,
  crearSesionVacia,
} from '../../../services/training/trainingModel'
import {
  fusionarSesionesGuardadas,
  guardarSesionesGuardadas,
  obtenerSesionesGuardadas,
  reemplazarSesionesDesdeRemotoConPendientesLocales,
} from '../../../services/storage/trainingStorage'
import {
  fusionarCatalogoEjerciciosGuardado,
  guardarCatalogoEjerciciosGuardado,
  obtenerCatalogoEjerciciosGuardado,
  reemplazarCatalogoDesdeRemotoConPendientesLocales,
} from '../../../services/storage/exerciseCatalogStorage'

export function obtenerSesionesConfiguracion() {
  return obtenerSesionesGuardadas()
}

export function guardarSesionesConfiguracion(sesiones) {
  guardarSesionesGuardadas(sesiones)
}

export function fusionarSesionesConfiguracion(sesiones) {
  return fusionarSesionesGuardadas(sesiones)
}

export function reemplazarSesionesConfiguracionDesdeRemoto(sesiones) {
  return reemplazarSesionesDesdeRemotoConPendientesLocales(sesiones)
}

export function obtenerCatalogoEjerciciosConfiguracion() {
  return obtenerCatalogoEjerciciosGuardado()
}

export function guardarCatalogoEjerciciosConfiguracion(catalogo) {
  guardarCatalogoEjerciciosGuardado(catalogo)
}

export function fusionarCatalogoEjerciciosConfiguracion(catalogo) {
  return fusionarCatalogoEjerciciosGuardado(catalogo)
}

export function reemplazarCatalogoEjerciciosConfiguracionDesdeRemoto(catalogo) {
  return reemplazarCatalogoDesdeRemotoConPendientesLocales(catalogo)
}

export { crearEjercicioDesdeCatalogo, crearSesionVacia }
