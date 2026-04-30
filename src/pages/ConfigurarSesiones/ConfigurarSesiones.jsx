import { useEffect, useMemo, useRef, useState } from 'react'
import MobilePullToRefreshIndicator from '../../components/MobilePullToRefreshIndicator/MobilePullToRefreshIndicator'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'
import {
  crearEjercicioDesdeCatalogo,
  crearSesionVacia,
  obtenerCatalogoEjerciciosConfiguracion,
  guardarSesionesConfiguracion,
  obtenerSesionesConfiguracion,
  reemplazarCatalogoEjerciciosConfiguracionDesdeRemoto,
  reemplazarSesionesConfiguracionDesdeRemoto,
} from './services/configurarSesionesLocalService'
import {
  eliminarSesionEnServidor,
  guardarSesionEnServidor as guardarSesionEnServidorApi,
} from './services/configurarSesionesApiService'
import { obtenerEjerciciosDesdeServidor } from '../Ejercicios/services/ejerciciosApiService'
import {
  recargarSesionesConSincronizacion,
  sincronizarSesionesPendientes as sincronizarSesionesPendientesService,
} from '../../services/training/trainingSessionDataService'
import { debugSesion, resumirSesionParaLog } from '../../services/debug/sessionSyncDebug'

const claseInputNumero =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white'

const claseInputTexto =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white'

const claseCampoCompacto =
  'grid gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/85 p-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:bg-pes-black/45 dark:text-slate-400'

const claseBotonPendientes =
  'rounded-md border px-4 py-3 text-sm font-bold transition-all duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-60'

function esIdSesionLocal(idSesion) {
  const idNormalizado = String(idSesion || '')

  return !/^\d+$/.test(idNormalizado)
}

function reemplazarSesionGuardada(sesionesActuales, sesionOriginal, sesionGuardada) {
  return sesionesActuales.map((sesionActual) => {
    const coincidePorId = sesionActual.id === sesionOriginal.id
    const coincidePorClientId =
      sesionOriginal.clientId && sesionActual.clientId === sesionOriginal.clientId

    return coincidePorId || coincidePorClientId ? sesionGuardada : sesionActual
  })
}

function esConflictoPorEntrenamientosAsociados(error) {
  const mensaje = String(error?.backendMessage || error?.message || '').toLowerCase()

  return (
    error?.status === 409 &&
    mensaje.includes('no se puede eliminar la sesion porque tiene entrenamientos asociados')
  )
}

function esConflictoDeVersion(error) {
  const mensaje = String(error?.backendMessage || error?.message || '').toLowerCase()

  return error?.status === 409 && mensaje.includes('version')
}

function marcarSesionPendiente(sesion) {
  const updatedAt = new Date().toISOString()

  return {
    ...sesion,
    updatedAt,
    syncStatus: 'pending',
    ejercicios: (sesion.ejercicios || []).map((ejercicio) => ({
      ...ejercicio,
      syncStatus: 'pending',
    })),
  }
}

function normalizarTexto(valor) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function quitarEstadoPendienteSesion(sesion) {
  return {
    ...sesion,
    syncStatus: 'synced',
    ejercicios: (sesion.ejercicios || []).map((ejercicio) => ({
      ...ejercicio,
      syncStatus: 'synced',
    })),
  }
}

function ConfigurarSesiones() {
  const [catalogoEjercicios, setCatalogoEjercicios] = useState(obtenerCatalogoEjerciciosConfiguracion)
  const [sesiones, setSesiones] = useState(obtenerSesionesConfiguracion)
  const [busquedaSesion, setBusquedaSesion] = useState('')
  const [sesionesAbiertas, setSesionesAbiertas] = useState(() => {
    const sesionesIniciales = obtenerSesionesConfiguracion()
    return Object.fromEntries(sesionesIniciales.map((sesion) => [sesion.id, false]))
  })
  const [estadoGuardado, setEstadoGuardado] = useState({})
  const [selectorSesionAbierto, setSelectorSesionAbierto] = useState('')
  const [busquedaEjercicio, setBusquedaEjercicio] = useState('')
  const [estaRecargando, setEstaRecargando] = useState(false)
  const [mensajeGeneral, setMensajeGeneral] = useState('')
  const [sesionPendienteEliminar, setSesionPendienteEliminar] = useState(null)
  const [estaEliminandoSesion, setEstaEliminandoSesion] = useState(false)
  const [estaAbiertoModalPendientes, setEstaAbiertoModalPendientes] = useState(false)
  const [estaSincronizandoPendientes, setEstaSincronizandoPendientes] = useState(false)
  const [pendienteEliminandoId, setPendienteEliminandoId] = useState('')
  const sincronizacionPendientesActivaRef = useRef(null)
  const ultimoEventoConexionRef = useRef(0)
  const sesionesPendientes = useMemo(
    () => sesiones.filter((sesion) => sesion.syncStatus === 'pending'),
    [sesiones],
  )

  useEffect(() => {
    guardarSesionesConfiguracion(sesiones)
  }, [sesiones])

  useEffect(() => {
    const sincronizarCatalogo = async () => {
      try {
        const resultadoSincronizacion = await sincronizarSesionesPendientes()
        if (resultadoSincronizacion?.sincronizados > 0) {
          setSesiones(resultadoSincronizacion.sesiones)
        }

        const catalogoServidor = await obtenerEjerciciosDesdeServidor()
        const catalogoActualizado =
          reemplazarCatalogoEjerciciosConfiguracionDesdeRemoto(catalogoServidor)
        setCatalogoEjercicios(catalogoActualizado)
      } catch (errorCapturado) {
        setMensajeGeneral(
          `${errorCapturado.message} Se mantiene el catalogo local mientras no se pueda leer el backend.`,
        )
      }
    }

    sincronizarCatalogo()
  }, [])

  const agregarSesion = () => {
    const sesion = marcarSesionPendiente(crearSesionVacia())

    debugSesion('agregarSesion local', {
      online: navigator.onLine,
      sesion: resumirSesionParaLog(sesion),
    })

    setSesiones((sesionesActuales) => [sesion, ...sesionesActuales])
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
        sesion.id === idSesion
          ? (() => {
              const sesionActualizada = marcarSesionPendiente({ ...sesion, [campo]: valor })

              debugSesion('actualizarSesion local', {
                online: navigator.onLine,
                idSesion,
                campo,
                valor,
                sesionActualizada: resumirSesionParaLog(sesionActualizada),
              })

              return sesionActualizada
            })()
          : sesion,
      ),
    )
  }

  const sincronizarSesionesPendientes = async () => {
    if (sincronizacionPendientesActivaRef.current) {
      return sincronizacionPendientesActivaRef.current
    }

    sincronizacionPendientesActivaRef.current = sincronizarSesionesPendientesService().finally(() => {
      sincronizacionPendientesActivaRef.current = null
    })

    return sincronizacionPendientesActivaRef.current
  }

  const sincronizarPendientesAhora = async () => {
    setEstaSincronizandoPendientes(true)
    debugSesion('accion manual sincronizarPendientesAhora', {
      online: navigator.onLine,
      pendientesAntes: sesionesPendientes.map(resumirSesionParaLog),
    })

    try {
      const resultado = await sincronizarSesionesPendientes()

      if (!resultado) {
        return
      }

      setSesiones(resultado.sesiones)
      setSesionesAbiertas((estadoActual) =>
        Object.fromEntries(
          resultado.sesiones.map((sesion) => [sesion.id, Boolean(estadoActual[sesion.id])]),
        ),
      )
      setEstadoGuardado({})

      if (resultado.sincronizados > 0) {
        setMensajeGeneral(`Se sincronizaron ${resultado.sincronizados} sesiones pendientes.`)
      } else if (resultado.error) {
        setMensajeGeneral(
          `${resultado.error.message} Las sesiones pendientes siguen guardadas en local.`,
        )
      } else {
        setMensajeGeneral('No habia sesiones pendientes por sincronizar.')
      }
    } catch (errorCapturado) {
      setMensajeGeneral(
        `${errorCapturado.message} Las sesiones pendientes siguen guardadas en local.`,
      )
    } finally {
      setEstaSincronizandoPendientes(false)
    }
  }

  const abrirConfirmacionEliminarSesion = (sesion) => {
    setSesionPendienteEliminar(sesion)
  }

  const cerrarConfirmacionEliminarSesion = () => {
    setSesionPendienteEliminar(null)
  }

  const confirmarEliminarSesion = async () => {
    if (!sesionPendienteEliminar) {
      return
    }

    setEstaEliminandoSesion(true)

    const idSesion = sesionPendienteEliminar.id
    const nombreSesion = sesionPendienteEliminar.nombreSesion || 'la sesion seleccionada'

    try {
      if (!esIdSesionLocal(idSesion)) {
        await eliminarSesionEnServidor(idSesion)
      }

      const sesionesActualizadas = sesiones.filter((sesion) => sesion.id !== idSesion)

      setSesiones(sesionesActualizadas)
      guardarSesionesConfiguracion(sesionesActualizadas)
      setSesionesAbiertas((sesionesAbiertasActuales) => {
        const siguienteEstado = { ...sesionesAbiertasActuales }
        delete siguienteEstado[idSesion]
        return siguienteEstado
      })
      setEstadoGuardado((estadoActual) => {
        const siguienteEstado = { ...estadoActual }
        delete siguienteEstado[idSesion]
        return siguienteEstado
      })
      setSelectorSesionAbierto((valorActual) => (valorActual === idSesion ? '' : valorActual))
      setBusquedaEjercicio('')
      setMensajeGeneral(
        esIdSesionLocal(idSesion)
          ? 'Sesion local eliminada de forma permanente en este dispositivo.'
          : `${nombreSesion} se ha eliminado de la BBDD y del almacenamiento local.`,
      )
      cerrarConfirmacionEliminarSesion()
    } catch (errorCapturado) {
      if (esConflictoPorEntrenamientosAsociados(errorCapturado)) {
        setMensajeGeneral(
          'No se puede eliminar esta sesion porque ya tiene entrenamientos asociados.',
        )
        return
      }

      if (errorCapturado?.status === 404) {
        cerrarConfirmacionEliminarSesion()
        await recargarSesionesDesdeServidor()
        setMensajeGeneral(
          'La sesion ya no existe en el servidor o tu lista estaba desincronizada. Se ha recargado la lista.',
        )
        return
      }

      setMensajeGeneral(
        `${errorCapturado.message} No se ha eliminado la sesion; se mantiene en local y en pantalla.`,
      )
    } finally {
      setEstaEliminandoSesion(false)
    }
  }

  const ejerciciosFiltrados = useMemo(() => {
    const termino = normalizarTexto(busquedaEjercicio)

    return catalogoEjercicios.filter((ejercicio) => {
      if (!termino) return true

      return [
        ejercicio.nombre,
        ejercicio.descripcion,
        ejercicio.grupoMuscular,
        ejercicio.patronMovimiento,
        ejercicio.equipamiento,
      ]
        .some((valor) => normalizarTexto(valor).includes(termino))
    })
  }, [busquedaEjercicio, catalogoEjercicios])

  const sesionesFiltradas = useMemo(() => {
    const termino = normalizarTexto(busquedaSesion)

    if (!termino) {
      return sesiones
    }

    return sesiones.filter((sesion) =>
      [sesion.nombreSesion, ...(sesion.ejercicios || []).map((ejercicio) => ejercicio.nombre)]
        .some((valor) => normalizarTexto(valor).includes(termino)),
    )
  }, [busquedaSesion, sesiones])

  const agregarEjercicio = (idSesion, plantillaEjercicio) => {
    setSesiones((sesionesActuales) =>
      sesionesActuales.map((sesion) =>
        sesion.id === idSesion
          ? marcarSesionPendiente({
              ...sesion,
              ejercicios: [...sesion.ejercicios, crearEjercicioDesdeCatalogo(plantillaEjercicio)],
            })
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
          ? marcarSesionPendiente({
              ...sesion,
              ejercicios: sesion.ejercicios.map((ejercicio) =>
                ejercicio.idEjercicio === idEjercicio
                  ? {
                      ...ejercicio,
                      [campo]: valor,
                      updatedAt: new Date().toISOString(),
                    }
                  : ejercicio,
              ),
            })
          : sesion,
      ),
    )
  }

  const eliminarEjercicio = (idSesion, idEjercicio) => {
    setSesiones((sesionesActuales) =>
      sesionesActuales.map((sesion) =>
        sesion.id === idSesion
          ? marcarSesionPendiente({
              ...sesion,
              ejercicios: sesion.ejercicios.filter(
                (ejercicio) => ejercicio.idEjercicio !== idEjercicio,
              ),
            })
          : sesion,
      ),
    )
  }

  const eliminarPendiente = async (sesionPendiente) => {
    const idPendiente = sesionPendiente.id
    setPendienteEliminandoId(idPendiente)

    try {
      setSesiones((sesionesActuales) =>
        sesionesActuales.map((sesion) =>
          sesion.id === idPendiente ? quitarEstadoPendienteSesion(sesion) : sesion,
        ),
      )
      setEstadoGuardado((estadoActual) => {
        const siguienteEstado = { ...estadoActual }
        delete siguienteEstado[idPendiente]
        return siguienteEstado
      })
      setMensajeGeneral(
        'Se ha quitado de la cola de pendientes. La sesion sigue en local y ya no se sincronizara automaticamente.',
      )
    } catch (errorCapturado) {
      setMensajeGeneral(`${errorCapturado.message} No se pudo quitar este pendiente.`)
    } finally {
      setPendienteEliminandoId('')
    }
  }

  const guardarSesionEnServidor = async (sesion) => {
    debugSesion('guardarSesionEnServidor desde UI', {
      online: navigator.onLine,
      sesion: resumirSesionParaLog(sesion),
    })

    setEstadoGuardado((estadoActual) => ({
      ...estadoActual,
      [sesion.id]: { state: 'saving', text: 'Guardando...' },
    }))

    try {
      const sesionGuardada = await guardarSesionEnServidorApi(sesion)

      setSesiones((sesionesActuales) => {
        const sesionesActualizadas = reemplazarSesionGuardada(
          sesionesActuales,
          sesion,
          sesionGuardada,
        )
        guardarSesionesConfiguracion(sesionesActualizadas)
        return sesionesActualizadas
      })
      setSesionesAbiertas((sesionesAbiertasActuales) => {
        const estaAbierta = Boolean(sesionesAbiertasActuales[sesion.id])

        return {
          ...Object.fromEntries(
            Object.entries(sesionesAbiertasActuales).filter(([clave]) => clave !== sesion.id),
          ),
          [sesionGuardada.id]: estaAbierta,
        }
      })
      setEstadoGuardado((estadoActual) => {
        const siguienteEstado = {
          ...Object.fromEntries(
            Object.entries(estadoActual).filter(([clave]) => clave !== sesion.id),
          ),
        }

        siguienteEstado[sesionGuardada.id] = { state: 'saved', text: 'Guardado en servidor' }
        return siguienteEstado
      })
      setSelectorSesionAbierto((valorActual) =>
        valorActual === sesion.id ? sesionGuardada.id : valorActual,
      )

      if (sesionPendienteEliminar?.id === sesion.id) {
        setSesionPendienteEliminar(sesionGuardada)
      }
    } catch (errorCapturado) {
      setEstadoGuardado((estadoActual) => ({
        ...estadoActual,
        [sesion.id]: {
          state: 'error',
          text: esConflictoDeVersion(errorCapturado)
            ? 'Conflicto de version con el backend. Recarga la sesion para traer la ultima version antes de volver a guardar.'
            : `${errorCapturado.message} Borrador local conservado.`,
        },
      }))
    }
  }

  const recargarSesionesDesdeServidor = async () => {
    setEstaRecargando(true)
    setMensajeGeneral('Recargando sesiones desde la base de datos...')

    try {
      const [resultadoSesiones, catalogoServidor] = await Promise.all([
        recargarSesionesConSincronizacion(),
        obtenerEjerciciosDesdeServidor(),
      ])
      const sesionesServidor = reemplazarSesionesConfiguracionDesdeRemoto(
        resultadoSesiones.sesiones,
      )
      const catalogoFusionado =
        reemplazarCatalogoEjerciciosConfiguracionDesdeRemoto(catalogoServidor)
      setSesiones(sesionesServidor)
      setCatalogoEjercicios(catalogoFusionado)
      setSesionesAbiertas(
        Object.fromEntries(sesionesServidor.map((sesion) => [sesion.id, false])),
      )
      setSelectorSesionAbierto('')
      setBusquedaEjercicio('')
      setMensajeGeneral(
        resultadoSesiones.sincronizados > 0
          ? `Se sincronizaron ${resultadoSesiones.sincronizados} sesiones pendientes y se recargo la configuracion.`
          : 'Sesiones y ejercicios recargados desde la base de datos.',
      )
    } catch (errorCapturado) {
      setMensajeGeneral(
        `${errorCapturado.message} No se pudieron recuperar los datos originales desde la base de datos.`,
      )
    } finally {
      setEstaRecargando(false)
    }
  }

  useEffect(() => {
    let cancelado = false

    const sincronizarAlRecuperarConexion = async () => {
      const ahora = Date.now()

      if (ahora - ultimoEventoConexionRef.current < 1200) {
        debugSesion('evento de reconexion ignorado por debounce', {
          online: navigator.onLine,
        })
        return
      }

      ultimoEventoConexionRef.current = ahora
      debugSesion('evento de reconexion detectado', {
        online: navigator.onLine,
        pendientesActuales: sesiones.filter((sesion) => sesion.syncStatus === 'pending').length,
      })
      const resultado = await sincronizarSesionesPendientes()

      if (cancelado || !resultado) {
        return
      }

      setSesiones(resultado.sesiones)
      setSesionesAbiertas((estadoActual) =>
        Object.fromEntries(
          resultado.sesiones.map((sesion) => [sesion.id, Boolean(estadoActual[sesion.id])]),
        ),
      )
      setEstadoGuardado({})

      if (resultado.sincronizados > 0) {
        setMensajeGeneral(`Se sincronizaron ${resultado.sincronizados} sesiones pendientes.`)
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

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-neon-purple/30 bg-white p-5 shadow-glow-purple transition-all duration-300 ease-out dark:bg-white/[0.04]">
        <MobilePullToRefreshIndicator
          isPulling={isPulling}
          isReady={isReady}
          isRefreshing={isRefreshing}
          pullDistance={pullDistance}
          progress={progress}
        />
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

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <input
              className={`${claseInputTexto} min-w-72`}
              placeholder="Buscar por sesion o ejercicio..."
              value={busquedaSesion}
              onChange={(evento) => setBusquedaSesion(evento.target.value)}
            />
            <button
              className={`${claseBotonPendientes} border-amber-400/50 text-neon-purple shadow-[0_0_22px_rgba(251,191,36,0.2)] hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink dark:text-amber-300`}
              type="button"
              onClick={() => setEstaAbiertoModalPendientes(true)}
            >
              Pendientes{sesionesPendientes.length ? ` (${sesionesPendientes.length})` : ''}
            </button>
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
        {sesionesFiltradas.map((sesion) => {
          const estaAbierta = Boolean(sesionesAbiertas[sesion.id])
          const estado = estadoGuardado[sesion.id]

          return (
            <article
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out hover:border-neon-cyan/50 hover:shadow-glow-cyan dark:border-white/10 dark:bg-white/[0.04]"
              key={sesion.id}
            >
              <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <button
                  className="min-w-0 flex-1 text-left transition-all duration-300 ease-out hover:text-neon-purple dark:hover:text-neon-cyan"
                  type="button"
                  aria-expanded={estaAbierta}
                  onClick={() => alternarSesion(sesion.id)}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
                    Sesion
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                    {sesion.nombreSesion || 'Sesion sin nombre'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {sesion.ejercicios.length} ejercicios configurados
                  </p>
                </button>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    className="rounded-md border border-neon-cyan/45 bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-[0_0_20px_rgba(0,255,237,0.16)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-neon-cyan/45 disabled:hover:text-slate-950 disabled:hover:shadow-[0_0_20px_rgba(0,255,237,0.16)] dark:bg-pes-black dark:text-neon-cyan dark:shadow-glow-cyan dark:focus:ring-offset-pes-black dark:disabled:hover:text-neon-cyan"
                    type="button"
                    disabled={estado?.state === 'saving'}
                    onClick={() => guardarSesionEnServidor(sesion)}
                  >
                    {estado?.state === 'saving' ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-md border border-neon-cyan/40 text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out dark:text-neon-cyan ${
                      estaAbierta ? 'border-neon-pink text-neon-pink shadow-glow-pink' : ''
                    }`}
                    type="button"
                    aria-expanded={estaAbierta}
                    aria-label={estaAbierta ? 'Plegar sesion' : 'Desplegar sesion'}
                    onClick={() => alternarSesion(sesion.id)}
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
                  </button>
                </div>
              </div>

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
                          Añadir ejercicio
                        </button>
                        <button
                          className="rounded-md border border-neon-pink/50 px-3 py-3 text-sm font-bold text-neon-pink shadow-glow-pink transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:text-neon-purple hover:shadow-glow-purple"
                          type="button"
                          onClick={() => abrirConfirmacionEliminarSesion(sesion)}
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
                              {ejercicio.nombre?.trim() || `Ejercicio ${indiceEjercicio + 1}`}
                            </p>
                            <button
                              className="rounded-md border border-neon-pink/50 px-3 py-2 text-sm font-bold text-neon-pink shadow-glow-pink transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:text-neon-purple hover:shadow-glow-purple"
                              type="button"
                              onClick={() => eliminarEjercicio(sesion.id, ejercicio.idEjercicio)}
                            >
                              Quitar
                            </button>
                          </div>

                          <div className="mt-4 grid gap-3">
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
                              Grupo muscular
                              <input
                                className={claseInputTexto}
                                value={ejercicio.grupoMuscular}
                                onChange={(evento) =>
                                  actualizarEjercicio(
                                    sesion.id,
                                    ejercicio.idEjercicio,
                                    'grupoMuscular',
                                    evento.target.value,
                                  )
                                }
                              />
                            </label>

                            <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                              Patron
                              <input
                                className={claseInputTexto}
                                value={ejercicio.patronMovimiento}
                                onChange={(evento) =>
                                  actualizarEjercicio(
                                    sesion.id,
                                    ejercicio.idEjercicio,
                                    'patronMovimiento',
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

                            <div className="grid grid-cols-3 gap-3">
                              <label className={claseCampoCompacto}>
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

                              <label className={claseCampoCompacto}>
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

                              <label className={claseCampoCompacto}>
                                Peso
                                <input
                                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white"
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
                                      sesion.id,
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
                    </div>
                  </div>
                </div>
              </div>
            </article>
          )
        })}

        {sesionesFiltradas.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500 dark:border-white/15 dark:bg-white/[0.03] dark:text-slate-400">
            No hay sesiones que coincidan con ese filtro.
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
                  Cola offline de sesiones
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Aqui ves las sesiones guardadas en local que aun no se han subido al backend.
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
                {sesionesPendientes.length === 0
                  ? 'No hay sesiones pendientes.'
                  : `${sesionesPendientes.length} sesion${sesionesPendientes.length === 1 ? '' : 'es'} pendiente${sesionesPendientes.length === 1 ? '' : 's'} de subida.`}
              </p>
            </div>

            <div className="max-h-[55vh] overflow-y-auto px-5 py-4">
              {sesionesPendientes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                  No hay sesiones pendientes de sincronizar.
                </div>
              ) : (
                <div className="grid gap-3">
                  {sesionesPendientes.map((sesion) => (
                    <article
                      className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-pes-black/50"
                      key={sesion.id}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-500">
                            {esIdSesionLocal(sesion.id) ? 'Borrador local' : 'Edicion pendiente'}
                          </p>
                          <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                            {sesion.nombreSesion || 'Sesion sin nombre'}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {sesion.ejercicios.length} ejercicios configurados
                          </p>
                        </div>
                        <div className={claseCampoCompacto}>
                          <span>Identificador</span>
                          <strong className="text-[12px] normal-case tracking-normal text-slate-700 dark:text-slate-200">
                            {sesion.id}
                          </strong>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          className="rounded-md border border-neon-pink/50 px-3 py-2 text-sm font-bold text-neon-pink shadow-glow-pink transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:text-neon-purple hover:shadow-glow-purple disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          disabled={pendienteEliminandoId === sesion.id}
                          onClick={() => eliminarPendiente(sesion)}
                        >
                          {pendienteEliminandoId === sesion.id
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

      {sesionPendienteEliminar ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-neon-pink/30 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:bg-[#050814]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neon-pink">
              Confirmar eliminacion
            </p>
            <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
              Vas a borrar esta sesion
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Se eliminara de forma persistente en este dispositivo y dejara de aparecer en
              Entreno. Asegurate de que realmente quieres quitar{' '}
              <span className="font-bold text-slate-950 dark:text-white">
                {sesionPendienteEliminar.nombreSesion || 'esta sesion'}
              </span>
              .
            </p>
            <p className="mt-3 rounded-2xl border border-amber-400/35 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
              Esta accion no se puede deshacer desde aqui. Si te equivocas, tendras que recargar
              las sesiones desde la BBDD o volver a crearla manualmente.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                className="rounded-md border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition-all duration-300 ease-out hover:border-neon-cyan hover:text-neon-cyan dark:border-white/10 dark:text-slate-300"
                type="button"
                disabled={estaEliminandoSesion}
                onClick={cerrarConfirmacionEliminarSesion}
              >
                Cancelar
              </button>
              <button
                className="rounded-md border border-neon-pink/50 px-4 py-3 text-sm font-bold text-neon-pink shadow-glow-pink transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:text-neon-purple hover:shadow-glow-purple"
                type="button"
                disabled={estaEliminandoSesion}
                onClick={confirmarEliminarSesion}
              >
                {estaEliminandoSesion ? 'Eliminando...' : 'Eliminar para siempre'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default ConfigurarSesiones
