import { recargarCatalogoEjerciciosConSincronizacion } from '../exercises/exerciseCatalogDataService'
import { recargarSesionesConSincronizacion } from '../training/trainingSessionDataService'
import { sincronizarEntrenamientosPendientes } from '../training/trainingDataService'
import { cargarRegistrosPeso } from '../weight/weightDataService'

let sincronizacionGlobalActiva = null

export async function sincronizarDatosOfflineEnOrden() {
  if (sincronizacionGlobalActiva) {
    return sincronizacionGlobalActiva
  }

  sincronizacionGlobalActiva = (async () => {
    const resultadoCatalogo = await recargarCatalogoEjerciciosConSincronizacion()
    const resultadoSesiones = await recargarSesionesConSincronizacion()
    const resultadoEntrenamientos = await sincronizarEntrenamientosPendientes()
    const resultadoPeso = await cargarRegistrosPeso()

    return {
      catalogo: resultadoCatalogo,
      sesiones: resultadoSesiones,
      entrenamientos: resultadoEntrenamientos,
      peso: resultadoPeso,
    }
  })().finally(() => {
    sincronizacionGlobalActiva = null
  })

  return sincronizacionGlobalActiva
}
