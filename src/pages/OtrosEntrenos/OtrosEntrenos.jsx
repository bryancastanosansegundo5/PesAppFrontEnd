import { useEffect, useMemo, useRef, useState } from 'react'
import MobilePullToRefreshIndicator from '../../components/MobilePullToRefreshIndicator/MobilePullToRefreshIndicator'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'
import { obtenerEntrenamientosDesdeServidor } from '../Entreno/services/entrenoApiService'
import {
  obtenerHistorialEntrenos,
  reemplazarHistorialEntrenosDesdeRemoto,
} from '../Entreno/services/entrenoLocalService'
import { sincronizarDatosOfflineEnOrden } from '../../services/sync/offlineSyncService'
import {
  actualizarEntrenamientoConRespaldo,
  eliminarEntrenamientoConRespaldo,
  sincronizarEntrenamientosPendientes,
} from '../../services/training/trainingDataService'
import {
  filtrarHistorialVisible,
  normalizarSesion,
} from '../../services/training/trainingModel'

const TAB_CONFIG = [
  { id: 'ejercicios', label: 'Ejercicios' },
  { id: 'entrenos', label: 'Entrenos' },
]

const claseInput =
  'w-full rounded-md border border-neon-cyan/35 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-pink focus:shadow-glow-pink dark:border-white/10 dark:bg-pes-black/90 dark:text-white'

const claseInputNumero = `${claseInput} text-center`

function clonarDatos(valor) {
  return JSON.parse(JSON.stringify(valor))
}

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

function formatearFechaHora(fecha) {
  if (!fecha) {
    return 'Sin fecha'
  }

  const valorFecha = new Date(fecha)

  if (Number.isNaN(valorFecha.getTime())) {
    return 'Sin fecha'
  }

  return valorFecha.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function normalizarTexto(valor) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function construirDatosGrafica(ejercicio) {
  const puntosDesdeSeries = ejercicio.entradas.flatMap((entrada, indiceEntrada) => {
    if (!Array.isArray(entrada.seriesDetalle) || !entrada.seriesDetalle.length) {
      return []
    }

    return entrada.seriesDetalle.map((serie, indiceSerie) => ({
      id: `${entrada.id || `entrada-${indiceEntrada + 1}`}-serie-${serie.id || indiceSerie + 1}`,
      fecha: entrada.fecha,
      valor: Number(serie.peso) || 0,
    }))
  })

  return puntosDesdeSeries
}

function construirHistoricoEjercicios(historial) {
  const mapa = new Map()

  filtrarHistorialVisible(historial).forEach((entrenamiento, indiceEntrenamiento) => {
    ;(entrenamiento.ejercicios || []).forEach((ejercicio, indiceEjercicio) => {
      const clave = String(
        ejercicio.catalogoEjercicioId || ejercicio.nombre || ejercicio.idEjercicio || ejercicio.id,
      )

      if (!mapa.has(clave)) {
        mapa.set(clave, {
          id: clave,
          nombre: ejercicio.nombre || 'Ejercicio sin nombre',
          descripcion: ejercicio.descripcion || '',
          grupoMuscular: ejercicio.grupoMuscular || '',
          patronMovimiento: ejercicio.patronMovimiento || '',
          equipamiento: ejercicio.equipamiento || '',
          agarre: ejercicio.agarre || '',
          alturaBanco:
            ejercicio.alturaBanco === null || ejercicio.alturaBanco === undefined
              ? ''
              : String(ejercicio.alturaBanco),
          sesionesTotales: 0,
          ultimoRegistro: '',
          pesoMaximoHistorico: 0,
          volumenHistorico: 0,
          chartData: [],
          entradas: [],
        })
      }

      const acumulado = mapa.get(clave)
      const fechaEntrada =
        entrenamiento.fechaFin || entrenamiento.fechaInicio || entrenamiento.updatedAt || ''
      const seriesDetalle = (ejercicio.seriesRealizadas || []).map((serie, indiceSerie) => ({
        id:
          serie.id ||
          `${entrenamiento.clientId || indiceEntrenamiento}-${ejercicio.idEjercicio || indiceEjercicio}-serie-${indiceSerie + 1}`,
        numeroSerie: Number(serie.numeroSerie) || indiceSerie + 1,
        repeticiones: Number(serie.repeticiones) || 0,
        peso: Number(serie.peso) || 0,
      }))
      const repeticionesTotales = seriesDetalle.reduce(
        (total, serie) => total + (Number(serie.repeticiones) || 0),
        0,
      )
      const volumenTotal = seriesDetalle.reduce(
        (total, serie) => total + (Number(serie.repeticiones) || 0) * (Number(serie.peso) || 0),
        0,
      )
      const pesoMaximo = seriesDetalle.reduce(
        (maximo, serie) => Math.max(maximo, Number(serie.peso) || 0),
        0,
      )

      acumulado.sesionesTotales += 1
      acumulado.ultimoRegistro =
        !acumulado.ultimoRegistro || new Date(fechaEntrada) > new Date(acumulado.ultimoRegistro)
          ? fechaEntrada
          : acumulado.ultimoRegistro
      acumulado.pesoMaximoHistorico = Math.max(acumulado.pesoMaximoHistorico, pesoMaximo)
      acumulado.volumenHistorico += volumenTotal
      acumulado.chartData.push(
        ...seriesDetalle.map((serie) => ({
          id: `${fechaEntrada}-${serie.id}`,
          fecha: fechaEntrada,
          valor: Number(serie.peso) || 0,
        })),
      )
      acumulado.entradas.push({
        id: `${entrenamiento.clientId || entrenamiento.id}-${ejercicio.idEjercicio || indiceEjercicio}`,
        entrenamientoId: entrenamiento.clientId || entrenamiento.id,
        fecha: fechaEntrada,
        nombreSesion: entrenamiento.nombreSesion || 'Sesion',
        seriesPlanificadas: Number(ejercicio.seriesPlanificadas) || 0,
        repeticionesPlanificadas: Number(ejercicio.repeticionesPlanificadas) || 0,
        pesoPlanificado: Number(ejercicio.pesoPlanificado) || 0,
        alturaBanco:
          ejercicio.alturaBanco === null || ejercicio.alturaBanco === undefined
            ? ''
            : String(ejercicio.alturaBanco),
        agarre: ejercicio.agarre || '',
        seriesRealizadas: seriesDetalle.length,
        repeticionesTotales,
        volumenTotal,
        pesoMaximo,
        seriesDetalle,
      })
    })
  })

  return Array.from(mapa.values())
    .map((ejercicio) => ({
      ...ejercicio,
      chartData: ejercicio.chartData.sort(
        (primero, segundo) => new Date(primero.fecha || 0) - new Date(segundo.fecha || 0),
      ),
      entradas: ejercicio.entradas.sort(
        (primero, segundo) => new Date(segundo.fecha || 0) - new Date(primero.fecha || 0),
      ),
    }))
    .sort((primero, segundo) => {
      const diferenciaSesiones = segundo.sesionesTotales - primero.sesionesTotales

      if (diferenciaSesiones !== 0) {
        return diferenciaSesiones
      }

      return new Date(segundo.ultimoRegistro || 0) - new Date(primero.ultimoRegistro || 0)
    })
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
    <div className="flex h-full flex-col rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_16px_34px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-pes-black/40">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
            Grafica lineal
          </p>
          <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
            Todos los pesos registrados
          </h3>
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Pico: {maxValue} kg</p>
      </div>

      <svg
        className="h-auto w-full flex-1"
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

function TabButton({ activa, onClick, label }) {
  return (
    <button
      className={`flex-1 rounded-t-[22px] border border-b-0 px-4 py-4 text-center text-base font-black transition-all duration-300 ease-out sm:text-lg ${
        activa
          ? 'border-neon-cyan/35 bg-gradient-to-b from-[#0B162B] to-[#08101E] text-neon-cyan shadow-[0_-10px_30px_rgba(34,211,238,0.12)]'
          : 'border-transparent bg-transparent text-slate-500 hover:bg-white/5 hover:text-neon-pink dark:text-slate-400 dark:hover:text-neon-pink'
      }`}
      type="button"
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function BadgeEstado({ entrenamiento }) {
  const pendiente = entrenamiento.syncStatus === 'pending'
  const eliminando = entrenamiento.pendingAction === 'delete'

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
        pendiente
          ? 'border-neon-orange/40 bg-neon-orange/10 text-neon-orange'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
      }`}
    >
      {pendiente ? (eliminando ? 'Borrado pendiente' : 'Pendiente sync') : 'Sincronizado'}
    </span>
  )
}

function OtrosEntrenos() {
  const [tabActiva, setTabActiva] = useState('ejercicios')
  const [historial, setHistorial] = useState(obtenerHistorialEntrenos)
  const [mensaje, setMensaje] = useState('')
  const [estaCargandoInicial, setEstaCargandoInicial] = useState(true)
  const [estaRecargando, setEstaRecargando] = useState(false)
  const [entrenamientoAbierto, setEntrenamientoAbierto] = useState({})
  const [ejercicioAbierto, setEjercicioAbierto] = useState({})
  const [acordeonesAbiertos, setAcordeonesAbiertos] = useState({})
  const [busqueda, setBusqueda] = useState('')
  const [draftsEntrenos, setDraftsEntrenos] = useState({})
  const [guardandoEntrenoId, setGuardandoEntrenoId] = useState('')
  const [eliminandoEntrenoId, setEliminandoEntrenoId] = useState('')
  const [entrenoPendienteEliminar, setEntrenoPendienteEliminar] = useState(null)
  const [seriePendienteEliminar, setSeriePendienteEliminar] = useState(null)
  const ultimoEventoConexionRef = useRef(0)

  const historialVisible = useMemo(() => filtrarHistorialVisible(historial), [historial])

  const ejerciciosAgrupados = useMemo(
    () => construirHistoricoEjercicios(historialVisible),
    [historialVisible],
  )

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

  const entrenosFiltrados = useMemo(() => {
    const termino = normalizarTexto(busqueda.trim())

    if (!termino) {
      return historialVisible
    }

    return historialVisible.filter((entrenamiento) =>
      [
        entrenamiento.nombreSesion,
        ...entrenamiento.ejercicios.map((ejercicio) => ejercicio.nombre),
      ].some((valor) => normalizarTexto(valor).includes(termino)),
    )
  }, [busqueda, historialVisible])

  const cargarHistorial = async ({ silencioso = false, desdeReconnect = false } = {}) => {
    if (!silencioso) {
      setEstaRecargando(true)
      setMensaje('Sincronizando historico de entrenos...')
    }

    try {
      await sincronizarDatosOfflineEnOrden()
      const historialServidor = await obtenerEntrenamientosDesdeServidor()
      const historialFusionado = reemplazarHistorialEntrenosDesdeRemoto(historialServidor)
      setHistorial(historialFusionado)
      setMensaje(
        desdeReconnect
          ? 'Historico actualizado desde el backend al recuperar la conexion.'
          : 'Historico de entrenos actualizado correctamente.',
      )
    } catch (errorCapturado) {
      const historialLocal = obtenerHistorialEntrenos()
      setHistorial(historialLocal)
      setMensaje(
        historialLocal.length > 0
          ? `${errorCapturado.message} Se mantiene la copia local disponible.`
          : errorCapturado.message,
      )
    } finally {
      if (!silencioso) {
        setEstaRecargando(false)
      }
    }
  }

  useEffect(() => {
    let cancelado = false

    const cargarInicial = async () => {
      setEstaCargandoInicial(true)

      try {
        await sincronizarEntrenamientosPendientes()
        const historialServidor = await obtenerEntrenamientosDesdeServidor()
        const historialFusionado = reemplazarHistorialEntrenosDesdeRemoto(historialServidor)

        if (cancelado) {
          return
        }

        setHistorial(historialFusionado)
        setMensaje('Historico de entrenos cargado desde la base de datos.')
      } catch (errorCapturado) {
        if (cancelado) {
          return
        }

        const historialLocal = obtenerHistorialEntrenos()
        setHistorial(historialLocal)
        setMensaje(
          historialLocal.length > 0
            ? `${errorCapturado.message} Se muestra la ultima copia guardada en este dispositivo.`
            : errorCapturado.message,
        )
      } finally {
        if (!cancelado) {
          setEstaCargandoInicial(false)
        }
      }
    }

    cargarInicial()

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

      try {
        await sincronizarDatosOfflineEnOrden()
        const historialServidor = await obtenerEntrenamientosDesdeServidor()
        const historialFusionado = reemplazarHistorialEntrenosDesdeRemoto(historialServidor)

        if (cancelado) {
          return
        }

        setHistorial(historialFusionado)
        setMensaje('Historico actualizado desde el backend al recuperar la conexion.')
      } catch {
        if (cancelado) {
          return
        }
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
  } = usePullToRefresh({
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

  const alternarEntreno = (idEntreno) => {
    setEntrenamientoAbierto((estadoActual) => ({
      ...estadoActual,
      [idEntreno]: !estadoActual[idEntreno],
    }))
  }

  const alternarEjercicioEntreno = (idEjercicio) => {
    setEjercicioAbierto((estadoActual) => ({
      ...estadoActual,
      [idEjercicio]: !estadoActual[idEjercicio],
    }))
  }

  const obtenerDraftEntreno = (entrenamiento) => {
    const clave = entrenamiento.clientId || entrenamiento.id
    return draftsEntrenos[clave] || clonarDatos(normalizarSesion(entrenamiento))
  }

  const actualizarDraftEntreno = (entrenamiento, actualizador) => {
    const clave = entrenamiento.clientId || entrenamiento.id

    setDraftsEntrenos((estadoActual) => {
      const base = estadoActual[clave] || clonarDatos(normalizarSesion(entrenamiento))
      const siguiente = normalizarSesion(actualizador(clonarDatos(base)))
      return {
        ...estadoActual,
        [clave]: siguiente,
      }
    })
  }

  const resetearDraftEntreno = (entrenamiento) => {
    const clave = entrenamiento.clientId || entrenamiento.id

    setDraftsEntrenos((estadoActual) => {
      const siguiente = { ...estadoActual }
      delete siguiente[clave]
      return siguiente
    })
  }

  const guardarEdicionEntreno = async (entrenamiento) => {
    const clave = entrenamiento.clientId || entrenamiento.id
    const draft = draftsEntrenos[clave] || normalizarSesion(entrenamiento)
    setGuardandoEntrenoId(clave)

    try {
      const resultado = await actualizarEntrenamientoConRespaldo(draft)
      setHistorial(resultado.historial)
      resetearDraftEntreno(entrenamiento)
      setMensaje(
        resultado.online
          ? 'Entreno actualizado y sincronizado.'
          : 'Entreno guardado en local. Se sincronizara cuando vuelva la conexion.',
      )
    } catch (errorCapturado) {
      if (errorCapturado?.historial) {
        setHistorial(errorCapturado.historial)
      }
      setMensaje(errorCapturado.message || 'No se pudo guardar el entreno.')
    } finally {
      setGuardandoEntrenoId('')
    }
  }

  const eliminarEntreno = async (entrenamiento) => {
    const clave = entrenamiento.clientId || entrenamiento.id
    console.log('[OtrosEntrenos] eliminarEntreno:start', {
      clave,
      id: entrenamiento?.id,
      persistedId: entrenamiento?.persistedId,
      clientId: entrenamiento?.clientId,
      version: entrenamiento?.version,
      nombreSesion: entrenamiento?.nombreSesion,
    })
    setEliminandoEntrenoId(clave)

    try {
      const resultado = await eliminarEntrenamientoConRespaldo(entrenamiento)
      console.log('[OtrosEntrenos] eliminarEntreno:resultado', {
        clave,
        online: resultado?.online,
        error: resultado?.error?.message || null,
        historialLength: resultado?.historial?.length ?? null,
      })
      setHistorial(resultado.historial)
      resetearDraftEntreno(entrenamiento)
      setMensaje(
        resultado.online
          ? 'Entreno eliminado y sincronizado.'
          : 'Entreno eliminado en local. Se borrara online al recuperar la conexion.',
      )
    } catch (errorCapturado) {
      console.log('[OtrosEntrenos] eliminarEntreno:error', {
        clave,
        status: errorCapturado?.status || 0,
        message: errorCapturado?.message || 'unknown-error',
        backendError: errorCapturado?.backendError || '',
        backendMessage: errorCapturado?.backendMessage || '',
        payload: errorCapturado?.payload || null,
      })
      if (errorCapturado?.historial) {
        setHistorial(errorCapturado.historial)
      }
      setMensaje(errorCapturado.message || 'No se pudo eliminar el entreno.')
    } finally {
      setEliminandoEntrenoId('')
    }
  }

  const abrirConfirmacionEliminarEntreno = (entrenamiento) => {
    console.log('[OtrosEntrenos] abrirConfirmacionEliminarEntreno', {
      id: entrenamiento?.id,
      persistedId: entrenamiento?.persistedId,
      clientId: entrenamiento?.clientId,
      version: entrenamiento?.version,
      nombreSesion: entrenamiento?.nombreSesion,
    })
    setEntrenoPendienteEliminar(entrenamiento)
  }

  const cerrarConfirmacionEliminarEntreno = () => {
    if (eliminandoEntrenoId) {
      return
    }

    setEntrenoPendienteEliminar(null)
  }

  const confirmarEliminarEntreno = async () => {
    if (!entrenoPendienteEliminar) {
      console.log('[OtrosEntrenos] confirmarEliminarEntreno:sin-entreno')
      return
    }

    console.log('[OtrosEntrenos] confirmarEliminarEntreno', {
      id: entrenoPendienteEliminar?.id,
      persistedId: entrenoPendienteEliminar?.persistedId,
      clientId: entrenoPendienteEliminar?.clientId,
      version: entrenoPendienteEliminar?.version,
      nombreSesion: entrenoPendienteEliminar?.nombreSesion,
    })
    await eliminarEntreno(entrenoPendienteEliminar)
    setEntrenoPendienteEliminar(null)
  }

  const abrirConfirmacionEliminarSerie = ({
    entrenamiento,
    ejercicio,
    indiceEjercicio,
    indiceSerie,
    serie,
  }) => {
    setSeriePendienteEliminar({
      entrenamiento,
      ejercicio,
      indiceEjercicio,
      indiceSerie,
      serie,
    })
  }

  const cerrarConfirmacionEliminarSerie = () => {
    setSeriePendienteEliminar(null)
  }

  const confirmarEliminarSerie = () => {
    if (!seriePendienteEliminar) {
      return
    }

    const { entrenamiento, indiceEjercicio, indiceSerie } = seriePendienteEliminar

    actualizarDraftEntreno(entrenamiento, (draftActual) => {
      draftActual.ejercicios[indiceEjercicio].seriesRealizadas.splice(indiceSerie, 1)
      return draftActual
    })

    setSeriePendienteEliminar(null)
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
              Revisa y edita tu historico completo.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              La tab de ejercicios mantiene la vista por ejercicio y la tab de entrenos te deja
              editar pesos, repeticiones y borrar series o entrenos, con el mismo enfoque offline
              y sincronizacion de toda la app.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className="min-w-72 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white"
              type="text"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder={
                tabActiva === 'ejercicios'
                  ? 'Filtrar por ejercicio, grupo, patron o equipo'
                  : 'Filtrar por sesion o ejercicio'
              }
            />
            <button
              className="hidden rounded-md border border-neon-purple/50 px-4 py-3 text-sm font-bold text-neon-purple shadow-glow-purple transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:text-neon-pink disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex"
              type="button"
              disabled={estaRecargando}
              onClick={() => cargarHistorial()}
            >
              {estaRecargando ? 'Recargando...' : 'Recargar BBDD'}
            </button>
          </div>
        </div>

        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {mensaje || 'El historico se consulta desde tu cuenta y se guarda tambien en local.'}
        </p>
        <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
          {tabActiva === 'ejercicios'
            ? busqueda
              ? `${ejerciciosFiltrados.length} ejercicios coinciden con tu busqueda.`
              : 'Usa el buscador para localizar rapido un ejercicio concreto.'
            : busqueda
              ? `${entrenosFiltrados.length} entrenos coinciden con tu busqueda.`
              : 'Abre un entreno para editar pesos, repeticiones o borrar series.'}
        </p>
        {gestoRecargaDisponible ? (
          <p className="mt-2 text-xs text-slate-400 sm:hidden dark:text-slate-500">
            En movil, arriba del todo, manten el dedo y desliza hacia abajo para recargar.
          </p>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-[30px] border border-slate-200 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-white/[0.04]">
        <div className="border-b border-slate-200 bg-[#060B16] px-4 pt-3 dark:border-white/10">
          <div className="flex gap-2">
            {TAB_CONFIG.map((tab) => (
              <TabButton
                key={tab.id}
                activa={tabActiva === tab.id}
                label={tab.label}
                onClick={() => setTabActiva(tab.id)}
              />
            ))}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          {tabActiva === 'ejercicios' ? (
            <section className="grid gap-5">
              {ejerciciosFiltrados.map((ejercicio) => {
                const estaAbierto = Boolean(acordeonesAbiertos[ejercicio.id])
                const datosGrafica = construirDatosGrafica(ejercicio)

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
                          estaAbierto ? 'border-neon-pink text-neon-pink shadow-glow-pink' : ''
                        }`}
                        aria-hidden="true"
                      >
                        <svg
                          className={`h-5 w-5 transition-transform duration-300 ease-out ${
                            estaAbierto ? 'rotate-180' : ''
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
                      </span>
                    </button>

                    <div
                      className={`grid transition-[grid-template-rows] duration-500 ease-out ${
                        estaAbierto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="grid gap-5 border-t border-slate-200 p-5 dark:border-white/10">
                          <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-stretch">
                            <div className="h-full rounded-[28px] border border-slate-200 bg-slate-50/80 p-5 shadow-[0_12px_28px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-pes-black/45">
                              <div className="h-full rounded-[22px] border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-pes-black/70">
                                <p className="text-xs font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
                                  Nombre ejercicio
                                </p>
                                <h3 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
                                  {ejercicio.nombre}
                                </h3>
                                <div className="mt-5 grid gap-3 text-sm text-slate-600 dark:text-slate-400">
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

                            <GraficaLineal data={datosGrafica} />
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
          ) : (
            <section className="grid gap-5">
              {entrenosFiltrados.map((entrenamiento) => {
                const claveEntreno = entrenamiento.clientId || entrenamiento.id
                const estaAbierto = Boolean(entrenamientoAbierto[claveEntreno])
                const draft = obtenerDraftEntreno(entrenamiento)
                const guardando = guardandoEntrenoId === claveEntreno
                const eliminando = eliminandoEntrenoId === claveEntreno

                return (
                  <article
                    className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_16px_38px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out hover:border-neon-cyan/45 hover:shadow-glow-cyan dark:border-white/10 dark:bg-white/[0.04]"
                    key={claveEntreno}
                  >
                    <div
                      className="flex cursor-pointer flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between"
                      role="button"
                      tabIndex={0}
                      aria-expanded={estaAbierto}
                      onClick={() => alternarEntreno(claveEntreno)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          alternarEntreno(claveEntreno)
                        }
                      }}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <h2 className="font-display text-2xl font-black text-slate-950 dark:text-white">
                            {entrenamiento.nombreSesion}
                          </h2>
                          <BadgeEstado entrenamiento={entrenamiento} />
                        </div>
                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                          {formatearFechaHora(entrenamiento.fechaFin || entrenamiento.fechaInicio)} ·{' '}
                          {entrenamiento.ejercicios.length} ejercicios
                        </p>
                        {entrenamiento.syncError ? (
                          <p className="mt-2 text-xs font-semibold text-neon-orange">
                            {entrenamiento.syncError}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
                        <button
                          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/[0.07] dark:hover:text-white"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            resetearDraftEntreno(entrenamiento)
                          }}
                        >
                          Deshacer cambios
                        </button>
                        <button
                          className="rounded-md border border-cyan-500/55 bg-cyan-500/10 px-4 py-2 text-sm font-bold text-cyan-700 shadow-[0_0_0_rgba(0,0,0,0)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-sky-500 hover:bg-sky-500/14 hover:text-sky-700 hover:shadow-[0_16px_34px_rgba(14,165,233,0.18)] dark:border-neon-cyan/50 dark:bg-transparent dark:text-neon-cyan dark:shadow-glow-cyan dark:hover:border-cyan-300 dark:hover:bg-neon-cyan/10 dark:hover:text-cyan-300 dark:hover:shadow-glow-cyan disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          disabled={guardando || eliminando}
                          onClick={(event) => {
                            event.stopPropagation()
                            guardarEdicionEntreno(draft)
                          }}
                        >
                          {guardando ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          className="rounded-md border border-fuchsia-500/50 bg-fuchsia-500/10 px-4 py-2 text-sm font-bold text-fuchsia-700 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-violet-500 hover:bg-violet-500/14 hover:text-violet-700 hover:shadow-[0_16px_34px_rgba(168,85,247,0.18)] dark:border-neon-pink/50 dark:bg-transparent dark:text-neon-pink dark:shadow-glow-pink dark:hover:border-neon-purple dark:hover:bg-neon-purple/10 dark:hover:text-neon-purple dark:hover:shadow-glow-purple disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          disabled={guardando || eliminando}
                          onClick={(event) => {
                            event.stopPropagation()
                            abrirConfirmacionEliminarEntreno(entrenamiento)
                          }}
                        >
                          Eliminar
                        </button>
                        <button
                          className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/45 bg-cyan-400/10 text-cyan-700 shadow-[0_10px_24px_rgba(34,211,238,0.12)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-cyan-500 hover:bg-cyan-400/16 hover:text-cyan-800 dark:border-neon-cyan/40 dark:bg-transparent dark:text-neon-cyan dark:shadow-glow-cyan ${
                            estaAbierto
                              ? 'border-fuchsia-500/70 bg-fuchsia-500/10 text-fuchsia-700 shadow-[0_16px_34px_rgba(217,70,239,0.18)] dark:border-neon-pink dark:bg-neon-pink/10 dark:text-neon-pink dark:shadow-glow-pink'
                              : ''
                          }`}
                          type="button"
                          aria-expanded={estaAbierto}
                          aria-label={estaAbierto ? 'Cerrar entreno' : 'Abrir entreno'}
                          onClick={(event) => {
                            event.stopPropagation()
                            alternarEntreno(claveEntreno)
                          }}
                        >
                          <svg
                            className={`h-5 w-5 transition-transform duration-300 ease-out ${
                              estaAbierto ? 'rotate-180' : ''
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
                      className={`grid min-h-0 transition-[grid-template-rows] duration-500 ease-out ${
                        estaAbierto ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="grid gap-5 border-t border-slate-200 p-5 dark:border-white/10">
                          <div className="rounded-[24px] border border-neon-cyan/20 bg-slate-50/70 p-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-pes-black/45">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
                              Edicion del entreno
                            </p>
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              Cambia pesos o repeticiones y guarda para dejarlo pendiente si estas
                              offline.
                            </p>
                          </div>
                          </div>

                          <div className="grid gap-4">
                          {draft.ejercicios.map((ejercicio, indiceEjercicio) => {
                            const claveEjercicio =
                              ejercicio.idEjercicio || ejercicio.clientId || `${claveEntreno}-${indiceEjercicio}`
                            const ejercicioExpandido = Boolean(ejercicioAbierto[claveEjercicio])

                            return (
                              <article
                                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out hover:border-neon-cyan/50 hover:shadow-glow-cyan dark:border-white/10 dark:bg-white/[0.04]"
                                key={claveEjercicio}
                              >
                                <div className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                                  <button
                                    className="flex min-w-0 flex-1 items-center gap-4 text-left"
                                    type="button"
                                    aria-expanded={ejercicioExpandido}
                                    onClick={() => alternarEjercicioEntreno(claveEjercicio)}
                                  >
                                    <span
                                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-neon-cyan/40 text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out dark:text-neon-cyan"
                                      aria-hidden="true"
                                    >
                                      <svg
                                        className={`h-5 w-5 transition-transform duration-300 ease-out ${
                                          ejercicioExpandido ? 'rotate-180 text-neon-pink' : ''
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
                                    </span>
                                    <span className="min-w-0">
                                      <span className="font-display block truncate text-xl font-black text-slate-950 dark:text-white">
                                        {ejercicio.nombre}
                                      </span>
                                      <span className="mt-1 block text-sm text-slate-600 dark:text-slate-400">
                                        {ejercicio.seriesRealizadas.length} series · plan{' '}
                                        {ejercicio.seriesPlanificadas}x{ejercicio.repeticionesPlanificadas}
                                      </span>
                                    </span>
                                  </button>
                                </div>

                                <div
                                  className={`grid min-h-0 transition-[grid-template-rows] duration-300 ease-out ${
                                    ejercicioExpandido ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                                  }`}
                                >
                                  <div className="overflow-hidden">
                                    <div className="grid gap-4 border-t border-slate-200 p-5 dark:border-white/10">
                                      <div>
                                        <p className="text-xs font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
                                          Detalles del ejercicio
                                        </p>
                                      </div>

                                      <div className="grid gap-3 md:grid-cols-4">
                                        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                          Nombre
                                          <input
                                            className={claseInput}
                                            value={ejercicio.nombre}
                                            onChange={(event) =>
                                              actualizarDraftEntreno(draft, (draftActual) => {
                                                draftActual.ejercicios[indiceEjercicio].nombre =
                                                  event.target.value
                                                return draftActual
                                              })
                                            }
                                          />
                                        </label>
                                        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                          Grupo
                                          <input
                                            className={claseInput}
                                            value={ejercicio.grupoMuscular || ''}
                                            onChange={(event) =>
                                              actualizarDraftEntreno(draft, (draftActual) => {
                                                draftActual.ejercicios[indiceEjercicio].grupoMuscular =
                                                  event.target.value
                                                return draftActual
                                              })
                                            }
                                          />
                                        </label>
                                        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                          Series base
                                          <input
                                            className={claseInputNumero}
                                            type="number"
                                            min="0"
                                            value={ejercicio.seriesPlanificadas}
                                            onChange={(event) =>
                                              actualizarDraftEntreno(draft, (draftActual) => {
                                                draftActual.ejercicios[indiceEjercicio].seriesPlanificadas =
                                                  Number(event.target.value) || 0
                                                return draftActual
                                              })
                                            }
                                          />
                                        </label>
                                        <label className="grid gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                          Reps base
                                          <input
                                            className={claseInputNumero}
                                            type="number"
                                            min="0"
                                            value={ejercicio.repeticionesPlanificadas}
                                            onChange={(event) =>
                                              actualizarDraftEntreno(draft, (draftActual) => {
                                                draftActual.ejercicios[
                                                  indiceEjercicio
                                                ].repeticionesPlanificadas =
                                                  Number(event.target.value) || 0
                                                return draftActual
                                              })
                                            }
                                          />
                                        </label>
                                      </div>

                                      <div className="grid gap-4">
                                        {ejercicio.seriesRealizadas.map((serie, indiceSerie) => (
                                          <div
                                            className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-4 shadow-[0_14px_32px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-[#0A0D16]"
                                            key={serie.id || `${claveEjercicio}-serie-${indiceSerie}`}
                                          >
                                            <div className="flex items-center justify-between gap-3">
                                              <h4 className="text-2xl font-black text-cyan-600 dark:text-neon-cyan">
                                                Serie {serie.numeroSerie || indiceSerie + 1}
                                              </h4>
                                            </div>

                                            <div className="grid gap-3 md:grid-cols-2">
                                              <label className="grid gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                                                Reps hechas
                                                <input
                                                  className={claseInputNumero}
                                                  type="number"
                                                  min="0"
                                                  value={serie.repeticiones}
                                                  onChange={(event) =>
                                                    actualizarDraftEntreno(draft, (draftActual) => {
                                                      draftActual.ejercicios[indiceEjercicio].seriesRealizadas[
                                                        indiceSerie
                                                      ].repeticiones = Number(event.target.value) || 0
                                                      return draftActual
                                                    })
                                                  }
                                                />
                                              </label>
                                              <label className="grid gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                                                Peso
                                                <input
                                                  className={claseInputNumero}
                                                  type="number"
                                                  min="0"
                                                  step="0.25"
                                                  value={serie.peso}
                                                  onChange={(event) =>
                                                    actualizarDraftEntreno(draft, (draftActual) => {
                                                      draftActual.ejercicios[indiceEjercicio].seriesRealizadas[
                                                        indiceSerie
                                                      ].peso = Number(event.target.value) || 0
                                                      return draftActual
                                                    })
                                                  }
                                                />
                                              </label>
                                            </div>

                                            <div className="grid gap-2">
                                              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                                Anterior
                                              </p>
                                              <div className="rounded-[16px] border border-fuchsia-500/35 bg-white px-5 py-4 text-lg font-black text-fuchsia-600 dark:bg-[#090B13] dark:text-neon-pink">
                                                {`${String(serie.peso).replace('.', ',')}kg x ${serie.repeticiones}`}
                                              </div>
                                            </div>

                                            <div className="flex justify-end">
                                              <button
                                                className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-black text-slate-500 transition-all duration-300 ease-out hover:border-fuchsia-500/45 hover:text-fuchsia-700 dark:border-white/10 dark:bg-[#0B0D15] dark:text-slate-400 dark:hover:border-neon-pink/40 dark:hover:text-white"
                                                type="button"
                                                onClick={() =>
                                                  abrirConfirmacionEliminarSerie({
                                                    entrenamiento: draft,
                                                    ejercicio,
                                                    indiceEjercicio,
                                                    indiceSerie,
                                                    serie,
                                                  })
                                                }
                                              >
                                                Borrar
                                              </button>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </article>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  </article>
                )
              })}

              {estaCargandoInicial ? (
                <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                  Cargando historico de entrenos...
                </div>
              ) : null}

              {!estaCargandoInicial && historialVisible.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                  Todavia no hay entrenos guardados en el historial.
                </div>
              ) : null}

              {!estaCargandoInicial && historialVisible.length > 0 && entrenosFiltrados.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-400">
                  No hay entrenos que coincidan con el filtro actual.
                </div>
              ) : null}
            </section>
          )}
        </div>
      </section>

      {entrenoPendienteEliminar ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar eliminacion de entreno"
        >
          <div className="w-full max-w-lg rounded-[28px] border border-fuchsia-500/30 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:bg-[#050814]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-600 dark:text-neon-pink">
              Confirmar eliminacion
            </p>
            <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
              Vas a eliminar este entreno
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Se eliminara del historial y dejara de aparecer en esta pantalla. Asegurate de que
              realmente quieres borrar{' '}
              <span className="font-bold text-slate-950 dark:text-white">
                {entrenoPendienteEliminar.nombreSesion || 'este entreno'}
              </span>
              .
            </p>
            <p className="mt-3 rounded-2xl border border-amber-400/35 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
              Esta accion no se puede deshacer desde aqui. Si lo eliminas sin conexion, quedara
              pendiente de sincronizarse cuando vuelva internet.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                className="rounded-md border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition-all duration-300 ease-out hover:border-cyan-500 hover:text-cyan-700 dark:border-white/10 dark:text-slate-300 dark:hover:border-neon-cyan dark:hover:text-neon-cyan"
                type="button"
                disabled={Boolean(eliminandoEntrenoId)}
                onClick={cerrarConfirmacionEliminarEntreno}
              >
                Cancelar
              </button>
              <button
                className="rounded-md border border-fuchsia-500/50 bg-fuchsia-500/10 px-4 py-3 text-sm font-bold text-fuchsia-700 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-violet-500 hover:bg-violet-500/14 hover:text-violet-700 hover:shadow-[0_16px_34px_rgba(168,85,247,0.18)] dark:border-neon-pink/50 dark:bg-transparent dark:text-neon-pink dark:shadow-glow-pink dark:hover:border-neon-purple dark:hover:bg-neon-purple/10 dark:hover:text-neon-purple dark:hover:shadow-glow-purple disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={Boolean(eliminandoEntrenoId)}
                onClick={confirmarEliminarEntreno}
              >
                {eliminandoEntrenoId ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {seriePendienteEliminar ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar borrado de serie"
        >
          <div className="w-full max-w-lg rounded-[28px] border border-fuchsia-500/30 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:bg-[#050814]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-600 dark:text-neon-pink">
              Confirmar borrado
            </p>
            <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
              Vas a borrar esta serie
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              Se quitara de este entreno la{' '}
              <span className="font-bold text-slate-950 dark:text-white">
                Serie {seriePendienteEliminar.serie.numeroSerie || seriePendienteEliminar.indiceSerie + 1}
              </span>{' '}
              del ejercicio{' '}
              <span className="font-bold text-slate-950 dark:text-white">
                {seriePendienteEliminar.ejercicio.nombre || 'seleccionado'}
              </span>
              .
            </p>
            <p className="mt-3 rounded-2xl border border-amber-400/35 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
              Esta accion eliminara la serie del borrador actual. Si despues guardas, el cambio se
              persistira en el historial.
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                className="rounded-md border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition-all duration-300 ease-out hover:border-cyan-500 hover:text-cyan-700 dark:border-white/10 dark:text-slate-300 dark:hover:border-neon-cyan dark:hover:text-neon-cyan"
                type="button"
                onClick={cerrarConfirmacionEliminarSerie}
              >
                Cancelar
              </button>
              <button
                className="rounded-md border border-fuchsia-500/50 bg-fuchsia-500/10 px-4 py-3 text-sm font-bold text-fuchsia-700 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-violet-500 hover:bg-violet-500/14 hover:text-violet-700 hover:shadow-[0_16px_34px_rgba(168,85,247,0.18)] dark:border-neon-pink/50 dark:bg-transparent dark:text-neon-pink dark:shadow-glow-pink dark:hover:border-neon-purple dark:hover:bg-neon-purple/10 dark:hover:text-neon-purple dark:hover:shadow-glow-purple"
                type="button"
                onClick={confirmarEliminarSerie}
              >
                Borrar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default OtrosEntrenos

