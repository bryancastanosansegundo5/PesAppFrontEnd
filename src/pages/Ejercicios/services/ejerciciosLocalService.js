import { crearPlantillaEjercicioVacia } from '../../../services/exercises/exerciseCatalogModel'
import {
  fusionarCatalogoEjerciciosGuardado,
  guardarCatalogoEjerciciosGuardado,
  obtenerCatalogoEjerciciosGuardado,
  reemplazarCatalogoDesdeRemotoConPendientesLocales,
} from '../../../services/storage/exerciseCatalogStorage'

export function obtenerCatalogoEjercicios() {
  return obtenerCatalogoEjerciciosGuardado()
}

export function guardarCatalogoEjercicios(ejercicios) {
  guardarCatalogoEjerciciosGuardado(ejercicios)
}

export function fusionarCatalogoEjercicios(ejercicios) {
  return fusionarCatalogoEjerciciosGuardado(ejercicios)
}

export function reemplazarCatalogoEjerciciosDesdeRemoto(ejercicios) {
  return reemplazarCatalogoDesdeRemotoConPendientesLocales(ejercicios)
}

export { crearPlantillaEjercicioVacia }
