import {
  guardarCatalogoEjerciciosGuardado,
  obtenerCatalogoEjerciciosGuardado,
} from '../storage/exerciseCatalogStorage'
import {
  guardarEntrenamientoActualGuardado,
  guardarHistorialEntrenamientosGuardado,
  guardarSesionesGuardadas,
  obtenerEntrenamientoActualGuardado,
  obtenerHistorialEntrenamientosGuardado,
  obtenerSesionesGuardadas,
} from '../storage/trainingStorage'
import {
  actualizarEjercicioEnServidor,
  crearEjercicioEnServidor,
  obtenerEjerciciosDesdeServidor,
} from '../../pages/Ejercicios/services/ejerciciosApiService'

let sincronizacionCatalogoActiva = null

function actualizarReferenciaEjercicio(item, idsAntiguos, ejercicioGuardado) {
  if (!item) {
    return item
  }

  if (!idsAntiguos.has(String(item.catalogoEjercicioId || ''))) {
    return item
  }

  return {
    ...item,
    catalogoEjercicioId: ejercicioGuardado.catalogoEjercicioId || item.catalogoEjercicioId,
    nombre: ejercicioGuardado.nombre || item.nombre,
    descripcion: ejercicioGuardado.descripcion || item.descripcion,
    grupoMuscular: ejercicioGuardado.grupoMuscular || item.grupoMuscular,
    patronMovimiento: ejercicioGuardado.patronMovimiento || item.patronMovimiento,
    equipamiento: ejercicioGuardado.equipamiento || item.equipamiento,
    agarre: ejercicioGuardado.agarre || item.agarre,
  }
}

function actualizarReferenciasEjercicioEnDatosGuardados(ejercicioOriginal, ejercicioGuardado) {
  const idsAntiguos = new Set(
    [
      ejercicioOriginal?.catalogoEjercicioId,
      ejercicioOriginal?.idEjercicio,
      ejercicioOriginal?.clientId,
      ejercicioOriginal?.id,
    ]
      .filter(Boolean)
      .map(String),
  )

  if (idsAntiguos.size === 0 || !ejercicioGuardado?.catalogoEjercicioId) {
    return
  }

  const sesionesActuales = obtenerSesionesGuardadas()
  guardarSesionesGuardadas(
    sesionesActuales.map((sesion) => ({
      ...sesion,
      ejercicios: (sesion.ejercicios || []).map((ejercicio) =>
        actualizarReferenciaEjercicio(ejercicio, idsAntiguos, ejercicioGuardado),
      ),
    })),
  )

  const historialActual = obtenerHistorialEntrenamientosGuardado()
  guardarHistorialEntrenamientosGuardado(
    historialActual.map((entrenamiento) => ({
      ...entrenamiento,
      ejercicios: (entrenamiento.ejercicios || []).map((ejercicio) =>
        actualizarReferenciaEjercicio(ejercicio, idsAntiguos, ejercicioGuardado),
      ),
    })),
  )

  const entrenamientoActual = obtenerEntrenamientoActualGuardado()
  if (entrenamientoActual) {
    guardarEntrenamientoActualGuardado({
      ...entrenamientoActual,
      ejercicios: (entrenamientoActual.ejercicios || []).map((ejercicio) =>
        actualizarReferenciaEjercicio(ejercicio, idsAntiguos, ejercicioGuardado),
      ),
    })
  }
}

export async function sincronizarCatalogoEjerciciosPendientes() {
  if (sincronizacionCatalogoActiva) {
    return sincronizacionCatalogoActiva
  }

  sincronizacionCatalogoActiva = (async () => {
    let ejerciciosActuales = obtenerCatalogoEjerciciosGuardado()
    const pendientes = ejerciciosActuales.filter((ejercicio) => ejercicio.syncStatus === 'pending')
    let sincronizados = 0
    let ultimoError = null

    for (const ejercicioPendiente of pendientes) {
      try {
        const ejercicioGuardado = ejercicioPendiente.catalogoEjercicioId
          ? await actualizarEjercicioEnServidor(
              ejercicioPendiente.catalogoEjercicioId,
              ejercicioPendiente,
            )
          : await crearEjercicioEnServidor(ejercicioPendiente)

        actualizarReferenciasEjercicioEnDatosGuardados(ejercicioPendiente, ejercicioGuardado)
        ejerciciosActuales = ejerciciosActuales.map((ejercicioActual) =>
          ejercicioActual.idEjercicio === ejercicioPendiente.idEjercicio
            ? { ...ejercicioGuardado, esBorrador: false, syncStatus: 'synced' }
            : ejercicioActual,
        )
        sincronizados += 1
      } catch (errorCapturado) {
        ultimoError = errorCapturado
      }
    }

    guardarCatalogoEjerciciosGuardado(ejerciciosActuales)

    return {
      ejercicios: ejerciciosActuales,
      sincronizados,
      error: ultimoError,
    }
  })().finally(() => {
    sincronizacionCatalogoActiva = null
  })

  return sincronizacionCatalogoActiva
}

export async function recargarCatalogoEjerciciosConSincronizacion() {
  const resultadoSincronizacion = await sincronizarCatalogoEjerciciosPendientes()
  const ejerciciosServidor = await obtenerEjerciciosDesdeServidor()
  guardarCatalogoEjerciciosGuardado(ejerciciosServidor)

  return {
    ejercicios: ejerciciosServidor,
    sincronizados: resultadoSincronizacion?.sincronizados || 0,
    error: resultadoSincronizacion?.error || null,
  }
}
