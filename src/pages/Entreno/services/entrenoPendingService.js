function normalizarTexto(valor) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function formatearFechaEntrenamiento(fecha) {
  if (!fecha) {
    return 'sin fecha'
  }

  return new Date(fecha).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function crearMensajeToastSincronizacion(entrenamientosSincronizados) {
  if (!entrenamientosSincronizados?.length) {
    return ''
  }

  if (entrenamientosSincronizados.length === 1) {
    return `Entreno del ${formatearFechaEntrenamiento(
      entrenamientosSincronizados[0].fechaFin || entrenamientosSincronizados[0].fechaInicio,
    )} actualizado correctamente.`
  }

  return `${entrenamientosSincronizados.length} entrenos pendientes actualizados correctamente.`
}

export function crearMensajeResumenSincronizacion(resultado) {
  if (!resultado) {
    return ''
  }

  const totalSincronizados = Number(resultado.sincronizados) || 0
  const totalFallidos = resultado.entrenamientosFallidos?.length || 0
  const totalPendientes = Number(resultado.pendientesRestantes) || 0

  if (totalSincronizados === 0 && totalFallidos === 0) {
    return ''
  }

  if (totalSincronizados === 0) {
    return totalFallidos === 1
      ? 'No se pudo subir 1 entreno pendiente.'
      : `No se pudieron subir ${totalFallidos} entrenos pendientes.`
  }

  if (totalFallidos === 0) {
    return totalSincronizados === 1
      ? 'Se sincronizo 1 entreno pendiente.'
      : `Se sincronizaron ${totalSincronizados} entrenos pendientes.`
  }

  return `${totalSincronizados} entrenos sincronizados, ${totalPendientes} siguen pendientes.`
}

export function clonarPendientes(entrenamientos) {
  return JSON.parse(JSON.stringify(entrenamientos || []))
}

export function esIdTemporalPendiente(valor) {
  const id = String(valor || '')

  return (
    !id ||
    id.startsWith('sesion-') ||
    id.startsWith('ejercicio-') ||
    id.startsWith('manual-') ||
    id.startsWith('hoy-') ||
    id.startsWith('serie-') ||
    id.startsWith('entrenamiento-') ||
    id.startsWith('entrenamiento-cliente-')
  )
}

export function limpiarIdTemporal(valor) {
  return esIdTemporalPendiente(valor) ? '' : String(valor || '')
}

function obtenerSesionSugerida(entrenamientoPendiente, sesiones) {
  return (
    sesiones.find(
      (sesion) =>
        String(sesion.idSesion || sesion.id || '') === String(entrenamientoPendiente.idSesion || ''),
    ) ||
    sesiones.find(
      (sesion) =>
        normalizarTexto(sesion.nombreSesion) === normalizarTexto(entrenamientoPendiente.nombreSesion),
    ) ||
    null
  )
}

function obtenerCatalogoSugerido(ejercicioPendiente, catalogoEjercicios) {
  return (
    catalogoEjercicios.find(
      (ejercicioCatalogo) =>
        String(ejercicioCatalogo.catalogoEjercicioId || ejercicioCatalogo.idEjercicio || '') ===
        String(ejercicioPendiente.catalogoEjercicioId || ejercicioPendiente.idEjercicio || ''),
    ) ||
    catalogoEjercicios.find(
      (ejercicioCatalogo) =>
        normalizarTexto(ejercicioCatalogo.nombre) === normalizarTexto(ejercicioPendiente.nombre),
    ) ||
    null
  )
}

function obtenerPlantillaSugerida(ejercicioPendiente, sesionSugerida) {
  if (!sesionSugerida?.ejercicios?.length) {
    return null
  }

  return (
    sesionSugerida.ejercicios.find(
      (ejercicioSesion) =>
        String(ejercicioSesion.plantillaEjercicioId || '') ===
          String(ejercicioPendiente.plantillaEjercicioId || '') ||
        String(ejercicioSesion.catalogoEjercicioId || '') ===
          String(ejercicioPendiente.catalogoEjercicioId || ''),
    ) ||
    sesionSugerida.ejercicios.find(
      (ejercicioSesion) =>
        normalizarTexto(ejercicioSesion.nombre) === normalizarTexto(ejercicioPendiente.nombre),
    ) ||
    null
  )
}

export function sugerirCorreccionesPendiente(entrenamientoPendiente, sesiones, catalogoEjercicios) {
  const sesionSugerida = obtenerSesionSugerida(entrenamientoPendiente, sesiones)

  return {
    ...entrenamientoPendiente,
    id: limpiarIdTemporal(entrenamientoPendiente.id),
    idSesion: limpiarIdTemporal(
      sesionSugerida?.idSesion || entrenamientoPendiente.idSesion || entrenamientoPendiente.id,
    ),
    ejercicios: (entrenamientoPendiente.ejercicios || []).map((ejercicioPendiente) => {
      const catalogoSugerido = obtenerCatalogoSugerido(ejercicioPendiente, catalogoEjercicios)
      const plantillaSugerida = obtenerPlantillaSugerida(ejercicioPendiente, sesionSugerida)
      const catalogoEjercicioId = limpiarIdTemporal(
        ejercicioPendiente.catalogoEjercicioId ||
          catalogoSugerido?.catalogoEjercicioId ||
          catalogoSugerido?.idEjercicio,
      )
      const plantillaEjercicioId = limpiarIdTemporal(
        ejercicioPendiente.plantillaEjercicioId || plantillaSugerida?.plantillaEjercicioId,
      )

      return {
        ...ejercicioPendiente,
        id: limpiarIdTemporal(ejercicioPendiente.id),
        idEjercicio: limpiarIdTemporal(ejercicioPendiente.idEjercicio),
        catalogoEjercicioId,
        plantillaEjercicioId,
      }
    }),
  }
}

export function crearOpcionesSesiones(sesiones) {
  return sesiones
    .map((sesion) => ({
      idSesion: limpiarIdTemporal(sesion.idSesion || sesion.id),
      nombreSesion: sesion.nombreSesion || 'Sesion sin nombre',
    }))
    .filter((sesion) => sesion.idSesion)
}

export function crearOpcionesCatalogo(catalogoEjercicios) {
  return catalogoEjercicios
    .map((ejercicio) => ({
      catalogoEjercicioId: limpiarIdTemporal(ejercicio.catalogoEjercicioId || ejercicio.idEjercicio),
      nombre: ejercicio.nombre || 'Ejercicio sin nombre',
    }))
    .filter((ejercicio) => ejercicio.catalogoEjercicioId)
}

export function obtenerEstadoPendiente(entrenamientoPendiente) {
  if (entrenamientoPendiente.syncError) {
    return {
      etiqueta: 'Error de sincronizacion',
      detalle: entrenamientoPendiente.syncError,
      variante: 'error',
    }
  }

  return {
    etiqueta: 'Pendiente de sincronizar',
    detalle: entrenamientoPendiente.lastSyncAttemptAt
      ? `Ultimo intento: ${formatearFechaEntrenamiento(entrenamientoPendiente.lastSyncAttemptAt)}`
      : 'Se subira automaticamente cuando vuelva la conexion.',
    variante: 'pending',
  }
}
