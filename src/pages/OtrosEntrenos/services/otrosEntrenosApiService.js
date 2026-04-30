import { apiRequest } from '../../../services/http/apiClient'

function normalizarNumero(valor) {
  return Number(valor) || 0
}

function normalizarSerieRealizada(serie, indice = 0) {
  return {
    id: serie?.id || `serie-${indice + 1}`,
    numeroSerie: normalizarNumero(serie?.numeroSerie ?? serie?.setNumber ?? indice + 1) || indice + 1,
    repeticiones: normalizarNumero(serie?.repeticiones ?? serie?.reps),
    peso: normalizarNumero(serie?.peso ?? serie?.weight),
  }
}

function normalizarEntrada(entrada, indice = 0) {
  const seriesDetalle = Array.isArray(entrada?.seriesRealizadas)
    ? entrada.seriesRealizadas.map(normalizarSerieRealizada)
    : Array.isArray(entrada?.performedSets)
      ? entrada.performedSets.map(normalizarSerieRealizada)
      : []

  return {
    id: entrada?.id || `entrada-${indice + 1}`,
    fecha: entrada?.fecha || '',
    nombreSesion: entrada?.nombreSesion || 'Sesion',
    seriesPlanificadas: normalizarNumero(entrada?.seriesPlanificadas),
    repeticionesPlanificadas: normalizarNumero(entrada?.repeticionesPlanificadas),
    pesoPlanificado: normalizarNumero(entrada?.pesoPlanificado),
    alturaBanco:
      entrada?.alturaBanco === null || entrada?.alturaBanco === undefined
        ? ''
        : String(entrada.alturaBanco),
    agarre: entrada?.agarre || '',
    seriesRealizadas: seriesDetalle.length || normalizarNumero(entrada?.seriesRealizadas),
    repeticionesTotales: normalizarNumero(entrada?.repeticionesTotales),
    volumenTotal: normalizarNumero(entrada?.volumenTotal),
    pesoMaximo: normalizarNumero(entrada?.pesoMaximo),
    seriesDetalle,
  }
}

function normalizarPuntoGrafica(punto, indice = 0) {
  return {
    id: `${punto?.fecha || 'sin-fecha'}-${indice}`,
    fecha: punto?.fecha || '',
    valor: normalizarNumero(punto?.valor),
  }
}

function normalizarEjercicioAgrupado(ejercicio, indice = 0) {
  return {
    id: ejercicio?.id || `ejercicio-${indice + 1}`,
    nombre: ejercicio?.nombre || 'Ejercicio sin nombre',
    descripcion: ejercicio?.descripcion || '',
    grupoMuscular: ejercicio?.grupoMuscular || '',
    patronMovimiento: ejercicio?.patronMovimiento || '',
    equipamiento: ejercicio?.equipamiento || '',
    agarre: ejercicio?.agarre || '',
    alturaBanco:
      ejercicio?.alturaBanco === null || ejercicio?.alturaBanco === undefined
        ? ''
        : String(ejercicio.alturaBanco),
    sesionesTotales: normalizarNumero(ejercicio?.sesionesTotales),
    ultimoRegistro: ejercicio?.ultimoRegistro || '',
    pesoMaximoHistorico: normalizarNumero(ejercicio?.pesoMaximoHistorico),
    volumenHistorico: normalizarNumero(ejercicio?.volumenHistorico),
    chartData: Array.isArray(ejercicio?.chartData)
      ? ejercicio.chartData.map(normalizarPuntoGrafica)
      : [],
    entradas: Array.isArray(ejercicio?.entradas)
      ? ejercicio.entradas.map(normalizarEntrada)
      : [],
  }
}

export function normalizarListaOtrosEntrenos(payload) {
  if (!Array.isArray(payload)) {
    return []
  }

  return payload
    .map(normalizarEjercicioAgrupado)
    .sort((primero, segundo) => {
      const diferenciaSesiones = segundo.sesionesTotales - primero.sesionesTotales

      if (diferenciaSesiones !== 0) {
        return diferenciaSesiones
      }

      return new Date(segundo.ultimoRegistro || 0) - new Date(primero.ultimoRegistro || 0)
    })
}

export async function obtenerOtrosEntrenosDesdeServidor() {
  const payload = await apiRequest('/api/otros-entrenos', {
    method: 'GET',
    auth: true,
  })

  return normalizarListaOtrosEntrenos(payload)
}
