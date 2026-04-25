import { aIsoString } from '../data/dateUtils'
import { crearIdLocal, normalizarIdTexto, normalizarVersion } from '../data/syncModel'

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

function normalizarTextoPayload(valor) {
  const texto = String(valor || '').trim()
  return texto || null
}

function normalizarAlturaBanco(valor) {
  return valor === null || valor === undefined ? '' : String(valor)
}

function obtenerIdCatalogo(ejercicio, indice = 0) {
  const idCatalogo =
    ejercicio?.catalogoEjercicioId ??
    ejercicio?.catalogExerciseId ??
    ejercicio?.id ??
    ejercicio?.idEjercicio ??
    ejercicio?.exerciseId

  return idCatalogo ? String(idCatalogo) : crearIdLocal(`catalogo-${indice + 1}`)
}

export function normalizarPlantillaEjercicio(ejercicio, indice = 0) {
  const idCatalogo = obtenerIdCatalogo(ejercicio, indice)
  const clientId = normalizarIdTexto(
    ejercicio?.clientId,
    ejercicio?.idEjercicio,
    ejercicio?.localId,
    idCatalogo,
  )
  const idEjercicio = clientId || idCatalogo
  const createdAt = aIsoString(ejercicio?.createdAt, '')
  const updatedAt = aIsoString(ejercicio?.updatedAt, createdAt)

  return {
    id: normalizarIdTexto(ejercicio?.id, idCatalogo) || idCatalogo,
    idEjercicio,
    clientId,
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
    createdAt,
    updatedAt,
    version: normalizarVersion(ejercicio?.version, 1),
    syncStatus: ejercicio?.syncStatus || (ejercicio?.esBorrador ? 'pending' : 'synced'),
  }
}

export function normalizarListaEjercicios(lista) {
  if (!Array.isArray(lista)) {
    return ejerciciosPredeterminados.map(normalizarPlantillaEjercicio)
  }

  return lista.map(normalizarPlantillaEjercicio)
}

export function crearPayloadEjercicioCatalogo(ejercicio) {
  const ejercicioNormalizado = normalizarPlantillaEjercicio(ejercicio)

  return {
    clientId: ejercicioNormalizado.clientId,
    version: ejercicioNormalizado.version,
    nombre: String(ejercicioNormalizado?.nombre || '').trim(),
    descripcion: normalizarTextoPayload(ejercicioNormalizado?.descripcion),
    grupoMuscular: normalizarTextoPayload(ejercicioNormalizado?.grupoMuscular),
    patronMovimiento: normalizarTextoPayload(ejercicioNormalizado?.patronMovimiento),
    equipamiento: normalizarTextoPayload(ejercicioNormalizado?.equipamiento),
    seriesPlanificadas: normalizarNumero(ejercicioNormalizado?.seriesPlanificadas),
    repeticionesPlanificadas: normalizarNumero(ejercicioNormalizado?.repeticionesPlanificadas),
    pesoPlanificado: normalizarNumero(ejercicioNormalizado?.pesoPlanificado),
    alturaBanco: normalizarTextoPayload(ejercicioNormalizado?.alturaBanco),
    agarre: normalizarTextoPayload(ejercicioNormalizado?.agarre),
  }
}

export function crearPlantillaEjercicioVacia() {
  const idTemporal = crearIdLocal('catalogo')

  return {
    id: idTemporal,
    idEjercicio: idTemporal,
    clientId: idTemporal,
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
    version: 1,
    esBorrador: true,
    syncStatus: 'pending',
  }
}
