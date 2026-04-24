export const sesionesPredeterminadas = [
  {
    id: 'push-session',
    idSesion: 'push-session',
    nombreSesion: 'Empuje',
    fechaInicio: '',
    fechaFin: '',
    ejercicios: [
      {
        idEjercicio: 'bench-press',
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
    idSesion: 'pull-session',
    nombreSesion: 'Tiron',
    fechaInicio: '',
    fechaFin: '',
    ejercicios: [
      {
        idEjercicio: 'lat-pulldown',
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
    idSesion: 'push-session',
    nombreSesion: 'Empuje',
    fechaInicio: '2026-04-20T17:30:00.000Z',
    fechaFin: '2026-04-20T18:30:00.000Z',
    ejercicios: [
      {
        idEjercicio: 'bench-press',
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
  return `${prefijo}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function normalizarSerieRealizada(serie, indice = 0) {
  return {
    id: serie?.id || crearId(`serie-${indice + 1}`),
    numeroSerie: Number(serie?.numeroSerie ?? serie?.setNumber ?? indice + 1) || indice + 1,
    repeticiones: Number(serie?.repeticiones ?? serie?.reps) || 0,
    peso: Number(serie?.peso ?? serie?.weight) || 0,
  }
}

export function normalizarEjercicio(ejercicio, indice = 0) {
  const seriesRealizadasOrigen = ejercicio?.seriesRealizadas ?? ejercicio?.performedSets
  const catalogoEjercicioId =
    ejercicio?.catalogoEjercicioId ??
    ejercicio?.catalogExerciseId ??
    ejercicio?.exerciseCatalogId ??
    null

  return {
    idEjercicio:
      ejercicio?.idEjercicio ||
      ejercicio?.exerciseId ||
      ejercicio?.id ||
      crearId(`ejercicio-${indice + 1}`),
    catalogoEjercicioId: catalogoEjercicioId ? String(catalogoEjercicioId) : '',
    nombre: ejercicio?.nombre || ejercicio?.name || 'Ejercicio sin nombre',
    descripcion: ejercicio?.descripcion || ejercicio?.description || '',
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
    alturaBanco: ejercicio?.alturaBanco ?? ejercicio?.benchHeight ?? '',
    agarre: ejercicio?.agarre || ejercicio?.grip || '',
    completado: Boolean(ejercicio?.completado ?? ejercicio?.completed),
    omitido: Boolean(ejercicio?.omitido ?? ejercicio?.skipped),
    seriesRealizadas: Array.isArray(seriesRealizadasOrigen)
      ? seriesRealizadasOrigen.map(normalizarSerieRealizada)
      : [],
  }
}

export function normalizarSesion(sesion) {
  const idSesion = sesion?.idSesion || sesion?.sessionId || sesion?.id || crearId('sesion')
  const ejerciciosOrigen = sesion?.ejercicios ?? sesion?.exercises

  return {
    id: sesion?.id || idSesion,
    idSesion,
    nombreSesion: sesion?.nombreSesion || sesion?.sessionName || sesion?.name || 'Sesion sin nombre',
    fechaInicio: sesion?.fechaInicio || sesion?.startedAt || '',
    fechaFin: sesion?.fechaFin || sesion?.completedAt || '',
    ejercicios: Array.isArray(ejerciciosOrigen) ? ejerciciosOrigen.map(normalizarEjercicio) : [],
  }
}

export function normalizarListaSesiones(lista, valorPorDefecto) {
  if (!Array.isArray(lista) || lista.length === 0) {
    return valorPorDefecto
  }

  return lista.map(normalizarSesion)
}

export function crearSesionVacia() {
  const idSesion = crearId('sesion')

  return {
    id: idSesion,
    idSesion,
    nombreSesion: 'Nueva sesion',
    fechaInicio: '',
    fechaFin: '',
    ejercicios: [],
  }
}

export function crearEjercicioVacio() {
  return {
    idEjercicio: crearId('ejercicio'),
    catalogoEjercicioId: '',
    nombre: 'Nuevo ejercicio',
    descripcion: '',
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
  }
}

export function crearEjercicioDesdeCatalogo(plantilla) {
  return {
    idEjercicio: crearId('ejercicio'),
    catalogoEjercicioId: String(
      plantilla.catalogoEjercicioId || plantilla.idEjercicio || plantilla.id || '',
    ),
    nombre: plantilla.nombre,
    descripcion: plantilla.descripcion || '',
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
  }
}

export function crearEntrenamientoDesdeSesion(sesion) {
  const sesionNormalizada = normalizarSesion(sesion)

  return {
    id: crearId('entrenamiento'),
    idSesion: sesionNormalizada.idSesion,
    nombreSesion: sesionNormalizada.nombreSesion,
    fechaInicio: new Date().toISOString(),
    fechaFin: '',
    ejercicios: sesionNormalizada.ejercicios.map((ejercicio) => ({
      ...ejercicio,
      idEjercicio: crearId('ejercicio'),
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
    })),
  }
}

export function obtenerUltimoRegistroEjercicio(idEjercicio, historial) {
  const historialOrdenado = [...historial].sort(
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
        nombreSesion: sesion.nombreSesion,
      }
    }
  }

  return null
}

export function crearPayloadSesion(sesion) {
  const sesionNormalizada = normalizarSesion(sesion)

  return {
    id: sesionNormalizada.id,
    idSesion: sesionNormalizada.idSesion,
    nombreSesion: sesionNormalizada.nombreSesion,
    fechaInicio: sesionNormalizada.fechaInicio,
    fechaFin: sesionNormalizada.fechaFin,
    ejercicios: sesionNormalizada.ejercicios.map((ejercicio) => ({
      idEjercicio: ejercicio.idEjercicio,
      catalogoEjercicioId: ejercicio.catalogoEjercicioId || null,
      nombre: ejercicio.nombre,
      descripcion: ejercicio.descripcion,
      grupoMuscular: ejercicio.grupoMuscular,
      patronMovimiento: ejercicio.patronMovimiento,
      equipamiento: ejercicio.equipamiento,
      seriesPlanificadas: Number(ejercicio.seriesPlanificadas) || 0,
      repeticionesPlanificadas: Number(ejercicio.repeticionesPlanificadas) || 0,
      pesoPlanificado: Number(ejercicio.pesoPlanificado) || 0,
      alturaBanco: ejercicio.alturaBanco === '' ? null : Number(ejercicio.alturaBanco) || 0,
      agarre: ejercicio.agarre || '',
    })),
  }
}

export function crearPayloadEntrenamiento(entrenamiento) {
  const entrenamientoNormalizado = normalizarSesion(entrenamiento)

  return {
    id: entrenamientoNormalizado.id,
    idSesion: entrenamientoNormalizado.idSesion,
    nombreSesion: entrenamientoNormalizado.nombreSesion,
    fechaInicio: entrenamientoNormalizado.fechaInicio,
    fechaFin: entrenamientoNormalizado.fechaFin,
    ejercicios: entrenamientoNormalizado.ejercicios.map((ejercicio) => ({
      idEjercicio: ejercicio.idEjercicio,
      catalogoEjercicioId: ejercicio.catalogoEjercicioId || null,
      nombre: ejercicio.nombre,
      descripcion: ejercicio.descripcion,
      grupoMuscular: ejercicio.grupoMuscular,
      patronMovimiento: ejercicio.patronMovimiento,
      equipamiento: ejercicio.equipamiento,
      seriesPlanificadas: Number(ejercicio.seriesPlanificadas) || 0,
      repeticionesPlanificadas: Number(ejercicio.repeticionesPlanificadas) || 0,
      pesoPlanificado: Number(ejercicio.pesoPlanificado) || 0,
      alturaBanco: ejercicio.alturaBanco === '' ? null : Number(ejercicio.alturaBanco) || 0,
      agarre: ejercicio.agarre || '',
      completado: Boolean(ejercicio.completado),
      omitido: Boolean(ejercicio.omitido),
      seriesRealizadas: ejercicio.seriesRealizadas.map((serie) => ({
        id: serie.id,
        numeroSerie: Number(serie.numeroSerie) || 0,
        repeticiones: Number(serie.repeticiones) || 0,
        peso: Number(serie.peso) || 0,
      })),
    })),
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
    fechaFin:
      payload?.fechaFin ||
      payload?.completedAt ||
      payload?.fecha ||
      ejercicioOrigen?.fechaFin ||
      ejercicioOrigen?.completedAt ||
      '',
    nombreSesion:
      payload?.nombreSesion ||
      payload?.sessionName ||
      payload?.sesion?.nombreSesion ||
      payload?.session?.nombreSesion ||
      '',
  }
}
