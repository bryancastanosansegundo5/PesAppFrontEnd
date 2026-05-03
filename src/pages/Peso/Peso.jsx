import { useEffect, useMemo, useRef, useState } from 'react'
import Toast from '../../components/Toast/Toast'
import WeightTimePicker from '../../components/WeightTimePicker/WeightTimePicker'
import { aFechaRegistro, aHoraRegistro, combinarFechaYHora } from '../../services/data/dateUtils'
import { obtenerRegistrosPesoGuardados } from '../../services/storage/weightStorage'
import {
  cargarRegistrosPeso,
  eliminarPesoConRespaldo,
  guardarPesoConRespaldo,
} from '../../services/weight/weightDataService'

const claseInputPesoDestacado =
  'w-full rounded-2xl border border-violet-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,243,255,0.94))] px-6 py-4 text-center text-4xl font-black tracking-tight text-slate-900 outline-none transition-all duration-300 ease-out placeholder:text-slate-400 focus:border-neon-purple focus:shadow-[0_0_28px_rgba(105,0,255,0.14)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(1,4,12,0.96),rgba(0,0,0,0.98))] dark:text-white dark:focus:border-neon-cyan dark:focus:shadow-[0_0_28px_rgba(0,255,237,0.16)]'

function obtenerHoraActual() {
  return aHoraRegistro(new Date(), '09:30')
}

function crearFormularioVacio() {
  const ultimoRegistro = obtenerRegistrosPesoGuardados()[0] || null

  return {
    pesoActual: ultimoRegistro ? String(ultimoRegistro.peso) : '',
    horaActual: obtenerHoraActual(),
    horaFueEditada: false,
    comentarioActual: '',
  }
}

function formatearFecha(fecha) {
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatearPeso(peso) {
  return `${Number(peso || 0).toFixed(1)} kg`
}

function formatearHora(hora) {
  return hora || '--:--'
}

function formatearFechaInforme(fecha) {
  return aFechaRegistro(fecha)
}

function formatearFechaHoraInput(valor) {
  const fecha = valor instanceof Date ? valor : new Date(valor)

  if (Number.isNaN(fecha.getTime())) {
    return ''
  }

  const year = fecha.getFullYear()
  const month = String(fecha.getMonth() + 1).padStart(2, '0')
  const day = String(fecha.getDate()).padStart(2, '0')
  const hours = String(fecha.getHours()).padStart(2, '0')
  const minutes = String(fecha.getMinutes()).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}

function obtenerFechaHoraRegistro(registro) {
  return (
    combinarFechaYHora(registro?.fechaRegistro ?? registro?.fecha, registro?.horaRegistro) ||
    new Date(registro?.fecha)
  )
}

function obtenerValorExtraInforme(registro, claves) {
  for (const clave of claves) {
    const valor = registro?.[clave]

    if (valor !== null && valor !== undefined && valor !== '') {
      return valor
    }
  }

  return null
}

function construirExtrasInforme(registro) {
  const extras = []
  const horasSueno = obtenerValorExtraInforme(registro, ['horas_sueno', 'horasSueno'])
  const gym = obtenerValorExtraInforme(registro, ['gym'])
  const cardioMin = obtenerValorExtraInforme(registro, ['cardio_min', 'cardioMin'])
  const pasos = obtenerValorExtraInforme(registro, ['pasos'])
  const cenaLibreAyer = obtenerValorExtraInforme(registro, ['cena_libre_ayer', 'cenaLibreAyer'])

  if (horasSueno !== null) {
    extras.push(`Sue\u00f1o: ${horasSueno}h`)
  }

  if (gym === true) {
    extras.push('Gym')
  }

  if (cardioMin !== null) {
    extras.push(`Cardio: ${cardioMin} min`)
  }

  if (pasos !== null) {
    extras.push(`Pasos: ${pasos}`)
  }

  if (cenaLibreAyer === true) {
    extras.push('Cena libre')
  }

  return extras
}

function construirTextoInforme(registros, fechaInicio, fechaFin) {
  if (!Array.isArray(registros) || registros.length === 0) {
    return ''
  }

  const registrosOrdenados = [...registros].sort(
    (primero, segundo) => obtenerFechaHoraRegistro(primero) - obtenerFechaHoraRegistro(segundo),
  )
  const pesoInicial = Number(registrosOrdenados[0]?.peso || 0)
  const pesoActual = Number(registrosOrdenados[registrosOrdenados.length - 1]?.peso || 0)
  const cambioTotal = Number((pesoActual - pesoInicial).toFixed(1))
  const signoCambio = cambioTotal > 0 ? '+' : ''
  const lineasRegistros = registrosOrdenados.flatMap((registro) => {
    const columnas = [formatearFechaInforme(registro.fechaRegistro || registro.fecha)]
    const horaRegistro = registro?.horaRegistro ? String(registro.horaRegistro) : ''
    const tipoPesaje = obtenerValorExtraInforme(registro, ['tipo_pesaje', 'tipoPesaje'])
    const extras = construirExtrasInforme(registro)

    if (horaRegistro) {
      columnas.push(horaRegistro)
    }

    columnas.push(String(Number(registro.peso).toFixed(1)))

    if (tipoPesaje !== null) {
      columnas.push(String(tipoPesaje))
    }

    if (extras.length > 0) {
      columnas.push(extras.join(' | '))
    }

    const observaciones = String(
      obtenerValorExtraInforme(registro, ['observaciones', 'comentario']) || '',
    )
    const lineas = [columnas.join(' | ')]

    if (observaciones) {
      lineas.push(...observaciones.split(/\r?\n/))
    }

    return lineas
  })

  return [
    'INFORME DE EVOLUCI\u00d3N DE PESO',
    '',
    'Periodo analizado:',
    `Desde: ${formatearFechaInforme(fechaInicio)}`,
    `Hasta: ${formatearFechaInforme(fechaFin)}`,
    '',
    'Resumen:',
    `Peso inicial: ${pesoInicial.toFixed(1)} kg`,
    `Peso actual: ${pesoActual.toFixed(1)} kg`,
    `Cambio total: ${signoCambio}${cambioTotal.toFixed(1)} kg`,
    '',
    'Registros:',
    '',
    ...lineasRegistros,
  ].join('\n')
}

function formatearFechaHora(registro) {
  if (!registro) {
    return 'Todavia sin datos'
  }

  return `${formatearFecha(registro.fecha)} · ${formatearHora(registro.horaRegistro)}`
}

function obtenerClaveSemana(fecha) {
  const fechaBase = new Date(fecha)
  const diaSemana = (fechaBase.getDay() + 6) % 7
  fechaBase.setHours(0, 0, 0, 0)
  fechaBase.setDate(fechaBase.getDate() - diaSemana)

  return fechaBase.toISOString()
}

function obtenerEtiquetaSemana(claveSemana) {
  const inicio = new Date(claveSemana)
  const fin = new Date(claveSemana)
  fin.setDate(fin.getDate() + 6)

  return `${inicio.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
  })} - ${fin.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
  })}`
}

function construirPuntosGrafica(registros) {
  if (registros.length === 0) {
    return []
  }

  const ordenados = [...registros].sort((primero, segundo) => new Date(primero.fecha) - new Date(segundo.fecha))
  const pesos = ordenados.map((registro) => registro.peso)
  const minPeso = Math.min(...pesos)
  const maxPeso = Math.max(...pesos)
  const rango = Math.max(maxPeso - minPeso, 1)
  const ancho = 100
  const alto = 100

  return ordenados.map((registro, indice) => {
    const x = ordenados.length === 1 ? 50 : (indice / (ordenados.length - 1)) * ancho
    const y = alto - ((registro.peso - minPeso) / rango) * alto

    return {
      registro,
      x,
      y,
      point: `${x},${y}`,
    }
  })
}

function crearEtiquetasPesoGrafica(registros, total = 4) {
  if (!Array.isArray(registros) || registros.length === 0) {
    return []
  }

  const pesos = registros.map((registro) => Number(registro.peso) || 0)
  const minPeso = Math.min(...pesos)
  const maxPeso = Math.max(...pesos)
  const rango = Math.max(maxPeso - minPeso, 1)
  const paso = total === 1 ? 0 : rango / (total - 1)

  return Array.from({ length: total }, (_, indice) => {
    const peso = maxPeso - paso * indice
    return `${peso.toFixed(1)}`
  })
}

function formatearFechaCortaGrafica(fecha) {
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
  })
}

function crearEtiquetasFechaGrafica(puntos) {
  if (!Array.isArray(puntos) || puntos.length === 0) {
    return []
  }

  const indices = puntos.length <= 4
    ? puntos.map((_, indice) => indice)
    : [0, Math.floor((puntos.length - 1) / 3), Math.floor(((puntos.length - 1) * 2) / 3), puntos.length - 1]

  return [...new Set(indices)].map((indice) => {
    const punto = puntos[indice]
    return {
      id: punto.registro.id,
      x: punto.x,
      label: formatearFechaCortaGrafica(punto.registro.fecha),
    }
  })
}

function esEventoTactil() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.matchMedia('(hover: none)').matches
}

const ETIQUETAS_DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function obtenerInicioDia(fecha) {
  const copia = new Date(fecha)
  copia.setHours(0, 0, 0, 0)
  return copia
}

function obtenerInicioMes(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1)
}

function sumarMeses(fecha, cantidad) {
  return new Date(fecha.getFullYear(), fecha.getMonth() + cantidad, 1)
}

function sonMismoDia(primeraFecha, segundaFecha) {
  return (
    primeraFecha.getFullYear() === segundaFecha.getFullYear() &&
    primeraFecha.getMonth() === segundaFecha.getMonth() &&
    primeraFecha.getDate() === segundaFecha.getDate()
  )
}

function estaFechaEntre(fecha, inicio, fin) {
  const marca = obtenerInicioDia(fecha).getTime()
  return marca >= obtenerInicioDia(inicio).getTime() && marca <= obtenerInicioDia(fin).getTime()
}

function combinarFechaConHoraLocal(fecha, hora = '00:00') {
  const [horas, minutos] = String(hora || '00:00')
    .split(':')
    .map((valor) => Number(valor) || 0)
  const combinada = new Date(fecha)
  combinada.setHours(horas, minutos, 0, 0)
  return formatearFechaHoraInput(combinada)
}

function construirDiasCalendario(fechaBase) {
  const inicioMes = obtenerInicioMes(fechaBase)
  const diaSemanaInicio = (inicioMes.getDay() + 6) % 7
  const primerDiaVisible = new Date(inicioMes)
  primerDiaVisible.setDate(inicioMes.getDate() - diaSemanaInicio)

  return Array.from({ length: 42 }, (_, indice) => {
    const fecha = new Date(primerDiaVisible)
    fecha.setDate(primerDiaVisible.getDate() + indice)
    return {
      fecha,
      perteneceAlMesActual: fecha.getMonth() === inicioMes.getMonth(),
    }
  })
}

function formatearMesCalendario(fecha) {
  return fecha.toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  })
}

function formatearRangoVisual(fechaInicio, fechaFin) {
  const inicio = fechaInicio ? formatearFechaInforme(fechaInicio) : 'Desde'
  const fin = fechaFin ? formatearFechaInforme(fechaFin) : 'Hasta'
  return `${inicio} - ${fin}`
}

function SelectorRangoInforme({
  fechaInicioInforme,
  fechaFinInforme,
  onChangeInicio,
  onChangeFin,
}) {
  const fechaInicio = fechaInicioInforme ? new Date(fechaInicioInforme) : null
  const fechaFin = fechaFinInforme ? new Date(fechaFinInforme) : null
  const [mesVisible, setMesVisible] = useState(
    obtenerInicioMes(fechaInicio && !Number.isNaN(fechaInicio.getTime()) ? fechaInicio : new Date()),
  )

  const seleccionarDia = (fechaSeleccionada) => {
    const fechaNormalizada = obtenerInicioDia(fechaSeleccionada)

    if (!fechaInicio || (fechaInicio && fechaFin)) {
      onChangeInicio(combinarFechaConHoraLocal(fechaNormalizada, '00:00'))
      onChangeFin('')
      return
    }

    if (fechaNormalizada.getTime() < obtenerInicioDia(fechaInicio).getTime()) {
      onChangeInicio(combinarFechaConHoraLocal(fechaNormalizada, '00:00'))
      onChangeFin(combinarFechaConHoraLocal(fechaInicio, '23:59'))
      return
    }

    onChangeFin(combinarFechaConHoraLocal(fechaNormalizada, '23:59'))
  }

  return (
    <div className="grid gap-4">
      <button
        className="group flex w-full items-center gap-3 rounded-[22px] border border-neon-cyan/20 bg-[linear-gradient(180deg,rgba(248,250,252,0.98),rgba(239,246,255,0.96))] px-4 py-4 text-left shadow-[0_16px_40px_rgba(15,23,42,0.1)] transition-all duration-300 ease-out hover:border-neon-purple/40 hover:shadow-glow-cyan dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(7,10,20,0.96),rgba(2,6,12,0.96))]"
        type="button"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-neon-cyan/25 bg-white/80 text-neon-purple shadow-[0_10px_24px_rgba(15,23,42,0.08)] dark:border-neon-cyan/20 dark:bg-white/[0.04] dark:text-neon-cyan">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 2v3M16 2v3M3.5 9.5h17M5 5.5h14a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 19 19.5H5A1.5 1.5 0 0 1 3.5 18V7A1.5 1.5 0 0 1 5 5.5Z" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Periodo del informe
          </p>
          <p className="mt-1 truncate text-sm font-black text-slate-950 dark:text-white">
            {formatearRangoVisual(fechaInicio, fechaFin)}
          </p>
        </div>
        <span className="rounded-full border border-neon-pink/20 bg-neon-pink/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-neon-purple dark:text-neon-cyan">
          Rango
        </span>
      </button>

      <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/95 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[#060913]">
        <div className="flex items-center justify-between gap-3">
          <button
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-700 transition-all duration-300 ease-out hover:border-neon-cyan hover:text-neon-purple dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:text-neon-cyan"
            type="button"
            onClick={() => setMesVisible((actual) => sumarMeses(actual, -1))}
          >
            Anterior
          </button>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Seleccion por rango
          </p>
          <button
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-700 transition-all duration-300 ease-out hover:border-neon-cyan hover:text-neon-purple dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:text-neon-cyan"
            type="button"
            onClick={() => setMesVisible((actual) => sumarMeses(actual, 1))}
          >
            Siguiente
          </button>
        </div>

        <div className="mt-4">
          {(() => {
            const dias = construirDiasCalendario(mesVisible)

            return (
              <div className="rounded-[22px] border border-slate-200/80 bg-white/90 p-3 dark:border-white/10 dark:bg-white/[0.03]">
                <p className="mb-3 text-center text-sm font-black capitalize text-slate-950 dark:text-white">
                  {formatearMesCalendario(mesVisible)}
                </p>
                <div className="mb-2 grid grid-cols-7 gap-2">
                  {ETIQUETAS_DIAS_SEMANA.map((dia) => (
                    <div
                      className="text-center text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500"
                      key={dia}
                    >
                      {dia}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {dias.map(({ fecha, perteneceAlMesActual }) => {
                    const esInicio = fechaInicio ? sonMismoDia(fecha, fechaInicio) : false
                    const esFin = fechaFin ? sonMismoDia(fecha, fechaFin) : false
                    const estaEnRango =
                      fechaInicio && fechaFin ? estaFechaEntre(fecha, fechaInicio, fechaFin) : false
                    const estaSeleccionado = esInicio || esFin

                    return (
                      <button
                        className={`h-10 rounded-xl text-sm font-black transition-all duration-200 ease-out ${
                          estaSeleccionado
                            ? 'bg-[linear-gradient(135deg,#00FFED,#FF66FF)] text-slate-950 shadow-[0_10px_24px_rgba(0,255,237,0.22)]'
                            : estaEnRango
                              ? 'border border-neon-cyan/20 bg-neon-cyan/10 text-slate-900 dark:text-neon-cyan'
                              : perteneceAlMesActual
                                ? 'border border-transparent bg-slate-100/90 text-slate-700 hover:border-neon-cyan/30 hover:text-neon-purple dark:bg-white/[0.04] dark:text-slate-200 dark:hover:text-neon-cyan'
                                : 'border border-transparent bg-slate-100/50 text-slate-300 hover:text-slate-500 dark:bg-white/[0.02] dark:text-slate-600'
                        }`}
                        key={fecha.toISOString()}
                        type="button"
                        onClick={() => seleccionarDia(fecha)}
                      >
                        {fecha.getDate()}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}

function InfoPuntoGrafica({ registro }) {
  if (!registro) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-slate-300/80 bg-white/70 px-4 py-3 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
        Toca un punto en movil o pasa el cursor por la linea en desktop para ver el detalle.
      </div>
    )
  }

  return (
    <div className="mt-4 rounded-2xl border border-neon-cyan/25 bg-white/85 px-4 py-4 text-sm text-slate-700 shadow-[0_14px_34px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-neon-purple dark:text-neon-cyan">
            Medicion
          </p>
          <p className="mt-1 text-lg font-black text-slate-950 dark:text-white">
            {formatearPeso(registro.peso)}
          </p>
        </div>
        <span className="rounded-full border border-neon-pink/25 bg-neon-pink/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-neon-purple dark:text-neon-cyan">
          {formatearHora(registro.horaRegistro)}
        </span>
      </div>
      <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
        {formatearFecha(registro.fecha)}
      </p>
      {registro.comentario ? (
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
          {registro.comentario}
        </p>
      ) : null}
    </div>
  )
}

function Peso() {
  const [registros, setRegistros] = useState(obtenerRegistrosPesoGuardados)
  const [pesoActual, setPesoActual] = useState(crearFormularioVacio().pesoActual)
  const [horaActual, setHoraActual] = useState(crearFormularioVacio().horaActual)
  const [horaFueEditada, setHoraFueEditada] = useState(crearFormularioVacio().horaFueEditada)
  const [comentarioActual, setComentarioActual] = useState(crearFormularioVacio().comentarioActual)
  const [registroEnEdicion, setRegistroEnEdicion] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [estaGuardando, setEstaGuardando] = useState(false)
  const [estaEliminando, setEstaEliminando] = useState(false)
  const [estaRecargando, setEstaRecargando] = useState(false)
  const [toast, setToast] = useState(null)
  const [registroGraficaHoverId, setRegistroGraficaHoverId] = useState('')
  const [registroGraficaFijadoId, setRegistroGraficaFijadoId] = useState('')
  const [estaModalInformeAbierto, setEstaModalInformeAbierto] = useState(false)
  const [fechaInicioInforme, setFechaInicioInforme] = useState('')
  const [fechaFinInforme, setFechaFinInforme] = useState('')
  const [informeGenerado, setInformeGenerado] = useState('')
  const ultimoEventoConexionRef = useRef(0)
  const formularioRef = useRef(null)

  const reiniciarFormulario = () => {
    const formularioVacio = crearFormularioVacio()
    setRegistroEnEdicion(null)
    setPesoActual(formularioVacio.pesoActual)
    setHoraActual(formularioVacio.horaActual)
    setHoraFueEditada(formularioVacio.horaFueEditada)
    setComentarioActual(formularioVacio.comentarioActual)
  }

  const cargarRegistroEnFormulario = (registro) => {
    if (!registro) {
      reiniciarFormulario()
      return
    }

    setRegistroEnEdicion(registro)
    setPesoActual(String(registro.peso))
    setHoraActual(registro.horaRegistro || obtenerHoraActual())
    setHoraFueEditada(Boolean(registro.horaManual))
    setComentarioActual(registro.comentario || '')
    window.requestAnimationFrame(() => {
      formularioRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  useEffect(() => {
    let cancelado = false

    const cargar = async () => {
      setEstaRecargando(true)

      const resultado = await cargarRegistrosPeso()

      if (cancelado) {
        return
      }

      setRegistros(resultado.registros)
      setMensaje(
        resultado.online
          ? 'Datos de peso actualizados.'
          : resultado.error?.message ||
              'No se pudieron actualizar los datos. Se muestran los registros disponibles.',
      )
      setEstaRecargando(false)
    }

    cargar()

    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    let cancelado = false

    const sincronizarAlRecuperarConexion = async () => {
      const ahora = Date.now()

      if (ahora - ultimoEventoConexionRef.current < 1200) {
        return
      }

      ultimoEventoConexionRef.current = ahora
      setEstaRecargando(true)

      const resultado = await cargarRegistrosPeso()

      if (cancelado) {
        return
      }

      setRegistros(resultado.registros)
      setMensaje(
        resultado.online
          ? resultado.sincronizados > 0
            ? `Se sincronizaron ${resultado.sincronizados} registros de peso pendientes.`
            : 'Datos de peso actualizados.'
          : resultado.error?.message ||
              'No se pudieron actualizar los datos. Se muestran los registros disponibles.',
      )
      setEstaRecargando(false)
    }

    window.addEventListener('online', sincronizarAlRecuperarConexion)
    window.addEventListener('pesapp:server-reachable', sincronizarAlRecuperarConexion)

    return () => {
      cancelado = true
      window.removeEventListener('online', sincronizarAlRecuperarConexion)
      window.removeEventListener('pesapp:server-reachable', sincronizarAlRecuperarConexion)
    }
  }, [])

  const ultimoRegistro = registros[0] || null
  const registrosOrdenadosAsc = useMemo(() => {
    return [...registros].sort(
      (primero, segundo) => obtenerFechaHoraRegistro(primero) - obtenerFechaHoraRegistro(segundo),
    )
  }, [registros])
  const promediosSemanales = useMemo(() => {
    const acumulado = registros.reduce((mapa, registro) => {
      const claveSemana = obtenerClaveSemana(registro.fecha)
      const existente = mapa.get(claveSemana) || { total: 0, conteo: 0 }

      mapa.set(claveSemana, {
        total: existente.total + Number(registro.peso),
        conteo: existente.conteo + 1,
      })

      return mapa
    }, new Map())

    return Array.from(acumulado.entries())
      .map(([claveSemana, valores]) => ({
        claveSemana,
        etiqueta: obtenerEtiquetaSemana(claveSemana),
        media: valores.total / valores.conteo,
        registros: valores.conteo,
      }))
      .sort((primero, segundo) => new Date(segundo.claveSemana) - new Date(primero.claveSemana))
  }, [registros])

  const puntosGrafica = useMemo(() => construirPuntosGrafica(registros.slice(0, 12).reverse()), [registros])
  const polylineGrafica = puntosGrafica.map((punto) => punto.point).join(' ')
  const etiquetasPesoGrafica = useMemo(
    () => crearEtiquetasPesoGrafica(puntosGrafica.map((punto) => punto.registro)),
    [puntosGrafica],
  )
  const etiquetasFechaGrafica = useMemo(
    () => crearEtiquetasFechaGrafica(puntosGrafica),
    [puntosGrafica],
  )
  const registroGraficaActivo = useMemo(() => {
    const idActivo = registroGraficaFijadoId || registroGraficaHoverId
    return puntosGrafica.find((punto) => punto.registro.id === idActivo)?.registro || null
  }, [puntosGrafica, registroGraficaFijadoId, registroGraficaHoverId])

  const activarPuntoGrafica = (registro) => {
    setRegistroGraficaHoverId(registro.id)
  }

  const limpiarHoverGrafica = () => {
    setRegistroGraficaHoverId('')
  }

  const alternarPuntoGraficaFijado = (registro) => {
    setRegistroGraficaFijadoId((actual) => (actual === registro.id ? '' : registro.id))
  }

  const obtenerRegistroActualizadoParaGuardar = () => {
    if (!registroEnEdicion) {
      return null
    }

    return (
      registros.find(
        (registro) =>
          registro.clientId === registroEnEdicion.clientId || registro.id === registroEnEdicion.id,
      ) || registroEnEdicion
    )
  }

  const subirAlInicio = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const abrirModalInforme = () => {
    if (registrosOrdenadosAsc.length === 0) {
      setMensaje('No hay registros de peso para generar un informe.')
      setToast({
        id: Date.now(),
        mensaje: 'No hay registros de peso para generar un informe.',
        tipo: 'error',
      })
      return
    }

    const fechaMinima = obtenerFechaHoraRegistro(registrosOrdenadosAsc[0])
    const fechaMaxima = obtenerFechaHoraRegistro(
      registrosOrdenadosAsc[registrosOrdenadosAsc.length - 1],
    )

    setFechaInicioInforme(combinarFechaConHoraLocal(fechaMinima, '00:00'))
    setFechaFinInforme(combinarFechaConHoraLocal(fechaMaxima, '23:59'))
    setEstaModalInformeAbierto(true)
  }

  const cerrarModalInforme = () => {
    setEstaModalInformeAbierto(false)
  }

  const generarInforme = () => {
    if (!fechaInicioInforme || !fechaFinInforme) {
      setMensaje('Selecciona un rango de fechas valido para generar el informe.')
      return
    }

    const fechaInicio = new Date(fechaInicioInforme)
    const fechaFin = new Date(fechaFinInforme)

    if (
      Number.isNaN(fechaInicio.getTime()) ||
      Number.isNaN(fechaFin.getTime()) ||
      fechaInicio > fechaFin
    ) {
      setMensaje('Selecciona un rango de fechas valido para generar el informe.')
      return
    }

    const registrosFiltrados = registrosOrdenadosAsc.filter((registro) => {
      const fechaRegistro = obtenerFechaHoraRegistro(registro)
      return fechaRegistro >= fechaInicio && fechaRegistro <= fechaFin
    })

    if (registrosFiltrados.length === 0) {
      setMensaje('No hay registros dentro del periodo seleccionado.')
      setToast({
        id: Date.now(),
        mensaje: 'No hay registros dentro del periodo seleccionado.',
        tipo: 'error',
      })
      return
    }

    setInformeGenerado(construirTextoInforme(registrosFiltrados, fechaInicio, fechaFin))
    setEstaModalInformeAbierto(false)
    setMensaje('Informe generado correctamente.')
    setToast({
      id: Date.now(),
      mensaje: 'Informe generado correctamente.',
      tipo: 'info',
    })
  }

  const copiarInforme = async () => {
    if (!informeGenerado) {
      return
    }

    try {
      await navigator.clipboard.writeText(informeGenerado)
      setMensaje('Informe copiado al portapapeles.')
      setToast({
        id: Date.now(),
        mensaje: 'Informe copiado al portapapeles.',
        tipo: 'info',
      })
    } catch {
      setMensaje('No se pudo copiar el informe al portapapeles.')
      setToast({
        id: Date.now(),
        mensaje: 'No se pudo copiar el informe al portapapeles.',
        tipo: 'error',
      })
    }
  }

  const guardarPeso = async () => {
    if (estaGuardando || estaRecargando || estaEliminando) {
      return
    }

    const pesoNumerico = Number(pesoActual)

    if (!pesoNumerico || pesoNumerico <= 0) {
      setMensaje('Introduce un peso valido para guardar el registro.')
      return
    }

    setEstaGuardando(true)

    try {
      const registroExistenteActualizado = obtenerRegistroActualizadoParaGuardar()
      const resultado = await guardarPesoConRespaldo(pesoNumerico, {
        horaRegistro: horaActual,
        horaManual: horaFueEditada,
        comentario: comentarioActual,
        registroExistente: registroExistenteActualizado,
      })
      setRegistros(resultado.registros)
      const eraEdicion = Boolean(registroEnEdicion)
      reiniciarFormulario()
      setMensaje(
        resultado.online
          ? eraEdicion
            ? 'Medicion actualizada correctamente.'
            : 'Nueva medicion guardada correctamente.'
          : `${resultado.error?.message || 'No se pudo sincronizar ahora mismo.'} El registro queda guardado en la app.`,
      )
      setToast({
        id: Date.now(),
        mensaje: resultado.online
          ? eraEdicion
            ? 'Peso actualizado correctamente.'
            : 'Peso registrado correctamente.'
          : 'Peso guardado en local. Se sincronizara cuando vuelva la conexion.',
        tipo: 'info',
      })
      subirAlInicio()
    } catch (errorCapturado) {
      if (Array.isArray(errorCapturado?.latestRecords)) {
        setRegistros(errorCapturado.latestRecords)
        cargarRegistroEnFormulario(errorCapturado.latestRecord || registroEnEdicion)
        setMensaje('Datos guardados correctamente.')
        setToast({
          id: Date.now(),
          mensaje: 'Datos guardados correctamente.',
          tipo: 'info',
        })
        return
      }

      setMensaje(errorCapturado.message || 'No se pudo guardar el peso.')
      setToast({
        id: Date.now(),
        mensaje: errorCapturado.message || 'No se pudo guardar el peso.',
        tipo: 'error',
      })
    } finally {
      setEstaGuardando(false)
    }
  }

  const eliminarPeso = async (registro) => {
    if (estaGuardando || estaRecargando || estaEliminando) {
      return
    }

    setEstaEliminando(true)

    try {
      const resultado = await eliminarPesoConRespaldo(registro)
      setRegistros(resultado.registros)

      if (registroEnEdicion?.clientId === registro.clientId) {
        reiniciarFormulario()
      }

      setMensaje('Registro eliminado definitivamente.')
      setToast({
        id: Date.now(),
        mensaje: 'Registro eliminado definitivamente.',
        tipo: 'info',
      })
      subirAlInicio()
    } catch (errorCapturado) {
      setMensaje(errorCapturado.message || 'No se pudo eliminar el peso.')
      setToast({
        id: Date.now(),
        mensaje: errorCapturado.message || 'No se pudo eliminar el peso.',
        tipo: 'error',
      })
    } finally {
      setEstaEliminando(false)
    }
  }

  return (
    <>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
        <section
          ref={formularioRef}
          className="grid gap-5 rounded-[28px] border border-neon-cyan/30 bg-white p-5 shadow-glow-cyan lg:grid-cols-[0.92fr_1.08fr] dark:bg-white/[0.04]"
        >
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
              Peso corporal
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
              Registro rapido de bascula
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Guarda nuevas mediciones en segundos y revisa la tendencia semanal sin salir del flujo.
            </p>
          </div>

          <div className="rounded-[26px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.96),rgba(255,255,255,0.92))] p-4 shadow-[0_14px_40px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(4,7,16,0.96),rgba(2,6,12,0.88))]">
            <div className="grid gap-3">
              <div className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-4 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
                <label className="grid gap-2">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    {registroEnEdicion ? 'Editar medicion' : 'Nueva medicion'}
                  </span>
                  <div className="rounded-[22px] border border-violet-200/80 bg-[linear-gradient(180deg,rgba(248,247,255,0.96),rgba(239,246,255,0.86))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_14px_34px_rgba(88,28,135,0.08)] dark:border-white/6 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.4),rgba(2,6,23,0.18))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                    <input
                      className={claseInputPesoDestacado}
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="82.4"
                      value={pesoActual}
                      onChange={(evento) => setPesoActual(evento.target.value)}
                    />
                  </div>
                </label>

                <div className="grid gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Hora
                    </span>
                    <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-violet-700 dark:border-neon-cyan/25 dark:bg-neon-cyan/10 dark:text-neon-cyan">
                      {horaFueEditada ? 'Manual' : 'Ahora'}
                    </span>
                  </div>
                  <WeightTimePicker
                    value={horaActual}
                    onChange={setHoraActual}
                    onTouch={() => setHoraFueEditada(true)}
                    className="min-w-0"
                  />
                </div>

                <label className="grid gap-2">
                  <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Comentario
                  </span>
                  <textarea
                    className="min-h-24 w-full rounded-2xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-[0_0_22px_rgba(0,255,237,0.12)] dark:border-white/10 dark:bg-pes-black dark:text-white"
                    placeholder="Ej: peso en ayunas, despues de entrenar, viaje o sensaciones del dia"
                    value={comentarioActual}
                    onChange={(evento) => setComentarioActual(evento.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border border-slate-200/80 bg-white/85 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-neon-purple/25 bg-neon-purple/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-neon-purple dark:text-neon-cyan">
                  {registroEnEdicion ? 'Editando' : 'Alta nueva'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {horaFueEditada ? `Hora elegida: ${horaActual}` : `Hora automatica: ${horaActual}`}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {mensaje ||
                  (registroEnEdicion
                    ? 'Estas editando una medicion guardada. Cuando termines, pulsa Guardar cambios.'
                    : 'Si no tocas la hora, usaremos la actual. Cada guardado crea una medicion nueva.')}
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  className="rounded-xl border border-slate-900 bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-[0_16px_34px_rgba(15,23,42,0.18)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:bg-neon-purple hover:shadow-glow-purple disabled:cursor-not-allowed disabled:opacity-60 dark:border-neon-cyan/45 dark:bg-pes-black dark:text-neon-cyan dark:shadow-glow-cyan dark:hover:border-neon-pink dark:hover:text-neon-pink dark:hover:shadow-glow-pink"
                  type="button"
                  disabled={estaGuardando || estaRecargando || estaEliminando}
                  onClick={guardarPeso}
                >
                  {estaGuardando
                    ? 'Guardando...'
                    : estaRecargando
                      ? 'Cargando...'
                      : registroEnEdicion
                        ? 'Guardar cambios'
                        : 'Guardar peso'}
                </button>
                {registroEnEdicion ? (
                  <button
                    className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-cyan hover:text-neon-purple hover:shadow-glow-cyan dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:text-neon-cyan"
                    type="button"
                    disabled={estaGuardando || estaRecargando || estaEliminando}
                    onClick={reiniciarFormulario}
                  >
                    Cancelar edicion
                  </button>
                ) : null}
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                {horaFueEditada ? 'Hora manual activa' : 'Hora actual automatica'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <article className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex min-h-[112px] flex-col items-center justify-center text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">Ultimo registro</p>
                <p className="mt-3 text-4xl font-black text-slate-950 dark:text-white">
                  {ultimoRegistro ? formatearPeso(ultimoRegistro.peso) : '--'}
                </p>
              </div>
              <div
                className={`flex min-h-[72px] min-w-[190px] max-w-[220px] flex-col items-center justify-center self-center justify-self-center rounded-xl border px-4 py-2 text-center ${
                  ultimoRegistro?.syncStatus === 'pending'
                    ? 'border-amber-400/45 bg-amber-400/10'
                    : 'border-neon-cyan/20 bg-neon-cyan/8 dark:bg-neon-cyan/10'
                }`}
              >
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Estado
                </p>
                <p
                  className={`mt-1 text-sm font-black ${
                    ultimoRegistro?.syncStatus === 'pending'
                      ? 'text-amber-500 dark:text-amber-300'
                      : 'text-neon-cyan'
                  }`}
                >
                  {ultimoRegistro?.syncStatus === 'pending' ? 'Pendiente' : 'Sincronizado'}
                </p>
              </div>

              <div className="flex min-h-[84px] flex-col items-center justify-center text-center">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Fecha y hora
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
                  {formatearFechaHora(ultimoRegistro)}
                </p>
              </div>
              <div className="flex min-h-[84px] flex-col items-center justify-center text-center">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Seguimiento
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
                  {registros.length > 1 ? `${registros.length} mediciones acumuladas` : 'Primera medicion registrada'}
                </p>
              </div>
            </div>
          </article>
          <article className="flex min-h-[176px] flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 p-5 text-center dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm text-slate-500 dark:text-slate-400">Media semanal actual</p>
            <p className="mt-3 text-3xl font-black text-neon-cyan">
              {promediosSemanales[0] ? formatearPeso(promediosSemanales[0].media) : '--'}
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {promediosSemanales[0]
                ? `${promediosSemanales[0].registros} registros esta semana`
                : 'Aun no hay semana calculada'}
            </p>
          </article>
          <article className="flex min-h-[176px] flex-col items-center justify-center rounded-2xl border border-slate-200/80 bg-white/90 p-5 text-center dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm text-slate-500 dark:text-slate-400">Historico total</p>
            <p className="mt-3 text-3xl font-black text-neon-pink">{registros.length}</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Dias registrados en esta app
            </p>
          </article>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <article className="rounded-[28px] border border-neon-purple/30 bg-white p-5 shadow-glow-purple dark:bg-white/[0.04]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-pink">
                Grafica lineal
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                Evolucion reciente
              </h2>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Ultimos 12 registros</p>
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-pes-black/60">
            {registros.length > 1 ? (
              <>
                <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3">
                  <div className="relative h-64">
                    {etiquetasPesoGrafica.map((peso, indice) => (
                      <div
                        key={`${peso}-${indice}`}
                        className="absolute left-0 -translate-y-1/2 text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400"
                        style={{ top: `${(indice / Math.max(etiquetasPesoGrafica.length - 1, 1)) * 100}%` }}
                      >
                        {peso}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="relative h-64 w-full">
                      <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="peso-linea" x1="0%" x2="100%" y1="0%" y2="0%">
                            <stop offset="0%" stopColor="#00FFED" />
                            <stop offset="100%" stopColor="#FF66FF" />
                          </linearGradient>
                        </defs>
                        <path d="M 0 100 H 100" stroke="rgba(148,163,184,0.25)" strokeWidth="0.8" />
                        <path d="M 0 66 H 100" stroke="rgba(148,163,184,0.18)" strokeWidth="0.8" />
                        <path d="M 0 33 H 100" stroke="rgba(148,163,184,0.12)" strokeWidth="0.8" />
                        <polyline
                          fill="none"
                          points={polylineGrafica}
                          stroke="url(#peso-linea)"
                          strokeWidth="2.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <div className="pointer-events-none absolute inset-0">
                        {puntosGrafica.map(({ registro, x, y }) => {
                          const estaActivo = registroGraficaActivo?.id === registro.id
                          const estaFijado = registroGraficaFijadoId === registro.id

                          return (
                            <button
                              key={registro.id}
                              className={`pointer-events-auto absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-[0_0_0_2px_rgba(15,23,42,0.14)] transition-all duration-200 ease-out ${
                                estaActivo || estaFijado
                                  ? 'scale-110 bg-neon-pink shadow-[0_0_0_3px_rgba(255,102,255,0.18)]'
                                  : 'bg-neon-cyan'
                              }`}
                              type="button"
                              style={{ left: `${x}%`, top: `${y}%` }}
                              aria-label={`Ver detalle de ${formatearPeso(registro.peso)} del ${formatearFecha(registro.fecha)}`}
                              onMouseEnter={() => activarPuntoGrafica(registro)}
                              onMouseLeave={limpiarHoverGrafica}
                              onClick={() => alternarPuntoGraficaFijado(registro)}
                            />
                          )
                        })}
                      </div>
                    </div>
                    <div className="relative mt-3 h-5">
                      {etiquetasFechaGrafica.map((etiqueta) => (
                        <div
                          key={etiqueta.id}
                          className="absolute -translate-x-1/2 text-[11px] font-semibold tabular-nums text-slate-500 dark:text-slate-400"
                          style={{ left: `${etiqueta.x}%` }}
                        >
                          {etiqueta.label}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <InfoPuntoGrafica registro={registroGraficaActivo} />
                {registroGraficaFijadoId && esEventoTactil() ? (
                  <button
                    className="mt-3 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-700 transition-all duration-300 ease-out hover:border-neon-cyan hover:text-neon-purple hover:shadow-glow-cyan dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:text-neon-cyan"
                    type="button"
                    onClick={() => {
                      setRegistroGraficaHoverId('')
                      setRegistroGraficaFijadoId('')
                    }}
                  >
                    Cerrar detalle
                  </button>
                ) : null}
              </>
            ) : (
              <div className="flex h-64 items-center justify-center text-sm text-slate-500 dark:text-slate-400">
                Necesitamos al menos dos registros para dibujar la tendencia.
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-4">
            <div className="hidden lg:flex lg:justify-end">
              <button
                className="rounded-[22px] border border-neon-cyan/30 bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.16em] text-slate-900 shadow-[0_16px_36px_rgba(15,23,42,0.1)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:text-neon-purple hover:shadow-glow-cyan dark:border-white/10 dark:bg-white/[0.04] dark:text-neon-cyan dark:hover:border-neon-pink dark:hover:text-neon-pink"
                type="button"
                onClick={abrirModalInforme}
              >
                Generar informe
              </button>
            </div>

            <article className="rounded-[24px] border border-slate-200/80 bg-slate-50/95 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-pes-black/45">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
                    Informe
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Texto estructurado listo para copiar a otro documento.
                  </p>
                </div>
                <button
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-slate-700 transition-all duration-300 ease-out hover:border-neon-cyan hover:text-neon-purple hover:shadow-glow-cyan disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:text-neon-cyan"
                  type="button"
                  disabled={!informeGenerado}
                  onClick={copiarInforme}
                >
                  Copiar informe
                </button>
              </div>

              {informeGenerado ? (
                <div className="relative mt-4">
                  <button
                    className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/95 text-slate-700 shadow-[0_12px_28px_rgba(15,23,42,0.12)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-cyan hover:text-neon-purple hover:shadow-glow-cyan dark:border-white/10 dark:bg-[#0b1220] dark:text-slate-200 dark:hover:text-neon-cyan"
                    type="button"
                    aria-label="Copiar informe"
                    onClick={copiarInforme}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <rect x="9" y="9" width="11" height="11" rx="2.5" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded-2xl border border-slate-200/80 bg-white p-4 pr-16 text-sm leading-6 text-slate-800 dark:border-white/10 dark:bg-[#050814] dark:text-slate-200">
                    {informeGenerado}
                  </pre>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300/80 bg-white/80 px-4 py-5 text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                  Genera un informe para ver aqui el periodo filtrado y poder copiarlo.
                </div>
              )}
            </article>
          </div>
        </article>

        <div className="grid gap-5">
          <article className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)] dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
              Medias semanales
            </p>
            <div className="mt-4 grid gap-3">
              {promediosSemanales.length > 0 ? (
                promediosSemanales.map((semana) => (
                  <div
                    className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-pes-black/50"
                    key={semana.claveSemana}
                  >
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                      {semana.etiqueta}
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                      {formatearPeso(semana.media)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {semana.registros} registros en la semana
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Aun no hay suficientes datos para calcular medias semanales.
                </p>
              )}
            </div>
          </article>

          <div className="lg:hidden">
            <button
              className="w-full rounded-[22px] border border-neon-cyan/30 bg-white px-5 py-4 text-sm font-black uppercase tracking-[0.16em] text-slate-900 shadow-[0_16px_36px_rgba(15,23,42,0.1)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:text-neon-purple hover:shadow-glow-cyan dark:border-white/10 dark:bg-white/[0.04] dark:text-neon-cyan dark:hover:border-neon-pink dark:hover:text-neon-pink"
              type="button"
              onClick={abrirModalInforme}
            >
              Generar informe
            </button>
          </div>

          <article className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)] dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
              Historico
            </p>
            <div className="mt-4 grid gap-3">
              {registros.length > 0 ? (
                registros.map((registro) => (
                  <div
                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-pes-black/50"
                    key={registro.id}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-950 dark:text-white">
                        {formatearFecha(registro.fecha)}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Registro diario de bascula · {formatearHora(registro.horaRegistro)}
                      </p>
                      {registro.comentario ? (
                        <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
                          {registro.comentario}
                        </p>
                      ) : null}
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {registro.syncStatus === 'pending'
                          ? 'Pendiente de sincronizar'
                          : `Version ${registro.version}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-xl font-black text-neon-cyan">{formatearPeso(registro.peso)}</p>
                      <button
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-slate-700 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-cyan hover:text-neon-purple hover:shadow-glow-cyan disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200 dark:hover:text-neon-cyan"
                        type="button"
                        disabled={estaGuardando || estaEliminando}
                        onClick={() => cargarRegistroEnFormulario(registro)}
                      >
                        Editar
                      </button>
                      <button
                        className="rounded-lg border border-neon-pink/40 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-neon-pink transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:text-neon-purple hover:shadow-glow-pink disabled:cursor-not-allowed disabled:opacity-60 dark:border-neon-pink/30 dark:bg-white/[0.04]"
                        type="button"
                        disabled={estaGuardando || estaEliminando}
                        onClick={() => eliminarPeso(registro)}
                      >
                        {estaEliminando ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Todavia no has guardado pesos en este dispositivo.
                </p>
              )}
            </div>
          </article>
        </div>
        </section>
      </main>
      {toast ? (
        <Toast
          key={toast.id}
          mensaje={toast.mensaje}
          tipo={toast.tipo}
          onClose={() => setToast(null)}
        />
      ) : null}
      {estaModalInformeAbierto ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Generar informe de peso"
        >
          <div className="w-full max-w-xl rounded-[28px] border border-neon-cyan/25 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:bg-[#050814]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neon-purple dark:text-neon-cyan">
              Informe de peso
            </p>
            <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
              Selecciona el periodo
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              El informe incluira todos los registros comprendidos entre la fecha inicial y la fecha final.
            </p>

            <div className="mt-6">
              <SelectorRangoInforme
                fechaInicioInforme={fechaInicioInforme}
                fechaFinInforme={fechaFinInforme}
                onChangeInicio={setFechaInicioInforme}
                onChangeFin={setFechaFinInforme}
              />
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                className="rounded-md border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition-all duration-300 ease-out hover:border-cyan-500 hover:text-cyan-700 dark:border-white/10 dark:text-slate-300 dark:hover:border-neon-cyan dark:hover:text-neon-cyan"
                type="button"
                onClick={cerrarModalInforme}
              >
                Cancelar
              </button>
              <button
                className="rounded-md border border-neon-cyan/50 bg-neon-cyan/10 px-4 py-3 text-sm font-bold text-slate-900 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:text-neon-purple hover:shadow-glow-cyan dark:border-neon-cyan/40 dark:bg-transparent dark:text-neon-cyan dark:hover:border-neon-pink dark:hover:text-neon-pink"
                type="button"
                onClick={generarInforme}
              >
                Generar informe
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default Peso
