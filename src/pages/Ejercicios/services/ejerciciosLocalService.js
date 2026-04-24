import { crearPlantillaEjercicioVacia } from '../../../services/exercises/exerciseCatalogModel'
import {
  guardarCatalogoEjerciciosGuardado,
  obtenerCatalogoEjerciciosGuardado,
} from '../../../services/storage/exerciseCatalogStorage'

export function obtenerCatalogoEjercicios() {
  return obtenerCatalogoEjerciciosGuardado()
}

export function guardarCatalogoEjercicios(ejercicios) {
  guardarCatalogoEjerciciosGuardado(ejercicios)
}

export { crearPlantillaEjercicioVacia }
