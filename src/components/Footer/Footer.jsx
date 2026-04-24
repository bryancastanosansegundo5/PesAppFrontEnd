function Footer({ actionLabel, disabled = false, isLoading = false, message, onAction }) {
  return (
    <footer className="sticky bottom-0 z-40 border-t border-slate-200/80 bg-white/92 backdrop-blur-xl transition-all duration-300 ease-out dark:border-white/10 dark:bg-pes-black/90">
      <div className="mx-auto flex w-full max-w-7xl flex-col items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
        {message ? <p className="text-sm text-slate-600 dark:text-slate-400">{message}</p> : null}

        {actionLabel ? (
          <button
            className="inline-flex min-w-[260px] items-center justify-center rounded-md border border-neon-cyan/50 bg-pes-black px-8 py-4 text-base font-black text-neon-cyan shadow-glow-cyan transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:border-neon-cyan/50 disabled:hover:text-neon-cyan disabled:hover:shadow-glow-cyan dark:bg-white/5 dark:focus:ring-offset-pes-black"
            type="button"
            disabled={disabled || isLoading}
            onClick={onAction}
          >
            {isLoading ? 'Enviando...' : actionLabel}
          </button>
        ) : null}
      </div>
    </footer>
  )
}

export default Footer
