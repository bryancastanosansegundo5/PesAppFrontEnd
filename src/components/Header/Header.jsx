import { useState } from 'react'
import logo from '../../assets/PesAppMark.png'

const menuItems = [
  { label: 'Entreno', href: '/entreno' },
  { label: 'Ejercicios', href: '/ejercicios' },
  { label: 'Otros entrenos', href: '/otros-entrenos' },
  { label: 'Configurar sesiones', href: '/configurar-sesiones' },
]

function Header({ theme, onNavigate, onToggleTheme, usuario, autenticado, onLogout }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
  const isDarkTheme = theme === 'dark'
  const esAdmin = usuario?.rol === 'ADMIN'

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
      <div className="mx-auto w-fit max-w-5xl">
        <div className="relative flex items-center justify-center rounded-full border border-neon-cyan/40 bg-white/18 pl-2 pr-3 py-2 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_0_18px_rgba(0,255,237,0.16)] backdrop-blur-2xl backdrop-saturate-150 transition-all duration-300 ease-out dark:border-neon-cyan/35 dark:bg-[#090D1A]/38 dark:text-white dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_24px_rgba(0,255,237,0.2)]">
          <a
            className="group inline-flex shrink-0 items-center rounded-full p-1 outline-none transition-all duration-300 ease-out hover:drop-shadow-[0_0_10px_rgba(0,255,237,0.45)] focus:outline-none focus-visible:shadow-[0_0_0_2px_rgba(0,255,237,0.28)]"
            href="/"
            onClick={(event) => handleNavigate(event, '/')}
          >
            <img
              className="h-14 w-14 object-contain drop-shadow-[0_0_10px_rgba(0,255,237,0.36)] transition-all duration-300 ease-out group-hover:scale-105 group-hover:drop-shadow-[0_0_16px_rgba(255,102,255,0.4)]"
              src={logo}
              alt="PesApp"
            />
          </a>

          <nav className="ml-3 hidden items-center justify-center gap-5 md:flex" aria-label="Menu principal">
            {(autenticado ? menuItems : []).map((item) => (
              <a
                className="group relative h-6 overflow-hidden text-[0.95rem] font-semibold text-slate-700 transition-colors duration-300 hover:text-neon-purple dark:text-slate-200 dark:hover:text-neon-cyan"
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

          <div className="hidden shrink-0 items-center gap-2 md:ml-3 md:flex">
            <button
              className="group relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-white/50 bg-white/30 text-slate-800 shadow-[inset_0_1px_0_rgba(255,255,255,0.4),0_0_14px_rgba(0,255,237,0.16)] backdrop-blur-xl transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-[0_0_20px_rgba(255,102,255,0.22)] dark:border-white/20 dark:bg-white/10 dark:text-slate-100 dark:hover:border-neon-cyan dark:hover:text-neon-cyan dark:hover:shadow-[0_0_20px_rgba(0,255,237,0.28)]"
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

            {autenticado ? (
              <button
                className="rounded-full border border-neon-cyan/45 bg-white/42 px-4 py-1.5 text-sm font-bold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_0_16px_rgba(0,255,237,0.14)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_0_22px_rgba(0,255,237,0.22)] dark:border-neon-cyan/45 dark:bg-neon-cyan/18 dark:text-neon-cyan dark:shadow-[0_0_18px_rgba(0,255,237,0.26)] dark:hover:shadow-[0_0_24px_rgba(0,255,237,0.34)]"
                type="button"
                onClick={() => setIsUserMenuOpen((currentValue) => !currentValue)}
              >
                {usuario?.nombre || 'Mi cuenta'}
              </button>
            ) : (
              <button
                className="rounded-full border border-neon-cyan/45 bg-white/42 px-4 py-1.5 text-sm font-bold text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_0_16px_rgba(0,255,237,0.14)] backdrop-blur-xl transition-all duration-300 hover:shadow-[0_0_22px_rgba(0,255,237,0.22)] dark:border-neon-cyan/45 dark:bg-neon-cyan/18 dark:text-neon-cyan dark:shadow-[0_0_18px_rgba(0,255,237,0.26)] dark:hover:shadow-[0_0_24px_rgba(0,255,237,0.34)]"
                type="button"
                onClick={() => onNavigate('/login')}
              >
                Login
              </button>
            )}
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

          {autenticado && isUserMenuOpen ? (
            <div
              className="absolute right-4 top-[calc(100%+12px)] hidden w-44 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_18px_42px_rgba(15,23,42,0.16)] md:block dark:border-white/10 dark:bg-[#0B0D14] dark:shadow-[0_0_30px_rgba(105,0,255,0.18)]"
              role="menu"
            >
              <div className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                {usuario?.rol || 'Usuario'}
              </div>
              {esAdmin ? (
                <button
                  className="mb-1 block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition-all duration-300 ease-out hover:bg-slate-100 hover:text-neon-purple focus:outline-none focus-visible:shadow-[0_0_0_2px_rgba(0,255,237,0.22)] dark:text-slate-300 dark:hover:bg-white/8 dark:hover:text-neon-cyan"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    closeMenus()
                    onNavigate('/admin')
                  }}
                >
                  Administracion
                </button>
              ) : null}
              <button
                className="block w-full rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-700 transition-all duration-300 ease-out hover:bg-slate-100 hover:text-neon-purple focus:outline-none focus-visible:shadow-[0_0_0_2px_rgba(0,255,237,0.22)] dark:text-slate-300 dark:hover:bg-white/8 dark:hover:text-neon-cyan"
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenus()
                  onLogout()
                }}
              >
                Cerrar sesion
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <nav
        className={`mx-auto mt-3 w-full max-w-5xl rounded-3xl border border-white/45 bg-white/55 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.45),0_14px_30px_rgba(15,23,42,0.1)] backdrop-blur-2xl transition-all duration-300 ease-out md:hidden dark:border-white/15 dark:bg-pes-black/72 dark:shadow-[0_0_26px_rgba(0,255,237,0.12)] ${
          isMenuOpen ? 'block' : 'hidden'
        }`}
        id="mobile-menu"
        aria-label="Menu movil"
      >
        <div className="grid gap-1">
          {(autenticado ? menuItems : []).map((item) => (
            <a
              className="rounded-xl px-3 py-3 text-base font-medium text-slate-700 transition-all duration-300 ease-out hover:translate-x-1 hover:text-neon-purple hover:shadow-[0_0_18px_rgba(105,0,255,0.18)] focus:outline-none focus:ring-2 focus:ring-neon-cyan dark:text-slate-300 dark:hover:text-neon-cyan dark:hover:shadow-[0_0_18px_rgba(0,255,237,0.2)]"
              href={item.href}
              key={item.href}
              onClick={(event) => handleNavigate(event, item.href)}
            >
              {item.label}
            </a>
          ))}

          {autenticado && esAdmin ? (
            <button
              className="rounded-xl px-3 py-3 text-left text-base font-medium text-slate-700 transition-all duration-300 ease-out hover:translate-x-1 hover:text-neon-purple hover:shadow-[0_0_18px_rgba(105,0,255,0.18)] focus:outline-none focus:ring-2 focus:ring-neon-cyan dark:text-slate-300 dark:hover:text-neon-cyan dark:hover:shadow-[0_0_18px_rgba(0,255,237,0.2)]"
              type="button"
              onClick={() => {
                closeMenus()
                onNavigate('/admin')
              }}
            >
              Administracion
            </button>
          ) : null}

          <button
            className="mt-2 rounded-xl border border-slate-300 px-3 py-2 text-left text-sm font-semibold text-slate-700 transition-all duration-300 hover:border-neon-cyan hover:text-neon-cyan dark:border-white/20 dark:text-slate-200 dark:hover:border-neon-pink dark:hover:text-neon-pink"
            type="button"
            onClick={() => {
              closeMenus()
              if (autenticado) {
                onLogout()
                return
              }

              onNavigate('/login')
            }}
          >
            {autenticado ? 'Cerrar sesion' : 'Login'}
          </button>
        </div>
      </nav>
    </header>
  )
}

export default Header
