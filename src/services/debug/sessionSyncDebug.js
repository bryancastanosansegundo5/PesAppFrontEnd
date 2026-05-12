function serializarSeguro(valor) {
  try {
    return JSON.parse(JSON.stringify(valor))
  } catch {
    return valor
  }
}

function resumirEjercicio(ejercicio) {
  return {
    id: ejercicio?.id || '',
    idEjercicio: ejercicio?.idEjercicio || '',
    clientId: ejercicio?.clientId || '',
    catalogoEjercicioId: ejercicio?.catalogoEjercicioId || '',
    plantillaEjercicioId: ejercicio?.plantillaEjercicioId || '',
    nombre: ejercicio?.nombre || '',
    observaciones: ejercicio?.observaciones || '',
    version: ejercicio?.version ?? null,
    syncStatus: ejercicio?.syncStatus || '',
  }
}

export function resumirSesionParaLog(sesion) {
  if (!sesion) {
    return null
  }

  return {
    id: sesion.id || '',
    idSesion: sesion.idSesion || '',
    clientId: sesion.clientId || '',
    nombreSesion: sesion.nombreSesion || '',
    observaciones: sesion.observaciones || '',
    version: sesion.version ?? null,
    syncStatus: sesion.syncStatus || '',
    updatedAt: sesion.updatedAt || '',
    ejercicios: Array.isArray(sesion.ejercicios)
      ? sesion.ejercicios.map(resumirEjercicio)
      : [],
  }
}

export function debugSesion(etiqueta, detalle = {}) {
  const marca = new Date().toISOString()

  if (globalThis.localStorage?.getItem('pesapp:debug-sesiones') === 'true') {
    console.log(`[sesiones-debug] ${marca} ${etiqueta}`, serializarSeguro(detalle))
  }
}
