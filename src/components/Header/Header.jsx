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
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 shadow-[0_0_24px_rgba(0,255,237,0.08)] backdrop-blur-xl transition-all duration-300 ease-out dark:border-white/10 dark:bg-pes-black/86 dark:shadow-[0_0_28px_rgba(105,0,255,0.18)]">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <a
          className="group inline-flex items-center rounded-md transition-all duration-300 ease-out hover:drop-shadow-[0_0_10px_rgba(105,0,255,0.45)] focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:ring-offset-4 focus:ring-offset-white dark:hover:drop-shadow-[0_0_12px_rgba(0,255,237,0.55)] dark:focus:ring-offset-pes-black"
          href="/"
          onClick={(event) => handleNavigate(event, '/')}
        >
          <span className="flex h-20 w-40 items-center justify-center overflow-hidden rounded-md">
            <img
              className="h-20 w-20 object-contain drop-shadow-[0_0_12px_rgba(0,255,237,0.4)] transition-all duration-300 ease-out group-hover:scale-105 group-hover:drop-shadow-[0_0_20px_rgba(255,102,255,0.52)]"
              src={logo}
              alt="PesApp"
            />
          </span>
        </a>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Menu principal">
          {menuItems.map((item) => (
            <a
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:text-neon-purple hover:shadow-[0_0_18px_rgba(105,0,255,0.22)] focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:ring-offset-2 focus:ring-offset-white dark:text-slate-300 dark:hover:text-neon-cyan dark:hover:shadow-[0_0_18px_rgba(0,255,237,0.24)] dark:focus:ring-offset-pes-black"
              href={item.href}
              key={item.href}
              onClick={(event) => handleNavigate(event, item.href)}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            className="group relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-slate-200 bg-white text-slate-800 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-cyan hover:text-neon-purple hover:shadow-glow-cyan focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:ring-offset-2 focus:ring-offset-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-neon-pink dark:hover:text-neon-pink dark:hover:shadow-glow-pink dark:focus:ring-offset-pes-black"
            type="button"
            id="themeToggle"
            aria-label={isDarkTheme ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
            onClick={onToggleTheme}
          >
            <span
              className={`absolute inset-0 rounded-md bg-neon-cyan/0 transition-all duration-300 ease-out ${
                isDarkTheme ? 'group-hover:bg-neon-pink/10' : 'group-hover:bg-neon-cyan/10'
              }`}
              aria-hidden="true"
            />
            <span className="relative h-5 w-5" aria-hidden="true">
              <svg
                className={`absolute inset-0 h-5 w-5 transition-all duration-300 ease-out ${
                  isDarkTheme
                    ? 'rotate-0 scale-100 text-neon-pink opacity-100'
                    : 'rotate-90 scale-75 opacity-0'
                }`}
                id="iconSun"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
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
                id="iconMoon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            </span>
          </button>

          <div className="relative">
            <button
              className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:text-neon-purple hover:shadow-glow-purple focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:ring-offset-2 focus:ring-offset-white dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:border-neon-pink dark:hover:text-neon-pink dark:hover:shadow-glow-pink dark:focus:ring-offset-pes-black"
              type="button"
              aria-expanded={isUserMenuOpen}
              aria-haspopup="menu"
              onClick={() => setIsUserMenuOpen((currentValue) => !currentValue)}
            >
              Bryan
              <svg
                className={`ml-2 h-4 w-4 transition-all duration-300 ease-out ${
                  isUserMenuOpen ? 'rotate-180 text-neon-pink' : ''
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            {isUserMenuOpen ? (
              <div
                className="absolute right-0 mt-2 w-44 rounded-lg border border-slate-200 bg-white p-2 shadow-[0_14px_34px_rgba(15,23,42,0.16)] transition-all duration-300 ease-out dark:border-white/10 dark:bg-[#0B0D14] dark:shadow-[0_0_30px_rgba(105,0,255,0.22)]"
                role="menu"
              >
                {userActions.map((action) => (
                  <button
                    className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 transition-all duration-300 ease-out hover:translate-x-1 hover:text-neon-purple hover:shadow-[0_0_16px_rgba(105,0,255,0.18)] focus:outline-none focus:ring-2 focus:ring-neon-cyan dark:text-slate-300 dark:hover:text-neon-cyan dark:hover:shadow-[0_0_16px_rgba(0,255,237,0.2)]"
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

          <button
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-800 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-cyan hover:text-neon-purple hover:shadow-glow-cyan focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:ring-offset-2 focus:ring-offset-white md:hidden dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-neon-pink dark:hover:text-neon-pink dark:hover:shadow-glow-pink dark:focus:ring-offset-pes-black"
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
      </div>

      <nav
        className={`border-t border-slate-200 bg-white px-4 py-3 shadow-[0_14px_30px_rgba(15,23,42,0.1)] transition-all duration-300 ease-out md:hidden dark:border-white/10 dark:bg-pes-black dark:shadow-[0_0_26px_rgba(0,255,237,0.12)] ${
          isMenuOpen ? 'block' : 'hidden'
        }`}
        id="mobile-menu"
        aria-label="Menu movil"
      >
        <div className="mx-auto grid max-w-7xl gap-1">
          {menuItems.map((item) => (
            <a
              className="rounded-md px-3 py-3 text-base font-medium text-slate-700 transition-all duration-300 ease-out hover:translate-x-1 hover:text-neon-purple hover:shadow-[0_0_18px_rgba(105,0,255,0.18)] focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:ring-offset-2 focus:ring-offset-white dark:text-slate-300 dark:hover:text-neon-cyan dark:hover:shadow-[0_0_18px_rgba(0,255,237,0.2)] dark:focus:ring-offset-pes-black"
              href={item.href}
              key={item.href}
              onClick={(event) => handleNavigate(event, item.href)}
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>
    </header>
  )
}

export default Header
