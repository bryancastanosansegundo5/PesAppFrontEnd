import { useEffect, useRef, useState } from 'react'
import Encabezado from './components/Header/Header'
import BotonVolverArriba from './components/ScrollToTopButton/ScrollToTopButton'
import Toast from './components/Toast/Toast'
import WeightTimePicker from './components/WeightTimePicker/WeightTimePicker'
import Login from './pages/Login/Login'
import NotFound from './pages/NotFound/NotFound'
import ConfigurarSesiones from './pages/ConfigurarSesiones/ConfigurarSesiones'
import Ejercicios from './pages/Ejercicios/Ejercicios'
import Entreno from './pages/Entreno/Entreno'
import OtrosEntrenos from './pages/OtrosEntrenos/OtrosEntrenos'
import AdminPanel from './pages/Admin/AdminPanel'
import MiCuenta from './pages/MiCuenta/MiCuenta'
import Peso from './pages/Peso/Peso'
import imagenHero from './assets/LogoConTexto.png'
import {
  cerrarSesion,
  iniciarSesion,
  obtenerUsuarioActual,
  refrescarSesion,
} from './services/auth/authApiService'
import {
  guardarSesionOffline,
  guardarSesionOfflineDesdeServidor,
  limpiarSesionOffline,
  obtenerSesionOfflineGuardada,
  validarInicioOffline,
} from './services/auth/authLocalSession'
import { ApiError } from './services/http/apiClient'
import {
  obtenerHistorialEntrenamientosGuardado,
  obtenerSesionesGuardadas,
} from './services/storage/trainingStorage'
import { obtenerCatalogoEjerciciosGuardado } from './services/storage/exerciseCatalogStorage'
import {
  obtenerRegistrosPesoGuardados,
} from './services/storage/weightStorage'
import {
  cargarRegistrosPeso,
  guardarPesoConRespaldo,
} from './services/weight/weightDataService'
import { aHoraRegistro } from './services/data/dateUtils'
import { sincronizarDatosOfflineEnOrden } from './services/sync/offlineSyncService'
import { configurarGlobalSyncGate } from './services/sync/globalSyncGate'

const rutasProtegidas = new Set([
  'entreno',
  'ejercicios',
  'otros-entrenos',
  'configurar-sesiones',
  'peso',
  'admin',
  'mi-cuenta',
])

function esUsuarioAdmin(usuario) {
  return usuario?.rol === 'ADMIN'
}

function obtenerTemaInicial() {
  const temaGuardado = window.localStorage.getItem('pesapp-theme')

  if (temaGuardado === 'light' || temaGuardado === 'dark') {
    return temaGuardado
  }

  return 'dark'
}

function obtenerRutaDesdePath() {
  const ruta = window.location.pathname

  if (ruta === '/') return 'inicio'
  if (ruta === '/login') return 'login'
  if (ruta === '/ejercicios') return 'ejercicios'
  if (ruta === '/entreno') return 'entreno'
  if (ruta === '/otros-entrenos') return 'otros-entrenos'
  if (ruta === '/configurar-sesiones') return 'configurar-sesiones'
  if (ruta === '/peso') return 'peso'
  if (ruta === '/admin') return 'admin'
  if (ruta === '/mi-cuenta') return 'mi-cuenta'

  return 'not-found'
}

function obtenerPathDesdeRuta(ruta) {
  if (ruta === 'login') return '/login'
  if (ruta === 'ejercicios') return '/ejercicios'
  if (ruta === 'entreno') return '/entreno'
  if (ruta === 'otros-entrenos') return '/otros-entrenos'
  if (ruta === 'configurar-sesiones') return '/configurar-sesiones'
  if (ruta === 'peso') return '/peso'
  if (ruta === 'admin') return '/admin'
  if (ruta === 'mi-cuenta') return '/mi-cuenta'
  if (ruta === 'not-found') return '/404'

  return '/'
}

function formatearFechaResumen(fecha) {
  if (!fecha) {
    return 'Sin actividad reciente'
  }

  return new Date(fecha).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function formatearPesoResumen(registro) {
  if (!registro) {
    return 'Sin registro'
  }

  return `${Number(registro.peso || 0).toFixed(1)} kg`
}

function formatearHoraResumen(registro) {
  return registro?.horaRegistro || '--:--'
}

function obtenerHoraActual() {
  return aHoraRegistro(new Date(), '09:30')
}

function crearEstadoInicialPesoRapido() {
  const ultimoRegistro = obtenerRegistrosPesoGuardados()[0] || null

  return {
    pesoRapido: ultimoRegistro ? String(ultimoRegistro.peso) : '',
    horaPesoRapido: obtenerHoraActual(),
    horaPesoRapidoFueEditada: false,
  }
}

function App() {
  const [tema, setTema] = useState(obtenerTemaInicial)
  const [ruta, setRuta] = useState(obtenerRutaDesdePath)
  const [sesion, setSesion] = useState(null)
  const [estaInicializandoAuth, setEstaInicializandoAuth] = useState(true)
  const [estaHaciendoLogin, setEstaHaciendoLogin] = useState(false)
  const [errorLogin, setErrorLogin] = useState('')
  const [rutaProtegidaPendiente, setRutaProtegidaPendiente] = useState('')
  const [estaDesconectadoServidor, setEstaDesconectadoServidor] = useState(false)
  const [toastNotificacion, setToastNotificacion] = useState(null)
  const [, setPesoVersion] = useState(0)
  const [pesoRapido, setPesoRapido] = useState(crearEstadoInicialPesoRapido().pesoRapido)
  const [horaPesoRapido, setHoraPesoRapido] = useState(crearEstadoInicialPesoRapido().horaPesoRapido)
  const [horaPesoRapidoFueEditada, setHoraPesoRapidoFueEditada] = useState(
    crearEstadoInicialPesoRapido().horaPesoRapidoFueEditada,
  )
  const [mensajePesoRapido, setMensajePesoRapido] = useState('')
  const [estaGuardandoPesoRapido, setEstaGuardandoPesoRapido] = useState(false)
  const ultimaSincronizacionGlobalRef = useRef(0)

  const usuarioAutenticado = Boolean(sesion)
  const sesionesInicio = usuarioAutenticado ? obtenerSesionesGuardadas() : []
  const historialInicio = usuarioAutenticado ? obtenerHistorialEntrenamientosGuardado() : []
  const catalogoInicio = usuarioAutenticado ? obtenerCatalogoEjerciciosGuardado() : []
  const registrosPeso = usuarioAutenticado ? obtenerRegistrosPesoGuardados() : []
  const ultimoPesoRegistrado = registrosPeso[0] || null

  const caracteristicas = [
    { title: 'Planifica', text: 'Crea una estructura de entrenamiento lista para repetir y ajustar.' },
    { title: 'Registra', text: 'Anota series, cargas y peso corporal sin cortar el ritmo del dia.' },
    {
      title: 'Evoluciona',
      text: 'Revisa tu progreso con datos utiles, sin ruido ni paneles pensados para expertos.',
    },
  ]

  const resumenInicio = usuarioAutenticado
    ? [
        { label: 'Sesiones base', value: sesionesInicio.length, accent: 'cyan' },
        { label: 'Ejercicios en catalogo', value: catalogoInicio.length, accent: 'purple' },
        {
          label: 'Ultimo entreno',
          value: formatearFechaResumen(historialInicio[0]?.fechaFin),
          accent: 'pink',
        },
      ]
    : [
        { label: 'Entrenos guiados', value: 'Plan', accent: 'cyan' },
        { label: 'Peso corporal', value: 'Track', accent: 'purple' },
        { label: 'Progreso personal', value: 'Sync', accent: 'pink' },
      ]

  const accesosRapidos = [
    {
      titulo: 'Entreno',
      descripcion: 'Abre la sesion del dia y registra el trabajo realizado sin salir del flujo.',
      accion: 'Abrir entreno',
      rutaDestino: '/entreno',
    },
    {
      titulo: 'Ejercicios',
      descripcion: 'Consulta y prepara el catalogo de ejercicios con sus datos principales.',
      accion: 'Ver catalogo',
      rutaDestino: '/ejercicios',
    },
    {
      titulo: 'Peso',
      descripcion: 'Registra el peso de la bascula en segundos y revisa su historico semanal.',
      accion: 'Abrir peso',
      rutaDestino: '/peso',
    },
    {
      titulo: 'Configurar sesiones',
      descripcion: 'Manten la estructura semanal lista para arrancar cada entreno con un clic.',
      accion: 'Configurar',
      rutaDestino: '/configurar-sesiones',
    },
  ]

  const nombreUsuario =
    sesion?.usuario?.username ||
    sesion?.usuario?.nombre ||
    sesion?.usuario?.email ||
    'Tu espacio de trabajo'
  const ultimoEntreno = historialInicio[0]
  const totalEjerciciosUltimoEntreno = ultimoEntreno?.ejercicios?.length || 0
  const totalSeriesUltimoEntreno =
    ultimoEntreno?.ejercicios?.reduce(
      (acumulado, ejercicio) => acumulado + (ejercicio.seriesRealizadas?.length || 0),
      0,
    ) || 0

  useEffect(() => {
    const raiz = document.documentElement

    raiz.classList.toggle('dark', tema === 'dark')
    raiz.style.colorScheme = tema
    window.localStorage.setItem('pesapp-theme', tema)
  }, [tema])

  useEffect(() => {
    const actualizarRuta = () => {
      setRuta(obtenerRutaDesdePath())
    }

    window.addEventListener('popstate', actualizarRuta)
    return () => window.removeEventListener('popstate', actualizarRuta)
  }, [])

  useEffect(() => {
    const restaurarSesion = async () => {
      try {
        const sesionRefrescada = await refrescarSesion()
        const usuarioActual = await obtenerUsuarioActual()
        const sesionRestaurada = {
          ...sesionRefrescada,
          usuario: usuarioActual,
          offline: false,
        }

        guardarSesionOfflineDesdeServidor(sesionRestaurada)
        setSesion(sesionRestaurada)
      } catch (errorCapturado) {
        const sesionOffline = obtenerSesionOfflineGuardada()?.sesion || null
        const backendNoDisponible =
          errorCapturado instanceof ApiError &&
          (errorCapturado.status === 0 || errorCapturado.status >= 500)

        if (sesionOffline && backendNoDisponible) {
          setSesion({
            ...sesionOffline,
            authenticated: true,
            offline: true,
          })
          setErrorLogin('')
        } else {
          setSesion(null)
        }
      } finally {
        setEstaInicializandoAuth(false)
      }
    }

    restaurarSesion()
  }, [])

  useEffect(() => {
    configurarGlobalSyncGate({ enabled: Boolean(sesion) })

    return () => {
      configurarGlobalSyncGate({ enabled: false })
    }
  }, [sesion])

  useEffect(() => {
    if (!sesion) {
      return
    }

    let cancelado = false

    const sincronizarPeso = async () => {
      await cargarRegistrosPeso()

      if (cancelado) {
        return
      }

      setPesoVersion((versionActual) => versionActual + 1)

      reiniciarFormularioPesoRapido()
    }

    sincronizarPeso()

    return () => {
      cancelado = true
    }
  }, [sesion])

  useEffect(() => {
    if (!sesion) {
      return
    }

    let cancelado = false

    const sincronizarDatosOffline = async () => {
      const ahora = Date.now()

      if (ahora - ultimaSincronizacionGlobalRef.current < 1200) {
        return
      }

      ultimaSincronizacionGlobalRef.current = ahora

      try {
        await sincronizarDatosOfflineEnOrden()

        if (cancelado) {
          return
        }

        setPesoVersion((versionActual) => versionActual + 1)

        reiniciarFormularioPesoRapido()
      } catch {
        // La UI concreta de cada seccion ya informa de errores; aqui solo intentamos reconciliar.
      }
    }

    sincronizarDatosOffline()
    window.addEventListener('online', sincronizarDatosOffline)
    window.addEventListener('pesapp:server-reachable', sincronizarDatosOffline)

    return () => {
      cancelado = true
      window.removeEventListener('online', sincronizarDatosOffline)
      window.removeEventListener('pesapp:server-reachable', sincronizarDatosOffline)
    }
  }, [sesion])

  useEffect(() => {
    const manejarAuthInvalida = () => {
      setSesion(null)
      limpiarSesionOffline()
      setErrorLogin('Tu sesion ha expirado. Vuelve a iniciar sesion.')
      setRutaProtegidaPendiente(ruta)
      window.history.replaceState({}, '', '/login')
      setRuta('login')
    }

    window.addEventListener('pesapp:auth-invalid', manejarAuthInvalida)
    return () => window.removeEventListener('pesapp:auth-invalid', manejarAuthInvalida)
  }, [ruta])

  useEffect(() => {
    const manejarServidorNoDisponible = (evento) => {
      setEstaDesconectadoServidor(true)
      setToastNotificacion({
        id: Date.now(),
        mensaje:
          evento.detail?.message ||
          'Sin conexion con el servidor. La app sigue funcionando con los datos locales disponibles.',
        tipo: 'error',
        persistente: true,
      })
    }

    const manejarServidorDisponible = () => {
      setEstaDesconectadoServidor(false)
    }

    window.addEventListener('pesapp:server-unreachable', manejarServidorNoDisponible)
    window.addEventListener('pesapp:server-reachable', manejarServidorDisponible)

    return () => {
      window.removeEventListener('pesapp:server-unreachable', manejarServidorNoDisponible)
      window.removeEventListener('pesapp:server-reachable', manejarServidorDisponible)
    }
  }, [])

  useEffect(() => {
    if (estaInicializandoAuth) {
      return
    }

    if (!sesion && rutasProtegidas.has(ruta)) {
      const timeoutId = window.setTimeout(() => {
        setRutaProtegidaPendiente(ruta)
        window.history.replaceState({}, '', '/login')
        setRuta('login')
      }, 0)

      return () => {
        window.clearTimeout(timeoutId)
      }
    }

    if (sesion && ruta === 'login') {
      const timeoutId = window.setTimeout(() => {
        const destino = rutaProtegidaPendiente || 'inicio'
        window.history.replaceState({}, '', obtenerPathDesdeRuta(destino))
        setRuta(destino)
        setRutaProtegidaPendiente('')
        setErrorLogin('')
      }, 0)

      return () => {
        window.clearTimeout(timeoutId)
      }
    }
  }, [estaInicializandoAuth, ruta, rutaProtegidaPendiente, sesion])

  useEffect(() => {
    if (ruta !== 'login') {
      window.scrollTo({ top: 0 })
    }
  }, [ruta])

  const alternarTema = () => {
    setTema((temaActual) => (temaActual === 'dark' ? 'light' : 'dark'))
  }

  function reiniciarFormularioPesoRapido() {
    const estadoInicial = crearEstadoInicialPesoRapido()
    setPesoRapido(estadoInicial.pesoRapido)
    setHoraPesoRapido(estadoInicial.horaPesoRapido)
    setHoraPesoRapidoFueEditada(estadoInicial.horaPesoRapidoFueEditada)
  }

  const navegarA = (rutaDestino) => {
    const rutaNormalizada =
      rutaDestino === '/' ? 'inicio' : rutaDestino.replace(/^\//, '')

    if (!sesion && rutasProtegidas.has(rutaNormalizada)) {
      setRutaProtegidaPendiente(rutaNormalizada)
      window.history.pushState({}, '', '/login')
      setRuta('login')
      return
    }

    window.history.pushState({}, '', rutaDestino)
    setRuta(obtenerRutaDesdePath())
  }

  const registrarPesoRapido = async () => {
    if (!sesion) {
      setRutaProtegidaPendiente('peso')
      window.history.pushState({}, '', '/login')
      setRuta('login')
      return
    }

    if (estaGuardandoPesoRapido) {
      return
    }

    const pesoNumerico = Number(pesoRapido)

    if (!pesoNumerico || pesoNumerico <= 0) {
      setMensajePesoRapido('Introduce un peso valido para guardar el registro.')
      return
    }

    setEstaGuardandoPesoRapido(true)

    try {
      const resultado = await guardarPesoConRespaldo(pesoNumerico, {
        horaRegistro: horaPesoRapido,
        horaManual: horaPesoRapidoFueEditada,
      })
      setPesoVersion((versionActual) => versionActual + 1)
      reiniciarFormularioPesoRapido()
      setMensajePesoRapido(
        resultado.online
          ? 'Nueva medicion guardada y sincronizada.'
          : `${resultado.error?.message || 'No se pudo sincronizar ahora.'} El dato queda guardado en local.`,
      )
      setToastNotificacion({
        id: Date.now(),
        mensaje: resultado.online
          ? 'Peso registrado correctamente.'
          : 'Peso guardado en local. Se sincronizara cuando vuelva la conexion.',
        tipo: 'info',
        persistente: false,
      })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (errorCapturado) {
      if (Array.isArray(errorCapturado?.latestRecords)) {
        setPesoVersion((versionActual) => versionActual + 1)
      }

      setMensajePesoRapido(errorCapturado.message || 'No se pudo guardar el peso.')
      setToastNotificacion({
        id: Date.now(),
        mensaje: errorCapturado.message || 'No se pudo guardar el peso.',
        tipo: 'error',
        persistente: false,
      })
    } finally {
      setEstaGuardandoPesoRapido(false)
    }
  }

  const renderizarAccesoDenegado = () => (
    <main className="mx-auto flex min-h-[60svh] w-full max-w-5xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <section className="w-full rounded-[32px] border border-slate-200 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-white/[0.04]">
        <p className="inline-flex rounded-full border border-neon-pink/35 bg-white px-4 py-2 text-sm font-semibold text-neon-purple shadow-glow-pink dark:bg-white/5 dark:text-neon-pink">
          Acceso restringido
        </p>
        <h1 className="mt-5 text-4xl font-black text-slate-950 dark:text-white">
          Esta zona es solo para administradores.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
          Tu sesion es valida, pero no tienes permisos para gestionar usuarios. Si necesitas
          acceso, tendra que habilitarlo un administrador.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            className="rounded-xl border border-neon-cyan/45 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_22px_rgba(0,255,237,0.18)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:bg-pes-black dark:text-neon-cyan dark:shadow-glow-cyan"
            type="button"
            onClick={() => navegarA('/')}
          >
            Volver al inicio
          </button>
        </div>
      </section>
    </main>
  )

  const manejarLogin = async ({ username, password }) => {
    setEstaHaciendoLogin(true)
    setErrorLogin('')

    try {
      const sesionIniciada = await iniciarSesion({ username, password })
      const usuarioActual = sesionIniciada?.usuario || (await obtenerUsuarioActual())
      const sesionFinal = {
        ...sesionIniciada,
        usuario: usuarioActual,
        offline: false,
      }

      await guardarSesionOffline({
        username,
        password,
        sesion: sesionFinal,
      })
      setSesion(sesionFinal)
    } catch (errorCapturado) {
      const backendNoDisponible =
        errorCapturado instanceof ApiError &&
        (errorCapturado.status === 0 || errorCapturado.status >= 500)

      if (backendNoDisponible) {
        const sesionOffline = await validarInicioOffline({ username, password })

        if (sesionOffline) {
          setSesion(sesionOffline)
          setErrorLogin('')
        } else {
          setErrorLogin(
            'No hay conexion con el servidor y este dispositivo no tiene una sesion offline valida para ese usuario.',
          )
        }
      } else if (errorCapturado instanceof ApiError && errorCapturado.status === 401) {
        setErrorLogin(errorCapturado.message || 'Credenciales no validas.')
      } else {
        setErrorLogin(errorCapturado.message || 'No se pudo iniciar sesion.')
      }
    } finally {
      setEstaHaciendoLogin(false)
    }
  }

  const manejarLogout = async () => {
    try {
      await cerrarSesion()
    } catch {
      // Aunque falle la llamada, limpiamos el estado local para no bloquear la UX.
    }

    setSesion(null)
    setRutaProtegidaPendiente('')
    setErrorLogin('')
    window.history.pushState({}, '', '/login')
    setRuta('login')
  }

  const manejarPerfilActualizado = (usuarioActualizado) => {
    setSesion((sesionActual) => {
      if (!sesionActual) {
        return sesionActual
      }

      const sesionSiguiente = {
        ...sesionActual,
        usuario: {
          ...sesionActual.usuario,
          ...usuarioActualizado,
        },
      }

      guardarSesionOfflineDesdeServidor(sesionSiguiente)

      return sesionSiguiente
    })
  }

  const renderizarInicio = () => (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <section
        className="grid gap-6 rounded-[32px] border border-slate-200/80 bg-white/85 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-sm lg:grid-cols-[1.1fr_0.9fr] lg:p-8 dark:border-white/10 dark:bg-white/[0.05]"
        id="inicio"
      >
        <div className="space-y-6">
          <div className="inline-flex rounded-full border border-neon-cyan/35 bg-violet-50/90 px-4 py-2 text-sm font-semibold text-violet-700 shadow-glow-cyan dark:bg-white/5 dark:text-neon-cyan">
            Entrenamiento personal con pulso futurista
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-neon-purple dark:text-slate-400">
                PesApp
              </p>
              <h1 className="font-display max-w-4xl text-[2.76rem] font-black leading-[0.94] tracking-[0.008em] text-slate-900 sm:text-[3.41rem] lg:text-[3.76rem] dark:text-white">
                Entrena, registra y progresa con una app visual, directa y preparada para tu rutina.
              </h1>
            </div>

            <p className="max-w-2xl text-base leading-7 text-slate-700 dark:text-slate-300">
              PesApp une sesiones, ejercicios y peso corporal en un panel claro para personas que
              quieren entrenar mejor sin perderse entre hojas sueltas, notas antiguas o datos
              inventados.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              className="rounded-xl border border-neon-cyan/45 bg-slate-950 px-4 py-2.5 text-sm font-black text-white shadow-[0_0_28px_rgba(0,255,237,0.26)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:shadow-glow-pink dark:bg-white dark:text-slate-950"
              type="button"
              onClick={() => navegarA('/entreno')}
            >
              {usuarioAutenticado ? 'Empezar entreno' : 'Entrar en mi cuenta'}
            </button>
            <button
              className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-800 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-cyan hover:text-neon-purple hover:shadow-glow-cyan dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:text-neon-cyan"
              type="button"
              onClick={() => navegarA('/peso')}
            >
              {usuarioAutenticado ? 'Registrar peso' : 'Ver acceso'}
            </button>
          </div>

          <div className="grid gap-3 pt-1 sm:grid-cols-3">
            {resumenInicio.map((item) => (
              <article
                className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out hover:-translate-y-1 dark:border-white/10 dark:bg-white/[0.04]"
                key={item.label}
              >
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
                <p
                  className={`font-display mt-3 text-2xl font-black tracking-[0.01em] ${
                    item.accent === 'cyan'
                      ? 'text-neon-cyan'
                      : item.accent === 'purple'
                        ? 'text-neon-purple'
                        : 'text-neon-pink'
                  }`}
                >
                  {item.value}
                </p>
              </article>
            ))}
          </div>
        </div>

        <aside className="rounded-[28px] border border-neon-cyan/20 bg-[linear-gradient(160deg,rgba(239,252,255,0.98),rgba(255,255,255,0.92))] p-5 text-slate-950 shadow-[0_28px_80px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-[linear-gradient(160deg,rgba(2,6,23,0.98),rgba(15,23,42,0.96))] dark:text-white dark:shadow-[0_28px_80px_rgba(2,6,23,0.42)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-violet-700 dark:text-neon-cyan/90">
                Vista operativa
              </p>
              <h2 className="font-display mt-3 text-[1.75rem] font-black tracking-[0.01em] text-slate-950 dark:text-white">
                Tu centro de control
              </h2>
            </div>
            <img
              className="h-14 w-auto object-contain opacity-90 drop-shadow-[0_0_24px_rgba(0,255,237,0.28)]"
              src={imagenHero}
              alt="Logo de PesApp"
            />
          </div>

          <div className="mt-6 grid gap-4">
            <article className="rounded-2xl border border-violet-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/[0.04]">
              <p className="text-sm text-slate-500 dark:text-slate-400">Espacio activo</p>
              <p className="mt-2 text-xl font-bold text-slate-900 dark:text-white">{nombreUsuario}</p>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {usuarioAutenticado
                  ? 'Accede rapido al flujo principal y manten a mano la estructura semanal.'
                  : 'Inicia sesion para cargar tus entrenos, tu historial y tus registros de peso.'}
              </p>
            </article>

            <div className="grid gap-4 sm:grid-cols-2">
              <article className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4 dark:border-neon-cyan/25 dark:bg-neon-cyan/10">
                <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-violet-700 dark:text-neon-cyan">
                  {usuarioAutenticado ? 'Ultimo entreno' : 'Tu ultimo entreno'}
                </p>
                <p className="font-display mt-3 text-[1.8rem] font-black tracking-[0.01em] text-slate-900 dark:text-white">
                  {usuarioAutenticado ? ultimoEntreno?.nombreSesion || 'Sin historial' : 'Tu historial real'}
                </p>
                <p className="mt-3 text-sm text-slate-800 dark:text-slate-200">
                  {usuarioAutenticado
                    ? `${totalEjerciciosUltimoEntreno} ejercicios registrados`
                    : 'Sin datos de ejemplo ni predicciones'}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-400">
                  {usuarioAutenticado
                    ? formatearFechaResumen(ultimoEntreno?.fechaFin)
                    : 'Se mostrara cuando accedas'}
                </p>
              </article>

              <article className="rounded-2xl border border-violet-200 bg-violet-50/70 p-4 dark:border-neon-pink/25 dark:bg-neon-pink/10">
                <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-violet-700 dark:text-neon-pink">
                  {usuarioAutenticado ? 'Ultima actividad' : 'Historial privado'}
                </p>
                <p className="font-display mt-3 text-[1.8rem] font-black tracking-[0.01em] text-slate-900 dark:text-white">
                  {usuarioAutenticado ? formatearFechaResumen(ultimoEntreno?.fechaFin) : 'Solo tuyo'}
                </p>
                <p className="mt-3 text-sm text-slate-800 dark:text-slate-200">
                  {usuarioAutenticado ? ultimoEntreno?.nombreSesion || 'Sin historial' : 'Tus datos aparecen tras iniciar sesion'}
                </p>
                <p className="text-sm text-slate-700 dark:text-slate-400">
                  {usuarioAutenticado
                    ? `${totalSeriesUltimoEntreno} series registradas`
                    : 'Nada inventado en portada'}
                </p>
              </article>
            </div>

            <article className="rounded-2xl border border-neon-purple/25 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {usuarioAutenticado ? 'Peso mas reciente' : 'Peso corporal'}
                  </p>
                  <p className="mt-1 text-sm text-slate-700 dark:text-slate-400">
                    {usuarioAutenticado
                      ? ultimoPesoRegistrado
                        ? formatearFechaResumen(ultimoPesoRegistrado.fecha)
                        : 'Aun no hay registro de bascula'
                      : 'Tu registro se carga despues del login'}
                  </p>
                </div>
                <span className="rounded-full border border-neon-purple/35 bg-neon-purple/10 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-neon-purple shadow-glow-purple">
                  {usuarioAutenticado ? formatearPesoResumen(ultimoPesoRegistrado) : 'Privado'}
                </span>
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Estado general
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-700 dark:text-slate-400">
                    {estaDesconectadoServidor
                      ? 'Trabajando en modo local por desconexion con el servidor.'
                      : usuarioAutenticado
                        ? 'Todo listo para entrar, registrar y revisar entrenos.'
                        : 'Listo para validar tu cuenta y cargar tus datos reales.'}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-black uppercase tracking-[0.16em] ${
                    estaDesconectadoServidor
                      ? 'border-red-500/45 bg-red-500/12 text-red-600 shadow-[0_0_20px_rgba(239,68,68,0.18)] dark:text-red-300'
                      : 'border-green-500/35 bg-green-400/10 text-green-700 shadow-[0_0_14px_rgba(34,197,94,0.12)] dark:border-[#39ff14]/45 dark:bg-[#39ff14]/15 dark:text-[#7dff6e] dark:shadow-[0_0_20px_rgba(57,255,20,0.18)]'
                  }`}
                >
                  {estaDesconectadoServidor ? 'Modo local' : 'Operativo'}
                </span>
              </div>
            </article>
          </div>
        </aside>
      </section>

      <section className="grid gap-5 rounded-[28px] border border-neon-cyan/25 bg-white/88 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)] lg:grid-cols-[0.9fr_1.1fr] dark:border-white/10 dark:bg-white/[0.04]">
        <div className="grid grid-rows-[auto_1fr]">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-neon-purple dark:text-neon-cyan">
            Peso rapido
          </p>
          <div className="flex flex-col justify-center space-y-3">
            <h2 className="text-3xl font-black text-slate-950 dark:text-white">
              {usuarioAutenticado ? 'Registra la bascula sin navegar.' : 'Tu seguimiento empieza al entrar.'}
            </h2>
            <p className="text-sm leading-6 text-slate-600 dark:text-slate-400">
              {usuarioAutenticado
                ? 'Pensado para entrar, escribir el numero y guardarlo al instante. Luego lo ves en la pantalla de peso con historico, medias semanales y grafica.'
                : 'La portada no enseña registros locales ni ejemplos falsos. Cuando inicies sesion, PesApp carga tu informacion real.'}
            </p>
            <p className="lg:col-span-2 text-xs text-slate-500 dark:text-slate-400">
              {usuarioAutenticado
                ? ultimoPesoRegistrado
                  ? `Hora registrada: ${formatearHoraResumen(ultimoPesoRegistrado)}`
                  : 'Si no tocas la hora, guardamos la hora actual al registrar.'
                : 'Acceso protegido para mantener tu historial privado.'}
            </p>
          </div>
        </div>

        <div className="grid gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4 dark:border-white/10 dark:bg-pes-black/50">
          <div className="grid gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-4 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300">
            <label className="grid gap-2">
              <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Nueva medicion
              </span>
              <div className="rounded-[22px] border border-violet-200/80 bg-[linear-gradient(180deg,rgba(248,247,255,0.96),rgba(239,246,255,0.86))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_14px_34px_rgba(88,28,135,0.08)] dark:border-white/6 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.4),rgba(2,6,23,0.18))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <input
                  className="w-full rounded-2xl border border-violet-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(246,243,255,0.94))] px-6 py-4 text-center text-4xl font-black tracking-tight text-slate-900 outline-none transition-all duration-300 ease-out placeholder:text-slate-400 focus:border-neon-purple focus:shadow-[0_0_28px_rgba(105,0,255,0.14)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(1,4,12,0.96),rgba(0,0,0,0.98))] dark:text-white dark:focus:border-neon-cyan dark:focus:shadow-[0_0_28px_rgba(0,255,237,0.16)]"
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="82.4"
                  value={usuarioAutenticado ? pesoRapido : ''}
                  onChange={(evento) => {
                    setPesoRapido(evento.target.value)
                    if (mensajePesoRapido) {
                      setMensajePesoRapido('')
                    }
                  }}
                />
              </div>
            </label>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  Hora
                </span>
                <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-violet-700 dark:border-neon-cyan/25 dark:bg-neon-cyan/10 dark:text-neon-cyan">
                  {horaPesoRapidoFueEditada ? 'Manual' : 'Ahora'}
                </span>
              </div>
              <WeightTimePicker
                value={horaPesoRapido}
                onChange={setHoraPesoRapido}
                onTouch={() => {
                  setHoraPesoRapidoFueEditada(true)
                  if (mensajePesoRapido) {
                    setMensajePesoRapido('')
                  }
                }}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className="rounded-xl border border-slate-900 bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-[0_16px_34px_rgba(15,23,42,0.18)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:bg-neon-purple hover:shadow-glow-purple dark:border-neon-cyan/45 dark:bg-pes-black dark:text-neon-cyan dark:shadow-glow-cyan dark:hover:border-neon-pink dark:hover:text-neon-pink dark:hover:shadow-glow-pink"
              type="button"
              disabled={estaGuardandoPesoRapido}
              onClick={registrarPesoRapido}
            >
              {estaGuardandoPesoRapido
                ? 'Guardando...'
                : usuarioAutenticado
                  ? 'Guardar peso'
                  : 'Iniciar sesion'}
            </button>

            <button
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-cyan hover:text-neon-purple hover:shadow-glow-cyan dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-100 dark:hover:text-neon-cyan"
              type="button"
              onClick={() => navegarA('/peso')}
            >
              {usuarioAutenticado ? 'Ver pantalla' : 'Entrar'}
            </button>
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400">
            {mensajePesoRapido ||
              (usuarioAutenticado
                ? `Ultimo dato: ${formatearPesoResumen(ultimoPesoRegistrado)}${
                    ultimoPesoRegistrado ? ` · ${formatearFechaResumen(ultimoPesoRegistrado.fecha)}` : ''
                  }`
                : 'Inicia sesion para registrar el peso en tu historial real.')}
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {accesosRapidos.map((acceso) => (
          <article
            className="group rounded-[24px] border border-slate-200/80 bg-white/88 p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-neon-cyan/40 hover:shadow-[0_0_36px_rgba(0,255,237,0.16)] dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-neon-cyan/40"
            key={acceso.titulo}
          >
            <h2 className="text-xl font-black text-slate-950 dark:text-white">{acceso.titulo}</h2>
            <p className="mt-3 min-h-18 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {acceso.descripcion}
            </p>
            <button
              className="mt-5 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-800 transition-all duration-300 ease-out group-hover:border-neon-pink group-hover:text-neon-purple group-hover:shadow-glow-cyan dark:border-white/10 dark:text-slate-100 dark:group-hover:text-neon-cyan"
              type="button"
              onClick={() => navegarA(acceso.rutaDestino)}
            >
              {acceso.accion}
            </button>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3" id="ejercicios">
        {caracteristicas.map((caracteristica) => (
          <article
            className="rounded-[24px] border border-slate-200/80 bg-white/88 p-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-neon-cyan/60 hover:shadow-[0_0_30px_rgba(0,255,237,0.22)] dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-neon-cyan/60 dark:hover:shadow-[0_0_32px_rgba(0,255,237,0.2)]"
            key={caracteristica.title}
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neon-purple dark:text-neon-cyan">
              {caracteristica.title}
            </p>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {caracteristica.text}
            </p>
          </article>
        ))}
      </section>
    </main>
  )

  const renderizarPagina = () => {
    if (estaInicializandoAuth) {
      return (
        <main className="mx-auto flex min-h-[60svh] w-full max-w-5xl items-center justify-center px-4 py-8">
          <div className="rounded-2xl border border-neon-cyan/30 bg-white px-6 py-4 text-sm font-semibold text-slate-700 shadow-glow-cyan dark:bg-white/[0.04] dark:text-slate-200">
            Validando sesion...
          </div>
        </main>
      )
    }

    if (ruta === 'login' || (!sesion && rutasProtegidas.has(ruta))) {
      return (
        <Login
          tema={tema}
          estaCargando={estaHaciendoLogin}
          error={errorLogin}
          onLogin={manejarLogin}
          modoOfflineDisponible={Boolean(obtenerSesionOfflineGuardada()?.sesion)}
          estaDesconectadoServidor={estaDesconectadoServidor}
        />
      )
    }

    if (ruta === 'entreno') {
      return <Entreno />
    }

    if (ruta === 'configurar-sesiones') {
      return <ConfigurarSesiones />
    }

    if (ruta === 'ejercicios') {
      return <Ejercicios />
    }

    if (ruta === 'peso') {
      return <Peso />
    }

    if (ruta === 'otros-entrenos') {
      return <OtrosEntrenos />
    }

    if (ruta === 'admin') {
      if (!esUsuarioAdmin(sesion?.usuario)) {
        return renderizarAccesoDenegado()
      }

      return <AdminPanel usuarioActual={sesion?.usuario || null} />
    }

    if (ruta === 'mi-cuenta') {
      return (
        <MiCuenta
          usuarioActual={sesion?.usuario || null}
          onPerfilActualizado={manejarPerfilActualizado}
        />
      )
    }

    if (ruta === 'not-found') {
      return <NotFound autenticado={Boolean(sesion)} onNavigate={navegarA} />
    }

    return renderizarInicio()
  }

  return (
    <div
      className={`app-shell min-h-svh overflow-hidden text-slate-950 transition-colors duration-300 ease-out dark:text-white ${
        tema === 'dark' ? 'app-shell--dark' : 'app-shell--light'
      }`}
    >
      <div className="app-background" aria-hidden="true">
        <div className="app-background__glow app-background__glow--top" />
        <div className="app-background__glow app-background__glow--bottom" />
        <div
          className="app-background__watermark"
          style={{ backgroundImage: `url(${imagenHero})` }}
        />
      </div>

      <div className="relative z-10 flex min-h-svh flex-col">
        <Encabezado
          theme={tema}
          usuario={sesion?.usuario || null}
          autenticado={Boolean(sesion)}
          estaDesconectadoServidor={estaDesconectadoServidor}
          onNavigate={navegarA}
          onToggleTheme={alternarTema}
          onLogout={manejarLogout}
        />
        <div className="flex flex-1 flex-col pt-24 sm:pt-28">{renderizarPagina()}</div>
        {ruta !== 'login' ? <BotonVolverArriba /> : null}
      </div>

      {toastNotificacion ? (
        <Toast
          key={toastNotificacion.id}
          mensaje={toastNotificacion.mensaje}
          tipo={toastNotificacion.tipo || 'info'}
          persistente={Boolean(toastNotificacion.persistente)}
          onClose={() => setToastNotificacion(null)}
        />
      ) : null}
    </div>
  )
}

export default App
