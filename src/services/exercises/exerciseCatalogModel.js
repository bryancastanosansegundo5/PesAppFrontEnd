import { crearId } from '../training/trainingModel'

export const ejerciciosPredeterminados = [
  {
    idEjercicio: 'bench-press',
    catalogoEjercicioId: 'bench-press',
    nombre: 'Press banca',
    descripcion: 'Press horizontal con control en la bajada y bloqueo estable.',
    grupoMuscular: 'Pecho',
    patronMovimiento: 'Empuje horizontal',
    equipamiento: 'Barra y banco',
    seriesPlanificadas: 4,
    repeticionesPlanificadas: 10,
    pesoPlanificado: 60,
    alturaBanco: 30,
    agarre: 'Medio',
  },
  {
    idEjercicio: 'incline-dumbbell-press',
    catalogoEjercicioId: 'incline-dumbbell-press',
    nombre: 'Press inclinado mancuernas',
    descripcion: 'Empuje en banco inclinado manteniendo escapulas fijadas.',
    grupoMuscular: 'Pecho superior',
    patronMovimiento: 'Empuje inclinado',
    equipamiento: 'Mancuernas y banco',
    seriesPlanificadas: 4,
    repeticionesPlanificadas: 10,
    pesoPlanificado: 24,
    alturaBanco: 45,
    agarre: 'Neutro',
  },
  {
    idEjercicio: 'shoulder-press',
    catalogoEjercicioId: 'shoulder-press',
    nombre: 'Press hombro',
    descripcion: 'Empuje vertical sin arquear la espalda.',
    grupoMuscular: 'Hombro',
    patronMovimiento: 'Empuje vertical',
    equipamiento: 'Mancuernas',
    seriesPlanificadas: 3,
    repeticionesPlanificadas: 10,
    pesoPlanificado: 22,
    alturaBanco: 80,
    agarre: 'Neutro',
  },
  {
    idEjercicio: 'lat-pulldown',
    catalogoEjercicioId: 'lat-pulldown',
    nombre: 'Jalon al pecho',
    descripcion: 'Tirar hacia clavicula manteniendo pecho alto.',
    grupoMuscular: 'Espalda',
    patronMovimiento: 'Tiron vertical',
    equipamiento: 'Polea',
    seriesPlanificadas: 4,
    repeticionesPlanificadas: 10,
    pesoPlanificado: 55,
    alturaBanco: 20,
    agarre: 'Prono',
  },
  {
    idEjercicio: 'seated-row',
    catalogoEjercicioId: 'seated-row',
    nombre: 'Remo sentado',
    descripcion: 'Remo con pausa corta al final del recorrido.',
    grupoMuscular: 'Espalda',
    patronMovimiento: 'Tiron horizontal',
    equipamiento: 'Polea',
    seriesPlanificadas: 4,
    repeticionesPlanificadas: 12,
    pesoPlanificado: 48,
    alturaBanco: 25,
    agarre: 'Cerrado',
  },
  {
    idEjercicio: 'leg-press',
    catalogoEjercicioId: 'leg-press',
    nombre: 'Prensa',
    descripcion: 'Empuje de piernas controlando profundidad y alineacion.',
    grupoMuscular: 'Pierna',
    patronMovimiento: 'Empuje de rodilla',
    equipamiento: 'Maquina',
    seriesPlanificadas: 4,
    repeticionesPlanificadas: 12,
    pesoPlanificado: 140,
    alturaBanco: 0,
    agarre: '',
  },
  {
    idEjercicio: 'romanian-deadlift',
    catalogoEjercicioId: 'romanian-deadlift',
    nombre: 'Peso muerto rumano',
    descripcion: 'Bisagra de cadera con tibia estable y espalda neutra.',
    grupoMuscular: 'Femoral y gluteo',
    patronMovimiento: 'Bisagra',
    equipamiento: 'Barra',
    seriesPlanificadas: 4,
    repeticionesPlanificadas: 8,
    pesoPlanificado: 80,
    alturaBanco: 0,
    agarre: 'Mixto',
  },
  {
    idEjercicio: 'cable-curl',
    catalogoEjercicioId: 'cable-curl',
    nombre: 'Curl polea',
    descripcion: 'Flexion de codo manteniendo hombro estable.',
    grupoMuscular: 'Biceps',
    patronMovimiento: 'Aislamiento',
    equipamiento: 'Polea',
    seriesPlanificadas: 3,
    repeticionesPlanificadas: 12,
    pesoPlanificado: 20,
    alturaBanco: 0,
    agarre: 'Supino',
  },
]

function normalizarNumero(valor, valorPorDefecto = 0) {
  if (valor === '' || valor === null || valor === undefined) {
    return valorPorDefecto
  }

  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : valorPorDefecto
}

function normalizarAlturaBanco(valor) {
  if (valor === '' || valor === null || valor === undefined) {
    return ''
  }

  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : ''
}

function obtenerIdCatalogo(ejercicio, indice = 0) {
  const idCatalogo =
    ejercicio?.catalogoEjercicioId ??
    ejercicio?.catalogExerciseId ??
    ejercicio?.id ??
    ejercicio?.idEjercicio ??
    ejercicio?.exerciseId

  return idCatalogo ? String(idCatalogo) : crearId(`catalogo-${indice + 1}`)
}

export function normalizarPlantillaEjercicio(ejercicio, indice = 0) {
  const idCatalogo = obtenerIdCatalogo(ejercicio, indice)
  const idEjercicio = ejercicio?.idEjercicio ? String(ejercicio.idEjercicio) : idCatalogo

  return {
    idEjercicio,
    catalogoEjercicioId: idCatalogo,
    nombre: ejercicio?.nombre || ejercicio?.name || 'Ejercicio sin nombre',
    descripcion: ejercicio?.descripcion || ejercicio?.description || '',
    grupoMuscular: ejercicio?.grupoMuscular || ejercicio?.muscleGroup || '',
    patronMovimiento: ejercicio?.patronMovimiento || ejercicio?.movementPattern || '',
    equipamiento: ejercicio?.equipamiento || ejercicio?.equipment || '',
    seriesPlanificadas: normalizarNumero(
      ejercicio?.seriesPlanificadas ?? ejercicio?.plannedSeries ?? ejercicio?.series,
    ),
    repeticionesPlanificadas: normalizarNumero(
      ejercicio?.repeticionesPlanificadas ??
        ejercicio?.plannedRepetitions ??
        ejercicio?.repetitions,
    ),
    pesoPlanificado: normalizarNumero(
      ejercicio?.pesoPlanificado ?? ejercicio?.plannedWeight ?? ejercicio?.weight,
    ),
    alturaBanco: normalizarAlturaBanco(ejercicio?.alturaBanco ?? ejercicio?.benchHeight),
    agarre: ejercicio?.agarre || ejercicio?.grip || '',
  }
}

export function normalizarListaEjercicios(lista) {
  if (!Array.isArray(lista) || lista.length === 0) {
    return ejerciciosPredeterminados.map(normalizarPlantillaEjercicio)
  }

  return lista.map(normalizarPlantillaEjercicio)
}

export function crearPayloadEjercicioCatalogo(ejercicio) {
  return {
    nombre: ejercicio?.nombre?.trim() || '',
    descripcion: ejercicio?.descripcion?.trim() || '',
    grupoMuscular: ejercicio?.grupoMuscular?.trim() || '',
    patronMovimiento: ejercicio?.patronMovimiento?.trim() || '',
    equipamiento: ejercicio?.equipamiento?.trim() || '',
    seriesPlanificadas: normalizarNumero(ejercicio?.seriesPlanificadas),
    repeticionesPlanificadas: normalizarNumero(ejercicio?.repeticionesPlanificadas),
    pesoPlanificado: normalizarNumero(ejercicio?.pesoPlanificado),
    alturaBanco: ejercicio?.alturaBanco === '' ? null : normalizarNumero(ejercicio?.alturaBanco),
    agarre: ejercicio?.agarre?.trim() || '',
  }
}

export function crearPlantillaEjercicioVacia() {
  const idTemporal = crearId('catalogo')

  return {
    idEjercicio: idTemporal,
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
    esBorrador: true,
  }
}
