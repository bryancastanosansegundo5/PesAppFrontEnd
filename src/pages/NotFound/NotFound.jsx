function NotFound({ onNavigate, autenticado }) {
  return (
    <main className="mx-auto flex min-h-[calc(100svh-120px)] w-full max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
      <section className="grid w-full gap-8 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <p className="inline-flex rounded-full border border-neon-pink/35 bg-white px-4 py-2 text-sm font-semibold text-neon-purple shadow-glow-pink dark:bg-white/5 dark:text-neon-pink">
            Error 404
          </p>
          <div className="space-y-4">
            <h1 className="text-5xl font-black leading-none text-slate-950 sm:text-6xl dark:text-white">
              Esta ruta no existe.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              El enlace al que has entrado no corresponde con ninguna pantalla disponible de
              PesApp. Puedes volver al inicio o seguir por una de las rutas principales.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              className="rounded-xl border border-neon-cyan/45 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_22px_rgba(0,255,237,0.18)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:bg-pes-black dark:text-neon-cyan dark:shadow-glow-cyan"
              type="button"
              onClick={() => onNavigate('/')}
            >
              Ir al inicio
            </button>
            {autenticado ? (
              <button
                className="rounded-xl border border-neon-purple/45 bg-white px-5 py-3 text-sm font-black text-neon-purple shadow-glow-purple transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:bg-white/[0.04] dark:text-neon-pink"
                type="button"
                onClick={() => onNavigate('/entreno')}
              >
                Ir a Entreno
              </button>
            ) : null}
          </div>
        </div>

        <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-white/[0.04]">
          <div className="rounded-[28px] border border-neon-cyan/20 bg-slate-50 p-8 dark:bg-[#080B14]">
            <div className="grid gap-4">
              <div className="rounded-2xl border border-neon-cyan/25 bg-white p-5 dark:bg-pes-black/70">
                <p className="text-xs font-semibold uppercase tracking-wide text-neon-cyan">
                  Destinos utiles
                </p>
                <div className="mt-4 grid gap-3">
                  <button
                    className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-all duration-300 ease-out hover:border-neon-cyan hover:text-neon-cyan dark:border-white/10 dark:text-slate-200 dark:hover:border-neon-pink dark:hover:text-neon-pink"
                    type="button"
                    onClick={() => onNavigate('/')}
                  >
                    Inicio
                  </button>
                  {autenticado ? (
                    <>
                      <button
                        className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-all duration-300 ease-out hover:border-neon-cyan hover:text-neon-cyan dark:border-white/10 dark:text-slate-200 dark:hover:border-neon-pink dark:hover:text-neon-pink"
                        type="button"
                        onClick={() => onNavigate('/ejercicios')}
                      >
                        Ejercicios
                      </button>
                      <button
                        className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-all duration-300 ease-out hover:border-neon-cyan hover:text-neon-cyan dark:border-white/10 dark:text-slate-200 dark:hover:border-neon-pink dark:hover:text-neon-pink"
                        type="button"
                        onClick={() => onNavigate('/configurar-sesiones')}
                      >
                        Configurar sesiones
                      </button>
                    </>
                  ) : (
                    <button
                      className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition-all duration-300 ease-out hover:border-neon-cyan hover:text-neon-cyan dark:border-white/10 dark:text-slate-200 dark:hover:border-neon-pink dark:hover:text-neon-pink"
                      type="button"
                      onClick={() => onNavigate('/login')}
                    >
                      Login
                    </button>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-neon-pink/20 bg-white p-5 dark:bg-pes-black/70">
                <p className="text-7xl font-black leading-none text-slate-950 dark:text-white">
                  404
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  Si has llegado aqui desde un enlace interno, seguramente esa ruta todavia no
                  existe o se ha escrito mal.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default NotFound
