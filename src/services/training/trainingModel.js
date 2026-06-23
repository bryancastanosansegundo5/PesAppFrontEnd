import { aIsoString } from '../data/dateUtils'
import { crearIdLocal, normalizarIdTexto, normalizarVersion } from '../data/syncModel'

export const sesionesPredeterminadas = [
  {
    id: 'push-session',
    clientId: 'push-session',
    idSesion: 'push-session',
    nombreSesion: 'Empuje',
    fechaInicio: '',
    fechaFin: '',
    ejercicios: [
      {
        idEjercicio: 'bench-press',
        clientId: 'bench-press',
        nombre: 'Press banca',
        descripcion: 'Press horizontal controlando bajada y bloqueo.',
        seriesPlanificadas: 4,
        repeticionesPlanificadas: 12,
        pesoPlanificado: 60,
        alturaBanco: 4,
        agarre: 'Medio',
        completado: false,
        omitido: false,
        seriesRealizadas: [],
      },
      {
        idEjercicio: 'shoulder-press',
        clientId: 'shoulder-press',
        nombre: 'Press hombro',
        descripcion: 'Empuje vertical sin arquear la espalda.',
        seriesPlanificadas: 3,
        repeticionesPlanificadas: 10,
        pesoPlanificado: 22,
        alturaBanco: 7,
        agarre: 'Neutro',
        completado: false,
        omitido: false,
        seriesRealizadas: [],
      },
    ],
  },
  {
    id: 'pull-session',
    clientId: 'pull-session',
    idSesion: 'pull-session',
    nombreSesion: 'Tiron',
    fechaInicio: '',
    fechaFin: '',
    ejercicios: [
      {
        idEjercicio: 'lat-pulldown',
        clientId: 'lat-pulldown',
        nombre: 'Jalon al pecho',
        descripcion: 'Tirar hacia clavicula manteniendo pecho alto.',
        seriesPlanificadas: 4,
        repeticionesPlanificadas: 10,
        pesoPlanificado: 55,
        alturaBanco: 2,
        agarre: 'Prono',
        completado: false,
        omitido: false,
        seriesRealizadas: [],
      },
      {
        idEjercicio: 'seated-row',
        clientId: 'seated-row',
        nombre: 'Remo sentado',
        descripcion: 'Remar con pausa corta al final del recorrido.',
        seriesPlanificadas: 4,
        repeticionesPlanificadas: 12,
        pesoPlanificado: 48,
        alturaBanco: 3,
        agarre: 'Cerrado',
        completado: false,
        omitido: false,
        seriesRealizadas: [],
      },
    ],
  },
]

export const historialPredeterminado = [
  {
    id: 'sample-history-1',
    clientId: 'sample-history-1',
    idSesion: 'push-session',
    nombreSesion: 'Empuje',
    fechaInicio: '2026-04-20T17:30:00.000Z',
    fechaFin: '2026-04-20T18:30:00.000Z',
    ejercicios: [
      {
        idEjercicio: 'bench-press',
        clientId: 'bench-press',
        nombre: 'Press banca',
        descripcion: '',
        seriesPlanificadas: 0,
        repeticionesPlanificadas: 0,
        pesoPlanificado: 0,
        alturaBanco: 4,
        agarre: 'Medio',
        completado: true,
        omitido: false,
        seriesRealizadas: [
          { id: 'set-1', numeroSerie: 1, repeticiones: 12, peso: 60 },
          { id: 'set-2', numeroSerie: 2, repeticiones: 10, peso: 60 },
          { id: 'set-2-drop-1', numeroSerie: 2, repeticiones: 3, peso: 55 },
          { id: 'set-3', numeroSerie: 3, repeticiones: 9, peso: 57.5 },
          { id: 'set-4', numeroSerie: 4, repeticiones: 8, peso: 55 },
        ],
      },
      {
        idEjercicio: 'shoulder-press',
        clientId: 'shoulder-press',
        nombre: 'Press hombro',
        descripcion: '',
        seriesPlanificadas: 0,
        repeticionesPlanificadas: 0,
        pesoPlanificado: 0,
        alturaBanco: 7,
        agarre: 'Neutro',
        completado: true,
        omitido: false,
        seriesRealizadas: [
          { id: 'set-1', numeroSerie: 1, repeticiones: 10, peso: 22 },
          { id: 'set-2', numeroSerie: 2, repeticiones: 10, peso: 22 },
          { id: 'set-3', numeroSerie: 3, repeticiones: 8, peso: 20 },
        ],
      },
    ],
  },
]

export function crearId(prefijo) {
  return crearIdLocal(prefijo)
}

function esIdLocalTemporal(valor) {
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

function normalizarPlantillaEjercicioId(plantillaEjercicioId, idEjercicioNormalizado) {
  if (!plantillaEjercicioId) {
    return null
  }

  const idNormalizado = String(plantillaEjercicioId)

  if (idNormalizado === String(idEjercicioNormalizado || '')) {
    return null
  }

  return esIdLocalTemporal(idNormalizado) ? null : idNormalizado
}

function normalizarReferenciaPayload(id) {
  if (!id) {
    return null
  }

  const idNormalizado = String(id)
  return esIdLocalTemporal(idNormalizado) ? null : idNormalizado
}

function normalizarIdLocalPayload(id) {
  if (!id) {
    return null
  }

  return String(id)
}

function esIdNumericoPersistido(valor) {
  return /^\d+$/.test(String(valor || ''))
}

function normalizarIdPersistido(...valores) {
  const candidato = valores.find((valor) => esIdNumericoPersistido(valor))
  return candidato ? String(candidato) : ''
}

function normalizarFechaPayload(valor) {
  return valor ? valor : null
}

function normalizarCatalogoEjercicioIdPayload(valor) {
  const idNormalizado = normalizarReferenciaPayload(valor)

  if (!idNormalizado || !esIdNumericoPersistido(idNormalizado)) {
    return null
  }

  return idNormalizado
}

function esSesionSincronizadaConServidor(sesion) {
  return esIdNumericoPersistido(sesion?.persistedId ?? sesion?.id)
}

function esEjercicioSincronizadoConServidor(ejercicio) {
  return esIdNumericoPersistido(ejercicio?.persistedId ?? ejercicio?.id)
}

export function normalizarSerieRealizada(serie, indice = 0) {
  const idSerie = serie?.id || crearId(`serie-${indice + 1}`)
  const persistedId = normalizarIdPersistido(
    serie?.persistedId,
    serie?.serverId,
    serie?.idPersistido,
    serie?.idServidor,
    serie?.id,
  )

  return {
    id: idSerie,
    persistedId,
    clientId: normalizarIdTexto(serie?.clientId, serie?.localId, idSerie),
    numeroSerie: Number(serie?.numeroSerie ?? serie?.setNumber ?? indice + 1) || indice + 1,
    repeticiones: Number(serie?.repeticiones ?? serie?.reps) || 0,
    peso: Number(serie?.peso ?? serie?.weight) || 0,
    version: normalizarVersion(serie?.version, 1),
  }
}

export function normalizarEjercicio(ejercicio, indice = 0) {
  const seriesRealizadasOrigen = ejercicio?.seriesRealizadas ?? ejercicio?.performedSets
  const catalogoEjercicioId =
    ejercicio?.catalogoEjercicioId ??
    ejercicio?.catalogExerciseId ??
    ejercicio?.exerciseCatalogId ??
    null
  const plantillaEjercicioId =
    ejercicio?.plantillaEjercicioId ??
    ejercicio?.templateExerciseId ??
    ejercicio?.exerciseTemplateId ??
    ejercicio?.idPlantillaEjercicio ??
    null
  const idEjercicioNormalizado =
    normalizarIdTexto(
      ejercicio?.clientId,
      ejercicio?.localId,
      ejercicio?.idEjercicio,
      ejercicio?.exerciseId,
      ejercicio?.id,
    ) || crearId(`ejercicio-${indice + 1}`)
  const persistedId = normalizarIdPersistido(
    ejercicio?.persistedId,
    ejercicio?.serverId,
    ejercicio?.idPersistido,
    ejercicio?.idServidor,
    ejercicio?.id,
  )
  const createdAt = aIsoString(ejercicio?.createdAt, '')
  const updatedAt = aIsoString(ejercicio?.updatedAt, createdAt)

  return {
    id: normalizarIdTexto(ejercicio?.id, ejercicio?.idEjercicio, idEjercicioNormalizado),
    persistedId,
    idEjercicio: idEjercicioNormalizado,
    clientId: normalizarIdTexto(ejercicio?.clientId, ejercicio?.localId, idEjercicioNormalizado),
    plantillaEjercicioId: normalizarPlantillaEjercicioId(
      plantillaEjercicioId,
      idEjercicioNormalizado,
    ),
    catalogoEjercicioId: catalogoEjercicioId ? String(catalogoEjercicioId) : '',
    nombre: ejercicio?.nombre || ejercicio?.name || 'Ejercicio sin nombre',
    descripcion: ejercicio?.descripcion || ejercicio?.description || '',
    observaciones: ejercicio?.observaciones || ejercicio?.notes || '',
    grupoMuscular: ejercicio?.grupoMuscular || ejercicio?.muscleGroup || '',
    patronMovimiento: ejercicio?.patronMovimiento || ejercicio?.movementPattern || '',
    equipamiento: ejercicio?.equipamiento || ejercicio?.equipment || '',
    seriesPlanificadas:
      Number(ejercicio?.seriesPlanificadas ?? ejercicio?.plannedSeries ?? ejercicio?.series) || 0,
    repeticionesPlanificadas:
      Number(
        ejercicio?.repeticionesPlanificadas ??
          ejercicio?.plannedRepetitions ??
          ejercicio?.repetitions,
      ) || 0,
    pesoPlanificado:
      Number(ejercicio?.pesoPlanificado ?? ejercicio?.plannedWeight ?? ejercicio?.weight) || 0,
    alturaBanco:
      ejercicio?.alturaBanco === null || ejercicio?.alturaBanco === undefined
        ? ejercicio?.benchHeight === null || ejercicio?.benchHeight === undefined
          ? ''
          : String(ejercicio.benchHeight)
        : String(ejercicio.alturaBanco),
    agarre: ejercicio?.agarre || ejercicio?.grip || '',
    completado: Boolean(ejercicio?.completado ?? ejercicio?.completed),
    omitido: Boolean(ejercicio?.omitido ?? ejercicio?.skipped),
    seriesRealizadas: Array.isArray(seriesRealizadasOrigen)
      ? seriesRealizadasOrigen.map(normalizarSerieRealizada)
      : [],
    createdAt,
    updatedAt,
    version: normalizarVersion(ejercicio?.version, 1),
    syncStatus: ejercicio?.syncStatus || 'synced',
    syncError: ejercicio?.syncError || '',
    syncFieldErrors: ejercicio?.syncFieldErrors || {},
  }
}

export function normalizarSesion(sesion) {
  const persistedId = normalizarIdPersistido(
    sesion?.persistedId,
    sesion?.serverId,
    sesion?.idPersistido,
    sesion?.idServidor,
    sesion?.idEntrenamiento,
    sesion?.entrenamientoId,
    sesion?.trainingId,
    sesion?.workoutId,
    sesion?.id,
  )
  const idSesion =
    normalizarIdTexto(
      sesion?.idSesion,
      sesion?.sessionId,
      persistedId,
      sesion?.id,
    ) || crearId('sesion')
  const ejerciciosOrigen = sesion?.ejercicios ?? sesion?.exercises
  const createdAt = aIsoString(sesion?.createdAt, '')
  const updatedAt = aIsoString(sesion?.updatedAt, createdAt)

  return {
    id: normalizarIdTexto(sesion?.id, idSesion),
    persistedId,
    clientId: normalizarIdTexto(sesion?.clientId, sesion?.localId, idSesion),
    idSesion,
    nombreSesion: sesion?.nombreSesion || sesion?.sessionName || sesion?.name || 'Sesion sin nombre',
    observaciones: sesion?.observaciones || sesion?.notes || '',
    fechaInicio: aIsoString(sesion?.fechaInicio || sesion?.startedAt, ''),
    fechaFin: aIsoString(sesion?.fechaFin || sesion?.completedAt, ''),
    ejercicios: Array.isArray(ejerciciosOrigen) ? ejerciciosOrigen.map(normalizarEjercicio) : [],
    createdAt,
    updatedAt,
    version: normalizarVersion(sesion?.version, 1),
    syncStatus: sesion?.syncStatus || 'synced',
    syncError: sesion?.syncError || '',
    syncFieldErrors: sesion?.syncFieldErrors || {},
    lastSyncAttemptAt: aIsoString(sesion?.lastSyncAttemptAt, ''),
    pendingAction: sesion?.pendingAction === 'delete' ? 'delete' : 'upsert',
    deletedAt: aIsoString(sesion?.deletedAt, ''),
  }
}

export function normalizarListaSesiones(lista, valorPorDefecto) {
  if (!Array.isArray(lista)) {
    return valorPorDefecto
  }

  return lista.map(normalizarSesion)
}

function obtenerMarcaTiempoSesion(sesion) {
  return (
    new Date(
      sesion?.fechaFin || sesion?.updatedAt || sesion?.fechaInicio || sesion?.createdAt || 0,
    ).getTime() || 0
  )
}

function obtenerClavesSesion(sesion) {
  return [sesion?.clientId, sesion?.id, sesion?.idSesion].filter(Boolean).map(String)
}

function obtenerClavesEntrenamiento(entrenamiento) {
  return [entrenamiento?.persistedId, entrenamiento?.clientId, entrenamiento?.id]
    .filter(Boolean)
    .map(String)
}

function buscarClaveExistente(mapa, sesion, obtenerClaves) {
  return obtenerClaves(sesion).find((clave) => mapa.has(clave)) || null
}

function seleccionarSesionMasReciente(existente, candidata) {
  if (!existente) {
    return candidata
  }

  if (candidata.syncStatus === 'pending' && existente.syncStatus !== 'pending') {
    return candidata
  }

  if (candidata.version > existente.version) {
    return candidata
  }

  if (
    candidata.version === existente.version &&
    obtenerMarcaTiempoSesion(candidata) > obtenerMarcaTiempoSesion(existente)
  ) {
    return candidata
  }

  return existente
}

function registrarSesionEnMapa(mapa, sesion, obtenerClaves = obtenerClavesSesion) {
  const claveExistente = buscarClaveExistente(mapa, sesion, obtenerClaves)
  const existente = claveExistente ? mapa.get(claveExistente) : null
  const seleccionada = seleccionarSesionMasReciente(existente, sesion)

  obtenerClaves(existente).forEach((clave) => mapa.delete(clave))
  obtenerClaves(seleccionada).forEach((clave) => mapa.set(clave, seleccionada))
}

export function combinarHistorialEntrenamientos(locales, remotos) {
  const mapa = new Map()

  ;[...normalizarListaSesiones(locales, []), ...normalizarListaSesiones(remotos, [])].forEach(
    (sesion) => {
      registrarSesionEnMapa(mapa, sesion, obtenerClavesEntrenamiento)
    },
  )

  return Array.from(new Set(mapa.values())).sort(
    (primero, segundo) => obtenerMarcaTiempoSesion(segundo) - obtenerMarcaTiempoSesion(primero),
  )
}

export function combinarSesionesGuardadas(locales, remotos) {
  const mapa = new Map()

  ;[...normalizarListaSesiones(locales, []), ...normalizarListaSesiones(remotos, [])].forEach(
    (sesion) => {
      registrarSesionEnMapa(mapa, sesion)
    },
  )

  return Array.from(new Set(mapa.values())).sort(
    (primero, segundo) => obtenerMarcaTiempoSesion(segundo) - obtenerMarcaTiempoSesion(primero),
  )
}

export function crearSesionVacia() {
  const idSesion = crearId('sesion')

  return {
    id: idSesion,
    clientId: idSesion,
    idSesion,
    nombreSesion: 'Nueva sesion',
    observaciones: '',
    fechaInicio: '',
    fechaFin: '',
    ejercicios: [],
    version: 1,
    syncStatus: 'pending',
  }
}

export function crearEjercicioVacio() {
  const idEjercicio = crearId('ejercicio')

  return {
    id: idEjercicio,
    idEjercicio,
    clientId: idEjercicio,
    plantillaEjercicioId: null,
    catalogoEjercicioId: '',
    nombre: 'Nuevo ejercicio',
    descripcion: '',
    observaciones: '',
    grupoMuscular: '',
    patronMovimiento: '',
    equipamiento: '',
    seriesPlanificadas: 4,
    repeticionesPlanificadas: 10,
    pesoPlanificado: 0,
    alturaBanco: '',
    agarre: '',
    completado: false,
    omitido: false,
    seriesRealizadas: [],
    version: 1,
    syncStatus: 'pending',
  }
}

export function crearEjercicioDesdeCatalogo(plantilla) {
  const idEjercicio = crearId('ejercicio')

  return {
    id: idEjercicio,
    idEjercicio,
    clientId: idEjercicio,
    plantillaEjercicioId: normalizarPlantillaEjercicioId(plantilla.plantillaEjercicioId, null),
    catalogoEjercicioId: String(
      plantilla.catalogoEjercicioId || plantilla.idEjercicio || plantilla.id || '',
    ),
    nombre: plantilla.nombre,
    descripcion: plantilla.descripcion || '',
    observaciones: plantilla.observaciones || '',
    grupoMuscular: plantilla.grupoMuscular || '',
    patronMovimiento: plantilla.patronMovimiento || '',
    equipamiento: plantilla.equipamiento || '',
    seriesPlanificadas: Number(plantilla.seriesPlanificadas) || 0,
    repeticionesPlanificadas: Number(plantilla.repeticionesPlanificadas) || 0,
    pesoPlanificado: Number(plantilla.pesoPlanificado) || 0,
    alturaBanco: plantilla.alturaBanco ?? '',
    agarre: plantilla.agarre || '',
    completado: false,
    omitido: false,
    seriesRealizadas: [],
    version: 1,
    syncStatus: 'pending',
  }
}

export function crearEntrenamientoDesdeSesion(sesion) {
  const sesionNormalizada = normalizarSesion(sesion)

  return {
    id: crearId('entrenamiento'),
    clientId: crearId('entrenamiento-cliente'),
    idSesion: sesionNormalizada.idSesion,
    nombreSesion: sesionNormalizada.nombreSesion,
    observaciones: sesionNormalizada.observaciones || '',
    fechaInicio: new Date().toISOString(),
    fechaFin: '',
    ejercicios: sesionNormalizada.ejercicios.map((ejercicio) => ({
      ...ejercicio,
      plantillaEjercicioId: normalizarPlantillaEjercicioId(
        ejercicio.plantillaEjercicioId,
        ejercicio.idEjercicio,
      ),
      id: crearId('ejercicio'),
      idEjercicio: crearId('ejercicio'),
      clientId: crearId('ejercicio'),
      completado: false,
      omitido: false,
      seriesRealizadas: Array.from(
        { length: Number(ejercicio.seriesPlanificadas) || 0 },
        (_, indice) => ({
          id: crearId(`serie-${indice + 1}`),
          numeroSerie: indice + 1,
          repeticiones: Number(ejercicio.repeticionesPlanificadas) || 0,
          peso: Number(ejercicio.pesoPlanificado) || 0,
        }),
      ),
      version: 1,
      syncStatus: 'pending',
        })),
      version: 1,
      syncStatus: 'pending',
    pendingAction: 'upsert',
    deletedAt: '',
  }
}

export function obtenerErrorValidacionSesion(sesion) {
  if (!Array.isArray(sesion?.ejercicios) || sesion.ejercicios.length === 0) {
    return 'La sesion debe tener al menos un ejercicio.'
  }

  return ''
}

export function esEntrenamientoEliminado(entrenamiento) {
  return Boolean(normalizarSesion(entrenamiento).deletedAt)
}

export function filtrarHistorialVisible(historial) {
  return normalizarListaSesiones(historial, []).filter(
    (entrenamiento) => !esEntrenamientoEliminado(entrenamiento),
  )
}

export function obtenerUltimoRegistroEjercicio(idEjercicio, historial) {
  const historialOrdenado = [...filtrarHistorialVisible(historial)].sort(
    (primero, segundo) => new Date(segundo.fechaFin || 0) - new Date(primero.fechaFin || 0),
  )

  for (const sesion of historialOrdenado) {
    const ejercicio = sesion.ejercicios.find(
      (item) =>
        item.idEjercicio === idEjercicio ||
        item.catalogoEjercicioId === idEjercicio ||
        item.catalogoEjercicioId === String(idEjercicio),
    )

    if (ejercicio) {
      return {
        ...ejercicio,
        fechaFin: sesion.fechaFin,
        fechaInicio: sesion.fechaInicio,
        nombreSesion: sesion.nombreSesion,
      }
    }
  }

  return null
}

export function crearPayloadSesion(sesion) {
  const sesionNormalizada = normalizarSesion(sesion)
  const idSesion = normalizarReferenciaPayload(sesionNormalizada.idSesion)
  const incluirVersionSesion = esSesionSincronizadaConServidor(sesionNormalizada)
  const idPersistidoSesion = normalizarReferenciaPayload(
    sesionNormalizada.persistedId || sesionNormalizada.id,
  )

  return {
    id: idPersistidoSesion || normalizarIdLocalPayload(sesionNormalizada.id),
    clientId: sesionNormalizada.clientId,
    ...(idSesion ? { idSesion } : {}),
    nombreSesion: sesionNormalizada.nombreSesion,
    observaciones: sesionNormalizada.observaciones,
    fechaInicio: normalizarFechaPayload(sesionNormalizada.fechaInicio),
    fechaFin: normalizarFechaPayload(sesionNormalizada.fechaFin),
    ...(incluirVersionSesion ? { version: sesionNormalizada.version } : {}),
    ejercicios: sesionNormalizada.ejercicios.map((ejercicio) => {
      const plantillaEjercicioId = normalizarPlantillaEjercicioId(
        ejercicio.plantillaEjercicioId,
        ejercicio.idEjercicio,
      )
      const catalogoEjercicioId = normalizarCatalogoEjercicioIdPayload(
        ejercicio.catalogoEjercicioId,
      )
      const incluirVersionEjercicio = esEjercicioSincronizadoConServidor(ejercicio)
      const idEjercicioPersistido = normalizarReferenciaPayload(
        ejercicio.persistedId || ejercicio.id,
      )

      return {
        ...(idEjercicioPersistido ? { id: idEjercicioPersistido } : {}),
        idEjercicio: normalizarIdLocalPayload(ejercicio.idEjercicio),
        clientId: ejercicio.clientId,
        ...(plantillaEjercicioId ? { plantillaEjercicioId } : {}),
        ...(catalogoEjercicioId ? { catalogoEjercicioId } : {}),
        nombre: ejercicio.nombre,
        descripcion: ejercicio.descripcion,
        observaciones: ejercicio.observaciones,
        grupoMuscular: ejercicio.grupoMuscular,
        patronMovimiento: ejercicio.patronMovimiento,
        equipamiento: ejercicio.equipamiento,
        seriesPlanificadas: Number(ejercicio.seriesPlanificadas) || 0,
        repeticionesPlanificadas: Number(ejercicio.repeticionesPlanificadas) || 0,
        pesoPlanificado: Number(ejercicio.pesoPlanificado) || 0,
        alturaBanco: ejercicio.alturaBanco === '' ? null : String(ejercicio.alturaBanco),
        agarre: ejercicio.agarre || '',
        ...(incluirVersionEjercicio ? { version: ejercicio.version } : {}),
      }
    }),
  }
}

export function crearPayloadEntrenamiento(entrenamiento) {
  const entrenamientoNormalizado = normalizarSesion(entrenamiento)
  const idSesion = normalizarReferenciaPayload(entrenamientoNormalizado.idSesion)
  const idPersistidoEntrenamiento = normalizarReferenciaPayload(
    entrenamientoNormalizado.persistedId || entrenamientoNormalizado.id,
  )
  const incluirVersionEntrenamiento = esSesionSincronizadaConServidor(entrenamientoNormalizado)

  return {
    id: idPersistidoEntrenamiento || normalizarIdLocalPayload(entrenamientoNormalizado.id),
    clientId: entrenamientoNormalizado.clientId,
    ...(idSesion ? { idSesion } : {}),
    nombreSesion: entrenamientoNormalizado.nombreSesion,
    observaciones: entrenamientoNormalizado.observaciones,
    fechaInicio: entrenamientoNormalizado.fechaInicio,
    fechaFin: entrenamientoNormalizado.fechaFin,
    ...(incluirVersionEntrenamiento ? { version: entrenamientoNormalizado.version } : {}),
    ejercicios: entrenamientoNormalizado.ejercicios.map((ejercicio) => {
      const catalogoEjercicioId = normalizarReferenciaPayload(ejercicio.catalogoEjercicioId)
      const plantillaEjercicioId = normalizarPlantillaEjercicioId(
        ejercicio.plantillaEjercicioId,
        ejercicio.idEjercicio,
      )
      const incluirVersionEjercicio =
        incluirVersionEntrenamiento && esEjercicioSincronizadoConServidor(ejercicio)

      return {
        id:
          normalizarReferenciaPayload(ejercicio.persistedId || ejercicio.id) ||
          normalizarIdLocalPayload(ejercicio.id),
        idEjercicio: normalizarIdLocalPayload(ejercicio.idEjercicio),
        clientId: ejercicio.clientId,
        ...(catalogoEjercicioId ? { catalogoEjercicioId } : {}),
        ...(plantillaEjercicioId ? { plantillaEjercicioId } : {}),
        nombre: ejercicio.nombre,
        descripcion: ejercicio.descripcion,
        observaciones: ejercicio.observaciones,
        grupoMuscular: ejercicio.grupoMuscular,
        patronMovimiento: ejercicio.patronMovimiento,
        equipamiento: ejercicio.equipamiento,
        seriesPlanificadas: Number(ejercicio.seriesPlanificadas) || 0,
        repeticionesPlanificadas: Number(ejercicio.repeticionesPlanificadas) || 0,
        pesoPlanificado: Number(ejercicio.pesoPlanificado) || 0,
        alturaBanco: ejercicio.alturaBanco === '' ? null : String(ejercicio.alturaBanco),
        agarre: ejercicio.agarre || '',
        completado: Boolean(ejercicio.completado),
        omitido: Boolean(ejercicio.omitido),
        ...(incluirVersionEjercicio ? { version: ejercicio.version } : {}),
        seriesRealizadas: ejercicio.seriesRealizadas.map((serie) => ({
          id:
            normalizarReferenciaPayload(serie.persistedId || serie.id) ||
            normalizarIdLocalPayload(serie.id),
          clientId: normalizarIdLocalPayload(serie.clientId || serie.id),
          numeroSerie: Number(serie.numeroSerie) || 0,
          repeticiones: Number(serie.repeticiones) || 0,
          peso: Number(serie.peso) || 0,
          ...(incluirVersionEjercicio ? { version: serie.version } : {}),
        })),
      }
    }),
  }
}

export function normalizarUltimoRegistroEjercicioApi(payload) {
  if (!payload) {
    return null
  }

  const ejercicioOrigen =
    payload?.ejercicio ??
    payload?.exercise ??
    payload?.ultimoRegistro ??
    payload?.lastRecord ??
    payload

  if (!ejercicioOrigen) {
    return null
  }

  const ejercicioNormalizado = normalizarEjercicio(ejercicioOrigen)

  return {
    ...ejercicioNormalizado,
    fechaFin: aIsoString(
      payload?.fechaFin ||
        payload?.completedAt ||
        payload?.fecha ||
        ejercicioOrigen?.fechaFin ||
        ejercicioOrigen?.completedAt,
      '',
    ),
    nombreSesion:
      payload?.nombreSesion ||
      payload?.sessionName ||
      payload?.sesion?.nombreSesion ||
      payload?.session?.nombreSesion ||
      '',
  }
}
