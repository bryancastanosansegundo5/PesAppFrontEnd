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
  const payload = await apiRequest('/api/peso/hoy', {
    method: 'PUT',
    auth: true,
    body: crearPayloadPesoHoy(registro),
  })

  return payload ? normalizarRegistroPeso(payload) : null
}

export async function crearPesoEnServidor(registro) {
  const payload = await apiRequest('/api/peso', {
    method: 'POST',
    auth: true,
    body: crearPayloadPeso(registro),
  })

  return payload ? normalizarRegistroPeso(payload) : null
}
