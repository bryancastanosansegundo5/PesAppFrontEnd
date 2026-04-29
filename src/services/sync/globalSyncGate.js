import { sincronizarDatosOfflineEnOrden } from './offlineSyncService'

let sincronizacionPreviaActiva = null
let sincronizacionHabilitada = false
let profundidadContextoInterno = 0

function esRutaAuth(path) {
  return (
    path === '/api/auth/login' ||
    path === '/api/auth/logout' ||
    path === '/api/auth/refresh' ||
    path === '/api/auth/me'
  )
}

export function configurarGlobalSyncGate({ enabled }) {
  sincronizacionHabilitada = Boolean(enabled)
}

export function ejecutarDentroDeGlobalSync(callback) {
  profundidadContextoInterno += 1

  const finalizar = () => {
    profundidadContextoInterno = Math.max(0, profundidadContextoInterno - 1)
  }

  try {
    const resultado = callback()

    if (resultado && typeof resultado.finally === 'function') {
      return resultado.finally(finalizar)
    }

    finalizar()
    return resultado
  } catch (error) {
    finalizar()
    throw error
  }
}

export async function asegurarGlobalSyncAntesDeRequest(path, options = {}) {
  const { auth = false, skip_global_sync = false } = options

  if (!auth || skip_global_sync || !sincronizacionHabilitada || profundidadContextoInterno > 0) {
    return
  }

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return
  }

  if (esRutaAuth(path)) {
    return
  }

  if (!sincronizacionPreviaActiva) {
    sincronizacionPreviaActiva = ejecutarDentroDeGlobalSync(() =>
      sincronizarDatosOfflineEnOrden(),
    ).finally(() => {
      sincronizacionPreviaActiva = null
    })
  }

  return sincronizacionPreviaActiva
}
