import { useEffect, useMemo, useState } from 'react'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'
import {
  crearEjercicioDesdeCatalogo,
  crearSesionVacia,
  guardarCatalogoEjerciciosConfiguracion,
  obtenerCatalogoEjerciciosConfiguracion,
  guardarSesionesConfiguracion,
  obtenerSesionesConfiguracion,
} from './services/configurarSesionesLocalService'
import {
  guardarSesionEnServidor as guardarSesionEnServidorApi,
  obtenerSesionesDesdeServidor,
} from './services/configurarSesionesApiService'
import { obtenerEjerciciosDesdeServidor } from '../Ejercicios/services/ejerciciosApiService'

const claseInputNumero =
  'w-20 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white'

const claseInputTexto =
  'rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white'

function ConfigurarSesiones() {
  const [catalogoEjercicios, setCatalogoEjercicios] = useState(obtenerCatalogoEjerciciosConfiguracion)
  const [sesiones, setSesiones] = useState(obtenerSesionesConfiguracion)
  const [sesionesAbiertas, setSesionesAbiertas] = useState(() => {
    const sesionesIniciales = obtenerSesionesConfiguracion()
    return Object.fromEntries(sesionesIniciales.map((sesion, indice) => [sesion.id, indice === 0]))
  })
  const [estadoGuardado, setEstadoGuardado] = useState({})
  const [selectorSesionAbierto, setSelectorSesionAbierto] = useState('')
  const [busquedaEjercicio, setBusquedaEjercicio] = useState('')
  const [estaRecargando, setEstaRecargando] = useState(false)
  const [mensajeGeneral, setMensajeGeneral] = useState('')

  useEffect(() => {
    guardarSesionesConfiguracion(sesiones)
  }, [sesiones])

  useEffect(() => {
    const sincronizarCatalogo = async () => {
      try {
        const catalogoServidor = await obtenerEjerciciosDesdeServidor()
        setCatalogoEjercicios(catalogoServidor)
        guardarCatalogoEjerciciosConfiguracion(catalogoServidor)
      } catch (errorCapturado) {
        setMensajeGeneral(
          `${errorCapturado.message} Se mantiene el catalogo local mientras no se pueda leer el backend.`,
        )
      }
    }

    sincronizarCatalogo()
  }, [])

  const agregarSesion = () => {
    const sesion = crearSesionVacia()

    setSesiones((sesionesActuales) => [...sesionesActuales, sesion])
    setSesionesAbiertas((sesionesAbiertasActuales) => ({
      ...sesionesAbiertasActuales,
      [sesion.id]: true,
    }))
  }

  const alternarSesion = (idSesion) => {
    setSesionesAbiertas((sesionesAbiertasActuales) => ({
      ...sesionesAbiertasActuales,
      [idSesion]: !sesionesAbiertasActuales[idSesion],
    }))
  }

  const actualizarSesion = (idSesion, campo, valor) => {
    setSesiones((sesionesActuales) =>
      sesionesActuales.map((sesion) =>
        sesion.id === idSesion ? { ...sesion, [campo]: valor } : sesion,
      ),
    )
  }

  const eliminarSesion = (idSesion) => {
    setSesiones((sesionesActuales) =>
      sesionesActuales.filter((sesion) => sesion.id !== idSesion),
    )
  }

  const ejerciciosFiltrados = useMemo(() => {
    const termino = busquedaEjercicio.trim().toLowerCase()

    return catalogoEjercicios.filter((ejercicio) => {
      if (!termino) return true

      return [
        ejercicio.nombre,
        ejercicio.descripcion,
        ejercicio.grupoMuscular,
        ejercicio.patronMovimiento,
        ejercicio.equipamiento,
      ]
        .join(' ')
        .toLowerCase()
        .includes(termino)
    })
  }, [busquedaEjercicio, catalogoEjercicios])

  const agregarEjercicio = (idSesion, plantillaEjercicio) => {
    setSesiones((sesionesActuales) =>
      sesionesActuales.map((sesion) =>
        sesion.id === idSesion
          ? {
              ...sesion,
              ejercicios: [...sesion.ejercicios, crearEjercicioDesdeCatalogo(plantillaEjercicio)],
            }
          : sesion,
      ),
    )
    setSelectorSesionAbierto('')
    setBusquedaEjercicio('')
  }

  const agregarEjercicioManual = (idSesion) => {
    agregarEjercicio(idSesion, {
      idEjercicio: `manual-${Date.now()}`,
      catalogoEjercicioId: '',
      nombre: 'Nuevo ejercicio',
      descripcion: '',
      grupoMuscular: '',
      patronMovimiento: '',
      equipamiento: '',
      seriesPlanificadas: 4,
      repeticionesPlanificadas: 10,
      pesoPlanificado: 0,
      alturaBanco: '',
      agarre: '',
    })
  }

  const actualizarEjercicio = (idSesion, idEjercicio, campo, valor) => {
    setSesiones((sesionesActuales) =>
      sesionesActuales.map((sesion) =>
        sesion.id === idSesion
          ? {
              ...sesion,
              ejercicios: sesion.ejercicios.map((ejercicio) =>
                ejercicio.idEjercicio === idEjercicio
                  ? { ...ejercicio, [campo]: valor }
                  : ejercicio,
              ),
            }
          : sesion,
      ),
    )
  }

  const eliminarEjercicio = (idSesion, idEjercicio) => {
    setSesiones((sesionesActuales) =>
      sesionesActuales.map((sesion) =>
        sesion.id === idSesion
          ? {
              ...sesion,
              ejercicios: sesion.ejercicios.filter(
                (ejercicio) => ejercicio.idEjercicio !== idEjercicio,
              ),
            }
          : sesion,
      ),
    )
  }

  const guardarSesionEnServidor = async (sesion) => {
    setEstadoGuardado((estadoActual) => ({
      ...estadoActual,
      [sesion.id]: { state: 'saving', text: 'Guardando...' },
    }))

    try {
      await guardarSesionEnServidorApi(sesion)

      setEstadoGuardado((estadoActual) => ({
        ...estadoActual,
        [sesion.id]: { state: 'saved', text: 'Guardado en servidor' },
      }))
    } catch (errorCapturado) {
      setEstadoGuardado((estadoActual) => ({
        ...estadoActual,
        [sesion.id]: {
          state: 'error',
          text: `${errorCapturado.message} Borrador local conservado.`,
        },
      }))
    }
  }

  const recargarSesionesDesdeServidor = async () => {
    setEstaRecargando(true)
    setMensajeGeneral('Recargando sesiones desde la base de datos...')

    try {
      const [sesionesServidor, catalogoServidor] = await Promise.all([
        obtenerSesionesDesdeServidor(),
        obtenerEjerciciosDesdeServidor(),
      ])
      setSesiones(sesionesServidor)
      setCatalogoEjercicios(catalogoServidor)
      setSesionesAbiertas(
        Object.fromEntries(
          sesionesServidor.map((sesion, indice) => [sesion.id, indice === 0]),
        ),
      )
      guardarSesionesConfiguracion(sesionesServidor)
      guardarCatalogoEjerciciosConfiguracion(catalogoServidor)
      setSelectorSesionAbierto('')
      setBusquedaEjercicio('')
      setMensajeGeneral('Sesiones y ejercicios recargados desde la base de datos.')
    } catch (errorCapturado) {
      setMensajeGeneral(
        `${errorCapturado.message} No se pudieron recuperar los datos originales desde la base de datos.`,
      )
    } finally {
      setEstaRecargando(false)
    }
  }

  const { isEnabled: gestoRecargaDisponible, isPulling, isReady, isRefreshing } =
    usePullToRefresh({
      onRefresh: recargarSesionesDesdeServidor,
    })

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <div
        className={`sm:hidden ${isPulling || isRefreshing ? 'block' : 'hidden'}`}
      >
        <div className="flex justify-center">
          <div className="rounded-full border border-neon-cyan/35 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-[0_10px_26px_rgba(15,23,42,0.08)] dark:bg-[#0B0D14] dark:text-slate-200">
            {isRefreshing
              ? 'Recargando...'
              : isReady
                ? 'Suelta para recargar'
                : 'Desliza hacia abajo para recargar'}
          </div>
        </div>
      </div>

      <section className="rounded-lg border border-neon-purple/30 bg-white p-5 shadow-glow-purple transition-all duration-300 ease-out dark:bg-white/[0.04]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-pink">
              Configurar sesiones
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
              Plantillas base de entrenamiento
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Define los grupos que apareceran en Entreno. Cada tarjeta se puede plegar para
              trabajar sin tanto scroll.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="hidden rounded-md border border-neon-purple/50 px-4 py-3 text-sm font-bold text-neon-purple shadow-glow-purple transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:text-neon-pink disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex"
              type="button"
              disabled={estaRecargando}
              onClick={recargarSesionesDesdeServidor}
            >
              {estaRecargando ? 'Recargando...' : 'Recargar BBDD'}
            </button>
            <button
              className="rounded-md border border-neon-cyan/50 px-4 py-3 text-sm font-bold text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:text-neon-cyan"
              type="button"
              onClick={agregarSesion}
            >
              Nueva sesion
            </button>
          </div>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {mensajeGeneral ||
            'Si te equivocas, puedes recargar las sesiones y ejercicios originales desde la base de datos.'}
        </p>
        {gestoRecargaDisponible ? (
          <p className="text-xs text-slate-400 sm:hidden dark:text-slate-500">
            En movil, arriba del todo, mantén el dedo y desliza hacia abajo para recargar.
          </p>
        ) : null}
      </section>

      <section className="grid gap-5">
        {sesiones.map((sesion) => {
          const estaAbierta = Boolean(sesionesAbiertas[sesion.id])
          const estado = estadoGuardado[sesion.id]

          return (
            <article
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out hover:border-neon-cyan/50 hover:shadow-glow-cyan dark:border-white/10 dark:bg-white/[0.04]"
              key={sesion.id}
            >
              <button
                className="flex w-full flex-col gap-3 px-5 py-4 text-left transition-all duration-300 ease-out hover:text-neon-purple dark:hover:text-neon-cyan sm:flex-row sm:items-center sm:justify-between"
                type="button"
                aria-expanded={estaAbierta}
                onClick={() => alternarSesion(sesion.id)}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
                    Sesion
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                    {sesion.nombreSesion || 'Sesion sin nombre'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {sesion.ejercicios.length} ejercicios configurados
                  </p>
                </div>

                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-md border border-neon-cyan/40 text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out dark:text-neon-cyan ${
                    estaAbierta ? 'border-neon-pink text-neon-pink shadow-glow-pink' : ''
                  }`}
                  aria-hidden="true"
                >
                  <svg
                    className={`h-5 w-5 transition-transform duration-300 ease-out ${estaAbierta ? 'rotate-180' : ''}`}
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
                  estaAbierta ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="grid gap-5 border-t border-slate-200 p-5 dark:border-white/10">
                    <div className="grid gap-4 md:grid-cols-[minmax(240px,1fr)_auto] md:items-end">
                      <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Nombre del entreno
                        <input
                          className={`${claseInputTexto} py-3 text-base font-bold`}
                          value={sesion.nombreSesion}
                          onChange={(evento) =>
                            actualizarSesion(sesion.id, 'nombreSesion', evento.target.value)
                          }
                        />
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-md border border-neon-cyan/50 px-3 py-3 text-sm font-bold text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:text-neon-cyan"
                          type="button"
                          onClick={() =>
                            setSelectorSesionAbierto((valorActual) =>
                              valorActual === sesion.id ? '' : sesion.id,
                            )
                          }
                        >
                          Anadir ejercicio
                        </button>
                        <button
                          className="rounded-md border border-neon-pink/50 px-3 py-3 text-sm font-bold text-neon-pink shadow-glow-pink transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:text-neon-purple hover:shadow-glow-purple"
                          type="button"
                          onClick={() => eliminarSesion(sesion.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>

                    {selectorSesionAbierto === sesion.id ? (
                      <div className="grid gap-3 rounded-lg border border-neon-cyan/30 bg-slate-50 p-4 dark:bg-pes-black/40">
                        <input
                          className={claseInputTexto}
                          placeholder="Buscar en el catalogo..."
                          value={busquedaEjercicio}
                          onChange={(evento) => setBusquedaEjercicio(evento.target.value)}
                        />

                        <div className="max-h-72 overflow-y-auto rounded-md border border-slate-200 dark:border-white/10">
                          {ejerciciosFiltrados.map((ejercicioCatalogo) => (
                            <button
                              className="w-full border-b border-slate-200 px-4 py-3 text-left transition-all duration-200 last:border-b-0 hover:bg-neon-cyan/10 dark:border-white/10 dark:hover:bg-neon-purple/10"
                              key={ejercicioCatalogo.idEjercicio}
                              type="button"
                              onClick={() => agregarEjercicio(sesion.id, ejercicioCatalogo)}
                            >
                              <p className="text-sm font-bold text-slate-900 dark:text-white">
                                {ejercicioCatalogo.nombre}
                              </p>
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                                {ejercicioCatalogo.grupoMuscular || 'Sin grupo'} ·{' '}
                                {ejercicioCatalogo.equipamiento || 'Sin equipo'} ·{' '}
                                {ejercicioCatalogo.seriesPlanificadas}x
                                {ejercicioCatalogo.repeticionesPlanificadas}
                              </p>
                            </button>
                          ))}
                        </div>

                        <div className="flex justify-end gap-2">
                          <button
                            className="rounded-md border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:border-neon-pink hover:text-neon-pink dark:border-white/10 dark:text-slate-300"
                            type="button"
                            onClick={() => setSelectorSesionAbierto('')}
                          >
                            Cerrar
                          </button>
                          <button
                            className="rounded-md border border-neon-purple/50 px-3 py-2 text-xs font-bold text-neon-purple hover:border-neon-pink hover:text-neon-pink dark:text-neon-pink"
                            type="button"
                            onClick={() => agregarEjercicioManual(sesion.id)}
                          >
                            Crear manual
                          </button>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-4">
                      {sesion.ejercicios.map((ejercicio, indiceEjercicio) => (
                        <div
                          className="rounded-lg border border-slate-200 p-4 transition-all duration-300 ease-out hover:border-neon-purple/50 hover:shadow-glow-purple dark:border-white/10"
                          key={ejercicio.idEjercicio}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-bold text-neon-purple dark:text-neon-cyan">
                              Ejercicio {indiceEjercicio + 1}
                            </p>
                            <button
                              className="rounded-md border border-neon-pink/50 px-3 py-2 text-sm font-bold text-neon-pink shadow-glow-pink transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:text-neon-purple hover:shadow-glow-purple"
                              type="button"
                              onClick={() => eliminarEjercicio(sesion.id, ejercicio.idEjercicio)}
                            >
                              Quitar
                            </button>
                          </div>

                          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,0.9fr)_minmax(260px,1.4fr)_80px_80px_90px_110px_minmax(150px,0.8fr)] lg:items-end">
                            <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                              Nombre
                              <input
                                className={claseInputTexto}
                                value={ejercicio.nombre}
                                onChange={(evento) =>
                                  actualizarEjercicio(
                                    sesion.id,
                                    ejercicio.idEjercicio,
                                    'nombre',
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
                                onChange={(evento) =>
                                  actualizarEjercicio(
                                    sesion.id,
                                    ejercicio.idEjercicio,
                                    'descripcion',
                                    evento.target.value,
                                  )
                                }
                              />
                            </label>

                            <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                              Series
                              <input
                                className={claseInputNumero}
                                type="number"
                                min="0"
                                max="99"
                                value={ejercicio.seriesPlanificadas}
                                onChange={(evento) =>
                                  actualizarEjercicio(
                                    sesion.id,
                                    ejercicio.idEjercicio,
                                    'seriesPlanificadas',
                                    evento.target.value,
                                  )
                                }
                              />
                            </label>

                            <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                              Reps
                              <input
                                className={claseInputNumero}
                                type="number"
                                min="0"
                                max="99"
                                value={ejercicio.repeticionesPlanificadas}
                                onChange={(evento) =>
                                  actualizarEjercicio(
                                    sesion.id,
                                    ejercicio.idEjercicio,
                                    'repeticionesPlanificadas',
                                    evento.target.value,
                                  )
                                }
                              />
                            </label>

                            <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                              Peso
                              <input
                                className="w-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white"
                                type="number"
                                min="0"
                                max="999"
                                value={ejercicio.pesoPlanificado}
                                onChange={(evento) =>
                                  actualizarEjercicio(
                                    sesion.id,
                                    ejercicio.idEjercicio,
                                    'pesoPlanificado',
                                    evento.target.value,
                                  )
                                }
                              />
                            </label>

                            <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                              Altura banco
                              <input
                                className="w-28 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white"
                                type="number"
                                min="0"
                                max="999"
                                value={ejercicio.alturaBanco}
                                onChange={(evento) =>
                                  actualizarEjercicio(
                                    sesion.id,
                                    ejercicio.idEjercicio,
                                    'alturaBanco',
                                    evento.target.value,
                                  )
                                }
                              />
                            </label>

                            <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                              Agarre
                              <input
                                className={`${claseInputTexto} min-w-36`}
                                value={ejercicio.agarre}
                                onChange={(evento) =>
                                  actualizarEjercicio(
                                    sesion.id,
                                    ejercicio.idEjercicio,
                                    'agarre',
                                    evento.target.value,
                                  )
                                }
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p
                        className={`text-sm ${
                          estado?.state === 'error'
                            ? 'text-neon-pink'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {estado?.text || 'Los cambios quedan como borrador local hasta guardar.'}
                      </p>

                      <button
                        className="self-end rounded-md border border-neon-cyan/45 bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(0,255,237,0.16)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-neon-cyan/45 disabled:hover:text-slate-950 disabled:hover:shadow-[0_0_20px_rgba(0,255,237,0.16)] dark:bg-pes-black dark:text-neon-cyan dark:shadow-glow-cyan dark:focus:ring-offset-pes-black dark:disabled:hover:text-neon-cyan"
                        type="button"
                        disabled={estado?.state === 'saving'}
                        onClick={() => guardarSesionEnServidor(sesion)}
                      >
                        {estado?.state === 'saving' ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </section>
    </main>
  )
}

export default ConfigurarSesiones
