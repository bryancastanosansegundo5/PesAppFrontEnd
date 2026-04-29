import {
  combinarCatalogoEjercicios,
  normalizarListaEjercicios,
  normalizarPlantillaEjercicio,
} from '../exercises/exerciseCatalogModel'
import { sincronizarQueueConRecursos } from '../sync/syncQueueStorage'

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

function conservarSoloPendientes(ejercicios) {
  return (ejercicios || []).filter((ejercicio) => ejercicio?.syncStatus === 'pending')
}

export function obtenerCatalogoEjerciciosGuardado() {
  const catalogo = normalizarListaEjercicios(leerJson(CLAVE_CATALOGO_EJERCICIOS, null))
  escribirJson(CLAVE_CATALOGO_EJERCICIOS, catalogo)
  return catalogo
}

export function guardarCatalogoEjerciciosGuardado(ejercicios) {
  const ejerciciosNormalizados = combinarCatalogoEjercicios([], ejercicios).map(
    normalizarPlantillaEjercicio,
  )
  escribirJson(CLAVE_CATALOGO_EJERCICIOS, ejerciciosNormalizados)
  sincronizarQueueConRecursos('exerciseCatalog', ejerciciosNormalizados, (ejercicio) => ({
    clientId: ejercicio?.clientId || ejercicio?.idEjercicio || ejercicio?.catalogoEjercicioId,
    entityLocalId: ejercicio?.idEjercicio || ejercicio?.id || ejercicio?.clientId,
  }))
  return ejerciciosNormalizados
}

export function fusionarCatalogoEjerciciosGuardado(ejerciciosRemotos) {
  const catalogoFusionado = combinarCatalogoEjercicios(
    obtenerCatalogoEjerciciosGuardado(),
    ejerciciosRemotos,
  )
  escribirJson(CLAVE_CATALOGO_EJERCICIOS, catalogoFusionado)
  return catalogoFusionado
}

export function reemplazarCatalogoDesdeRemotoConPendientesLocales(ejerciciosRemotos) {
  const catalogoLocalPendiente = conservarSoloPendientes(obtenerCatalogoEjerciciosGuardado())
  const catalogoFusionado = combinarCatalogoEjercicios(catalogoLocalPendiente, ejerciciosRemotos)
  escribirJson(CLAVE_CATALOGO_EJERCICIOS, catalogoFusionado)
  sincronizarQueueConRecursos('exerciseCatalog', catalogoFusionado, (ejercicio) => ({
    clientId: ejercicio?.clientId || ejercicio?.idEjercicio || ejercicio?.catalogoEjercicioId,
    entityLocalId: ejercicio?.idEjercicio || ejercicio?.id || ejercicio?.clientId,
  }))
  return catalogoFusionado
}
