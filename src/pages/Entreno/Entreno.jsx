import { useEffect, useMemo, useRef, useState } from 'react'
import PieAccion from '../../components/Footer/Footer'
import MobilePullToRefreshIndicator from '../../components/MobilePullToRefreshIndicator/MobilePullToRefreshIndicator'
import Toast from '../../components/Toast/Toast'
import { usePullToRefresh } from '../../hooks/usePullToRefresh'
import {
  crearEntrenamientoDesdeSesion,
  guardarCatalogoEjerciciosEntreno,
  guardarEntrenamientoBorrador,
  guardarSesionesEntreno,
  obtenerCatalogoEjerciciosEntreno,
  guardarHistorialEntrenos,
  limpiarEntrenamientoBorrador,
  obtenerEntrenamientoBorrador,
  obtenerHistorialEntrenos,
  obtenerSesionesEntreno,
  obtenerUltimoRegistroEjercicio,
} from './services/entrenoLocalService'
import {
  obtenerEntrenamientosDesdeServidor,
  obtenerSesionesEntrenoDesdeServidor,
} from './services/entrenoApiService'
import {
  obtenerEjerciciosDesdeServidor,
  obtenerUltimoRegistroEjercicioDesdeServidor,
} from '../Ejercicios/services/ejerciciosApiService'
import {
  guardarEntrenamientoConRespaldo,
  sincronizarEntrenamientosPendientes,
} from '../../services/training/trainingDataService'
import { fusionarHistorialEntrenamientosGuardado } from '../../services/storage/trainingStorage'
import {
  clonarPendientes,
  crearMensajeResumenSincronizacion,
  crearMensajeToastSincronizacion,
  crearOpcionesCatalogo,
  crearOpcionesSesiones,
  formatearFechaEntrenamiento,
  obtenerEstadoPendiente,
  sugerirCorreccionesPendiente,
} from './services/entrenoPendingService'

const claseInputNumero =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white'

const claseInputPeso =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white'

const claseInputTexto =
  'w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white'

const claseInputPendiente =
  'min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-[#04070F] dark:text-white'

const claseCampoCompacto =
  'grid gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/85 p-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:bg-pes-black/45 dark:text-slate-400'

function formatearSerieAnterior(serieAnterior) {
  if (!serieAnterior) {
    return '-'
  }

  return `${serieAnterior.peso || 0}kg x ${serieAnterior.repeticiones || 0}`
}

function agruparSeriesPorNumeroSerie(series) {
  return series.reduce((grupos, serie, indice) => {
    const numeroSerie = serie.numeroSerie || indice + 1
    const grupoExistente = grupos.find((grupo) => grupo.numeroSerie === numeroSerie)

    if (grupoExistente) {
      grupoExistente.series.push(serie)
      return grupos
    }

    return [...grupos, { numeroSerie, series: [serie] }]
  }, [])
}

function obtenerSeriesAnterioresPorNumeroSerie(registroAnterior, numeroSerie) {
  if (!registroAnterior) {
    return []
  }

  return registroAnterior.seriesRealizadas.filter(
    (serieAnterior, indiceAnterior) =>
      (serieAnterior.numeroSerie || indiceAnterior + 1) === numeroSerie,
  )
}

function tieneMultiplesPesos(series) {
  return new Set(series.map((serie) => Number(serie.peso))).size > 1
}

function normalizarTexto(valor) {
  return String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function crearEstadoEjerciciosCerrados(ejercicios) {
  return Object.fromEntries(ejercicios.map((ejercicio) => [ejercicio.idEjercicio, false]))
}

function crearEstadoAcordeonPendientes(pendientes) {
  return Object.fromEntries(
    (pendientes || []).map((entrenamientoPendiente, indice) => [
      entrenamientoPendiente.clientId,
      indice === 0,
    ]),
  )
}

function crearEjercicioDeHoy() {
  return {
    idEjercicio: `hoy-${Date.now()}`,
    plantillaEjercicioId: null,
    catalogoEjercicioId: '',
    nombre: 'Ejercicio extra',
    descripcion: '',
    grupoMuscular: '',
    patronMovimiento: '',
    equipamiento: '',
    seriesPlanificadas: 0,
    repeticionesPlanificadas: 0,
    pesoPlanificado: 0,
    alturaBanco: '',
    agarre: '',
    completado: false,
    omitido: false,
    seriesRealizadas: [{ id: `serie-${Date.now()}`, numeroSerie: 1, repeticiones: 10, peso: 0 }],
  }
}

function crearEjercicioDeHoyDesdePlantilla(ejercicioPlantilla) {
  const seriesPlanificadas = Number(ejercicioPlantilla.seriesPlanificadas) || 0
  const repeticionesPlanificadas = Number(ejercicioPlantilla.repeticionesPlanificadas) || 0
  const pesoPlanificado = Number(ejercicioPlantilla.pesoPlanificado) || 0

  return {
    idEjercicio: `hoy-${Date.now()}`,
    // Los ejercicios anadidos durante el entreno se mandan como ad hoc.
    plantillaEjercicioId: null,
    catalogoEjercicioId: String(
      ejercicioPlantilla.catalogoEjercicioId ||
        ejercicioPlantilla.idEjercicio ||
        ejercicioPlantilla.id ||
        '',
    ),
    nombre: ejercicioPlantilla.nombre,
    descripcion: ejercicioPlantilla.descripcion || '',
    grupoMuscular: ejercicioPlantilla.grupoMuscular || '',
    patronMovimiento: ejercicioPlantilla.patronMovimiento || '',
    equipamiento: ejercicioPlantilla.equipamiento || '',
    seriesPlanificadas,
    repeticionesPlanificadas,
    pesoPlanificado,
    alturaBanco: ejercicioPlantilla.alturaBanco || '',
    agarre: ejercicioPlantilla.agarre || '',
    completado: false,
    omitido: false,
    seriesRealizadas: Array.from({ length: seriesPlanificadas || 1 }, (_, indice) => ({
      id: `serie-${Date.now()}-${indice + 1}`,
      numeroSerie: indice + 1,
      repeticiones: repeticionesPlanificadas,
      peso: pesoPlanificado,
    })),
  }
}

function crearEjemploEntrenamiento() {
  const marcaTiempo = Date.now()

  return {
    id: `entrenamiento-ejemplo-${marcaTiempo}`,
    idSesion: 'push-session',
    nombreSesion: 'Ejemplo empuje',
    fechaInicio: new Date().toISOString(),
    fechaFin: '',
    ejercicios: [
      {
        idEjercicio: 'bench-press',
        nombre: 'Press banca',
        descripcion: 'Ejemplo con fallo en segunda serie y bajada de peso.',
        seriesPlanificadas: 4,
        repeticionesPlanificadas: 12,
        pesoPlanificado: 60,
        alturaBanco: 4,
        agarre: 'Medio',
        completado: false,
        omitido: false,
        seriesRealizadas: [
          { id: `ejemplo-serie-${marcaTiempo}-1`, numeroSerie: 1, repeticiones: 12, peso: 60 },
          { id: `ejemplo-serie-${marcaTiempo}-2`, numeroSerie: 2, repeticiones: 8, peso: 60 },
          { id: `ejemplo-serie-${marcaTiempo}-3`, numeroSerie: 2, repeticiones: 4, peso: 50 },
          { id: `ejemplo-serie-${marcaTiempo}-4`, numeroSerie: 3, repeticiones: 10, peso: 55 },
        ],
      },
      {
        idEjercicio: 'shoulder-press',
        nombre: 'Press hombro',
        descripcion: 'Ejemplo con una serie menos que la plantilla.',
        seriesPlanificadas: 3,
        repeticionesPlanificadas: 10,
        pesoPlanificado: 22,
        alturaBanco: 7,
        agarre: 'Neutro',
        completado: false,
        omitido: false,
        seriesRealizadas: [
          { id: `ejemplo-serie-${marcaTiempo}-5`, numeroSerie: 1, repeticiones: 10, peso: 22 },
          { id: `ejemplo-serie-${marcaTiempo}-6`, numeroSerie: 2, repeticiones: 8, peso: 20 },
        ],
      },
      {
        idEjercicio: 'today-extra-example',
        nombre: 'Fondos asistidos',
        descripcion: 'Ejercicio anadido solo para hoy.',
        seriesPlanificadas: 3,
        repeticionesPlanificadas: 12,
        pesoPlanificado: 35,
        alturaBanco: '',
        agarre: 'Paralelo',
        completado: false,
        omitido: false,
        seriesRealizadas: [
          { id: `ejemplo-serie-${marcaTiempo}-7`, numeroSerie: 1, repeticiones: 12, peso: 35 },
          { id: `ejemplo-serie-${marcaTiempo}-8`, numeroSerie: 2, repeticiones: 10, peso: 30 },
          { id: `ejemplo-serie-${marcaTiempo}-9`, numeroSerie: 3, repeticiones: 9, peso: 30 },
        ],
      },
    ],
  }
}

function crearEjemploEntrenamientoAnterior() {
  return {
    id: 'example-previous-workout',
    idSesion: 'push-session',
    nombreSesion: 'Empuje anterior',
    fechaInicio: '2026-04-20T17:30:00.000Z',
    fechaFin: '2026-04-20T18:30:00.000Z',
    ejercicios: [
      {
        idEjercicio: 'bench-press',
        nombre: 'Press banca',
        descripcion: '',
        seriesPlanificadas: 0,
        repeticionesPlanificadas: 0,
        pesoPlanificado: 0,
        alturaBanco: 4,
        agarre: 'Medio',
        completado: true,
        omitido: false,
        seriesRealizadas: [
          { id: 'previous-bench-1', numeroSerie: 1, repeticiones: 12, peso: 60 },
          { id: 'previous-bench-2', numeroSerie: 2, repeticiones: 10, peso: 60 },
          { id: 'previous-bench-3', numeroSerie: 2, repeticiones: 3, peso: 55 },
          { id: 'previous-bench-4', numeroSerie: 3, repeticiones: 9, peso: 57.5 },
          { id: 'previous-bench-5', numeroSerie: 4, repeticiones: 8, peso: 55 },
        ],
      },
      {
        idEjercicio: 'shoulder-press',
        nombre: 'Press hombro',
        descripcion: '',
        seriesPlanificadas: 0,
        repeticionesPlanificadas: 0,
        pesoPlanificado: 0,
        alturaBanco: 7,
        agarre: 'Neutro',
        completado: true,
        omitido: false,
        seriesRealizadas: [
          { id: 'previous-shoulder-1', numeroSerie: 1, repeticiones: 10, peso: 22 },
          { id: 'previous-shoulder-2', numeroSerie: 2, repeticiones: 10, peso: 22 },
          { id: 'previous-shoulder-3', numeroSerie: 3, repeticiones: 8, peso: 20 },
        ],
      },
      {
        idEjercicio: 'today-extra-example',
        nombre: 'Fondos asistidos',
        descripcion: '',
        seriesPlanificadas: 0,
        repeticionesPlanificadas: 0,
        pesoPlanificado: 0,
        alturaBanco: '',
        agarre: 'Paralelo',
        completado: true,
        omitido: false,
        seriesRealizadas: [
          { id: 'previous-dips-1', numeroSerie: 1, repeticiones: 12, peso: 30 },
          { id: 'previous-dips-2', numeroSerie: 2, repeticiones: 10, peso: 30 },
          { id: 'previous-dips-3', numeroSerie: 3, repeticiones: 8, peso: 25 },
        ],
      },
    ],
  }
}

function Entreno() {
  const [sesiones, setSesiones] = useState(obtenerSesionesEntreno)
  const [catalogoEjercicios, setCatalogoEjercicios] = useState(obtenerCatalogoEjerciciosEntreno)
  const [historial, setHistorial] = useState(obtenerHistorialEntrenos)
  const [entrenamiento, setEntrenamiento] = useState(() => {
    const entrenamientoActual = obtenerEntrenamientoBorrador()

    if (entrenamientoActual) {
      return entrenamientoActual
    }

    return null
  })
  const [idSesionSeleccionada, setIdSesionSeleccionada] = useState(entrenamiento?.idSesion || '')
  const [estaGuardando, setEstaGuardando] = useState(false)
  const [estaRecargando, setEstaRecargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [ejerciciosAbiertos, setEjerciciosAbiertos] = useState({})
  const [estaAbiertoSelectorSesiones, setEstaAbiertoSelectorSesiones] = useState(false)
  const [busquedaSesion, setBusquedaSesion] = useState('')
  const [estaAbiertoSelectorEjercicios, setEstaAbiertoSelectorEjercicios] = useState(false)
  const [busquedaEjercicio, setBusquedaEjercicio] = useState('')
  const [registrosPreviosPorCatalogo, setRegistrosPreviosPorCatalogo] = useState({})
  const [toastSincronizacion, setToastSincronizacion] = useState(null)
  const [estaAbiertoModalPendientes, setEstaAbiertoModalPendientes] = useState(false)
  const [pendientesEditados, setPendientesEditados] = useState([])
  const [pendientesAbiertos, setPendientesAbiertos] = useState({})
  const [ejerciciosPendientesAbiertos, setEjerciciosPendientesAbiertos] = useState({})
  const [clientIdPendienteForzando, setClientIdPendienteForzando] = useState('')
  const sincronizacionPendientesActivaRef = useRef(null)
  const ultimaClaveSincronizacionRef = useRef('')
  const ultimoEventoConexionRef = useRef(0)

  const sesionesFiltradas = useMemo(() => {
    const busquedaNormalizada = normalizarTexto(busquedaSesion)

    if (!busquedaNormalizada) return sesiones

    return sesiones.filter((sesion) =>
      normalizarTexto(sesion.nombreSesion).includes(busquedaNormalizada),
    )
  }, [sesiones, busquedaSesion])

  const plantillasEjerciciosAgregables = useMemo(() => {
    const idsEjerciciosExistentes = new Set(
      entrenamiento?.ejercicios
        .map((ejercicio) => ejercicio.catalogoEjercicioId || ejercicio.idEjercicio)
        .filter(Boolean),
    )
    const busquedaNormalizada = normalizarTexto(busquedaEjercicio)
    const plantillas = catalogoEjercicios.filter(
      (ejercicio) =>
        !idsEjerciciosExistentes.has(ejercicio.catalogoEjercicioId || ejercicio.idEjercicio),
    )

    if (!busquedaNormalizada) return plantillas

    return plantillas.filter(
      (ejercicio) =>
        normalizarTexto(ejercicio.nombre).includes(busquedaNormalizada) ||
        normalizarTexto(ejercicio.descripcion).includes(busquedaNormalizada) ||
        normalizarTexto(ejercicio.grupoMuscular).includes(busquedaNormalizada) ||
        normalizarTexto(ejercicio.equipamiento).includes(busquedaNormalizada),
    )
  }, [catalogoEjercicios, entrenamiento, busquedaEjercicio])

  const entrenamientosPendientes = useMemo(
    () => historial.filter((itemHistorial) => itemHistorial.syncStatus === 'pending'),
    [historial],
  )
  const opcionesSesionesPendientes = useMemo(() => crearOpcionesSesiones(sesiones), [sesiones])
  const opcionesCatalogoPendientes = useMemo(
    () => crearOpcionesCatalogo(catalogoEjercicios),
    [catalogoEjercicios],
  )

  useEffect(() => {
    if (entrenamiento) {
      guardarEntrenamientoBorrador(entrenamiento)
    }
  }, [entrenamiento])

  useEffect(() => {
    const sincronizarCatalogo = async () => {
      try {
        const catalogoServidor = await obtenerEjerciciosDesdeServidor()
        setCatalogoEjercicios(catalogoServidor)
        guardarCatalogoEjerciciosEntreno(catalogoServidor)
      } catch (errorCapturado) {
        setMensaje(
          `${errorCapturado.message} Se mantiene el catalogo local mientras no se pueda leer el backend.`,
        )
      }
    }

    sincronizarCatalogo()
  }, [])

  const aplicarResultadoSincronizacionPendientes = (resultado) => {
    console.log('[EntrenoSync] Aplicando resultado de sincronizacion', {
      sincronizados: resultado.sincronizados,
      pendientesRestantes: resultado.pendientesRestantes,
      entrenamientosSincronizados: resultado.entrenamientosSincronizados?.map((entrenamiento) => ({
        clientId: entrenamiento.clientId,
        fechaFin: entrenamiento.fechaFin,
        nombreSesion: entrenamiento.nombreSesion,
      })),
    })

    setHistorial(resultado.historial)
    const pendientesRestantes = clonarPendientes(
      resultado.historial.filter((itemHistorial) => itemHistorial.syncStatus === 'pending'),
    )
    setPendientesEditados(pendientesRestantes)
    setPendientesAbiertos((estadoActual) => ({
      ...crearEstadoAcordeonPendientes(pendientesRestantes),
      ...estadoActual,
    }))

    if (resultado.sincronizados === 0) {
      if (resultado.entrenamientosFallidos?.length) {
        setMensaje(crearMensajeResumenSincronizacion(resultado))
      }
      return
    }

    setToastSincronizacion({
      id: Date.now(),
      mensaje: crearMensajeToastSincronizacion(resultado.entrenamientosSincronizados),
    })
    setMensaje(crearMensajeResumenSincronizacion(resultado))
  }

  const sincronizarPendientesEntreno = async (clientIds = []) => {
    const clientIdsNormalizados = [...new Set((clientIds || []).filter(Boolean))].sort()
    const claveSincronizacion = clientIdsNormalizados.join('|') || '__all__'

    if (
      sincronizacionPendientesActivaRef.current &&
      ultimaClaveSincronizacionRef.current === claveSincronizacion
    ) {
      console.log('[EntrenoSync] Reutilizando sincronizacion en curso', {
        claveSincronizacion,
      })
      return sincronizacionPendientesActivaRef.current
    }

    if (sincronizacionPendientesActivaRef.current) {
      console.log('[EntrenoSync] Sincronizacion en curso, se evita un duplicado', {
        claveEnCurso: ultimaClaveSincronizacionRef.current,
        claveSolicitada: claveSincronizacion,
      })
      return sincronizacionPendientesActivaRef.current
    }

    ultimaClaveSincronizacionRef.current = claveSincronizacion
    console.log('[EntrenoSync] Lanzando sincronizacion de pendientes', {
      claveSincronizacion,
    })

    sincronizacionPendientesActivaRef.current = sincronizarEntrenamientosPendientes(
      clientIdsNormalizados,
    ).finally(() => {
      sincronizacionPendientesActivaRef.current = null
      ultimaClaveSincronizacionRef.current = ''
      console.log('[EntrenoSync] Sincronizacion de pendientes finalizada')
    })

    return sincronizacionPendientesActivaRef.current
  }

  useEffect(() => {
    let cancelado = false

    const sincronizarPendientes = async () => {
      const resultado = await sincronizarPendientesEntreno()

      if (cancelado || !resultado) {
        return
      }

      aplicarResultadoSincronizacionPendientes(resultado)
    }

    sincronizarPendientes()

    return () => {
      cancelado = true
    }
  }, [])

  useEffect(() => {
    let cancelado = false

    const manejarConexionRecuperada = async () => {
      const ahora = Date.now()

      if (ahora - ultimoEventoConexionRef.current < 1200) {
        console.log('[EntrenoSync] Evento de conexion ignorado por deduplicacion')
        return
      }

      ultimoEventoConexionRef.current = ahora
      console.log('[EntrenoSync] Evento de conexion recuperada detectado')
      const resultado = await sincronizarPendientesEntreno()

      if (cancelado || !resultado) {
        console.log('[EntrenoSync] No se aplica resultado tras recuperar conexion', {
          cancelado,
          hayResultado: Boolean(resultado),
        })
        return
      }

      aplicarResultadoSincronizacionPendientes(resultado)
    }

    window.addEventListener('online', manejarConexionRecuperada)
    window.addEventListener('pesapp:server-reachable', manejarConexionRecuperada)

    return () => {
      cancelado = true
      window.removeEventListener('online', manejarConexionRecuperada)
      window.removeEventListener('pesapp:server-reachable', manejarConexionRecuperada)
    }
  }, [])

  useEffect(() => {
    const idsCatalogo = Array.from(
      new Set(
        (entrenamiento?.ejercicios || [])
          .map((ejercicio) => ejercicio.catalogoEjercicioId)
          .filter(Boolean),
      ),
    )

    if (idsCatalogo.length === 0) {
      const timeoutId = window.setTimeout(() => {
        setRegistrosPreviosPorCatalogo({})
      }, 0)

      return () => {
        window.clearTimeout(timeoutId)
      }
    }

    let cancelado = false

    const cargarRegistrosPrevios = async () => {
      const resultados = await Promise.all(
        idsCatalogo.map(async (idCatalogo) => {
          try {
            const registro = await obtenerUltimoRegistroEjercicioDesdeServidor(idCatalogo)
            return [idCatalogo, registro]
          } catch {
            return [idCatalogo, null]
          }
        }),
      )

      if (cancelado) {
        return
      }

      setRegistrosPreviosPorCatalogo(
        Object.fromEntries(resultados.filter(([, registro]) => Boolean(registro))),
      )
    }

    cargarRegistrosPrevios()

    return () => {
      cancelado = true
    }
  }, [entrenamiento])

  const limpiarSeleccionSesion = () => {
    setIdSesionSeleccionada('')
    setEntrenamiento(null)
    setEjerciciosAbiertos({})
    setEstaAbiertoSelectorSesiones(false)
    setEstaAbiertoSelectorEjercicios(false)
    setBusquedaSesion('')
    setBusquedaEjercicio('')
    setMensaje('')
    limpiarEntrenamientoBorrador()
  }

  const abrirModalPendientes = () => {
    const pendientesClonados = clonarPendientes(entrenamientosPendientes)
    setPendientesEditados(pendientesClonados)
    setPendientesAbiertos(crearEstadoAcordeonPendientes(pendientesClonados))
    setEjerciciosPendientesAbiertos({})
    setEstaAbiertoModalPendientes(true)
  }

  const cerrarModalPendientes = () => {
    setEstaAbiertoModalPendientes(false)
    setClientIdPendienteForzando('')
  }

  const guardarPendientesEditados = (pendientesActualizados) => {
    const pendientesConservados = new Set(
      (pendientesActualizados || []).map((entrenamientoPendiente) => entrenamientoPendiente.clientId),
    )
    const mapaPendientes = new Map(
      (pendientesActualizados || []).map((entrenamientoPendiente) => [
        entrenamientoPendiente.clientId,
        {
          ...entrenamientoPendiente,
          syncStatus: 'pending',
          syncError: '',
          syncFieldErrors: {},
          ejercicios: (entrenamientoPendiente.ejercicios || []).map((ejercicio) => ({
            ...ejercicio,
            syncError: '',
            syncFieldErrors: {},
            syncStatus: 'pending',
          })),
        },
      ]),
    )

    const historialActualizado = historial.reduce((acumulado, itemHistorial) => {
      if (
        itemHistorial.syncStatus === 'pending' &&
        !pendientesConservados.has(itemHistorial.clientId)
      ) {
        return acumulado
      }

      return [...acumulado, mapaPendientes.get(itemHistorial.clientId) || itemHistorial]
    }, [])

    setHistorial(historialActualizado)
    guardarHistorialEntrenos(historialActualizado)
    setPendientesEditados(clonarPendientes(pendientesActualizados))
    setMensaje(
      mapaPendientes.size === 0
        ? mensaje
        : `Cambios guardados en local para ${mapaPendientes.size} pendiente${mapaPendientes.size === 1 ? '' : 's'}.`,
    )

    return historialActualizado
  }

  const alternarPendiente = (clientId) => {
    setPendientesAbiertos((estadoActual) => ({
      ...estadoActual,
      [clientId]: !estadoActual[clientId],
    }))
  }

  const alternarEjercicioPendiente = (clientId, indiceEjercicio) => {
    const clave = `${clientId}-${indiceEjercicio}`

    setEjerciciosPendientesAbiertos((estadoActual) => ({
      ...estadoActual,
      [clave]: !estadoActual[clave],
    }))
  }

  const eliminarPendienteEditado = (clientId) => {
    setPendientesEditados((pendientesActuales) =>
      pendientesActuales.filter((entrenamientoPendiente) => entrenamientoPendiente.clientId !== clientId),
    )
    setPendientesAbiertos((estadoActual) => {
      const siguienteEstado = { ...estadoActual }
      delete siguienteEstado[clientId]
      return siguienteEstado
    })
    setEjerciciosPendientesAbiertos((estadoActual) =>
      Object.fromEntries(
        Object.entries(estadoActual).filter(([clave]) => !clave.startsWith(`${clientId}-`)),
      ),
    )
  }

  const eliminarEjercicioPendiente = (clientId, indiceEjercicio) => {
    setPendientesEditados((pendientesActuales) =>
      pendientesActuales.flatMap((entrenamientoPendiente) => {
        if (entrenamientoPendiente.clientId !== clientId) {
          return [entrenamientoPendiente]
        }

        const ejerciciosActualizados = entrenamientoPendiente.ejercicios.filter(
          (_, indiceActual) => indiceActual !== indiceEjercicio,
        )

        if (ejerciciosActualizados.length === 0) {
          return []
        }

        return [
          {
            ...entrenamientoPendiente,
            ejercicios: ejerciciosActualizados,
          },
        ]
      }),
    )

    setEjerciciosPendientesAbiertos((estadoActual) =>
      Object.fromEntries(
        Object.entries(estadoActual).filter(([clave]) => clave !== `${clientId}-${indiceEjercicio}`),
      ),
    )
  }

  const actualizarPendienteCampo = (clientId, campo, valor) => {
    setPendientesEditados((pendientesActuales) =>
      pendientesActuales.map((entrenamientoPendiente) =>
        entrenamientoPendiente.clientId === clientId
          ? { ...entrenamientoPendiente, [campo]: valor }
          : entrenamientoPendiente,
      ),
    )
  }

  const actualizarPendienteEjercicioCampo = (clientId, indiceEjercicio, campo, valor) => {
    setPendientesEditados((pendientesActuales) =>
      pendientesActuales.map((entrenamientoPendiente) =>
        entrenamientoPendiente.clientId === clientId
          ? {
              ...entrenamientoPendiente,
              ejercicios: entrenamientoPendiente.ejercicios.map((ejercicio, indiceActual) =>
                indiceActual === indiceEjercicio ? { ...ejercicio, [campo]: valor } : ejercicio,
              ),
            }
          : entrenamientoPendiente,
      ),
    )
  }

  const sugerirPendiente = (clientId) => {
    setPendientesEditados((pendientesActuales) =>
      pendientesActuales.map((entrenamientoPendiente) =>
        entrenamientoPendiente.clientId === clientId
          ? sugerirCorreccionesPendiente(entrenamientoPendiente, sesiones, catalogoEjercicios)
          : entrenamientoPendiente,
      ),
    )
  }

  const sugerirTodosLosPendientes = () => {
    setPendientesEditados((pendientesActuales) =>
      pendientesActuales.map((entrenamientoPendiente) =>
        sugerirCorreccionesPendiente(entrenamientoPendiente, sesiones, catalogoEjercicios),
      ),
    )
  }

  const forzarSubidaPendientes = async (clientIds = []) => {
    const pendientesObjetivo =
      clientIds.length === 0
        ? pendientesEditados.map((entrenamientoPendiente) => entrenamientoPendiente.clientId)
        : clientIds

    guardarPendientesEditados(pendientesEditados)
    setClientIdPendienteForzando(clientIds.length === 1 ? clientIds[0] : '__all__')

    try {
      const resultado = await sincronizarPendientesEntreno(pendientesObjetivo)

      if (resultado) {
        aplicarResultadoSincronizacionPendientes(resultado)
      }
    } finally {
      setClientIdPendienteForzando('')
    }
  }

  const seleccionarSesion = (idSesion) => {
    if (!idSesion) {
      limpiarSeleccionSesion()
      return
    }

    const sesion = sesiones.find((elemento) => elemento.id === idSesion)

    if (!sesion) return

    setIdSesionSeleccionada(idSesion)
    const siguienteEntrenamiento = crearEntrenamientoDesdeSesion(sesion)

    setEntrenamiento(siguienteEntrenamiento)
    setEjerciciosAbiertos(crearEstadoEjerciciosCerrados(siguienteEntrenamiento.ejercicios))
    setEstaAbiertoSelectorSesiones(false)
    setBusquedaSesion('')
    setMensaje(
      'Entreno de hoy cargado desde la plantilla. Puedes modificarlo sin cambiar la base.',
    )
  }

  const alternarEjercicio = (idEjercicio) => {
    const ejercicio = entrenamiento?.ejercicios.find(
      (elemento) => elemento.idEjercicio === idEjercicio,
    )

    if (ejercicio?.completado) return

    setEjerciciosAbiertos((ejerciciosAbiertosActuales) => ({
      ...ejerciciosAbiertosActuales,
      [idEjercicio]: !ejerciciosAbiertosActuales[idEjercicio],
    }))
  }

  const alternarEjercicioCompletado = (idEjercicio) => {
    setEntrenamiento((entrenamientoActual) => ({
      ...entrenamientoActual,
      ejercicios: entrenamientoActual.ejercicios.map((ejercicio) =>
        ejercicio.idEjercicio === idEjercicio
          ? { ...ejercicio, completado: !ejercicio.completado }
          : ejercicio,
      ),
    }))

    setEjerciciosAbiertos((ejerciciosAbiertosActuales) => ({
      ...ejerciciosAbiertosActuales,
      [idEjercicio]: false,
    }))
  }

  const actualizarEjercicio = (idEjercicio, campo, valor) => {
    setEntrenamiento((entrenamientoActual) => ({
      ...entrenamientoActual,
      ejercicios: entrenamientoActual.ejercicios.map((ejercicio) =>
        ejercicio.idEjercicio === idEjercicio ? { ...ejercicio, [campo]: valor } : ejercicio,
      ),
    }))
  }

  const actualizarSerie = (idEjercicio, idSerie, campo, valor) => {
    setEntrenamiento((entrenamientoActual) => ({
      ...entrenamientoActual,
      ejercicios: entrenamientoActual.ejercicios.map((ejercicio) =>
        ejercicio.idEjercicio === idEjercicio
          ? {
              ...ejercicio,
              seriesRealizadas: ejercicio.seriesRealizadas.map((serie) =>
                serie.id === idSerie ? { ...serie, [campo]: Number(valor) } : serie,
              ),
            }
          : ejercicio,
      ),
    }))
  }

  const agregarSerie = (idEjercicio) => {
    setEntrenamiento((entrenamientoActual) => ({
      ...entrenamientoActual,
      ejercicios: entrenamientoActual.ejercicios.map((ejercicio) => {
        if (ejercicio.idEjercicio !== idEjercicio) return ejercicio

        const siguienteNumeroSerie =
          Math.max(
            0,
            ...ejercicio.seriesRealizadas.map((serie) => Number(serie.numeroSerie) || 0),
          ) + 1

        return {
          ...ejercicio,
          seriesRealizadas: [
            ...ejercicio.seriesRealizadas,
            {
              id: `serie-${Date.now()}`,
              numeroSerie: siguienteNumeroSerie,
              repeticiones: ejercicio.repeticionesPlanificadas || 0,
              peso: ejercicio.pesoPlanificado || 0,
            },
          ],
        }
      }),
    }))
  }

  const agregarTramoPeso = (idEjercicio, serieOrigen) => {
    setEntrenamiento((entrenamientoActual) => ({
      ...entrenamientoActual,
      ejercicios: entrenamientoActual.ejercicios.map((ejercicio) => {
        if (ejercicio.idEjercicio !== idEjercicio) return ejercicio

        const indiceOrigen = ejercicio.seriesRealizadas.findIndex(
          (serie) => serie.id === serieOrigen.id,
        )
        const nuevaSerie = {
          id: `serie-${Date.now()}`,
          numeroSerie: serieOrigen.numeroSerie,
          repeticiones: 0,
          peso: serieOrigen.peso,
        }
        const seriesRealizadas = [...ejercicio.seriesRealizadas]

        seriesRealizadas.splice(indiceOrigen + 1, 0, nuevaSerie)

        return { ...ejercicio, seriesRealizadas }
      }),
    }))
  }

  const eliminarSerie = (idEjercicio, idSerie) => {
    setEntrenamiento((entrenamientoActual) => ({
      ...entrenamientoActual,
      ejercicios: entrenamientoActual.ejercicios.map((ejercicio) =>
        ejercicio.idEjercicio === idEjercicio
          ? {
              ...ejercicio,
              seriesRealizadas: ejercicio.seriesRealizadas.filter((serie) => serie.id !== idSerie),
            }
          : ejercicio,
      ),
    }))
  }

  const agregarEjercicioSoloHoy = () => {
    const ejercicio = crearEjercicioDeHoy()

    setEntrenamiento((entrenamientoActual) => ({
      ...entrenamientoActual,
      ejercicios: [...entrenamientoActual.ejercicios, ejercicio],
    }))
    setEjerciciosAbiertos((ejerciciosAbiertosActuales) => ({
      ...ejerciciosAbiertosActuales,
      [ejercicio.idEjercicio]: true,
    }))
    setEstaAbiertoSelectorEjercicios(false)
    setBusquedaEjercicio('')
  }

  const agregarEjercicioDesdePlantilla = (ejercicioPlantilla) => {
    const ejercicio = crearEjercicioDeHoyDesdePlantilla(ejercicioPlantilla)

    setEntrenamiento((entrenamientoActual) => ({
      ...entrenamientoActual,
      ejercicios: [...entrenamientoActual.ejercicios, ejercicio],
    }))
    setEjerciciosAbiertos((ejerciciosAbiertosActuales) => ({
      ...ejerciciosAbiertosActuales,
      [ejercicio.idEjercicio]: true,
    }))
    setEstaAbiertoSelectorEjercicios(false)
    setBusquedaEjercicio('')
  }

  const cargarEjemploEntrenamiento = () => {
    const ejemploEntrenamiento = crearEjemploEntrenamiento()
    const ejemploEntrenamientoAnterior = crearEjemploEntrenamientoAnterior()
    const historialSinEjemplo = historial.filter(
      (itemHistorial) => itemHistorial.id !== ejemploEntrenamientoAnterior.id,
    )
    const historialActualizado = [ejemploEntrenamientoAnterior, ...historialSinEjemplo]

    setIdSesionSeleccionada('')
    setHistorial(historialActualizado)
    guardarHistorialEntrenos(historialActualizado)
    setEntrenamiento(ejemploEntrenamiento)
    setEjerciciosAbiertos(crearEstadoEjerciciosCerrados(ejemploEntrenamiento.ejercicios))
    setMensaje(
      'Ejemplo completo cargado con entreno actual y registro anterior para comparar en linea.',
    )
  }

  const quitarEjercicioSoloHoy = (idEjercicio) => {
    setEntrenamiento((entrenamientoActual) => ({
      ...entrenamientoActual,
      ejercicios: entrenamientoActual.ejercicios.filter(
        (ejercicio) => ejercicio.idEjercicio !== idEjercicio,
      ),
    }))
  }

  const finalizarEntrenamiento = async () => {
    if (!entrenamiento) return

    setEstaGuardando(true)
    setMensaje('Enviando entreno al servidor...')
    console.log('[EntrenoSync] Finalizar entreno pulsado', {
      clientId: entrenamiento.clientId,
      fechaInicio: entrenamiento.fechaInicio,
      nombreSesion: entrenamiento.nombreSesion,
      ejercicios: entrenamiento.ejercicios?.length || 0,
    })

    const entrenamientoCompletado = {
      ...entrenamiento,
      fechaFin: new Date().toISOString(),
    }

      try {
        const resultado = await guardarEntrenamientoConRespaldo(entrenamientoCompletado)

        limpiarEntrenamientoBorrador()
        setHistorial(resultado.historial)
      setIdSesionSeleccionada('')
      setEntrenamiento(null)
      setEjerciciosAbiertos({})

        setMensaje(
          resultado.online
            ? 'Servidor OK. Entreno guardado y borrador local limpiado.'
            : `${resultado.error?.message || 'No se pudo sincronizar ahora mismo.'} El entreno queda guardado en local y pendiente de sincronizar.`,
        )
      if (resultado.online && resultado.entrenamientosSincronizados?.length) {
        setToastSincronizacion({
          id: Date.now(),
          mensaje: crearMensajeToastSincronizacion(resultado.entrenamientosSincronizados),
        })
      }
    } catch (errorCapturado) {
      console.log('[EntrenoSync] Error finalizando entreno', {
        message: errorCapturado?.message,
        status: errorCapturado?.status,
      })
      if (errorCapturado?.historial) {
        setHistorial(errorCapturado.historial)
      }
      setMensaje(`${errorCapturado.message} El borrador sigue guardado en localStorage.`)
    } finally {
      setEstaGuardando(false)
    }
  }

  const recargarDesdeServidor = async ({ silencioso = false } = {}) => {
    setEstaRecargando(true)
    if (silencioso) {
      setMensaje('')
    }

    console.log('[EntrenoSync] Recarga desde servidor iniciada', { silencioso })

    try {
      const [sesionesServidor, historialServidor, catalogoServidor] = await Promise.all([
        obtenerSesionesEntrenoDesdeServidor(),
        obtenerEntrenamientosDesdeServidor(),
        obtenerEjerciciosDesdeServidor(),
      ])

      setSesiones(sesionesServidor)
      const historialFusionado = fusionarHistorialEntrenamientosGuardado(historialServidor)
      setHistorial(historialFusionado)
      setCatalogoEjercicios(catalogoServidor)
      guardarSesionesEntreno(sesionesServidor)
      guardarCatalogoEjerciciosEntreno(catalogoServidor)

      const resultadoSincronizacion = await sincronizarPendientesEntreno()

      if (resultadoSincronizacion) {
        aplicarResultadoSincronizacionPendientes(resultadoSincronizacion)
      }

      const sesionSeleccionada = idSesionSeleccionada
        ? sesionesServidor.find((sesion) => sesion.id === idSesionSeleccionada) || null
        : null

      if (sesionSeleccionada) {
        const siguienteEntrenamiento = crearEntrenamientoDesdeSesion(sesionSeleccionada)
        setIdSesionSeleccionada(sesionSeleccionada.id)
        setEntrenamiento(siguienteEntrenamiento)
        setEjerciciosAbiertos(crearEstadoEjerciciosCerrados(siguienteEntrenamiento.ejercicios))
      } else {
        setIdSesionSeleccionada('')
        setEntrenamiento(null)
        setEjerciciosAbiertos({})
      }

      setEstaAbiertoSelectorEjercicios(false)
      setEstaAbiertoSelectorSesiones(false)
      setBusquedaEjercicio('')
      setBusquedaSesion('')
      if (!silencioso) {
        setMensaje(crearMensajeResumenSincronizacion(resultadoSincronizacion))
      }
    } catch (errorCapturado) {
      console.log('[EntrenoSync] Error en recarga desde servidor', {
        message: errorCapturado?.message,
        status: errorCapturado?.status,
      })
      setMensaje(
        `${errorCapturado.message} No se pudieron recuperar los datos originales desde la base de datos.`,
      )
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
      onRefresh: () => recargarDesdeServidor({ silencioso: true }),
    })

  const ocultarAyudaGesto = true
  const gestoRecargaDisponible = _gestoRecargaDisponible && !ocultarAyudaGesto

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <MobilePullToRefreshIndicator
        isPulling={isPulling}
        isReady={isReady}
        isRefreshing={isRefreshing}
        pullDistance={pullDistance}
        progress={progress}
      />
      <main
        className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8"
      >
        <section className="rounded-lg border border-neon-cyan/30 bg-white p-5 shadow-glow-cyan transition-all duration-300 ease-out dark:bg-white/[0.04]">
          <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
                Entreno de hoy
              </p>
              <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                Registra lo que haces hoy, sin romper la plantilla.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                Selecciona una sesion base, ajusta series, reps, peso, altura o agarre solo
                para hoy. El ultimo registro del mismo ejercicio aparece al lado para comparar.
              </p>
            </div>

            <div className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <p>Entreno a realizar</p>
              <div className="rounded-lg border border-neon-cyan/40 bg-white/70 p-2 dark:bg-pes-black/40">
                <button
                  className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3 text-left text-base font-bold text-slate-900 transition-all duration-300 ease-out hover:border-neon-pink dark:border-white/10 dark:bg-pes-black dark:text-white"
                  type="button"
                  onClick={() => {
                    setEstaAbiertoSelectorSesiones((valorActual) => !valorActual)
                    setEstaAbiertoSelectorEjercicios(false)
                  }}
                >
                  <span>
                    {sesiones.find((sesion) => sesion.id === idSesionSeleccionada)?.nombreSesion ||
                      '-- Seleccionar --'}
                  </span>
                  <svg
                    className={`h-5 w-5 text-neon-cyan transition-transform duration-300 ${
                      estaAbiertoSelectorSesiones ? 'rotate-180' : ''
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

                <div
                  className={`mt-2 grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                    estaAbiertoSelectorSesiones
                      ? 'grid-rows-[1fr] opacity-100'
                      : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden rounded-md border border-slate-200 bg-white/95 dark:border-white/10 dark:bg-pes-black/95">
                    <div className="border-b border-slate-200 p-2 dark:border-white/10">
                      <input
                        className="w-full rounded-md border border-neon-cyan/40 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all duration-300 ease-out focus:border-neon-pink focus:shadow-glow-pink dark:bg-pes-black dark:text-white"
                        placeholder="Buscar entreno..."
                        value={busquedaSesion}
                        onChange={(evento) => setBusquedaSesion(evento.target.value)}
                      />
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                      <button
                        className={`w-full border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold transition-all duration-200 dark:border-white/10 ${
                          idSesionSeleccionada === ''
                            ? 'bg-neon-cyan/15 text-neon-cyan'
                            : 'text-slate-800 hover:bg-neon-pink/10 hover:text-neon-pink dark:text-slate-200'
                        }`}
                        type="button"
                        onClick={() => seleccionarSesion('')}
                      >
                        -- Seleccionar --
                      </button>
                      {sesionesFiltradas.map((sesion) => (
                        <button
                          className={`w-full border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold transition-all duration-200 last:border-b-0 dark:border-white/10 ${
                            idSesionSeleccionada === sesion.id
                              ? 'bg-neon-cyan/15 text-neon-cyan'
                              : 'text-slate-800 hover:bg-neon-pink/10 hover:text-neon-pink dark:text-slate-200'
                          }`}
                          key={sesion.id}
                          type="button"
                          onClick={() => seleccionarSesion(sesion.id)}
                        >
                          {sesion.nombreSesion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-wrap justify-end gap-3">
          <button
            className="rounded-md border border-amber-400/60 px-4 py-3 text-sm font-bold text-amber-600 shadow-[0_0_20px_rgba(251,191,36,0.18)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:text-amber-300"
            type="button"
            onClick={abrirModalPendientes}
          >
            Pendientes{entrenamientosPendientes.length ? ` (${entrenamientosPendientes.length})` : ''}
          </button>
          <button
            className="hidden rounded-md border border-neon-purple/50 px-4 py-3 text-sm font-bold text-neon-purple shadow-glow-purple transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:text-neon-pink disabled:cursor-not-allowed disabled:opacity-60 sm:inline-flex"
            type="button"
            disabled={estaRecargando}
            onClick={recargarDesdeServidor}
          >
            {estaRecargando ? 'Recargando...' : 'Recargar BBDD'}
          </button>
          <button
            className="rounded-md border border-neon-cyan/50 px-4 py-3 text-sm font-bold text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:text-neon-cyan"
            type="button"
            onClick={cargarEjemploEntrenamiento}
          >
            Cargar ejemplo
          </button>
          <button
            className="rounded-md border border-neon-purple/50 px-4 py-3 text-sm font-bold text-neon-purple shadow-glow-purple transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink disabled:cursor-not-allowed disabled:opacity-50 dark:text-neon-pink"
            type="button"
            disabled={!entrenamiento}
            onClick={() => {
              setEstaAbiertoSelectorEjercicios((valorActual) => !valorActual)
              setEstaAbiertoSelectorSesiones(false)
            }}
          >
            Añadir ejercicio solo hoy
          </button>
        </section>
        {gestoRecargaDisponible ? (
          <p className="text-center text-xs text-slate-400 sm:hidden dark:text-slate-500">
            En movil, arriba del todo, mantén el dedo y desliza hacia abajo para recargar.
          </p>
        ) : null}

        {mensaje && !entrenamiento ? (
          <section
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${
              mensaje.toLowerCase().includes('no se pudo') || mensaje.toLowerCase().includes('error')
                ? 'border-neon-pink/35 bg-neon-pink/8 text-neon-pink'
                : 'border-neon-cyan/30 bg-neon-cyan/8 text-slate-700 dark:text-slate-200'
            }`}
          >
            {mensaje}
          </section>
        ) : null}

        {estaAbiertoSelectorEjercicios && entrenamiento ? (
          <section className="rounded-lg border border-neon-purple/30 bg-white p-3 shadow-glow-purple dark:bg-white/[0.04]">
            <div className="grid gap-2">
              <input
                className="w-full rounded-md border border-neon-cyan/40 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-all duration-300 ease-out focus:border-neon-pink focus:shadow-glow-pink dark:bg-pes-black dark:text-white"
                placeholder="Buscar ejercicio para hoy..."
                value={busquedaEjercicio}
                onChange={(evento) => setBusquedaEjercicio(evento.target.value)}
              />

              <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200 dark:border-white/10">
                {plantillasEjerciciosAgregables.length > 0 ? (
                  plantillasEjerciciosAgregables.map((ejercicio) => (
                    <button
                      className="w-full border-b border-slate-200 px-4 py-3 text-left transition-all duration-200 last:border-b-0 hover:bg-neon-cyan/10 dark:border-white/10 dark:hover:bg-neon-purple/10"
                      key={ejercicio.idEjercicio}
                      type="button"
                      onClick={() => agregarEjercicioDesdePlantilla(ejercicio)}
                    >
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {ejercicio.nombre}
                      </p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        {ejercicio.seriesPlanificadas}x{ejercicio.repeticionesPlanificadas} ·{' '}
                        {ejercicio.pesoPlanificado}kg · {ejercicio.agarre || 'Sin agarre'}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                    No hay ejercicios disponibles con ese filtro.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  className="rounded-md border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:border-neon-pink hover:text-neon-pink dark:border-white/10 dark:text-slate-300"
                  type="button"
                  onClick={() => setEstaAbiertoSelectorEjercicios(false)}
                >
                  Cerrar
                </button>
                <button
                  className="rounded-md border border-neon-cyan/50 px-3 py-2 text-xs font-bold text-neon-cyan hover:border-neon-pink hover:text-neon-pink"
                  type="button"
                  onClick={agregarEjercicioSoloHoy}
                >
                  Crear ejercicio manual
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="grid gap-5">
          {entrenamiento?.ejercicios.map((ejercicio) => {
            const registroAnterior =
              registrosPreviosPorCatalogo[ejercicio.catalogoEjercicioId] ||
              obtenerUltimoRegistroEjercicio(
                ejercicio.catalogoEjercicioId || ejercicio.idEjercicio,
                historial,
              )
            const estaAbiertoEjercicio = Boolean(ejerciciosAbiertos[ejercicio.idEjercicio])
            const gruposSeries = agruparSeriesPorNumeroSerie(ejercicio.seriesRealizadas)

            return (
              <article
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out hover:border-neon-cyan/50 hover:shadow-glow-cyan dark:border-white/10 dark:bg-white/[0.04]"
                key={ejercicio.idEjercicio}
              >
                <div className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                  <button
                    className="flex min-w-0 flex-1 items-center gap-4 text-left"
                    type="button"
                    aria-expanded={estaAbiertoEjercicio}
                    onClick={() => alternarEjercicio(ejercicio.idEjercicio)}
                  >
                    <span
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-neon-cyan/40 text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out dark:text-neon-cyan"
                      aria-hidden="true"
                    >
                      <svg
                        className={`h-5 w-5 transition-transform duration-300 ease-out ${
                          estaAbiertoEjercicio ? 'rotate-180 text-neon-pink' : ''
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
                        {gruposSeries.length} series · {ejercicio.seriesRealizadas.length} tramos ·{' '}
                        {ejercicio.completado
                          ? 'completado'
                          : ejercicio.omitido
                            ? 'omitido hoy'
                            : 'activo'}
                      </span>
                    </span>
                  </button>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={ejercicio.completado}
                      title={ejercicio.completado ? 'Completado' : 'Pendiente'}
                      className="inline-flex items-center gap-2 rounded-md border border-[#39ff14]/50 px-3 py-2 text-sm font-black text-[#39ff14] shadow-[0_0_16px_rgba(57,255,20,0.28)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(57,255,20,0.45)]"
                      onClick={() => alternarEjercicioCompletado(ejercicio.idEjercicio)}
                    >
                      <span
                        className={`relative h-6 w-11 rounded-full border transition-all duration-300 ease-out ${
                          ejercicio.completado
                            ? 'border-[#39ff14]/80 bg-[#39ff14]/30 shadow-[0_0_14px_rgba(57,255,20,0.45)]'
                            : 'border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`absolute left-0.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full transition-all duration-300 ease-out ${
                            ejercicio.completado
                              ? 'translate-x-5 bg-[#39ff14] text-pes-black'
                              : 'translate-x-0 bg-white text-slate-500 dark:bg-slate-200 dark:text-slate-600'
                          }`}
                        >
                          {ejercicio.completado ? (
                            <svg
                              className="h-3 w-3"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg
                              className="h-3 w-3"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 6 6 18" />
                              <path d="m6 6 12 12" />
                            </svg>
                          )}
                        </span>
                      </span>
                      Completado
                    </button>
                    <button
                      className="rounded-md border border-neon-pink/50 px-3 py-2 text-sm font-bold text-neon-pink shadow-glow-pink transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:text-neon-purple hover:shadow-glow-purple"
                      type="button"
                      onClick={() =>
                        actualizarEjercicio(ejercicio.idEjercicio, 'omitido', !ejercicio.omitido)
                      }
                    >
                      {ejercicio.omitido ? 'Reactivar' : 'No hacer hoy'}
                    </button>
                    <button
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:border-white/10 dark:text-slate-400"
                      type="button"
                      onClick={() => quitarEjercicioSoloHoy(ejercicio.idEjercicio)}
                    >
                      Quitar
                    </button>
                  </div>
                </div>

                <div
                  className={`grid transition-[grid-template-rows] duration-500 ease-out ${
                    estaAbiertoEjercicio && !ejercicio.completado
                      ? 'grid-rows-[1fr]'
                      : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="grid gap-4 border-t border-slate-200 p-5 dark:border-white/10">
                      <div>
                        <input
                          className="font-display w-full bg-transparent text-xl font-black text-slate-950 outline-none transition-all duration-300 ease-out focus:text-neon-purple dark:text-white dark:focus:text-neon-pink"
                          value={ejercicio.nombre}
                          onChange={(evento) =>
                            actualizarEjercicio(
                              ejercicio.idEjercicio,
                              'nombre',
                              evento.target.value,
                            )
                          }
                        />
                        <input
                          className="mt-2 w-full bg-transparent text-sm text-slate-600 outline-none transition-all duration-300 ease-out focus:text-neon-purple dark:text-slate-400 dark:focus:text-neon-cyan"
                          value={ejercicio.grupoMuscular}
                          placeholder="Grupo muscular"
                          onChange={(evento) =>
                            actualizarEjercicio(
                              ejercicio.idEjercicio,
                              'grupoMuscular',
                              evento.target.value,
                            )
                          }
                        />
                        <input
                          className="mt-2 w-full bg-transparent text-sm text-slate-600 outline-none transition-all duration-300 ease-out focus:text-neon-purple dark:text-slate-400 dark:focus:text-neon-cyan"
                          value={ejercicio.patronMovimiento}
                          placeholder="Patron"
                          onChange={(evento) =>
                            actualizarEjercicio(
                              ejercicio.idEjercicio,
                              'patronMovimiento',
                              evento.target.value,
                            )
                          }
                        />
                        <input
                          className="mt-2 w-full bg-transparent text-sm text-slate-600 outline-none transition-all duration-300 ease-out focus:text-neon-purple dark:text-slate-400 dark:focus:text-neon-cyan"
                          value={ejercicio.descripcion}
                          placeholder="Descripcion"
                          onChange={(evento) =>
                            actualizarEjercicio(
                              ejercicio.idEjercicio,
                              'descripcion',
                              evento.target.value,
                            )
                          }
                        />
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
                              className={claseInputPeso}
                              type="number"
                              min="0"
                              max="999"
                              value={ejercicio.pesoPlanificado}
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

                      <div className="grid gap-2 rounded-lg border border-neon-purple/30 bg-slate-50 p-3 text-xs text-slate-600 shadow-glow-purple dark:bg-pes-black/60 dark:text-slate-400 sm:grid-cols-3">
                        <p>
                          <span className="font-bold text-slate-950 dark:text-white">
                            Anterior:
                          </span>{' '}
                          {registroAnterior
                            ? `${new Date(registroAnterior.fechaFin).toLocaleDateString('es-ES')} · ${registroAnterior.nombreSesion}`
                            : 'Sin registro previo'}
                        </p>
                        <p>
                          <span className="font-bold text-slate-950 dark:text-white">
                            Banco:
                          </span>{' '}
                          {registroAnterior?.alturaBanco || '-'}
                        </p>
                        <p>
                          <span className="font-bold text-slate-950 dark:text-white">
                            Agarre:
                          </span>{' '}
                          {registroAnterior?.agarre || '-'}
                        </p>
                      </div>

                      <div className="grid gap-3">
                        {agruparSeriesPorNumeroSerie(ejercicio.seriesRealizadas).map(
                          (grupoSeries) => {
                            const seriesAnteriores = obtenerSeriesAnterioresPorNumeroSerie(
                              registroAnterior,
                              grupoSeries.numeroSerie,
                            )
                            const hayCambioPesoAnterior =
                              seriesAnteriores.length > 1 && tieneMultiplesPesos(seriesAnteriores)
                            const hayCambioPesoActual =
                              grupoSeries.series.length > 1 &&
                              tieneMultiplesPesos(grupoSeries.series)
                            const ultimaSerieDelGrupo =
                              grupoSeries.series[grupoSeries.series.length - 1]

                            return (
                              <div
                                className="rounded-lg border border-slate-200 p-3 transition-all duration-300 ease-out hover:border-neon-purple/50 hover:shadow-glow-purple dark:border-white/10"
                                key={grupoSeries.numeroSerie}
                              >
                                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-bold text-neon-purple dark:text-neon-cyan">
                                      Serie {grupoSeries.numeroSerie}
                                    </p>
                                    {hayCambioPesoActual ? (
                                      <span className="rounded-full border border-neon-cyan/40 px-2 py-1 text-xs font-bold text-neon-cyan shadow-glow-cyan">
                                        Varios pesos hoy
                                      </span>
                                    ) : null}
                                    {hayCambioPesoAnterior ? (
                                      <span className="rounded-full border border-neon-pink/50 px-2 py-1 text-xs font-bold text-neon-pink shadow-glow-pink">
                                        Mas de un peso anterior
                                      </span>
                                    ) : null}
                                  </div>

                                  <button
                                    className="w-fit rounded-md border border-neon-cyan/50 px-3 py-2 text-sm font-bold text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:text-neon-cyan"
                                    type="button"
                                    onClick={() =>
                                      agregarTramoPeso(
                                        ejercicio.idEjercicio,
                                        ultimaSerieDelGrupo,
                                      )
                                    }
                                  >
                                    Otro peso en serie {grupoSeries.numeroSerie}
                                  </button>
                                </div>

                                <div className="mt-3 grid gap-2">
                                  {grupoSeries.series.map((serie, indiceSerie) => (
                                    <div
                                      className="grid gap-3 rounded-md border border-slate-200/80 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-pes-black/50"
                                      key={serie.id}
                                    >
                                      <div className="grid grid-cols-2 gap-3">
                                        <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                          Reps hechas
                                          <input
                                            className={claseInputNumero}
                                            type="number"
                                            min="0"
                                            max="99"
                                            value={serie.repeticiones}
                                            onChange={(evento) =>
                                              actualizarSerie(
                                                ejercicio.idEjercicio,
                                                serie.id,
                                                'repeticiones',
                                                evento.target.value,
                                              )
                                            }
                                          />
                                        </label>
                                        <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                          Peso
                                          <input
                                            className={claseInputPeso}
                                            type="number"
                                            min="0"
                                            max="999"
                                            value={serie.peso}
                                            onChange={(evento) =>
                                              actualizarSerie(
                                                ejercicio.idEjercicio,
                                                serie.id,
                                                'peso',
                                                evento.target.value,
                                              )
                                            }
                                          />
                                        </label>
                                      </div>
                                      <div className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        Anterior
                                        <div className="flex min-h-10 items-center rounded-md border border-neon-purple/30 bg-white px-3 py-2 text-sm font-bold text-slate-950 shadow-[0_0_18px_rgba(105,0,255,0.12)] dark:bg-pes-black/70 dark:text-neon-pink">
                                          {formatearSerieAnterior(seriesAnteriores[indiceSerie])}
                                        </div>
                                      </div>
                                      <div className="flex justify-end">
                                        <button
                                          className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:border-white/10 dark:text-slate-400"
                                          type="button"
                                          onClick={() =>
                                            eliminarSerie(ejercicio.idEjercicio, serie.id)
                                          }
                                        >
                                          Borrar
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                  {seriesAnteriores.length > grupoSeries.series.length ? (
                                    <div className="rounded-md border border-neon-pink/30 px-3 py-2 text-sm text-neon-pink shadow-[0_0_18px_rgba(255,102,255,0.12)]">
                                      La sesion anterior tuvo {seriesAnteriores.length} tramos en
                                      esta serie:{' '}
                                      {seriesAnteriores
                                        .map((serieAnterior) =>
                                          formatearSerieAnterior(serieAnterior),
                                        )
                                        .join(' + ')}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            )
                          },
                        )}
                      </div>

                      <button
                        className="w-fit rounded-md border border-neon-cyan/50 px-4 py-3 text-sm font-bold text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:text-neon-cyan"
                        type="button"
                        onClick={() => agregarSerie(ejercicio.idEjercicio)}
                      >
                        Añadir serie
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      </main>

      {entrenamiento ? (
        <PieAccion
          etiquetaAccion="Finalizar y enviar"
          deshabilitado={estaGuardando}
          estaCargando={estaGuardando}
          mensaje={mensaje}
          alAccionar={finalizarEntrenamiento}
        />
      ) : null}

      {estaAbiertoModalPendientes ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[88vh] w-full max-w-6xl flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_28px_90px_rgba(15,23,42,0.28)] dark:border-white/10 dark:bg-[#080B14]">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
                  Pendientes
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                  Cola offline de entrenos
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                  Revisa ids, corrige lo que haga falta y fuerza la subida cuando quieras.
                </p>
              </div>

              <button
                className="rounded-full border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600 transition-all duration-300 ease-out hover:border-neon-pink hover:text-neon-pink dark:border-white/10 dark:text-slate-300"
                type="button"
                onClick={cerrarModalPendientes}
              >
                Cerrar
              </button>
            </div>

            <div className="flex flex-wrap gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <button
                className="rounded-md border border-neon-cyan/50 px-4 py-3 text-sm font-bold text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:text-neon-cyan"
                type="button"
                onClick={sugerirTodosLosPendientes}
              >
                Sugerir correcciones
              </button>
              <button
                className="rounded-md border border-neon-purple/50 px-4 py-3 text-sm font-bold text-neon-purple shadow-glow-purple transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink"
                type="button"
                onClick={() => guardarPendientesEditados(pendientesEditados)}
              >
                Guardar cambios
              </button>
              <button
                className="rounded-md border border-amber-400/60 px-4 py-3 text-sm font-bold text-amber-600 shadow-[0_0_20px_rgba(251,191,36,0.18)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:text-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                type="button"
                disabled={
                  pendientesEditados.length === 0 || clientIdPendienteForzando === '__all__'
                }
                onClick={() => forzarSubidaPendientes()}
              >
                {clientIdPendienteForzando === '__all__'
                  ? 'Subiendo pendientes...'
                  : 'Forzar subida de todos'}
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5">
              <datalist id="pendientes-sesiones-sugeridas">
                {opcionesSesionesPendientes.map((sesion) => (
                  <option
                    key={`${sesion.idSesion}-${sesion.nombreSesion}`}
                    value={sesion.idSesion}
                    label={sesion.nombreSesion}
                  />
                ))}
              </datalist>
              <datalist id="pendientes-catalogo-sugerido">
                {opcionesCatalogoPendientes.map((ejercicio) => (
                  <option
                    key={`${ejercicio.catalogoEjercicioId}-${ejercicio.nombre}`}
                    value={ejercicio.catalogoEjercicioId}
                    label={ejercicio.nombre}
                  />
                ))}
              </datalist>
              {pendientesEditados.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-pes-black/40 dark:text-slate-400">
                  No hay entrenos pendientes de sincronizar.
                </div>
              ) : (
                <div className="grid gap-5">
                  {pendientesEditados.map((entrenamientoPendiente) => {
                    const estadoPendiente = obtenerEstadoPendiente(entrenamientoPendiente)
                    const estaAbiertoPendiente = Boolean(
                      pendientesAbiertos[entrenamientoPendiente.clientId],
                    )

                    return (
                      <article
                        className="rounded-[24px] border border-slate-200 bg-slate-50/70 p-4 shadow-[0_14px_36px_rgba(15,23,42,0.08)] dark:border-white/10 dark:bg-pes-black/45"
                        key={entrenamientoPendiente.clientId}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <button
                            className="min-w-0 flex-1 text-left"
                            type="button"
                            onClick={() => alternarPendiente(entrenamientoPendiente.clientId)}
                          >
                            <div className="flex items-start gap-3">
                              <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neon-cyan/35 text-neon-cyan">
                                <svg
                                  className={`h-4 w-4 transition-transform duration-300 ${
                                    estaAbiertoPendiente ? 'rotate-180' : ''
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
                              <span>
                          <h3 className="text-lg font-black text-slate-950 dark:text-white">
                            {entrenamientoPendiente.nombreSesion}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {formatearFechaEntrenamiento(
                              entrenamientoPendiente.fechaFin || entrenamientoPendiente.fechaInicio,
                            )}{' '}
                            · {entrenamientoPendiente.ejercicios.length} ejercicios
                          </p>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-bold ${
                                estadoPendiente.variante === 'error'
                                  ? 'border-neon-pink/40 bg-neon-pink/10 text-neon-pink'
                                  : 'border-amber-400/50 bg-amber-400/10 text-amber-600 dark:text-amber-300'
                              }`}
                            >
                              {estadoPendiente.etiqueta}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {estadoPendiente.detalle}
                            </span>
                                </div>
                              </span>
                            </div>
                          </button>

                        <div className="flex flex-wrap gap-2">
                          <button
                            className="rounded-md border border-neon-cyan/50 px-3 py-2 text-sm font-bold text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:text-neon-cyan"
                            type="button"
                            onClick={() => sugerirPendiente(entrenamientoPendiente.clientId)}
                          >
                            Sugerir ids
                          </button>
                          <button
                            className="rounded-md border border-amber-400/60 px-3 py-2 text-sm font-bold text-amber-600 shadow-[0_0_20px_rgba(251,191,36,0.18)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:text-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
                            type="button"
                            disabled={clientIdPendienteForzando === entrenamientoPendiente.clientId}
                            onClick={() => forzarSubidaPendientes([entrenamientoPendiente.clientId])}
                          >
                            {clientIdPendienteForzando === entrenamientoPendiente.clientId
                              ? 'Subiendo...'
                              : 'Forzar subida'}
                          </button>
                          <button
                            className="rounded-md border border-neon-pink/45 px-3 py-2 text-sm font-bold text-neon-pink transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:text-neon-purple hover:shadow-glow-purple"
                            type="button"
                            onClick={() => eliminarPendienteEditado(entrenamientoPendiente.clientId)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>

                        <div
                          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                            estaAbiertoPendiente
                              ? 'mt-4 grid-rows-[1fr] opacity-100'
                              : 'grid-rows-[0fr] opacity-0'
                          }`}
                        >
                          <div className="overflow-hidden">
                        <div className="grid gap-3 md:grid-cols-2">
                        <label className="grid content-start gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                          ID entreno
                          <input
                            className={claseInputPendiente}
                            value={entrenamientoPendiente.id || ''}
                            onChange={(evento) =>
                              actualizarPendienteCampo(
                                entrenamientoPendiente.clientId,
                                'id',
                                evento.target.value,
                              )
                            }
                          />
                          {entrenamientoPendiente.syncFieldErrors?.id ? (
                            <span className="text-[11px] font-medium normal-case text-neon-pink">
                              {entrenamientoPendiente.syncFieldErrors.id}
                            </span>
                          ) : null}
                        </label>
                        <label className="grid content-start gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                          ID sesion
                          <input
                            className={claseInputPendiente}
                            list="pendientes-sesiones-sugeridas"
                            value={entrenamientoPendiente.idSesion || ''}
                            onChange={(evento) =>
                              actualizarPendienteCampo(
                                entrenamientoPendiente.clientId,
                                'idSesion',
                                evento.target.value,
                              )
                            }
                          />
                          <span className="text-[11px] font-medium normal-case text-slate-500 dark:text-slate-400">
                            Usa una sesion real del backend; vacio si no aplica.
                          </span>
                          {entrenamientoPendiente.syncFieldErrors?.idSesion ? (
                            <span className="text-[11px] font-medium normal-case text-neon-pink">
                              {entrenamientoPendiente.syncFieldErrors.idSesion}
                            </span>
                          ) : null}
                        </label>
                        </div>

                        <div className="mt-4 grid gap-3">
                          {entrenamientoPendiente.ejercicios.map((ejercicio, indiceEjercicio) => {
                            const claveEjercicioPendiente = `${entrenamientoPendiente.clientId}-${indiceEjercicio}`
                            const estaAbiertoEjercicioPendiente = Boolean(
                              ejerciciosPendientesAbiertos[claveEjercicioPendiente],
                            )

                            return (
                            <div
                              className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-white/10 dark:bg-[#0B1020]/75"
                              key={`${entrenamientoPendiente.clientId}-${ejercicio.clientId}-${indiceEjercicio}`}
                            >
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <button
                                  className="min-w-0 flex-1 text-left"
                                  type="button"
                                  onClick={() =>
                                    alternarEjercicioPendiente(
                                      entrenamientoPendiente.clientId,
                                      indiceEjercicio,
                                    )
                                  }
                                >
                                  <div className="flex items-start gap-3">
                                    <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neon-cyan/30 text-neon-cyan">
                                      <svg
                                        className={`h-4 w-4 transition-transform duration-300 ${
                                          estaAbiertoEjercicioPendiente ? 'rotate-180' : ''
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
                                    <span>
                                      <p className="text-sm font-bold text-slate-950 dark:text-white">
                                        {ejercicio.nombre}
                                      </p>
                                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        {ejercicio.catalogoEjercicioId
                                          ? `Catalogo ${ejercicio.catalogoEjercicioId}`
                                          : 'Ejercicio ad hoc'}
                                      </p>
                                    </span>
                                  </div>
                                </button>
                                <button
                                  className="rounded-md border border-neon-pink/45 px-3 py-2 text-xs font-bold text-neon-pink transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:text-neon-purple hover:shadow-glow-purple"
                                  type="button"
                                  onClick={() =>
                                    eliminarEjercicioPendiente(
                                      entrenamientoPendiente.clientId,
                                      indiceEjercicio,
                                    )
                                  }
                                >
                                  Eliminar ejercicio
                                </button>
                              </div>
                              {ejercicio.syncError ? (
                                <p className="mt-2 rounded-xl border border-neon-pink/35 bg-neon-pink/8 px-3 py-2 text-xs font-semibold text-neon-pink">
                                  {ejercicio.syncError}
                                </p>
                              ) : null}
                              <div
                                className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                                  estaAbiertoEjercicioPendiente
                                    ? 'mt-3 grid-rows-[1fr] opacity-100'
                                    : 'grid-rows-[0fr] opacity-0'
                                }`}
                              >
                                <div className="overflow-hidden">
                              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                              <label className="grid content-start gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                ID ejercicio
                                <input
                                  className={claseInputPendiente}
                                  value={ejercicio.idEjercicio || ''}
                                  onChange={(evento) =>
                                    actualizarPendienteEjercicioCampo(
                                      entrenamientoPendiente.clientId,
                                      indiceEjercicio,
                                      'idEjercicio',
                                      evento.target.value,
                                    )
                                  }
                                />
                                {ejercicio.syncFieldErrors?.idEjercicio ? (
                                  <span className="text-[11px] font-medium normal-case text-neon-pink">
                                    {ejercicio.syncFieldErrors.idEjercicio}
                                  </span>
                                ) : null}
                              </label>
                              <label className="grid content-start gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                ID interno
                                <input
                                  className={claseInputPendiente}
                                  value={ejercicio.id || ''}
                                  onChange={(evento) =>
                                    actualizarPendienteEjercicioCampo(
                                      entrenamientoPendiente.clientId,
                                      indiceEjercicio,
                                      'id',
                                      evento.target.value,
                                    )
                                  }
                                />
                                {ejercicio.syncFieldErrors?.id ? (
                                  <span className="text-[11px] font-medium normal-case text-neon-pink">
                                    {ejercicio.syncFieldErrors.id}
                                  </span>
                                ) : null}
                              </label>
                              <label className="grid content-start gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                Catalogo
                                <input
                                  className={claseInputPendiente}
                                  list="pendientes-catalogo-sugerido"
                                  value={ejercicio.catalogoEjercicioId || ''}
                                  onChange={(evento) =>
                                    actualizarPendienteEjercicioCampo(
                                      entrenamientoPendiente.clientId,
                                      indiceEjercicio,
                                      'catalogoEjercicioId',
                                      evento.target.value,
                                    )
                                  }
                                />
                                <span className="text-[11px] font-medium normal-case text-slate-500 dark:text-slate-400">
                                  Referencia real del catalogo. Vacio = ad hoc.
                                </span>
                                {ejercicio.syncFieldErrors?.catalogoEjercicioId ? (
                                  <span className="text-[11px] font-medium normal-case text-neon-pink">
                                    {ejercicio.syncFieldErrors.catalogoEjercicioId}
                                  </span>
                                ) : null}
                              </label>
                              <label className="grid content-start gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                Plantilla
                                <input
                                  className={claseInputPendiente}
                                  value={ejercicio.plantillaEjercicioId || ''}
                                  onChange={(evento) =>
                                    actualizarPendienteEjercicioCampo(
                                      entrenamientoPendiente.clientId,
                                      indiceEjercicio,
                                      'plantillaEjercicioId',
                                      evento.target.value,
                                    )
                                  }
                                />
                                {ejercicio.syncFieldErrors?.plantillaEjercicioId ? (
                                  <span className="text-[11px] font-medium normal-case text-neon-pink">
                                    {ejercicio.syncFieldErrors.plantillaEjercicioId}
                                  </span>
                                ) : null}
                              </label>
                              </div>
                                </div>
                              </div>
                            </div>
                            )
                          })}
                        </div>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {toastSincronizacion ? (
        <Toast
          key={toastSincronizacion.id}
          mensaje={toastSincronizacion.mensaje}
          tipo="info"
          onClose={() => setToastSincronizacion(null)}
        />
      ) : null}
    </div>
  )
}

export default Entreno
