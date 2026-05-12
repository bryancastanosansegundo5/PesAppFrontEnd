export function crearIdLocal(prefijo) {
  return `${prefijo}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function normalizarVersion(valor, valorPorDefecto = 0) {
  const version = Number(valor)
  return Number.isFinite(version) && version >= 0 ? version : valorPorDefecto
}

export function normalizarIdTexto(...valores) {
  const encontrado = valores.find(
    (valor) => valor !== null && valor !== undefined && String(valor).trim() !== '',
  )

  return encontrado === undefined ? '' : String(encontrado).trim()
}
