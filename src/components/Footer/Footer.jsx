function PieAccion({
  etiquetaAccion,
  deshabilitado = false,
  estaCargando = false,
  mensaje,
  alAccionar,
}) {
  return (
    <footer className="sticky bottom-0 z-40 border-t border-slate-200/80 bg-white/92 backdrop-blur-xl transition-all duration-300 ease-out dark:border-white/10 dark:bg-pes-black/90">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
        {mensaje ? <p className="text-sm text-slate-600 dark:text-slate-400">{mensaje}</p> : null}

        {etiquetaAccion ? (
          <button
            className="inline-flex min-w-[260px] items-center justify-center rounded-md border border-neon-cyan/45 bg-white px-8 py-4 text-base font-black text-slate-950 shadow-[0_0_22px_rgba(0,255,237,0.18)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:border-neon-cyan/45 disabled:hover:text-slate-950 disabled:hover:shadow-[0_0_22px_rgba(0,255,237,0.18)] dark:bg-pes-black dark:text-neon-cyan dark:shadow-glow-cyan dark:focus:ring-offset-pes-black dark:disabled:hover:text-neon-cyan"
            type="button"
            disabled={deshabilitado || estaCargando}
            onClick={alAccionar}
          >
            {estaCargando ? 'Enviando...' : etiquetaAccion}
          </button>
        ) : null}
      </div>
    </footer>
  )
}

export default PieAccion
