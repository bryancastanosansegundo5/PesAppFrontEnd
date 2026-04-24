import { useEffect, useState } from 'react'
import Header from './components/Header/Header'
import ConfigurarSesiones from './pages/ConfigurarSesiones/ConfigurarSesiones'
import Entreno from './pages/Entreno/Entreno'
import heroImg from './assets/PesApp.png'

function getInitialTheme() {
  const savedTheme = window.localStorage.getItem('pesapp-theme')

  if (savedTheme === 'light' || savedTheme === 'dark') {
    return savedTheme
  }

  return 'dark'
}

function getRouteFromPath() {
  const path = window.location.pathname

  if (path === '/ejercicios') return 'ejercicios'
  if (path === '/entreno') return 'entreno'
  if (path === '/otros-entrenos') return 'otros-entrenos'
  if (path === '/configurar-sesiones') return 'configurar-sesiones'

  return 'inicio'
}

function App() {
  const [theme, setTheme] = useState(getInitialTheme)
  const [route, setRoute] = useState(getRouteFromPath)

  const features = [
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
    const root = document.documentElement

    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
    window.localStorage.setItem('pesapp-theme', theme)
  }, [theme])

  useEffect(() => {
    const updateRoute = () => {
      setRoute(getRouteFromPath())
    }

    window.addEventListener('popstate', updateRoute)
    return () => window.removeEventListener('popstate', updateRoute)
  }, [])

  useEffect(() => {
    if (route === 'ejercicios' || route === 'otros-entrenos') {
      requestAnimationFrame(() => {
        document.getElementById(route)?.scrollIntoView({ block: 'start' })
      })
    } else {
      window.scrollTo({ top: 0 })
    }
  }, [route])

  const toggleTheme = () => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))
  }

  const navigateTo = (path) => {
    window.history.pushState({}, '', path)
    setRoute(getRouteFromPath())
  }

  const renderPage = () => {
    if (route === 'entreno') {
      return <Entreno />
    }

    if (route === 'configurar-sesiones') {
      return <ConfigurarSesiones />
    }

    return (
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 sm:px-6 lg:px-8">
        <section
          className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center"
          id="inicio"
        >
          <div className="space-y-7">
            <div className="inline-flex rounded-full border border-neon-cyan/40 bg-white px-4 py-2 text-sm font-semibold text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink/60 hover:text-neon-pink hover:shadow-glow-pink dark:bg-white/5 dark:text-neon-cyan dark:hover:text-neon-pink">
              PesApp interface system
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-4xl font-black leading-tight text-slate-950 sm:text-5xl lg:text-6xl dark:text-white">
                Entrena con una interfaz rapida, clara y futurista.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
                La base visual queda preparada para modo oscuro y modo claro, con acentos
                neon profesionales y componentes reutilizables para construir PesApp.
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
                src={heroImg}
                alt="Interfaz inicial de PesApp"
              />
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3" id="ejercicios">
          {features.map((feature) => (
            <article
              className="rounded-lg border border-slate-200 bg-white p-5 shadow-[0_12px_32px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out hover:-translate-y-1 hover:border-neon-cyan/60 hover:shadow-[0_0_30px_rgba(0,255,237,0.22)] dark:border-white/10 dark:bg-white/[0.04] dark:hover:border-neon-cyan/60 dark:hover:shadow-[0_0_32px_rgba(0,255,237,0.2)]"
              key={feature.title}
            >
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                {feature.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                {feature.text}
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
  }

  return (
    <div className="min-h-svh overflow-hidden bg-[#F5F7FB] text-slate-950 transition-colors duration-300 ease-out dark:bg-pes-black dark:text-white">
      <Header theme={theme} onNavigate={navigateTo} onToggleTheme={toggleTheme} />
      {renderPage()}
    </div>
  )
}

export default App
