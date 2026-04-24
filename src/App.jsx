import { useEffect, useState } from 'react'
import Encabezado from './components/Header/Header'
import BotonVolverArriba from './components/ScrollToTopButton/ScrollToTopButton'
import Login from './pages/Login/Login'
import NotFound from './pages/NotFound/NotFound'
import ConfigurarSesiones from './pages/ConfigurarSesiones/ConfigurarSesiones'
import Ejercicios from './pages/Ejercicios/Ejercicios'
import Entreno from './pages/Entreno/Entreno'
import OtrosEntrenos from './pages/OtrosEntrenos/OtrosEntrenos'
import AdminPanel from './pages/Admin/AdminPanel'
import imagenHero from './assets/LogoConTexto.png'
import {
  cerrarSesion,
  iniciarSesion,
  obtenerUsuarioActual,
  refrescarSesion,
} from './services/auth/authApiService'
import { ApiError } from './services/http/apiClient'

const rutasProtegidas = new Set([
  'entreno',
  'ejercicios',
  'otros-entrenos',
  'configurar-sesiones',
  'admin',
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
  if (ruta === '/admin') return 'admin'

  return 'not-found'
}

function obtenerPathDesdeRuta(ruta) {
  if (ruta === 'login') return '/login'
  if (ruta === 'ejercicios') return '/ejercicios'
  if (ruta === 'entreno') return '/entreno'
  if (ruta === 'otros-entrenos') return '/otros-entrenos'
  if (ruta === 'configurar-sesiones') return '/configurar-sesiones'
  if (ruta === 'admin') return '/admin'
  if (ruta === 'not-found') return '/404'

  return '/'
}

function App() {
  const [tema, setTema] = useState(obtenerTemaInicial)
  const [ruta, setRuta] = useState(obtenerRutaDesdePath)
  const [sesion, setSesion] = useState(null)
  const [estaInicializandoAuth, setEstaInicializandoAuth] = useState(true)
  const [estaHaciendoLogin, setEstaHaciendoLogin] = useState(false)
  const [errorLogin, setErrorLogin] = useState('')
  const [rutaProtegidaPendiente, setRutaProtegidaPendiente] = useState('')

  const caracteristicas = [
    {
      title: 'Diseno responsive',
      text: 'La interfaz mantiene jerarquia visual en movil, tablet y escritorio.',
    },
    {
      title: 'Sistema reutilizable',
      text: 'Header y Footer viven como componentes preparados para crecer.',
    },
    {
      title: 'Identidad neon',
      text: 'Cian, purpura y rosa se usan como acentos con glow controlado.',
    },
  ]

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
        await refrescarSesion()
        const usuarioActual = await obtenerUsuarioActual()
        setSesion({ usuario: usuarioActual, authenticated: true })
      } catch {
        setSesion(null)
      } finally {
        setEstaInicializandoAuth(false)
      }
    }

    restaurarSesion()
  }, [])

  useEffect(() => {
    const manejarAuthInvalida = () => {
      setSesion(null)
      setErrorLogin('Tu sesion ha expirado. Vuelve a iniciar sesion.')
      setRutaProtegidaPendiente(ruta)
      window.history.replaceState({}, '', '/login')
      setRuta('login')
    }

    window.addEventListener('pesapp:auth-invalid', manejarAuthInvalida)
    return () => window.removeEventListener('pesapp:auth-invalid', manejarAuthInvalida)
  }, [ruta])

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

  const manejarLogin = async ({ email, password }) => {
    setEstaHaciendoLogin(true)
    setErrorLogin('')

    try {
      const sesionIniciada = await iniciarSesion({ email, password })
      setSesion(sesionIniciada)
    } catch (errorCapturado) {
      if (errorCapturado instanceof ApiError && errorCapturado.status === 401) {
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

  const renderizarInicio = () => (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center" id="inicio">
        <div className="space-y-7">
          <div className="inline-flex rounded-full border border-neon-cyan/40 bg-white px-4 py-2 text-sm font-semibold text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink/60 hover:text-neon-pink hover:shadow-glow-pink dark:bg-white/5 dark:text-neon-cyan dark:hover:text-neon-pink">
            PesApp interface system
          </div>

          <div className="space-y-5">
            <h1 className="max-w-4xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
              Entrena con una interfaz rapida, clara y futurista.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
              La base visual queda preparada para modo oscuro y modo claro, con acentos neon
              profesionales y componentes reutilizables para construir PesApp.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-neon-cyan/30 bg-white p-4 shadow-glow-cyan transition-all duration-300 ease-out hover:-translate-y-1 hover:border-neon-cyan/70 hover:shadow-[0_0_34px_rgba(0,255,237,0.34)] dark:bg-white/[0.04]">
              <p className="text-2xl font-bold text-slate-950 dark:text-white">#00FFED</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Energia cian</p>
            </div>
            <div className="rounded-lg border border-neon-purple/30 bg-white p-4 shadow-glow-purple transition-all duration-300 ease-out hover:-translate-y-1 hover:border-neon-purple/70 hover:shadow-[0_0_34px_rgba(105,0,255,0.34)] dark:bg-white/[0.04]">
              <p className="text-2xl font-bold text-slate-950 dark:text-white">#6900FF</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Profundidad purpura
              </p>
            </div>
            <div className="rounded-lg border border-neon-pink/30 bg-white p-4 shadow-glow-pink transition-all duration-300 ease-out hover:-translate-y-1 hover:border-neon-pink/70 hover:shadow-[0_0_34px_rgba(255,102,255,0.32)] dark:bg-white/[0.04]">
              <p className="text-2xl font-bold text-slate-950 dark:text-white">#FF66FF</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Pulso rosa</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.14)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-neon-purple/50 hover:shadow-[0_0_42px_rgba(105,0,255,0.24)] dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_0_44px_rgba(105,0,255,0.24)] dark:hover:border-neon-cyan/50 dark:hover:shadow-[0_0_50px_rgba(0,255,237,0.22)]">
          <div className="flex min-h-80 items-center justify-center overflow-hidden rounded-md border border-neon-cyan/20 bg-pes-black/95 p-8 transition-all duration-300 ease-out hover:border-neon-pink/50 sm:min-h-96 lg:min-h-[480px]">
            <img
              className="h-auto w-full max-w-[520px] object-contain drop-shadow-[0_0_28px_rgba(0,255,237,0.36)] transition-all duration-500 ease-out hover:scale-[1.05] hover:drop-shadow-[0_0_42px_rgba(255,102,255,0.42)]"
              src={imagenHero}
              alt="Interfaz inicial de PesApp"
            />
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3" id="ejercicios">
        {caracteristicas.map((caracteristica) => (
          <article
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-neon-cyan/60 hover:shadow-[0_0_30px_rgba(0,255,237,0.22)] dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-neon-cyan/60 dark:hover:shadow-[0_0_32px_rgba(0,255,237,0.2)]"
            key={caracteristica.title}
          >
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
              {caracteristica.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {caracteristica.text}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.1)] transition-all duration-300 ease-out hover:border-neon-pink/50 hover:shadow-[0_0_34px_rgba(255,102,255,0.18)] md:grid-cols-2 md:p-6 dark:border-white/10 dark:bg-white/[0.04] dark:shadow-[0_0_34px_rgba(255,102,255,0.12)] dark:hover:border-neon-pink/60 dark:hover:shadow-[0_0_42px_rgba(255,102,255,0.18)]">
        <div id="entreno">
          <p className="text-sm font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
            Entreno
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
            Prepara tus rutinas principales.
          </h2>
        </div>
        <div id="otros-entrenos">
          <p className="text-sm font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-pink">
            Otros entrenos
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950 dark:text-white">
            Organiza variantes y sesiones extra.
          </h2>
        </div>
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

    if (ruta === 'otros-entrenos') {
      return <OtrosEntrenos />
    }

    if (ruta === 'admin') {
      if (!esUsuarioAdmin(sesion?.usuario)) {
        return renderizarAccesoDenegado()
      }

      return <AdminPanel usuarioActual={sesion?.usuario || null} />
    }

    if (ruta === 'not-found') {
      return <NotFound autenticado={Boolean(sesion)} onNavigate={navegarA} />
    }

    return renderizarInicio()
  }

  return (
    <div className="min-h-svh overflow-hidden bg-[#F5F7FB] text-slate-950 transition-colors duration-300 ease-out dark:bg-pes-black dark:text-white">
      <Encabezado
        theme={tema}
        usuario={sesion?.usuario || null}
        autenticado={Boolean(sesion)}
        onNavigate={navegarA}
        onToggleTheme={alternarTema}
        onLogout={manejarLogout}
      />
      <div className="pt-24 sm:pt-28">{renderizarPagina()}</div>
      {ruta !== 'login' ? <BotonVolverArriba /> : null}
    </div>
  )
}

export default App
