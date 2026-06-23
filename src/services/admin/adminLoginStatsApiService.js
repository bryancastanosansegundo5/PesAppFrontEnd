import { apiRequest } from '../http/apiClient'

function normalizarDia(item, indice) {
  const fecha = item?.fecha || item?.date || item?.dia || ''
  const iniciosSesion = Number(
    item?.iniciosSesion ?? item?.inicios_sesion ?? item?.logins ?? item?.total ?? item?.count ?? 0,
  )

  return {
    id: fecha || `dia-${indice + 1}`,
    fecha,
    iniciosSesion: Number.isFinite(iniciosSesion) ? iniciosSesion : 0,
  }
}

export async function obtenerEstadisticasInicioSesion(dias = 30) {
  const payload = await apiRequest(`/api/admin/estadisticas/inicios-sesion?dias=${dias}`, {
    method: 'GET',
    auth: true,
    suppress_auth_invalid: true,
  })
  const serie = Array.isArray(payload)
    ? payload
    : payload?.dias || payload?.serie || payload?.data || payload?.registros || []
  const datos = serie.map(normalizarDia).filter((item) => item.fecha)

  return {
    datos,
    total: Number(payload?.total ?? payload?.totalIniciosSesion) ||
      datos.reduce((suma, item) => suma + item.iniciosSesion, 0),
    usuariosUnicos: Number(payload?.usuariosUnicos ?? payload?.usuarios_unicos) || 0,
  }
}
