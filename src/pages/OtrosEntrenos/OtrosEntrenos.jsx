import { useEffect, useMemo, useState } from 'react'
import MobilePullToRefreshIndicator from '../../components/MobilePullToRefreshIndicator/MobilePullToRefreshIndicator'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'
import { obtenerOtrosEntrenosDesdeServidor } from './services/otrosEntrenosApiService'

function formatearFecha(fecha) {
  if (!fecha) {
    return 'Sin fecha'
  }

  return new Date(fecha).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function normalizarTexto(valor) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function GraficaLineal({ data }) {
  if (!data.length) {
    return (
      <div className="flex h-full min-h-56 items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white/70 text-sm text-slate-500 dark:border-white/10 dark:bg-pes-black/40 dark:text-slate-400">
        Sin suficientes registros para dibujar la grafica.
      </div>
    )
  }

  const width = 680
  const height = 250
  const padding = 28
  const maxValue = Math.max(...data.map((point) => point.valor), 1)
  const stepX = data.length === 1 ? 0 : (width - padding * 2) / (data.length - 1)

  const points = data.map((point, index) => {
    const x = padding + stepX * index
    const y = height - padding - (point.valor / maxValue) * (height - padding * 2)
    return { ...point, x, y }
  })

  const polyline = points.map((point) => `${point.x},${point.y}`).join(' ')

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_16px_34px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-pes-black/40">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
            Grafica lineal
          </p>
          <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
            Peso maximo por sesion
          </h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Pico: {maxValue} kg</p>
      </div>

      <svg
        className="h-auto w-full"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Grafica lineal de progresion por ejercicio"
      >
        <defs>
          <linearGradient id="pesappLineFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,255,237,0.24)" />
            <stop offset="100%" stopColor="rgba(0,255,237,0.02)" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75, 1].map((step) => {
          const y = height - padding - step * (height - padding * 2)
          return (
            <line
              key={step}
              x1={padding}
              x2={width - padding}
              y1={y}
              y2={y}
              stroke="currentColor"
              strokeOpacity="0.12"
            />
          )
        })}

        {points.length > 1 ? (
          <polygon
            points={`${points[0].x},${height - padding} ${polyline} ${points[points.length - 1].x},${height - padding}`}
            fill="url(#pesappLineFill)"
          />
        ) : null}

        <polyline
          fill="none"
          points={polyline}
          stroke="#00FFED"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point) => (
          <g key={point.id}>
            <circle cx={point.x} cy={point.y} fill="#6900FF" r="6" />
            <circle cx={point.x} cy={point.y} fill="#ffffff" r="2.5" />
            <text
              x={point.x}
              y={height - 6}
              textAnchor="middle"
              fontSize="11"
              fill="currentColor"
              opacity="0.7"
            >
              {formatearFecha(point.fecha)}
            </text>
            <text
              x={point.x}
              y={point.y - 12}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill="currentColor"
            >
              {point.valor} kg
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function OtrosEntrenos() {
  const [ejerciciosAgrupados, setEjerciciosAgrupados] = useState([])
  const [mensaje, setMensaje] = useState('')
  const [estaCargandoInicial, setEstaCargandoInicial] = useState(true)
  const [estaRecargando, setEstaRecargando] = useState(false)
  const [acordeonesAbiertos, setAcordeonesAbiertos] = useState({})
  const [busqueda, setBusqueda] = useState('')

  const ejerciciosFiltrados = useMemo(() => {
    const termino = normalizarTexto(busqueda.trim())

    if (!termino) {
      return ejerciciosAgrupados
    }

    return ejerciciosAgrupados.filter((ejercicio) =>
      [
        ejercicio.nombre,
        ejercicio.descripcion,
        ejercicio.grupoMuscular,
        ejercicio.patronMovimiento,
        ejercicio.equipamiento,
        ejercicio.agarre,
      ].some((valor) => normalizarTexto(valor).includes(termino)),
    )
  }, [busqueda, ejerciciosAgrupados])

  useEffect(() => {
    const cargarInicial = async () => {
      setEstaCargandoInicial(true)

      try {
        const ejerciciosServidor = await obtenerOtrosEntrenosDesdeServidor()
        setEjerciciosAgrupados(ejerciciosServidor)
        setMensaje('Historico de ejercicios cargado desde la base de datos.')
      } catch (errorCapturado) {
        setMensaje(errorCapturado.message)
      } finally {
        setEstaCargandoInicial(false)
      }
    }

    cargarInicial()
  }, [])

  const recargarDesdeServidor = async () => {
    setEstaRecargando(true)
    setMensaje('Recargando historico desde la base de datos...')

    try {
      const ejerciciosServidor = await obtenerOtrosEntrenosDesdeServidor()
      setEjerciciosAgrupados(ejerciciosServidor)
      setMensaje('Historico de ejercicios recargado desde la base de datos.')
    } catch (errorCapturado) {
      setMensaje(errorCapturado.message)
    } finally {
      setEstaRecargando(false)
    }
  }

  const {
    isEnabled: _gestoRecargaDisponible,
    isPulling,
    isReady,
    isRefreshing,
    pullDistance,
    progress,
  } =
    usePullToRefresh({
      forceReload: true,
    })

  const ocultarAyudaGesto = true
  const gestoRecargaDisponible = _gestoRecargaDisponible && !ocultarAyudaGesto

  const alternarAcordeon = (idEjercicio) => {
    setAcordeonesAbiertos((estadoActual) => ({
      ...estadoActual,
      [idEjercicio]: !estadoActual[idEjercicio],
    }))
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[28px] border border-neon-purple/25 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:bg-white/[0.04]">
        <MobilePullToRefreshIndicator
          isPulling={isPulling}
          isReady={isReady}
          isRefreshing={isRefreshing}
          pullDistance={pullDistance}
          progress={progress}
        />
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
              Otros entrenos
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
              Revisa tus ejercicios de un vistazo.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Aqui puedes ver cada ejercicio por separado, revisar tus ultimas sesiones y seguir
              facilmente como va evolucionando con el tiempo.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="min-w-72 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white"
              type="text"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Filtrar por ejercicio, grupo, patron o equipo"
            />
            <button
              className="hidden rounded-md border border-neon-purple/50 px-4 py-3 text-sm font-bold text-neon-purple shadow-glow-purple transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:text-neon-pink disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex"
              type="button"
              disabled={estaRecargando}
              onClick={recargarDesdeServidor}
            >
              {estaRecargando ? 'Recargando...' : 'Recargar BBDD'}
            </button>
          </div>
        </div>

        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {mensaje || 'El historico se consulta directamente desde tu cuenta autenticada.'}
        </p>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          {busqueda
            ? `${ejerciciosFiltrados.length} ejercicios coinciden con tu busqueda.`
            : 'Usa el buscador para localizar rapido un ejercicio concreto.'}
        </p>
        {gestoRecargaDisponible ? (
          <p className="mt-2 text-xs text-slate-400 sm:hidden dark:text-slate-500">
            En movil, arriba del todo, manten el dedo y desliza hacia abajo para recargar.
          </p>
        ) : null}
      </section>

      <section className="grid gap-5">
        {ejerciciosFiltrados.map((ejercicio) => {
          const estaAbierto = Boolean(acordeonesAbiertos[ejercicio.id])

          return (
            <article
              className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out hover:border-neon-cyan/45 hover:shadow-glow-cyan dark:border-white/10 dark:bg-white/[0.04]"
              key={ejercicio.id}
            >
              <button
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-all duration-300 ease-out hover:text-neon-purple dark:hover:text-neon-cyan"
                type="button"
                aria-expanded={estaAbierto}
                onClick={() => alternarAcordeon(ejercicio.id)}
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
                    {ejercicio.grupoMuscular || 'Grupo sin definir'}
                  </p>
                  <h2 className="mt-1 truncate text-2xl font-black text-slate-950 dark:text-white">
                    {ejercicio.nombre}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {ejercicio.sesionesTotales} sesiones · ultimo registro{' '}
                    {formatearFecha(ejercicio.ultimoRegistro)}
                  </p>
                </div>

                <span
                  className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-neon-cyan/40 text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out dark:text-neon-cyan ${
                    estaAbierto ? 'rotate-180 border-neon-pink text-neon-pink shadow-glow-pink' : ''
                  }`}
                  aria-hidden="true"
                >
                  <svg
                    className="h-5 w-5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </button>

              <div
                className={`grid transition-[grid-template-rows] duration-500 ease-out ${
                  estaAbierto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="grid gap-5 border-t border-slate-200 p-5 dark:border-white/10">
                    <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
                      <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-pes-black/45">
                        <div className="rounded-[22px] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-pes-black/70">
                          <p className="text-xs font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
                            Nombre ejercicio
                          </p>
                          <h3 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
                            {ejercicio.nombre}
                          </h3>
                          <div className="mt-5 grid gap-3 text-sm text-slate-600 dark:text-slate-400">
                            <p>
                              <span className="font-bold text-slate-950 dark:text-white">
                                Patron:
                              </span>{' '}
                              {ejercicio.patronMovimiento || '-'}
                            </p>
                            <p>
                              <span className="font-bold text-slate-950 dark:text-white">
                                Equipamiento:
                              </span>{' '}
                              {ejercicio.equipamiento || '-'}
                            </p>
                            <p>
                              <span className="font-bold text-slate-950 dark:text-white">
                                Agarre:
                              </span>{' '}
                              {ejercicio.agarre || '-'}
                            </p>
                            <p>
                              <span className="font-bold text-slate-950 dark:text-white">
                                Altura banco:
                              </span>{' '}
                              {ejercicio.alturaBanco || '-'}
                            </p>
                            <p>
                              <span className="font-bold text-slate-950 dark:text-white">
                                Volumen acumulado:
                              </span>{' '}
                              {Math.round(ejercicio.volumenHistorico)} kg
                            </p>
                          </div>
                        </div>
                      </div>

                      <GraficaLineal data={ejercicio.chartData} />
                    </div>

                    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_16px_34px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-pes-black/40">
                      <div className="mb-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
                          Registro por dias
                        </p>
                        <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                          Historial detallado
                        </h3>
                      </div>

                      <div className="grid gap-3">
                        {ejercicio.entradas.map((entrada) => (
                          <div
                            className="grid gap-3 rounded-[22px] border border-slate-200 bg-slate-50/80 p-4 md:grid-cols-[150px_minmax(180px,1fr)_repeat(3,minmax(90px,120px))] md:items-center dark:border-white/10 dark:bg-pes-black/65"
                            key={entrada.id}
                          >
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                                Fecha
                              </p>
                              <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                                {formatearFecha(entrada.fecha)}
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                                Sesion
                              </p>
                              <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                                {entrada.nombreSesion}
                              </p>
                              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {entrada.seriesRealizadas} series · {entrada.repeticionesTotales}{' '}
                                reps
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                                Peso max
                              </p>
                              <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                                {entrada.pesoMaximo} kg
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                                Volumen
                              </p>
                              <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                                {Math.round(entrada.volumenTotal)} kg
                              </p>
                            </div>

                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-500">
                                Plan base
                              </p>
                              <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
                                {entrada.seriesPlanificadas}x{entrada.repeticionesPlanificadas}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          )
        })}

        {estaCargandoInicial ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
            Cargando historico de ejercicios...
          </div>
        ) : null}

        {!estaCargandoInicial && ejerciciosAgrupados.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
            Todavia no hay entrenamientos registrados para construir el historico por ejercicio.
          </div>
        ) : null}

        {!estaCargandoInicial && ejerciciosAgrupados.length > 0 && ejerciciosFiltrados.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
            No hay ejercicios que coincidan con el filtro actual.
          </div>
        ) : null}
      </section>
    </main>
  )
}

export default OtrosEntrenos
