import { useEffect, useMemo, useState } from 'react'
import {
  obtenerRegistroPesoDeHoy,
  obtenerRegistrosPesoGuardados,
} from '../../services/storage/weightStorage'
import {
  cargarRegistrosPeso,
  guardarPesoConRespaldo,
} from '../../services/weight/weightDataService'

const claseInputPeso =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white'

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
    return ''
  }

  const ordenados = [...registros].sort((primero, segundo) => new Date(primero.fecha) - new Date(segundo.fecha))
  const pesos = ordenados.map((registro) => registro.peso)
  const minPeso = Math.min(...pesos)
  const maxPeso = Math.max(...pesos)
  const rango = Math.max(maxPeso - minPeso, 1)
  const ancho = 100
  const alto = 100

  return ordenados
    .map((registro, indice) => {
      const x = ordenados.length === 1 ? 50 : (indice / (ordenados.length - 1)) * ancho
      const y = alto - ((registro.peso - minPeso) / rango) * alto
      return `${x},${y}`
    })
    .join(' ')
}

function Peso() {
  const [registros, setRegistros] = useState(obtenerRegistrosPesoGuardados)
  const [pesoActual, setPesoActual] = useState(() => {
    const registroHoy = obtenerRegistroPesoDeHoy()
    return registroHoy ? String(registroHoy.peso) : ''
  })
  const [mensaje, setMensaje] = useState('')
  const [estaGuardando, setEstaGuardando] = useState(false)
  const [estaRecargando, setEstaRecargando] = useState(false)

  useEffect(() => {
    let cancelado = false

    const cargar = async () => {
      setEstaRecargando(true)

      const resultado = await cargarRegistrosPeso()

      if (cancelado) {
        return
      }

      setRegistros(resultado.registros)

      if (!pesoActual) {
        const registroHoy = resultado.registros.find(
          (registro) => registro.fechaRegistro === obtenerRegistroPesoDeHoy()?.fechaRegistro,
        )
        if (registroHoy) {
          setPesoActual(String(registroHoy.peso))
        }
      }

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
  }, [pesoActual])

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

  const guardarPeso = async () => {
    const pesoNumerico = Number(pesoActual)

    if (!pesoNumerico || pesoNumerico <= 0) {
      setMensaje('Introduce un peso valido para guardar el registro.')
      return
    }

    setEstaGuardando(true)

    try {
      const resultado = await guardarPesoConRespaldo(pesoNumerico)
      setRegistros(resultado.registros)
      setPesoActual(String(pesoNumerico))
      setMensaje(
        resultado.online
          ? 'Peso de hoy guardado y sincronizado con el backend.'
          : `${resultado.error?.message || 'No se pudo sincronizar ahora mismo.'} El registro queda guardado en local.`,
      )
    } catch (errorCapturado) {
      setMensaje(errorCapturado.message || 'No se pudo guardar el peso.')
    } finally {
      setEstaGuardando(false)
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-5 rounded-[28px] border border-neon-cyan/30 bg-white p-5 shadow-glow-cyan lg:grid-cols-[0.8fr_1.2fr] dark:bg-white/[0.04]">
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
              Peso corporal
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
              Registro rapido de bascula
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Guarda el peso del dia en segundos y revisa la tendencia semanal sin salir del flujo.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-pes-black/60">
            <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              Peso de hoy
              <input
                className={claseInputPeso}
                type="number"
                min="0"
                step="0.1"
                placeholder="82.4"
                value={pesoActual}
                onChange={(evento) => setPesoActual(evento.target.value)}
              />
            </label>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                className="rounded-xl border border-neon-cyan/45 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_22px_rgba(0,255,237,0.18)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink disabled:cursor-not-allowed disabled:opacity-60 dark:bg-pes-black dark:text-neon-cyan dark:shadow-glow-cyan"
                type="button"
                disabled={estaGuardando || estaRecargando}
                onClick={guardarPeso}
              >
                {estaGuardando ? 'Guardando...' : estaRecargando ? 'Cargando...' : 'Guardar peso'}
              </button>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {mensaje || 'Si ya existe un registro hoy, lo actualizamos con el nuevo valor.'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <article className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-white/10 dark:bg-white/[0.04]">
            <p className="text-sm text-slate-500 dark:text-slate-400">Ultimo registro</p>
            <p className="mt-3 text-3xl font-black text-slate-950 dark:text-white">
              {ultimoRegistro ? formatearPeso(ultimoRegistro.peso) : '--'}
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {ultimoRegistro ? formatearFecha(ultimoRegistro.fecha) : 'Todavia sin datos'}
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-white/10 dark:bg-white/[0.04]">
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
          <article className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 dark:border-white/10 dark:bg-white/[0.04]">
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
              <svg className="h-64 w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
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
                  points={puntosGrafica}
                  stroke="url(#peso-linea)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
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
                        Registro diario de bascula
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {registro.syncStatus === 'pending'
                          ? 'Pendiente de sincronizar'
                          : `Version ${registro.version}`}
                      </p>
                    </div>
                    <p className="text-xl font-black text-neon-cyan">{formatearPeso(registro.peso)}</p>
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
  )
}

export default Peso
