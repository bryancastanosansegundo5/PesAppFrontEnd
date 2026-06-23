import { ApiError } from '../http/apiClient'
import {
  eliminarRegistroPesoGuardado,
  fusionarRegistrosPesoGuardados,
  guardarPesoDelDia,
  guardarRegistrosPesoGuardados,
  obtenerRegistrosPesoGuardados,
  reemplazarRegistroPesoGuardado,
} from '../storage/weightStorage'
import {
  crearPesoEnServidor,
  eliminarPesoEnServidor,
  obtenerPesoDesdeServidor,
} from './weightApiService'

let sincronizacionPesoActiva = null
const ERROR_CONFLICTO_VERSION = 'Conflicto de version'
const ERROR_CONFLICTO_DATOS = 'Conflicto de datos'

function esErrorRecuperable(error) {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500)
}

function clasificarConflictoPeso(error) {
  if (!(error instanceof ApiError) || error.status !== 409) {
    return null
  }

  if (error.backendError === ERROR_CONFLICTO_VERSION) {
    return 'version'
  }

  if (error.backendError === ERROR_CONFLICTO_DATOS) {
    return 'data'
  }

  return 'unknown'
}

function encontrarRegistroRelacionado(registros, registroObjetivo) {
  if (!Array.isArray(registros) || !registroObjetivo) {
    return null
  }

  if (registroObjetivo.clientId) {
    const encontradoPorClientId =
      registros.find((item) => item.clientId === registroObjetivo.clientId) || null

    if (encontradoPorClientId) {
      return encontradoPorClientId
    }
  }

  if (registroObjetivo.id) {
    return registros.find((item) => item.id === registroObjetivo.id) || null
  }

  return null
}

function enriquecerErrorPeso(error, extras = {}) {
  if (!(error instanceof ApiError)) {
    return error
  }

  Object.assign(error, extras)
  return error
}

function crearRegistroSincronizado(registroLocal, registroServidor) {
  return registroServidor || { ...registroLocal, syncStatus: 'synced' }
}

async function enviarRegistroPeso(registro) {
  return crearPesoEnServidor(registro)
}

async function resolverConflictoDeVersion(registroLocal, registrosPrevios, errorOriginal) {
  try {
    const registrosServidor = await obtenerPesoDesdeServidor()
    const registroServidor = encontrarRegistroRelacionado(registrosServidor, registroLocal)
    const registrosActualizados = registroServidor
      ? reemplazarRegistroPesoGuardado(registroServidor)
      : fusionarRegistrosPesoGuardados(registrosServidor)

    throw enriquecerErrorPeso(errorOriginal, {
      conflictType: 'version',
      latestRecord: registroServidor,
      latestRecords: registrosActualizados,
      message:
        errorOriginal.backendMessage ||
        'El dato cambio mientras lo editabas. Se ha cargado la version mas reciente.',
    })
  } catch (errorRefresco) {
    if (errorRefresco instanceof ApiError && errorRefresco.conflictType === 'version') {
      throw errorRefresco
    }

    const registrosRestaurados = guardarRegistrosPesoGuardados(registrosPrevios)

    throw enriquecerErrorPeso(errorOriginal, {
      conflictType: 'version',
      latestRecord: encontrarRegistroRelacionado(registrosRestaurados, registroLocal),
      latestRecords: registrosRestaurados,
      refreshFailed: true,
      message:
        errorOriginal.backendMessage ||
        'La version enviada no coincide con la version actual del recurso.',
    })
  }
}

function crearConflictoDeDatos(errorOriginal) {
  return enriquecerErrorPeso(errorOriginal, {
    conflictType: 'data',
    message:
      errorOriginal.backendMessage ||
      'No se ha podido guardar el recurso porque los datos entran en conflicto con el estado actual.',
  })
}

async function sincronizarRegistroPendiente(registro) {
  try {
    const registroServidor = await enviarRegistroPeso(registro)
    return registroServidor || { ...registro, syncStatus: 'synced' }
  } catch (error) {
    const tipoConflicto = clasificarConflictoPeso(error)

    if (tipoConflicto !== 'version') {
      throw error
    }

    const registrosServidor = await obtenerPesoDesdeServidor()
    const registroExistente = encontrarRegistroRelacionado(registrosServidor, registro)

    if (registroExistente) {
      return registroExistente
    }

    throw error
  }
}

export async function sincronizarRegistrosPesoPendientes() {
  if (sincronizacionPesoActiva) {
    return sincronizacionPesoActiva
  }

  sincronizacionPesoActiva = (async () => {
    let registrosActuales = obtenerRegistrosPesoGuardados()
    const pendientes = registrosActuales.filter((registro) => registro.syncStatus === 'pending')
    let sincronizados = 0

    for (const registroPendiente of pendientes) {
      try {
        const registroServidor = await sincronizarRegistroPendiente(registroPendiente)
        registrosActuales = reemplazarRegistroPesoGuardado(registroServidor)
        sincronizados += 1
      } catch (error) {
        return {
          registros: registrosActuales,
          sincronizados,
          pendientesRestantes: registrosActuales.filter(
            (registro) => registro.syncStatus === 'pending',
          ).length,
          online: !esErrorRecuperable(error),
          error,
        }
      }
    }

    return {
      registros: registrosActuales,
      sincronizados,
      pendientesRestantes: registrosActuales.filter((registro) => registro.syncStatus === 'pending')
        .length,
      online: true,
      error: null,
    }
  })().finally(() => {
    sincronizacionPesoActiva = null
  })

  return sincronizacionPesoActiva
}

export async function cargarRegistrosPeso() {
  try {
    const resultadoSincronizacion = await sincronizarRegistrosPesoPendientes()
    const registrosServidor = await obtenerPesoDesdeServidor()
    const registros = fusionarRegistrosPesoGuardados(registrosServidor)
    return {
      registros,
      online: true,
      error: null,
      sincronizados: resultadoSincronizacion?.sincronizados || 0,
    }
  } catch (error) {
    return {
      registros: obtenerRegistrosPesoGuardados(),
      online: false,
      error,
      sincronizados: 0,
    }
  }
}

export async function guardarPesoConRespaldo(
  peso,
  {
    fecha = new Date(),
    horaRegistro = '',
    horaManual = false,
    comentario = '',
    horasSueno = '',
    registroExistente = null,
  } = {},
) {
  const registrosPrevios = obtenerRegistrosPesoGuardados()
  const registrosLocales = guardarPesoDelDia(peso, {
    fecha,
    horaRegistro,
    horaManual,
    comentario,
    horasSueno,
    registroExistente,
  })
  const registroLocal = registroExistente?.clientId
    ? registrosLocales.find((registro) => registro.clientId === registroExistente.clientId) || null
    : registrosLocales.find((registro) => registro.syncStatus === 'pending') || null

  try {
    const registroSincronizado = crearRegistroSincronizado(
      registroLocal,
      await crearPesoEnServidor(registroLocal),
    )

    const registrosSincronizados = reemplazarRegistroPesoGuardado(registroSincronizado)

    try {
      const registrosServidor = await obtenerPesoDesdeServidor()
      const registros = fusionarRegistrosPesoGuardados(registrosServidor)

      return {
        registros,
        online: true,
        error: null,
      }
    } catch (error) {
      if (!esErrorRecuperable(error)) {
        throw error
      }

      return {
        registros: registrosSincronizados,
        online: true,
        error: null,
      }
    }
  } catch (error) {
    const tipoConflicto = clasificarConflictoPeso(error)

    if (tipoConflicto === 'version') {
      await resolverConflictoDeVersion(registroLocal, registrosPrevios, error)
    }

    if (tipoConflicto === 'data') {
      guardarRegistrosPesoGuardados(registrosPrevios)
      throw crearConflictoDeDatos(error)
    }

    if (!esErrorRecuperable(error)) {
      guardarRegistrosPesoGuardados(registrosPrevios)
      throw error
    }

    return {
      registros: registrosLocales,
      online: false,
      error,
    }
  }
}

function esIdPersistido(idRegistro) {
  return /^\d+$/.test(String(idRegistro || ''))
}

export async function eliminarPesoConRespaldo(registro) {
  if (!registro?.clientId) {
    return {
      registros: obtenerRegistrosPesoGuardados(),
      online: true,
      error: null,
    }
  }

  const registrosPrevios = obtenerRegistrosPesoGuardados()

  try {
    if (esIdPersistido(registro.id)) {
      await eliminarPesoEnServidor(registro.id)
    }

    const registrosActualizados = eliminarRegistroPesoGuardado(registro.clientId)

    return {
      registros: registrosActualizados,
      online: true,
      error: null,
    }
  } catch (error) {
    guardarRegistrosPesoGuardados(registrosPrevios)
    throw error
  }
}
