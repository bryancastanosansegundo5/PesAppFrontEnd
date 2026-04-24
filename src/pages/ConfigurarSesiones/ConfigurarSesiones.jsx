import { useEffect, useState } from 'react'
import {
  SESSION_TEMPLATES_SYNC_ENDPOINT,
  createEmptyExercise,
  createEmptySession,
  getSessions,
  saveSessions,
} from '../../services/trainingStorage'

const numberInputClass =
  'w-20 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white'

const textInputClass =
  'rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white'

function ConfigurarSesiones() {
  const [sessions, setSessions] = useState(getSessions)
  const [openSessions, setOpenSessions] = useState(() => {
    const initialSessions = getSessions()
    return Object.fromEntries(initialSessions.map((session, index) => [session.id, index === 0]))
  })
  const [saveStatus, setSaveStatus] = useState({})

  useEffect(() => {
    saveSessions(sessions)
  }, [sessions])

  const addSession = () => {
    const session = createEmptySession()

    setSessions((currentSessions) => [...currentSessions, session])
    setOpenSessions((currentOpenSessions) => ({
      ...currentOpenSessions,
      [session.id]: true,
    }))
  }

  const toggleSession = (sessionId) => {
    setOpenSessions((currentOpenSessions) => ({
      ...currentOpenSessions,
      [sessionId]: !currentOpenSessions[sessionId],
    }))
  }

  const updateSession = (sessionId, field, value) => {
    setSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id === sessionId ? { ...session, [field]: value } : session,
      ),
    )
  }

  const removeSession = (sessionId) => {
    setSessions((currentSessions) =>
      currentSessions.filter((session) => session.id !== sessionId),
    )
  }

  const addExercise = (sessionId) => {
    setSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id === sessionId
          ? { ...session, exercises: [...session.exercises, createEmptyExercise()] }
          : session,
      ),
    )
  }

  const updateExercise = (sessionId, exerciseId, field, value) => {
    setSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              exercises: session.exercises.map((exercise) =>
                exercise.id === exerciseId ? { ...exercise, [field]: value } : exercise,
              ),
            }
          : session,
      ),
    )
  }

  const removeExercise = (sessionId, exerciseId) => {
    setSessions((currentSessions) =>
      currentSessions.map((session) =>
        session.id === sessionId
          ? {
              ...session,
              exercises: session.exercises.filter((exercise) => exercise.id !== exerciseId),
            }
          : session,
      ),
    )
  }

  const saveSessionOnServer = async (session) => {
    setSaveStatus((currentStatus) => ({
      ...currentStatus,
      [session.id]: { state: 'saving', text: 'Guardando...' },
    }))

    try {
      const response = await fetch(SESSION_TEMPLATES_SYNC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(session),
      })

      if (!response.ok) {
        throw new Error('El servidor no confirmo el guardado.')
      }

      setSaveStatus((currentStatus) => ({
        ...currentStatus,
        [session.id]: { state: 'saved', text: 'Guardado en servidor' },
      }))
    } catch (error) {
      setSaveStatus((currentStatus) => ({
        ...currentStatus,
        [session.id]: { state: 'error', text: `${error.message} Borrador local conservado.` },
      }))
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-neon-purple/30 bg-white p-5 shadow-glow-purple transition-all duration-300 ease-out dark:bg-white/[0.04]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-pink">
              Configurar sesiones
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
              Plantillas base de entrenamiento
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
              Define los grupos que apareceran en Entreno. Cada tarjeta se puede plegar para
              trabajar sin tanto scroll.
            </p>
          </div>

          <button
            className="rounded-md border border-neon-cyan/50 px-4 py-3 text-sm font-bold text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:text-neon-cyan"
            type="button"
            onClick={addSession}
          >
            Nueva sesion
          </button>
        </div>
      </section>

      <section className="grid gap-5">
        {sessions.map((session) => {
          const isOpen = Boolean(openSessions[session.id])
          const status = saveStatus[session.id]

          return (
            <article
              className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out hover:border-neon-cyan/50 hover:shadow-glow-cyan dark:border-white/10 dark:bg-white/[0.04]"
              key={session.id}
            >
              <button
                className="flex w-full flex-col gap-3 px-5 py-4 text-left transition-all duration-300 ease-out hover:text-neon-purple dark:hover:text-neon-cyan sm:flex-row sm:items-center sm:justify-between"
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggleSession(session.id)}
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
                    Sesion
                  </p>
                  <h2 className="mt-1 text-xl font-black text-slate-950 dark:text-white">
                    {session.name || 'Sesion sin nombre'}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {session.exercises.length} ejercicios configurados
                  </p>
                </div>

                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-md border border-neon-cyan/40 text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out dark:text-neon-cyan ${
                    isOpen ? 'border-neon-pink text-neon-pink shadow-glow-pink' : ''
                  }`}
                  aria-hidden="true"
                >
                  <svg
                    className={`h-5 w-5 transition-transform duration-300 ease-out ${isOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </span>
              </button>

              <div
                className={`grid transition-[grid-template-rows] duration-500 ease-out ${
                  isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                }`}
              >
                <div className="overflow-hidden">
                  <div className="grid gap-5 border-t border-slate-200 p-5 dark:border-white/10">
                    <div className="grid gap-4 md:grid-cols-[minmax(240px,1fr)_auto] md:items-end">
                      <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Nombre del entreno
                        <input
                          className={`${textInputClass} py-3 text-base font-bold`}
                          value={session.name}
                          onChange={(event) =>
                            updateSession(session.id, 'name', event.target.value)
                          }
                        />
                      </label>

                      <div className="flex flex-wrap gap-2">
                        <button
                          className="rounded-md border border-neon-cyan/50 px-3 py-3 text-sm font-bold text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:text-neon-cyan"
                          type="button"
                          onClick={() => addExercise(session.id)}
                        >
                          Add ejercicio
                        </button>
                        <button
                          className="rounded-md border border-neon-pink/50 px-3 py-3 text-sm font-bold text-neon-pink shadow-glow-pink transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:text-neon-purple hover:shadow-glow-purple"
                          type="button"
                          onClick={() => removeSession(session.id)}
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4">
                      {session.exercises.map((exercise, exerciseIndex) => (
                        <div
                          className="rounded-lg border border-slate-200 p-4 transition-all duration-300 ease-out hover:border-neon-purple/50 hover:shadow-glow-purple dark:border-white/10"
                          key={exercise.id}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-bold text-neon-purple dark:text-neon-cyan">
                              Ejercicio {exerciseIndex + 1}
                            </p>
                            <button
                              className="rounded-md border border-neon-pink/50 px-3 py-2 text-sm font-bold text-neon-pink shadow-glow-pink transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:text-neon-purple hover:shadow-glow-purple"
                              type="button"
                              onClick={() => removeExercise(session.id, exercise.id)}
                            >
                              Quitar
                            </button>
                          </div>

                          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(220px,0.9fr)_minmax(260px,1.4fr)_80px_80px_90px_110px_minmax(150px,0.8fr)] lg:items-end">
                            <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                              Nombre
                              <input
                                className={textInputClass}
                                value={exercise.name}
                                onChange={(event) =>
                                  updateExercise(
                                    session.id,
                                    exercise.id,
                                    'name',
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                              Descripcion
                              <input
                                className={textInputClass}
                                value={exercise.description}
                                onChange={(event) =>
                                  updateExercise(
                                    session.id,
                                    exercise.id,
                                    'description',
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                              Series
                              <input
                                className={numberInputClass}
                                type="number"
                                min="0"
                                max="99"
                                value={exercise.series}
                                onChange={(event) =>
                                  updateExercise(
                                    session.id,
                                    exercise.id,
                                    'series',
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                              Reps
                              <input
                                className={numberInputClass}
                                type="number"
                                min="0"
                                max="99"
                                value={exercise.repetitions}
                                onChange={(event) =>
                                  updateExercise(
                                    session.id,
                                    exercise.id,
                                    'repetitions',
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                              Peso
                              <input
                                className="w-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white"
                                type="number"
                                min="0"
                                max="999"
                                value={exercise.weight}
                                onChange={(event) =>
                                  updateExercise(
                                    session.id,
                                    exercise.id,
                                    'weight',
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                              Altura banco
                              <input
                                className="w-28 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white"
                                type="number"
                                min="0"
                                max="999"
                                value={exercise.benchHeight}
                                onChange={(event) =>
                                  updateExercise(
                                    session.id,
                                    exercise.id,
                                    'benchHeight',
                                    event.target.value,
                                  )
                                }
                              />
                            </label>

                            <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                              Agarre
                              <input
                                className={`${textInputClass} min-w-36`}
                                value={exercise.grip}
                                onChange={(event) =>
                                  updateExercise(
                                    session.id,
                                    exercise.id,
                                    'grip',
                                    event.target.value,
                                  )
                                }
                              />
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p
                        className={`text-sm ${
                          status?.state === 'error'
                            ? 'text-neon-pink'
                            : 'text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        {status?.text || 'Los cambios quedan como borrador local hasta guardar.'}
                      </p>

                      <button
                        className="self-end rounded-md border border-neon-cyan/50 bg-pes-black px-5 py-3 text-sm font-bold text-neon-cyan shadow-glow-cyan transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink focus:outline-none focus:ring-2 focus:ring-neon-cyan focus:ring-offset-2 focus:ring-offset-white disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:border-neon-cyan/50 disabled:hover:text-neon-cyan disabled:hover:shadow-glow-cyan dark:bg-white/5 dark:focus:ring-offset-pes-black"
                        type="button"
                        disabled={status?.state === 'saving'}
                        onClick={() => saveSessionOnServer(session)}
                      >
                        {status?.state === 'saving' ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          )
        })}
      </section>
    </main>
  )
}

export default ConfigurarSesiones
