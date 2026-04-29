import { useEffect, useMemo, useRef, useState } from 'react'
import Toast from '../../components/Toast/Toast'
import WeightTimePicker from '../../components/WeightTimePicker/WeightTimePicker'
import { aHoraRegistro } from '../../services/data/dateUtils'
import { obtenerRegistrosPesoGuardados } from '../../services/storage/weightStorage'
import {
  cargarRegistrosPeso,
  eliminarPesoConRespaldo,
  guardarPesoConRespaldo,
} from '../../services/weight/weightDataService'

const claseInputPesoDestacado =
  'w-full rounded-2xl border border-slate-200/80 bg-[linear-gradient(180deg,rgba(2,6,23,0.96),rgba(0,0,0,0.96))] px-6 py-4 text-center text-4xl font-black tracking-tight text-white outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-[0_0_28px_rgba(0,255,237,0.16)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(1,4,12,0.96),rgba(0,0,0,0.98))]'

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
  const ultimoEventoConexionRef = useRef(0)

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
          ? 'Peso actualizado desde el backend.'
          : resultado.error?.message ||
              'No se pudo refrescar el backend. Se muestran los datos locales disponibles.',
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
            : 'Peso actualizado desde el backend.'
          : resultado.error?.message ||
              'No se pudo refrescar el backend. Se muestran los datos locales disponibles.',
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

  const subirAlInicio = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
      const resultado = await guardarPesoConRespaldo(pesoNumerico, {
        horaRegistro: horaActual,
        horaManual: horaFueEditada,
        comentario: comentarioActual,
        registroExistente: registroEnEdicion,
      })
      setRegistros(resultado.registros)
      const eraEdicion = Boolean(registroEnEdicion)
      reiniciarFormulario()
      setMensaje(
        resultado.online
          ? eraEdicion
            ? 'Medicion actualizada y sincronizada con el backend.'
            : 'Nueva medicion guardada y sincronizada con el backend.'
          : `${resultado.error?.message || 'No se pudo sincronizar ahora mismo.'} El registro queda guardado en local.`,
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
        <section className="grid gap-5 rounded-[28px] border border-neon-cyan/30 bg-white p-5 shadow-glow-cyan lg:grid-cols-[0.92fr_1.08fr] dark:bg-white/[0.04]">
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
                  <div className="rounded-[22px] border border-white/6 bg-[linear-gradient(180deg,rgba(15,23,42,0.4),rgba(2,6,23,0.18))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
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
                    <span className="rounded-full border border-neon-cyan/25 bg-neon-cyan/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-neon-purple dark:text-neon-cyan">
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
                {registroEnEdicion ? (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Version actual: {registroEnEdicion.version}
                  </span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-500 dark:text-slate-400">
                {mensaje ||
                  (registroEnEdicion
                    ? 'Estas editando una medicion existente. Mantendremos su clientId y enviaremos su version.'
                    : 'Si no tocas la hora, guardamos la hora actual. Cada guardado crea una medicion nueva.')}
              </p>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  className="rounded-xl border border-neon-cyan/45 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_22px_rgba(0,255,237,0.18)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink disabled:cursor-not-allowed disabled:opacity-60 dark:bg-pes-black dark:text-neon-cyan dark:shadow-glow-cyan"
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
    </>
  )
}

export default Peso
