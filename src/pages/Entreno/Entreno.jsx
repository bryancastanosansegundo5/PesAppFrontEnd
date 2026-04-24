import { useEffect, useMemo, useState } from 'react'
import PieAccion from '../../components/Footer/Footer'
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
  guardarEntrenamientoEnServidor,
  obtenerEntrenamientosDesdeServidor,
  obtenerSesionesEntrenoDesdeServidor,
} from './services/entrenoApiService'
import {
  obtenerEjerciciosDesdeServidor,
  obtenerUltimoRegistroEjercicioDesdeServidor,
} from '../Ejercicios/services/ejerciciosApiService'

const claseInputNumero =
  'w-20 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white'

const claseInputPeso =
  'w-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white'

const claseInputTexto =
  'rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white'

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

function crearEjercicioDeHoy() {
  return {
    idEjercicio: `hoy-${Date.now()}`,
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

    return sesiones[0] ? crearEntrenamientoDesdeSesion(sesiones[0]) : null
  })
  const [idSesionSeleccionada, setIdSesionSeleccionada] = useState(
    entrenamiento?.idSesion || sesiones[0]?.id || '',
  )
  const [estaGuardando, setEstaGuardando] = useState(false)
  const [estaRecargando, setEstaRecargando] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [ejerciciosAbiertos, setEjerciciosAbiertos] = useState({})
  const [estaAbiertoSelectorSesiones, setEstaAbiertoSelectorSesiones] = useState(false)
  const [busquedaSesion, setBusquedaSesion] = useState('')
  const [estaAbiertoSelectorEjercicios, setEstaAbiertoSelectorEjercicios] = useState(false)
  const [busquedaEjercicio, setBusquedaEjercicio] = useState('')
  const [registrosPreviosPorCatalogo, setRegistrosPreviosPorCatalogo] = useState({})

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

  const seleccionarSesion = (idSesion) => {
    const sesion = sesiones.find((elemento) => elemento.id === idSesion)

    if (!sesion) return

    setIdSesionSeleccionada(idSesion)
    const siguienteEntrenamiento = crearEntrenamientoDesdeSesion(sesion)

    setEntrenamiento(siguienteEntrenamiento)
    setEjerciciosAbiertos(
      Object.fromEntries(
        siguienteEntrenamiento.ejercicios.map((ejercicio) => [ejercicio.idEjercicio, true]),
      ),
    )
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
      [idEjercicio]: !(ejerciciosAbiertosActuales[idEjercicio] ?? true),
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

    setIdSesionSeleccionada(ejemploEntrenamiento.idSesion)
    setHistorial(historialActualizado)
    guardarHistorialEntrenos(historialActualizado)
    setEntrenamiento(ejemploEntrenamiento)
    setEjerciciosAbiertos(
      Object.fromEntries(
        ejemploEntrenamiento.ejercicios.map((ejercicio) => [ejercicio.idEjercicio, true]),
      ),
    )
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

    const entrenamientoCompletado = {
      ...entrenamiento,
      fechaFin: new Date().toISOString(),
    }

    try {
      await guardarEntrenamientoEnServidor(entrenamientoCompletado)

      const historialActualizado = [entrenamientoCompletado, ...historial]

      guardarHistorialEntrenos(historialActualizado)
      limpiarEntrenamientoBorrador()
      setHistorial(historialActualizado)
      setEntrenamiento(null)
      setMensaje('Servidor OK. Entreno guardado y borrador local limpiado.')
    } catch (errorCapturado) {
      setMensaje(`${errorCapturado.message} El borrador sigue guardado en localStorage.`)
    } finally {
      setEstaGuardando(false)
    }
  }

  const recargarDesdeServidor = async () => {
    setEstaRecargando(true)
    setMensaje('Recargando datos originales desde la base de datos...')

    try {
      const [sesionesServidor, historialServidor, catalogoServidor] = await Promise.all([
        obtenerSesionesEntrenoDesdeServidor(),
        obtenerEntrenamientosDesdeServidor(),
        obtenerEjerciciosDesdeServidor(),
      ])

      setSesiones(sesionesServidor)
      setHistorial(historialServidor)
      setCatalogoEjercicios(catalogoServidor)
      guardarSesionesEntreno(sesionesServidor)
      guardarHistorialEntrenos(historialServidor)
      guardarCatalogoEjerciciosEntreno(catalogoServidor)

      const sesionSeleccionada =
        sesionesServidor.find((sesion) => sesion.id === idSesionSeleccionada) || sesionesServidor[0]

      if (sesionSeleccionada) {
        const siguienteEntrenamiento = crearEntrenamientoDesdeSesion(sesionSeleccionada)
        setIdSesionSeleccionada(sesionSeleccionada.id)
        setEntrenamiento(siguienteEntrenamiento)
        setEjerciciosAbiertos(
          Object.fromEntries(
            siguienteEntrenamiento.ejercicios.map((ejercicio) => [ejercicio.idEjercicio, true]),
          ),
        )
      } else {
        setIdSesionSeleccionada('')
        setEntrenamiento(null)
        setEjerciciosAbiertos({})
      }

      setEstaAbiertoSelectorEjercicios(false)
      setEstaAbiertoSelectorSesiones(false)
      setBusquedaEjercicio('')
      setBusquedaSesion('')
      setMensaje('Entreno, historial y catalogo recargados desde la base de datos.')
    } catch (errorCapturado) {
      setMensaje(
        `${errorCapturado.message} No se pudieron recuperar los datos originales desde la base de datos.`,
      )
    } finally {
      setEstaRecargando(false)
    }
  }

  const { isEnabled: gestoRecargaDisponible, isPulling, isReady, isRefreshing } =
    usePullToRefresh({
      onRefresh: recargarDesdeServidor,
    })

  return (
    <div className="flex flex-col">
      <main
        className={`mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 ${
          entrenamiento ? 'pb-28' : 'pb-6'
        }`}
      >
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
            className="rounded-md border border-neon-purple/50 px-4 py-3 text-sm font-bold text-neon-purple shadow-glow-purple transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:text-neon-pink"
            type="button"
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

        {estaAbiertoSelectorEjercicios ? (
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
            const estaAbiertoEjercicio = ejerciciosAbiertos[ejercicio.idEjercicio] ?? true
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
                      <span className="block truncate text-xl font-black text-slate-950 dark:text-white">
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
                      aria-checked={Boolean(ejercicio.completado)}
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
                          className="w-full bg-transparent text-xl font-black text-slate-950 outline-none transition-all duration-300 ease-out focus:text-neon-purple dark:text-white dark:focus:text-neon-pink"
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

                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[90px_90px_120px_minmax(150px,1fr)]">
                        <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
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
                        <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
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
                        <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Altura banco
                          <input
                            className={`${claseInputTexto} w-28`}
                            type="text"
                            value={ejercicio.alturaBanco}
                            onChange={(evento) =>
                              actualizarEjercicio(
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
                                ejercicio.idEjercicio,
                                'agarre',
                                evento.target.value,
                              )
                            }
                          />
                        </label>
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
                                      className="grid gap-3 rounded-md border border-slate-200/80 bg-slate-50/70 p-3 md:grid-cols-[90px_100px_150px_96px] md:items-end dark:border-white/10 dark:bg-pes-black/50"
                                      key={serie.id}
                                    >
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
                                      <div className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                        Anterior
                                        <div className="flex min-h-10 items-center rounded-md border border-neon-purple/30 bg-white px-3 py-2 text-sm font-bold text-slate-950 shadow-[0_0_18px_rgba(105,0,255,0.12)] dark:bg-pes-black/70 dark:text-neon-pink">
                                          {formatearSerieAnterior(seriesAnteriores[indiceSerie])}
                                        </div>
                                      </div>
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
      ) : (
        <Toast
          key={mensaje || 'toast-vacio'}
          mensaje={mensaje}
          tipo={
            mensaje?.toLowerCase().includes('no se pudo') ||
            mensaje?.toLowerCase().includes('error')
              ? 'error'
              : 'info'
          }
        />
      )}
    </div>
  )
}

export default Entreno
