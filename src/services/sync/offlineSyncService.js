import { recargarCatalogoEjerciciosConSincronizacion } from '../exercises/exerciseCatalogDataService'
import { recargarIdeasAdminConSincronizacion } from '../admin/adminIdeasDataService'
import { recargarSesionesConSincronizacion } from '../training/trainingSessionDataService'
import { sincronizarEntrenamientosPendientes } from '../training/trainingDataService'
import { cargarRegistrosPeso } from '../weight/weightDataService'
import { ejecutarDentroDeGlobalSync } from './globalSyncGate'

let sincronizacionGlobalActiva = null

export async function sincronizarDatosOfflineEnOrden() {
  if (sincronizacionGlobalActiva) {
    return sincronizacionGlobalActiva
  }

  sincronizacionGlobalActiva = ejecutarDentroDeGlobalSync(async () => {
    const resultadoCatalogo = await recargarCatalogoEjerciciosConSincronizacion()
    const resultadoSesiones = await recargarSesionesConSincronizacion()
    const resultadoIdeasAdmin = await recargarIdeasAdminConSincronizacion()
    const resultadoEntrenamientos = await sincronizarEntrenamientosPendientes()
    const resultadoPeso = await cargarRegistrosPeso()

    return {
      catalogo: resultadoCatalogo,
      sesiones: resultadoSesiones,
      ideasAdmin: resultadoIdeasAdmin,
      entrenamientos: resultadoEntrenamientos,
      peso: resultadoPeso,
    }
  }).finally(() => {
    sincronizacionGlobalActiva = null
  })

  return sincronizacionGlobalActiva
}
