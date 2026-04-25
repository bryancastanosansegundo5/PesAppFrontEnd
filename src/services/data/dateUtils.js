const EXPRESION_FECHA_DIA = /^(\d{4})-(\d{2})-(\d{2})$/

function pad(valor) {
  return String(valor).padStart(2, '0')
}

export function parseFechaIso(valor) {
  if (!valor) {
    return null
  }

  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : new Date(valor)
  }

  if (typeof valor === 'string') {
    const coincidencia = valor.match(EXPRESION_FECHA_DIA)

    if (coincidencia) {
      const [, year, month, day] = coincidencia
      return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0)
    }
  }

  const fecha = new Date(valor)
  return Number.isNaN(fecha.getTime()) ? null : fecha
}

export function aIsoString(valor, valorPorDefecto = '') {
  const fecha = parseFechaIso(valor)
  return fecha ? fecha.toISOString() : valorPorDefecto
}

export function aFechaRegistro(valor, valorPorDefecto = '') {
  const fecha = parseFechaIso(valor)

  if (!fecha) {
    return valorPorDefecto
  }

  return `${fecha.getFullYear()}-${pad(fecha.getMonth() + 1)}-${pad(fecha.getDate())}`
}

export function inicioDiaLocal(valor = new Date()) {
  const fecha = parseFechaIso(valor) || new Date()
  fecha.setHours(0, 0, 0, 0)
  return fecha
}

export function esMismoDiaLocal(primeraFecha, segundaFecha) {
  return inicioDiaLocal(primeraFecha).getTime() === inicioDiaLocal(segundaFecha).getTime()
}
