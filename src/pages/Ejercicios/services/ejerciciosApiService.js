import {
  crearPayloadEjercicioCatalogo,
  normalizarListaEjercicios,
  normalizarPlantillaEjercicio,
} from '../../../services/exercises/exerciseCatalogModel'
import { normalizarUltimoRegistroEjercicioApi } from '../../../services/training/trainingModel'
import { apiRequest } from '../../../services/http/apiClient'

export async function obtenerEjerciciosDesdeServidor() {
  const payload = await apiRequest('/api/ejercicios', {
    method: 'GET',
    auth: true,
  })

  return normalizarListaEjercicios(payload)
}

export async function obtenerEjercicioDesdeServidor(idEjercicio) {
  const payload = await apiRequest(`/api/ejercicios/${idEjercicio}`, {
    method: 'GET',
    auth: true,
  })

  return normalizarPlantillaEjercicio(payload)
}

export async function crearEjercicioEnServidor(ejercicio) {
  const payload = await apiRequest('/api/ejercicios', {
    method: 'POST',
    auth: true,
    body: crearPayloadEjercicioCatalogo(ejercicio),
  })

  return normalizarPlantillaEjercicio(payload)
}

export async function actualizarEjercicioEnServidor(idEjercicio, ejercicio) {
  const payload = await apiRequest(`/api/ejercicios/${idEjercicio}`, {
    method: 'PUT',
    auth: true,
    body: crearPayloadEjercicioCatalogo(ejercicio),
  })

  return normalizarPlantillaEjercicio(payload)
}

export function eliminarEjercicioEnServidor(idEjercicio) {
  return apiRequest(`/api/ejercicios/${idEjercicio}`, {
    method: 'DELETE',
    auth: true,
  })
}

export async function obtenerUltimoRegistroEjercicioDesdeServidor(idEjercicio) {
  const payload = await apiRequest(`/api/ejercicios/${idEjercicio}/ultimo-registro`, {
    method: 'GET',
    auth: true,
  })

  return normalizarUltimoRegistroEjercicioApi(payload)
}
