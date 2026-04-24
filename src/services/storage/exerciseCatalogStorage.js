import {
  normalizarListaEjercicios,
  normalizarPlantillaEjercicio,
} from '../exercises/exerciseCatalogModel'

const CLAVE_CATALOGO_EJERCICIOS = 'pesapp-exercise-catalog'

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

export function obtenerCatalogoEjerciciosGuardado() {
  const catalogo = normalizarListaEjercicios(leerJson(CLAVE_CATALOGO_EJERCICIOS, null))
  escribirJson(CLAVE_CATALOGO_EJERCICIOS, catalogo)
  return catalogo
}

export function guardarCatalogoEjerciciosGuardado(ejercicios) {
  escribirJson(CLAVE_CATALOGO_EJERCICIOS, ejercicios.map(normalizarPlantillaEjercicio))
}
