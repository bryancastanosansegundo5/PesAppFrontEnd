import { useEffect, useMemo, useRef, useState } from 'react'
import MobilePullToRefreshIndicator from '../../components/MobilePullToRefreshIndicator/MobilePullToRefreshIndicator'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'
import {
  crearPlantillaEjercicioVacia,
  guardarCatalogoEjercicios,
  obtenerCatalogoEjercicios,
  reemplazarCatalogoEjerciciosDesdeRemoto,
} from './services/ejerciciosLocalService'
import {
  actualizarEjercicioEnServidor,
  crearEjercicioEnServidor,
  eliminarEjercicioEnServidor,
  obtenerEjerciciosDesdeServidor,
} from './services/ejerciciosApiService'
import {
  recargarCatalogoEjerciciosConSincronizacion,
  sincronizarCatalogoEjerciciosPendientes,
} from '../../services/exercises/exerciseCatalogDataService'

const claseInputNumero =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white'

const claseInputTexto =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white'

const claseCampoCompacto =
  'grid gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/85 p-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:bg-pes-black/45 dark:text-slate-400'

const claseBotonPendientes =
  'rounded-md border px-4 py-3 text-sm font-bold transition-all duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-60'

function marcarEjercicioPendiente(ejercicio) {
  return {
    ...ejercicio,
    esBorrador: !ejercicio.catalogoEjercicioId,
    syncStatus: 'pending',
  }
}

function normalizarTexto(valor) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function crearEstadoAbierto(ejercicios) {
  return Object.fromEntries(ejercicios.map((ejercicio) => [ejercicio.idEjercicio, false]))
}

function quitarEstadoPendiente(ejercicio) {
  return {
    ...ejercicio,
    syncStatus: 'synced',
  }
}

function Ejercicios() {
  const [ejercicios, setEjercicios] = useState(obtenerCatalogoEjercicios)
  const [busqueda, setBusqueda] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [estaRecargando, setEstaRecargando] = useState(false)
  const [guardandoPorId, setGuardandoPorId] = useState({})
  const [estadoPorEjercicio, setEstadoPorEjercicio] = useState({})
  const [estaAbiertoModalPendientes, setEstaAbiertoModalPendientes] = useState(false)
  const [estaSincronizandoPendientes, setEstaSincronizandoPendientes] = useState(false)
  const [pendienteEliminandoId, setPendienteEliminandoId] = useState('')
  const sincronizacionPendientesActivaRef = useRef(null)
  const ultimoEventoConexionRef = useRef(0)
  const [ejerciciosAbiertos, setEjerciciosAbiertos] = useState(() =>
    crearEstadoAbierto(obtenerCatalogoEjercicios()),
  )
  const ejerciciosPendientes = useMemo(
    () => ejercicios.filter((ejercicio) => ejercicio.syncStatus === 'pending'),
    [ejercicios],
  )

  useEffect(() => {
    guardarCatalogoEjercicios(ejercicios)
  }, [ejercicios])

  useEffect(() => {
    const cargarCatalogoInicial = async () => {
      try {
        await sincronizarEjerciciosPendientes()
        const ejerciciosServidor = await obtenerEjerciciosDesdeServidor()
        const ejerciciosActualizados = reemplazarCatalogoEjerciciosDesdeRemoto(ejerciciosServidor)
        setEjercicios(ejerciciosActualizados)
        setEjerciciosAbiertos(crearEstadoAbierto(ejerciciosActualizados))
        setEstadoPorEjercicio({})
        setMensaje('Catalogo recargado desde la base de datos.')
      } catch (errorCapturado) {
        setMensaje(
          `${errorCapturado.message} Se mantiene el catalogo local como respaldo mientras el backend no responde.`,
        )
      }
    }

    cargarCatalogoInicial()
  }, [])

  const ejerciciosFiltrados = useMemo(() => {
    const termino = normalizarTexto(busqueda)

    if (!termino) {
      return ejercicios
    }

    return ejercicios.filter((ejercicio) =>
      [
        ejercicio.nombre,
        ejercicio.descripcion,
        ejercicio.grupoMuscular,
        ejercicio.patronMovimiento,
        ejercicio.equipamiento,
        ejercicio.agarre,
      ].some((valor) => normalizarTexto(valor).includes(termino)),
    )
  }, [busqueda, ejercicios])

  const actualizarEjercicio = (idEjercicio, campo, valor) => {
    setEjercicios((ejerciciosActuales) =>
      ejerciciosActuales.map((ejercicio) =>
        ejercicio.idEjercicio === idEjercicio
          ? marcarEjercicioPendiente({ ...ejercicio, [campo]: valor })
          : ejercicio,
      ),
    )
    setEstadoPorEjercicio((estadoActual) => ({
      ...estadoActual,
      [idEjercicio]: 'Cambios pendientes',
    }))
  }

  const sincronizarEjerciciosPendientes = async () => {
    if (sincronizacionPendientesActivaRef.current) {
      return sincronizacionPendientesActivaRef.current
    }

    sincronizacionPendientesActivaRef.current = sincronizarCatalogoEjerciciosPendientes().finally(
      () => {
        sincronizacionPendientesActivaRef.current = null
      },
    )

    return sincronizacionPendientesActivaRef.current
  }

  const cargarCatalogo = async (silencioso = false) => {
    if (!silencioso) {
      setEstaRecargando(true)
      setMensaje('Recargando ejercicios desde la base de datos...')
    }

    try {
      const resultadoSincronizacion = await recargarCatalogoEjerciciosConSincronizacion()
      setEjercicios(resultadoSincronizacion.ejercicios)
      setEjerciciosAbiertos(crearEstadoAbierto(resultadoSincronizacion.ejercicios))
      setEstadoPorEjercicio({})
      guardarCatalogoEjercicios(resultadoSincronizacion.ejercicios)
      setMensaje(
        resultadoSincronizacion?.sincronizados > 0
          ? `Se sincronizaron ${resultadoSincronizacion.sincronizados} ejercicios pendientes y se recargo el catalogo.`
          : 'Catalogo recargado desde la base de datos.',
      )
    } catch (errorCapturado) {
      setMensaje(
        `${errorCapturado.message} Se mantiene el catalogo local como respaldo mientras el backend no responde.`,
      )
    } finally {
      if (!silencioso) {
        setEstaRecargando(false)
      }
    }
  }

  useEffect(() => {
    let cancelado = false

    const sincronizarAlRecuperarConexion = async () => {
      const ahora = Date.now()

      if (ahora - ultimoEventoConexionRef.current < 1200) {
        return
      }

      ultimoEventoConexionRef.current = ahora
      const resultado = await sincronizarEjerciciosPendientes()

      if (cancelado || !resultado) {
        return
      }

      setEjercicios(resultado.ejercicios)
      setEjerciciosAbiertos((estadoActual) => ({
        ...crearEstadoAbierto(resultado.ejercicios),
        ...estadoActual,
      }))
      setEstadoPorEjercicio({})

      if (resultado.sincronizados > 0) {
        setMensaje(`Se sincronizaron ${resultado.sincronizados} ejercicios pendientes.`)
      }
    }

    window.addEventListener('online', sincronizarAlRecuperarConexion)
    window.addEventListener('pesapp:server-reachable', sincronizarAlRecuperarConexion)

    return () => {
      cancelado = true
      window.removeEventListener('online', sincronizarAlRecuperarConexion)
      window.removeEventListener('pesapp:server-reachable', sincronizarAlRecuperarConexion)
    }
  }, [])

  async function recargarDesdeServidor(silencioso = false) {
    await cargarCatalogo(silencioso)
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

  const agregarEjercicio = () => {
    const nuevoEjercicio = crearPlantillaEjercicioVacia()

    setEjercicios((ejerciciosActuales) => [nuevoEjercicio, ...ejerciciosActuales])
    setEjerciciosAbiertos((ejerciciosAbiertosActuales) => ({
      ...ejerciciosAbiertosActuales,
      [nuevoEjercicio.idEjercicio]: true,
    }))
    setEstadoPorEjercicio((estadoActual) => ({
      ...estadoActual,
      [nuevoEjercicio.idEjercicio]: 'Borrador local',
    }))
  }

  const guardarEjercicio = async (ejercicio) => {
    const idTemporal = ejercicio.idEjercicio

    setGuardandoPorId((estadoActual) => ({ ...estadoActual, [idTemporal]: true }))
    setEstadoPorEjercicio((estadoActual) => ({
      ...estadoActual,
      [idTemporal]: 'Guardando...',
    }))

    try {
      const ejercicioGuardado = ejercicio.catalogoEjercicioId
        ? await actualizarEjercicioEnServidor(ejercicio.catalogoEjercicioId, ejercicio)
        : await crearEjercicioEnServidor(ejercicio)

      setEjercicios((ejerciciosActuales) =>
        ejerciciosActuales.map((item) =>
          item.idEjercicio === idTemporal ? { ...ejercicioGuardado, esBorrador: false } : item,
        ),
      )
      setEjerciciosAbiertos((estadoActual) => {
        const siguienteEstado = { ...estadoActual }
        const estabaAbierto = estadoActual[idTemporal]
        delete siguienteEstado[idTemporal]
        siguienteEstado[ejercicioGuardado.idEjercicio] = estabaAbierto ?? true
        return siguienteEstado
      })
      setEstadoPorEjercicio((estadoActual) => {
        const siguienteEstado = { ...estadoActual }
        delete siguienteEstado[idTemporal]
        siguienteEstado[ejercicioGuardado.idEjercicio] = 'Guardado en servidor'
        return siguienteEstado
      })
      setMensaje('Catalogo sincronizado con el backend.')
    } catch (errorCapturado) {
      setEstadoPorEjercicio((estadoActual) => ({
        ...estadoActual,
        [idTemporal]: `${errorCapturado.message} El borrador local se conserva.`,
      }))
    } finally {
      setGuardandoPorId((estadoActual) => {
        const siguienteEstado = { ...estadoActual }
        delete siguienteEstado[idTemporal]
        return siguienteEstado
      })
    }
  }

  const eliminarEjercicio = async (ejercicio) => {
    const idEjercicio = ejercicio.idEjercicio

    if (!ejercicio.catalogoEjercicioId) {
      setEjercicios((ejerciciosActuales) =>
        ejerciciosActuales.filter((item) => item.idEjercicio !== idEjercicio),
      )
      setEjerciciosAbiertos((estadoActual) => {
        const siguienteEstado = { ...estadoActual }
        delete siguienteEstado[idEjercicio]
        return siguienteEstado
      })
      setEstadoPorEjercicio((estadoActual) => {
        const siguienteEstado = { ...estadoActual }
        delete siguienteEstado[idEjercicio]
        return siguienteEstado
      })
      return
    }

    setGuardandoPorId((estadoActual) => ({ ...estadoActual, [idEjercicio]: true }))

    try {
      await eliminarEjercicioEnServidor(ejercicio.catalogoEjercicioId)
      setEjercicios((ejerciciosActuales) =>
        ejerciciosActuales.filter((item) => item.idEjercicio !== idEjercicio),
      )
      setEjerciciosAbiertos((estadoActual) => {
        const siguienteEstado = { ...estadoActual }
        delete siguienteEstado[idEjercicio]
        return siguienteEstado
      })
      setEstadoPorEjercicio((estadoActual) => {
        const siguienteEstado = { ...estadoActual }
        delete siguienteEstado[idEjercicio]
        return siguienteEstado
      })
      setMensaje('Ejercicio eliminado del backend.')
    } catch (errorCapturado) {
      setEstadoPorEjercicio((estadoActual) => ({
        ...estadoActual,
        [idEjercicio]: `${errorCapturado.message} No se pudo eliminar.`,
      }))
    } finally {
      setGuardandoPorId((estadoActual) => {
        const siguienteEstado = { ...estadoActual }
        delete siguienteEstado[idEjercicio]
        return siguienteEstado
      })
    }
  }

  const alternarEjercicio = (idEjercicio) => {
    setEjerciciosAbiertos((ejerciciosAbiertosActuales) => ({
      ...ejerciciosAbiertosActuales,
      [idEjercicio]: !ejerciciosAbiertosActuales[idEjercicio],
    }))
  }

  const sincronizarPendientesAhora = async () => {
    setEstaSincronizandoPendientes(true)

    try {
      const resultado = await sincronizarEjerciciosPendientes()

      if (!resultado) {
        return
      }

      setEjercicios(resultado.ejercicios)
      setEjerciciosAbiertos((estadoActual) => ({
        ...crearEstadoAbierto(resultado.ejercicios),
        ...estadoActual,
      }))
      setEstadoPorEjercicio({})

      if (resultado.sincronizados > 0) {
        setMensaje(`Se sincronizaron ${resultado.sincronizados} ejercicios pendientes.`)
      } else if (resultado.error) {
        setMensaje(
          `${resultado.error.message} Los ejercicios pendientes siguen guardados en local.`,
        )
      } else {
        setMensaje('No habia ejercicios pendientes por sincronizar.')
      }
    } catch (errorCapturado) {
      setMensaje(
        `${errorCapturado.message} Los ejercicios pendientes siguen guardados en local.`,
      )
    } finally {
      setEstaSincronizandoPendientes(false)
    }
  }

  const eliminarPendiente = async (ejercicioPendiente) => {
    const idPendiente = ejercicioPendiente.idEjercicio
    setPendienteEliminandoId(idPendiente)

    try {
      setEjercicios((ejerciciosActuales) =>
        ejerciciosActuales.map((ejercicio) =>
          ejercicio.idEjercicio === idPendiente ? quitarEstadoPendiente(ejercicio) : ejercicio,
        )
      )
      setEstadoPorEjercicio((estadoActual) => {
        const siguienteEstado = { ...estadoActual }
        delete siguienteEstado[idPendiente]
        return siguienteEstado
      })
      setMensaje(
        'Se ha quitado de la cola de pendientes. El ejercicio sigue en local y ya no se sincronizara automaticamente.',
      )
    } catch (errorCapturado) {
      setMensaje(`${errorCapturado.message} No se pudo quitar este pendiente.`)
    } finally {
      setPendienteEliminandoId('')
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-neon-cyan/30 bg-white p-5 shadow-glow-cyan transition-all duration-300 ease-out dark:bg-white/[0.04]">
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
              Biblioteca de ejercicios
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
              Catalogo base para construir sesiones y entrenos.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Aqui defines la ficha de cada ejercicio. Este catalogo es la fuente que luego
              podras seleccionar tanto en Entreno como en Configurar sesiones.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className={`${claseInputTexto} min-w-72`}
              placeholder="Buscar por nombre, grupo o descripcion..."
              value={busqueda}
              onChange={(evento) => setBusqueda(evento.target.value)}
            />
            <button
              className={`${claseBotonPendientes} border-amber-400/50 text-neon-purple shadow-[0_0_22px_rgba(251,191,36,0.2)] hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink dark:text-amber-300`}
              type="button"
              onClick={() => setEstaAbiertoModalPendientes(true)}
            >
              Pendientes{ejerciciosPendientes.length ? ` (${ejerciciosPendientes.length})` : ''}
            </button>
            <button
              className="hidden rounded-md border border-neon-purple/50 px-4 py-3 text-sm font-bold text-neon-purple shadow-glow-purple transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:text-neon-pink disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex"
              type="button"
              disabled={estaRecargando}
              onClick={() => recargarDesdeServidor()}
            >
              {estaRecargando ? 'Recargando...' : 'Recargar BBDD'}
            </button>
            <button
              className="rounded-md border border-neon-cyan/50 px-4 py-3 text-sm font-bold text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:text-neon-cyan"
              type="button"
              onClick={agregarEjercicio}
            >
              Nuevo ejercicio
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {mensaje ||
            'El catalogo se lee del backend y solo usa el almacenamiento local como respaldo.'}
        </p>
        {gestoRecargaDisponible ? (
          <p className="text-xs text-slate-400 sm:hidden dark:text-slate-500">
            En movil, arriba del todo, mantén el dedo y desliza hacia abajo para recargar.
          </p>
        ) : null}
      </section>

      <section className="grid gap-5">
        {ejerciciosFiltrados.map((ejercicio) => {
          const estaGuardando = Boolean(guardandoPorId[ejercicio.idEjercicio])

          return (
            <article
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out hover:border-neon-cyan/50 hover:shadow-glow-cyan dark:border-white/10 dark:bg-white/[0.04]"
              key={ejercicio.idEjercicio}
            >
              <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  className="min-w-0 flex-1 text-left transition-all duration-300 ease-out hover:text-neon-purple dark:hover:text-neon-cyan"
                  type="button"
                  aria-expanded={Boolean(ejerciciosAbiertos[ejercicio.idEjercicio])}
                  onClick={() => alternarEjercicio(ejercicio.idEjercicio)}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
                    {ejercicio.grupoMuscular || 'Grupo sin definir'}
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                    {ejercicio.nombre || 'Ejercicio sin nombre'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {ejercicio.grupoMuscular || 'Grupo sin definir'}  ·{' '}
                    {ejercicio.seriesPlanificadas}x{ejercicio.repeticionesPlanificadas}
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    ID: {ejercicio.catalogoEjercicioId || 'Pendiente de guardar'}
                  </p>
                </button>

                <div className="flex items-center gap-3">
                  <button
                    className="rounded-md border border-neon-cyan/50 px-3 py-2 text-sm font-bold text-neon-cyan shadow-glow-cyan transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    disabled={estaGuardando}
                    onClick={() => guardarEjercicio(ejercicio)}
                  >
                    {estaGuardando ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    className="rounded-md border border-neon-pink/50 px-3 py-2 text-sm font-bold text-neon-pink shadow-glow-pink transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:text-neon-purple hover:shadow-glow-purple disabled:cursor-not-allowed disabled:opacity-60"
                    type="button"
                    disabled={estaGuardando}
                    onClick={() => eliminarEjercicio(ejercicio)}
                  >
                    Eliminar
                  </button>

                  <button
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-md border border-neon-cyan/40 text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out dark:text-neon-cyan ${
                      ejerciciosAbiertos[ejercicio.idEjercicio]
                        ? 'border-neon-pink text-neon-pink shadow-glow-pink'
                        : ''
                    }`}
                    type="button"
                    aria-label={
                      ejerciciosAbiertos[ejercicio.idEjercicio]
                        ? 'Plegar ejercicio'
                        : 'Desplegar ejercicio'
                    }
                    aria-expanded={Boolean(ejerciciosAbiertos[ejercicio.idEjercicio])}
                    onClick={() => alternarEjercicio(ejercicio.idEjercicio)}
                  >
                    <svg
                      className={`h-5 w-5 transition-transform duration-300 ease-out ${
                        ejerciciosAbiertos[ejercicio.idEjercicio] ? 'rotate-180' : ''
                      }`}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                </div>
              </div>

              <div
                className={`grid transition-[grid-template-rows] duration-500 ease-out ${
                  ejerciciosAbiertos[ejercicio.idEjercicio] ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="grid gap-4 border-t border-slate-200 p-5 dark:border-white/10">
                    <div className="grid gap-4">
                      <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Nombre
                        <input
                          className={claseInputTexto}
                          value={ejercicio.nombre}
                          placeholder="Ej: Press banca"
                          onChange={(evento) =>
                            actualizarEjercicio(ejercicio.idEjercicio, 'nombre', evento.target.value)
                          }
                        />
                      </label>
                      <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Grupo muscular
                        <input
                          className={claseInputTexto}
                          value={ejercicio.grupoMuscular}
                          placeholder="Ej: Pecho"
                          onChange={(evento) =>
                            actualizarEjercicio(
                              ejercicio.idEjercicio,
                              'grupoMuscular',
                              evento.target.value,
                            )
                          }
                        />
                      </label>
                      <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Descripcion
                        <input
                          className={claseInputTexto}
                          value={ejercicio.descripcion}
                          placeholder="Ej: Ejercicio base de empuje horizontal"
                          onChange={(evento) =>
                            actualizarEjercicio(
                              ejercicio.idEjercicio,
                              'descripcion',
                              evento.target.value,
                            )
                          }
                        />
                      </label>
                    </div>

                    <div className="grid gap-3">
                      <div className="grid grid-cols-3 gap-3">
                        <label className={claseCampoCompacto}>
                          Series base
                          <input
                            className={claseInputNumero}
                            type="number"
                            min="0"
                            max="99"
                            value={ejercicio.seriesPlanificadas}
                            placeholder="4"
                            onChange={(evento) =>
                              actualizarEjercicio(
                                ejercicio.idEjercicio,
                                'seriesPlanificadas',
                                evento.target.value,
                              )
                            }
                          />
                        </label>
                        <label className={claseCampoCompacto}>
                          Reps base
                          <input
                            className={claseInputNumero}
                            type="number"
                            min="0"
                            max="99"
                            value={ejercicio.repeticionesPlanificadas}
                            placeholder="8"
                            onChange={(evento) =>
                              actualizarEjercicio(
                                ejercicio.idEjercicio,
                                'repeticionesPlanificadas',
                                evento.target.value,
                              )
                            }
                          />
                        </label>
                        <label className={claseCampoCompacto}>
                          Peso base
                          <input
                            className={claseInputNumero}
                            type="number"
                            min="0"
                            max="999"
                            value={ejercicio.pesoPlanificado}
                            placeholder="80"
                            onChange={(evento) =>
                              actualizarEjercicio(
                                ejercicio.idEjercicio,
                                'pesoPlanificado',
                                evento.target.value,
                              )
                            }
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <label className={claseCampoCompacto}>
                          Altura banco
                          <input
                            className={claseInputTexto}
                            type="text"
                            value={ejercicio.alturaBanco}
                            placeholder="Sin definir"
                            onChange={(evento) =>
                              actualizarEjercicio(
                                ejercicio.idEjercicio,
                                'alturaBanco',
                                evento.target.value,
                              )
                            }
                          />
                        </label>
                        <label className={claseCampoCompacto}>
                          Agarre
                          <input
                            className={claseInputTexto}
                            value={ejercicio.agarre}
                            placeholder="Sin definir"
                            onChange={(evento) =>
                              actualizarEjercicio(
                                ejercicio.idEjercicio,
                                'agarre',
                                evento.target.value,
                              )
                            }
                          />
                        </label>
                      </div>
                    </div>

                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {estadoPorEjercicio[ejercicio.idEjercicio] ||
                        'Edita los campos y usa Guardar para sincronizar con el backend.'}
                    </p>
                  </div>
                </div>
              </div>
            </article>
          )
        })}

        {ejerciciosFiltrados.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500 dark:border-white/15 dark:bg-white/[0.03] dark:text-slate-400">
            No hay ejercicios que coincidan con ese filtro.
          </div>
        ) : null}
      </section>

      {estaAbiertoModalPendientes ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-amber-400/30 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.38)] dark:bg-[#050816]"
            aria-modal="true"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">
                  Pendientes
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                  Cola offline de ejercicios
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Aqui ves los ejercicios guardados en local que aun no han subido al backend.
                </p>
              </div>

              <button
                className="rounded-full border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-neon-pink hover:text-neon-pink dark:border-white/10 dark:text-slate-300"
                type="button"
                onClick={() => setEstaAbiertoModalPendientes(false)}
              >
                Cerrar
              </button>
            </div>

            <div className="flex flex-wrap gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <button
                className="rounded-md border border-neon-cyan/50 px-4 py-3 text-sm font-bold text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink disabled:cursor-not-allowed disabled:opacity-60 dark:text-neon-cyan"
                type="button"
                disabled={estaSincronizandoPendientes}
                onClick={sincronizarPendientesAhora}
              >
                {estaSincronizandoPendientes ? 'Sincronizando...' : 'Sincronizar ahora'}
              </button>
              <p className="self-center text-sm text-slate-500 dark:text-slate-400">
                {ejerciciosPendientes.length === 0
                  ? 'No hay ejercicios pendientes.'
                  : `${ejerciciosPendientes.length} ejercicio${ejerciciosPendientes.length === 1 ? '' : 's'} pendiente${ejerciciosPendientes.length === 1 ? '' : 's'} de subida.`}
              </p>
            </div>

            <div className="max-h-[55vh] overflow-y-auto px-5 py-4">
              {ejerciciosPendientes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                  No hay ejercicios pendientes de sincronizar.
                </div>
              ) : (
                <div className="grid gap-3">
                  {ejerciciosPendientes.map((ejercicio) => (
                    <article
                      className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-pes-black/50"
                      key={ejercicio.idEjercicio}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-500">
                            {ejercicio.catalogoEjercicioId ? 'Edicion pendiente' : 'Borrador local'}
                          </p>
                          <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                            {ejercicio.nombre || 'Ejercicio sin nombre'}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {ejercicio.grupoMuscular || 'Sin grupo'} �{' '}
                            {ejercicio.seriesPlanificadas}x{ejercicio.repeticionesPlanificadas}
                          </p>
                        </div>
                        <div className={claseCampoCompacto}>
                          <span>Identificador local</span>
                          <strong className="text-[12px] normal-case tracking-normal text-slate-700 dark:text-slate-200">
                            {ejercicio.idEjercicio}
                          </strong>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          className="rounded-md border border-neon-pink/50 px-3 py-2 text-sm font-bold text-neon-pink shadow-glow-pink transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:text-neon-purple hover:shadow-glow-purple disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          disabled={pendienteEliminandoId === ejercicio.idEjercicio}
                          onClick={() => eliminarPendiente(ejercicio)}
                        >
                          {pendienteEliminandoId === ejercicio.idEjercicio
                            ? 'Quitando...'
                            : 'Quitar de la cola'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default Ejercicios


