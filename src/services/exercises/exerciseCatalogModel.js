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

function esIdCatalogoTemporal(valor) {
  const id = String(valor || '')

  return (
    !id ||
    id.startsWith('catalogo-') ||
    id.startsWith('exercise-') ||
    id.startsWith('ejercicio-') ||
    id.startsWith('manual-')
  )
}

function obtenerIdCatalogoPersistido(ejercicio) {
  const idCatalogo =
    ejercicio?.catalogoEjercicioId ??
    ejercicio?.catalogExerciseId ??
    ejercicio?.exerciseCatalogId ??
    ejercicio?.id ??
    ejercicio?.exerciseId

  if (!idCatalogo) {
    return ''
  }

  const idNormalizado = String(idCatalogo)
  return esIdCatalogoTemporal(idNormalizado) ? '' : idNormalizado
}

export function normalizarPlantillaEjercicio(ejercicio, indice = 0) {
  const idCatalogoPersistido = obtenerIdCatalogoPersistido(ejercicio)
  const idLocal =
    normalizarIdTexto(
      ejercicio?.clientId,
      ejercicio?.idEjercicio,
      ejercicio?.localId,
      idCatalogoPersistido,
    ) || crearIdLocal(`catalogo-${indice + 1}`)
  const clientId = normalizarIdTexto(ejercicio?.clientId, idLocal)
  const esBorrador = Boolean(ejercicio?.esBorrador ?? !idCatalogoPersistido)
  const createdAt = aIsoString(ejercicio?.createdAt, '')
  const updatedAt = aIsoString(ejercicio?.updatedAt, createdAt)

  return {
    id: normalizarIdTexto(ejercicio?.id, idCatalogoPersistido, idLocal) || idLocal,
    idEjercicio: idLocal,
    clientId,
    catalogoEjercicioId: idCatalogoPersistido,
    nombre: ejercicio?.nombre || ejercicio?.name || 'Ejercicio sin nombre',
    descripcion: ejercicio?.descripcion || ejercicio?.description || '',
    observaciones: ejercicio?.observaciones || ejercicio?.notes || '',
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
    esBorrador,
    syncStatus: ejercicio?.syncStatus || (esBorrador ? 'pending' : 'synced'),
  }
}

export function normalizarListaEjercicios(lista) {
  if (!Array.isArray(lista)) {
    return ejerciciosPredeterminados.map(normalizarPlantillaEjercicio)
  }

  return lista.map(normalizarPlantillaEjercicio)
}

function obtenerClavesEjercicioCatalogo(ejercicio) {
  return [ejercicio?.clientId, ejercicio?.idEjercicio, ejercicio?.catalogoEjercicioId, ejercicio?.id]
    .filter(Boolean)
    .map(String)
}

function buscarClaveEjercicioExistente(mapa, ejercicio) {
  return obtenerClavesEjercicioCatalogo(ejercicio).find((clave) => mapa.has(clave)) || null
}

function seleccionarEjercicioMasReciente(existente, candidato) {
  if (!existente) {
    return candidato
  }

  if (candidato.syncStatus === 'pending' && existente.syncStatus !== 'pending') {
    return candidato
  }

  if (candidato.version > existente.version) {
    return candidato
  }

  const fechaCandidato = new Date(candidato.updatedAt || candidato.createdAt || 0).getTime() || 0
  const fechaExistente = new Date(existente.updatedAt || existente.createdAt || 0).getTime() || 0

  return fechaCandidato > fechaExistente ? candidato : existente
}

export function combinarCatalogoEjercicios(locales, remotos) {
  const mapa = new Map()

  ;[...normalizarListaEjercicios(locales), ...normalizarListaEjercicios(remotos)].forEach((ejercicio) => {
    const claveExistente = buscarClaveEjercicioExistente(mapa, ejercicio)
    const existente = claveExistente ? mapa.get(claveExistente) : null
    const seleccionado = seleccionarEjercicioMasReciente(existente, ejercicio)

    obtenerClavesEjercicioCatalogo(existente).forEach((clave) => mapa.delete(clave))
    obtenerClavesEjercicioCatalogo(seleccionado).forEach((clave) => mapa.set(clave, seleccionado))
  })

  return Array.from(new Set(mapa.values()))
}

export function crearPayloadEjercicioCatalogo(ejercicio) {
  const ejercicioNormalizado = normalizarPlantillaEjercicio(ejercicio)

  return {
    clientId: ejercicioNormalizado.clientId,
    version: ejercicioNormalizado.version,
    nombre: String(ejercicioNormalizado?.nombre || '').trim(),
    descripcion: normalizarTextoPayload(ejercicioNormalizado?.descripcion),
    observaciones: normalizarTextoPayload(ejercicioNormalizado?.observaciones),
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
    observaciones: '',
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
