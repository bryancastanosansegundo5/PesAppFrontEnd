import { useState } from 'react'
import logo from '../../assets/PesAppMark.png'

const menuItems = [
  { label: 'Inicio', href: '/' },
  { label: 'Ejercicios', href: '/ejercicios' },
  { label: 'Entreno', href: '/entreno' },
  { label: 'Otros entrenos', href: '/otros-entrenos' },
  { label: 'Configurar sesiones', href: '/configurar-sesiones' },
]

const userActions = ['Perfil', 'Ajustes', 'Cerrar sesion']

function Header({ theme, onNavigate, onToggleTheme }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const isDarkTheme = theme === 'dark'

  const closeMenus = () => {
    setIsMenuOpen(false)
    setIsUserMenuOpen(false)
  }

  const handleNavigate = (event, href) => {
    event.preventDefault()
    onNavigate(href)
    closeMenus()
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-transparent px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="relative flex items-center justify-between rounded-full border border-white/45 bg-white/18 px-4 py-3 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_0_28px_rgba(0,255,237,0.2)] backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300 ease-out dark:border-white/20 dark:bg-[#090D1A]/38 dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_34px_rgba(105,0,255,0.28)]">
          <a
            className="group inline-flex items-center rounded-full p-1 transition-all duration-300 ease-out hover:drop-shadow-[0_0_10px_rgba(0,255,237,0.45)] focus:outline-none focus:ring-2 focus:ring-neon-cyan"
            href="/"
            onClick={(event) => handleNavigate(event, '/')}
          >
            <img
              className="h-10 w-10 object-contain drop-shadow-[0_0_12px_rgba(0,255,237,0.42)] transition-all duration-300 ease-out group-hover:scale-105 group-hover:drop-shadow-[0_0_20px_rgba(255,102,255,0.5)]"
              src={logo}
              alt="PesApp"
            />
          </a>

          <nav className="ml-6 hidden items-center gap-6 md:flex" aria-label="Menu principal">
            {menuItems.map((item) => (
              <a
                className="group relative h-6 overflow-hidden font-semibold text-slate-700 transition-colors duration-300 hover:text-neon-purple dark:text-slate-200 dark:hover:text-neon-cyan"
                href={item.href}
                key={item.href}
                onClick={(event) => handleNavigate(event, item.href)}
              >
                <span className="block transition-transform duration-300 ease-out group-hover:-translate-y-full">
                  {item.label}
                </span>
                <span className="absolute left-0 top-full block transition-transform duration-300 ease-out group-hover:-translate-y-full">
                  {item.label}
                </span>
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:ml-8 md:flex">
            <button
              className="group relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/50 bg-white/30 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_0_18px_rgba(0,255,237,0.2)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-[0_0_24px_rgba(255,102,255,0.26)] dark:border-white/20 dark:bg-white/10 dark:text-slate-100 dark:hover:border-neon-cyan dark:hover:text-neon-cyan dark:hover:shadow-[0_0_24px_rgba(0,255,237,0.35)]"
              type="button"
              aria-label={isDarkTheme ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              onClick={onToggleTheme}
            >
              <span className="relative h-5 w-5" aria-hidden="true">
                <svg
                  className={`absolute inset-0 h-5 w-5 transition-all duration-300 ease-out ${
                    isDarkTheme
                      ? 'rotate-0 scale-100 text-neon-pink opacity-100'
                      : 'rotate-90 scale-75 opacity-0'
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2" />
                  <path d="M12 20v2" />
                  <path d="m4.93 4.93 1.41 1.41" />
                  <path d="m17.66 17.66 1.41 1.41" />
                  <path d="M2 12h2" />
                  <path d="M20 12h2" />
                  <path d="m6.34 17.66-1.41 1.41" />
                  <path d="m19.07 4.93-1.41 1.41" />
                </svg>
                <svg
                  className={`absolute inset-0 h-5 w-5 transition-all duration-300 ease-out ${
                    isDarkTheme
                      ? '-rotate-90 scale-75 opacity-0'
                      : 'rotate-0 scale-100 text-neon-pink opacity-100'
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
              </span>
            </button>

            <button
              className="rounded-full border border-white/55 bg-white/42 px-4 py-2 text-sm font-bold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_0_20px_rgba(255,255,255,0.25)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_0_26px_rgba(255,255,255,0.5)] dark:border-neon-cyan/45 dark:bg-neon-cyan/25 dark:text-neon-cyan dark:shadow-[0_0_22px_rgba(0,255,237,0.35)] dark:hover:shadow-[0_0_28px_rgba(0,255,237,0.52)]"
              type="button"
              onClick={() => setIsUserMenuOpen((currentValue) => !currentValue)}
            >
              Bryan
            </button>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white/30 text-slate-800 backdrop-blur-xl transition-all duration-300 hover:border-neon-cyan hover:text-neon-cyan dark:border-white/20 dark:bg-white/10 dark:text-slate-100 dark:hover:border-neon-pink dark:hover:text-neon-pink"
              type="button"
              aria-label={isDarkTheme ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
              onClick={onToggleTheme}
            >
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {isDarkTheme ? (
                  <>
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2" />
                    <path d="M12 20v2" />
                    <path d="m4.93 4.93 1.41 1.41" />
                    <path d="m17.66 17.66 1.41 1.41" />
                    <path d="M2 12h2" />
                    <path d="M20 12h2" />
                    <path d="m6.34 17.66-1.41 1.41" />
                    <path d="m19.07 4.93-1.41 1.41" />
                  </>
                ) : (
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                )}
              </svg>
            </button>

            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white/30 text-slate-800 backdrop-blur-xl transition-all duration-300 hover:border-neon-cyan hover:text-neon-cyan dark:border-white/20 dark:bg-white/10 dark:text-slate-100 dark:hover:border-neon-pink dark:hover:text-neon-pink"
              type="button"
              aria-label="Abrir menu"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-menu"
              onClick={() => {
                setIsMenuOpen((currentValue) => !currentValue)
                setIsUserMenuOpen(false)
              }}
            >
              <span className="relative h-4 w-5" aria-hidden="true">
                <span
                  className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-out ${
                    isMenuOpen ? 'translate-y-[7px] rotate-45' : ''
                  }`}
                />
                <span
                  className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-out ${
                    isMenuOpen ? 'opacity-0' : ''
                  }`}
                />
                <span
                  className={`absolute bottom-0 left-0 h-0.5 w-5 rounded-full bg-current transition-all duration-300 ease-out ${
                    isMenuOpen ? '-translate-y-[7px] -rotate-45' : ''
                  }`}
                />
              </span>
            </button>
          </div>

          {isUserMenuOpen ? (
            <div
              className="absolute right-4 top-[calc(100%+12px)] hidden w-44 rounded-2xl border border-white/50 bg-white/70 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_14px_34px_rgba(15,23,42,0.16)] backdrop-blur-2xl md:block dark:border-white/15 dark:bg-[#0B0D14]/78 dark:shadow-[0_0_30px_rgba(105,0,255,0.22)]"
              role="menu"
            >
              {userActions.map((action) => (
                <button
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition-all duration-300 ease-out hover:translate-x-1 hover:text-neon-purple hover:shadow-[0_0_16px_rgba(105,0,255,0.18)] focus:outline-none focus:ring-2 focus:ring-neon-cyan dark:text-slate-300 dark:hover:text-neon-cyan dark:hover:shadow-[0_0_16px_rgba(0,255,237,0.2)]"
                  type="button"
                  key={action}
                  role="menuitem"
                  onClick={closeMenus}
                >
                  {action}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <nav
        className={`mx-auto mt-3 w-full max-w-7xl rounded-3xl border border-white/45 bg-white/55 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_14px_30px_rgba(15,23,42,0.1)] backdrop-blur-2xl transition-all duration-300 ease-out md:hidden dark:border-white/15 dark:bg-pes-black/72 dark:shadow-[0_0_26px_rgba(0,255,237,0.12)] ${
          isMenuOpen ? 'block' : 'hidden'
        }`}
        id="mobile-menu"
        aria-label="Menu movil"
      >
        <div className="grid gap-1">
          {menuItems.map((item) => (
            <a
              className="rounded-xl px-3 py-3 text-base font-medium text-slate-700 transition-all duration-300 ease-out hover:translate-x-1 hover:text-neon-purple hover:shadow-[0_0_18px_rgba(105,0,255,0.18)] focus:outline-none focus:ring-2 focus:ring-neon-cyan dark:text-slate-300 dark:hover:text-neon-cyan dark:hover:shadow-[0_0_18px_rgba(0,255,237,0.2)]"
              href={item.href}
              key={item.href}
              onClick={(event) => handleNavigate(event, item.href)}
            >
              {item.label}
            </a>
          ))}

          <button
            className="mt-2 rounded-xl border border-slate-300 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition-all duration-300 hover:border-neon-cyan hover:text-neon-cyan dark:border-white/20 dark:text-slate-200 dark:hover:border-neon-pink dark:hover:text-neon-pink"
            type="button"
            onClick={closeMenus}
          >
            Perfil
          </button>
        </div>
      </nav>
    </header>
  )
}

export default Header
