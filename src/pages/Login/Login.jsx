import { useState } from 'react'

const claseInput =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white'

function Login({ onLogin, estaCargando, error, tema }) {
  const [email, setEmail] = useState('admin@pesapp.local')
  const [password, setPassword] = useState('*_*Passw0rd*_*')
  const isDarkTheme = tema === 'dark'

  const handleSubmit = (event) => {
    event.preventDefault()
    onLogin({ email: email.trim(), password })
  }

  return (
    <main className="mx-auto flex min-h-[calc(100svh-96px)] w-full max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid w-full gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="order-2 space-y-6 lg:order-1">
          <p className="inline-flex rounded-full border border-neon-cyan/35 bg-white px-4 py-2 text-sm font-semibold text-neon-purple shadow-glow-cyan dark:bg-white/5 dark:text-neon-cyan">
            Acceso seguro
          </p>
          <div className="space-y-4">
            <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl dark:text-white">
              Entra en PesApp con tu cuenta.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
              El catalogo de ejercicios y el resto de areas protegidas ya usan JWT, asi que
              desde aqui validamos la sesion antes de entrar en la app.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-neon-cyan/30 bg-white p-4 shadow-glow-cyan dark:bg-white/[0.04]">
              <p className="text-sm font-bold text-slate-950 dark:text-white">JWT</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Se guarda la sesion local y se revalida al arrancar.
              </p>
            </div>
            <div className="rounded-2xl border border-neon-purple/30 bg-white p-4 shadow-glow-purple dark:bg-white/[0.04]">
              <p className="text-sm font-bold text-slate-950 dark:text-white">24h</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Usamos la expiracion que devuelve el backend.
              </p>
            </div>
            <div className="rounded-2xl border border-neon-pink/30 bg-white p-4 shadow-glow-pink dark:bg-white/[0.04]">
              <p className="text-sm font-bold text-slate-950 dark:text-white">Roles</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Compatible con ADMIN, COACH y USUARIO.
              </p>
            </div>
          </div>
        </div>

        <div className="order-1 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] lg:order-2 dark:border-white/10 dark:bg-white/[0.04]">
          <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-6 dark:border-white/10 dark:bg-[#080B14]">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
                Login
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                Identificate para continuar
              </h2>
            </div>

            <form className="grid gap-4" onSubmit={handleSubmit}>
              <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Email
                <input
                  className={claseInput}
                  type="email"
                  value={email}
                  autoComplete="username"
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Password
                <input
                  className={claseInput}
                  type="password"
                  value={password}
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>

              {error ? (
                <div className="rounded-xl border border-neon-pink/35 bg-neon-pink/8 px-4 py-3 text-sm text-neon-pink">
                  {error}
                </div>
              ) : null}

              <button
                className="mt-2 inline-flex items-center justify-center rounded-xl border border-neon-cyan/45 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_22px_rgba(0,255,237,0.18)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink disabled:cursor-not-allowed disabled:opacity-60 dark:bg-pes-black dark:text-neon-cyan dark:shadow-glow-cyan"
                type="submit"
                disabled={estaCargando}
              >
                {estaCargando ? 'Entrando...' : 'Entrar'}
              </button>
            </form>

            <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              Tema activo: {isDarkTheme ? 'oscuro' : 'claro'}.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}

export default Login
