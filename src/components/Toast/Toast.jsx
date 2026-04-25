import { useEffect, useState } from 'react'

function Toast({ mensaje, tipo = 'info', duracion = 4200, persistente = false, onClose }) {
  const [mensajeVisible, setMensajeVisible] = useState(() => mensaje)

  useEffect(() => {
    if (persistente) {
      return undefined
    }

    if (!mensajeVisible) {
      return undefined
    }

    const timeoutId = window.setTimeout(() => {
      setMensajeVisible('')
    }, duracion)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [duracion, mensajeVisible, persistente])

  if (!mensajeVisible) {
    return null
  }

  const esError = tipo === 'error'

  return (
    <div className="pointer-events-none fixed right-4 top-24 z-50 flex max-w-[calc(100vw-2rem)] justify-end sm:right-6 sm:top-28 lg:right-8">
      <div
        className={`pointer-events-auto w-full max-w-md rounded-2xl border px-4 py-3 text-sm font-semibold shadow-[0_18px_44px_rgba(15,23,42,0.16)] backdrop-blur-xl transition-all duration-300 ease-out ${
          esError
            ? 'border-neon-pink/40 bg-white/96 text-neon-pink dark:bg-[#0B0D14]/96'
            : 'border-neon-cyan/35 bg-white/96 text-slate-700 dark:bg-[#0B0D14]/96 dark:text-slate-200'
        }`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">{mensajeVisible}</div>
          <button
            className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 ease-out hover:-translate-y-0.5 ${
              esError
                ? 'border-neon-pink/30 text-neon-pink hover:border-neon-pink'
                : 'border-neon-cyan/25 text-slate-500 hover:border-neon-cyan hover:text-neon-cyan dark:text-slate-300'
            }`}
            type="button"
            aria-label="Cerrar notificacion"
            onClick={() => {
              setMensajeVisible('')
              onClose?.()
            }}
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default Toast
