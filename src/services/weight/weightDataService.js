import { ApiError } from '../http/apiClient'
import {
  fusionarRegistrosPesoGuardados,
  guardarPesoDelDia,
  guardarRegistrosPesoGuardados,
  obtenerRegistrosPesoGuardados,
  reemplazarRegistroPesoGuardado,
} from '../storage/weightStorage'
import { esMismoDiaLocal } from '../data/dateUtils'
import { esRegistroDeHoy } from './weightModel'
import {
  crearPesoEnServidor,
  guardarPesoHoyEnServidor,
  obtenerPesoDesdeServidor,
} from './weightApiService'

function esErrorRecuperable(error) {
  return error instanceof ApiError && (error.status === 0 || error.status >= 500)
}

async function sincronizarRegistroPendiente(registro) {
  if (esRegistroDeHoy(registro)) {
    const registroServidor = await guardarPesoHoyEnServidor(registro)
    return registroServidor || { ...registro, syncStatus: 'synced' }
  }

  const registroServidor = await crearPesoEnServidor(registro)
  return registroServidor || { ...registro, syncStatus: 'synced' }
}

export async function sincronizarRegistrosPesoPendientes() {
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
        pendientesRestantes: registrosActuales.filter((registro) => registro.syncStatus === 'pending')
          .length,
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
}

export async function cargarRegistrosPeso() {
  try {
    await sincronizarRegistrosPesoPendientes()
    const registrosServidor = await obtenerPesoDesdeServidor()
    const registros = fusionarRegistrosPesoGuardados(registrosServidor)
    return { registros, online: true, error: null }
  } catch (error) {
    return {
      registros: obtenerRegistrosPesoGuardados(),
      online: false,
      error,
    }
  }
}

export async function guardarPesoConRespaldo(peso, fecha = new Date()) {
  const registrosPrevios = obtenerRegistrosPesoGuardados()
  const registrosLocales = guardarPesoDelDia(peso, fecha)
  const esHoy = esMismoDiaLocal(fecha, new Date())

  try {
    if (esHoy) {
      await guardarPesoHoyEnServidor(registrosLocales[0])
    } else {
      await crearPesoEnServidor(registrosLocales[0])
    }

    const registrosServidor = await obtenerPesoDesdeServidor()
    const registros = fusionarRegistrosPesoGuardados(registrosServidor)

    return {
      registros,
      online: true,
      error: null,
    }
  } catch (error) {
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
