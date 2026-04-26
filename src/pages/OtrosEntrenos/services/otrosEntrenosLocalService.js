import { normalizarListaOtrosEntrenos } from './otrosEntrenosApiService'

const CLAVE_OTROS_ENTRENOS = 'pesapp-other-workouts-history'

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

export function obtenerOtrosEntrenosGuardados() {
  const ejercicios = normalizarListaOtrosEntrenos(leerJson(CLAVE_OTROS_ENTRENOS, null))
  escribirJson(CLAVE_OTROS_ENTRENOS, ejercicios)
  return ejercicios
}

export function guardarOtrosEntrenosGuardados(ejercicios) {
  const ejerciciosNormalizados = normalizarListaOtrosEntrenos(ejercicios)
  escribirJson(CLAVE_OTROS_ENTRENOS, ejerciciosNormalizados)
  return ejerciciosNormalizados
}
