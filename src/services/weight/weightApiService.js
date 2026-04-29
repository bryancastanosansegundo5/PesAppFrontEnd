import { apiRequest } from '../http/apiClient'
import {
  crearPayloadPeso,
  crearPayloadPesoHoy,
  normalizarListaPeso,
  normalizarRegistroPeso,
} from './weightModel'

export async function obtenerPesoDesdeServidor() {
  const payload = await apiRequest('/api/peso', {
    method: 'GET',
    auth: true,
  })

  return normalizarListaPeso(payload)
}

export async function guardarPesoHoyEnServidor(registro) {
  const body = crearPayloadPesoHoy(registro)

  const payload = await apiRequest('/api/peso/hoy', {
    method: 'PUT',
    auth: true,
    body,
  })

  return payload ? normalizarRegistroPeso(payload) : null
}

export async function crearPesoEnServidor(registro) {
  const body = crearPayloadPeso(registro)

  const payload = await apiRequest('/api/peso', {
    method: 'POST',
    auth: true,
    body,
  })

  return payload ? normalizarRegistroPeso(payload) : null
}

export async function eliminarPesoEnServidor(idRegistro) {
  await apiRequest(`/api/peso/${idRegistro}`, {
    method: 'DELETE',
    auth: true,
  })
}
