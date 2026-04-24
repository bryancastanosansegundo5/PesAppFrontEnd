import { useEffect, useMemo, useState } from 'react'
import Footer from '../../components/Footer/Footer'
import {
  TRAINING_SYNC_ENDPOINT,
  clearCurrentWorkout,
  createWorkoutFromSession,
  getCurrentWorkout,
  getLastExerciseRecord,
  getSessions,
  getTrainingHistory,
  saveCurrentWorkout,
  saveTrainingHistory,
} from '../../services/trainingStorage'

const numberInputClass =
  'w-20 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white'

const weightInputClass =
  'w-24 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white'

const textInputClass =
  'rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan dark:border-white/10 dark:bg-pes-black dark:text-white'

function formatPreviousSet(previousSet) {
  if (!previousSet) {
    return '-'
  }

  return `${previousSet.weight || 0}kg x ${previousSet.reps || 0}`
}

function groupSetsBySetNumber(sets) {
  return sets.reduce((groups, set, index) => {
    const setNumber = set.setNumber || index + 1
    const existingGroup = groups.find((group) => group.setNumber === setNumber)

    if (existingGroup) {
      existingGroup.sets.push(set)
      return groups
    }

    return [...groups, { setNumber, sets: [set] }]
  }, [])
}

function getPreviousSetsBySetNumber(previousRecord, setNumber) {
  if (!previousRecord) {
    return []
  }

  return previousRecord.performedSets.filter(
    (previousSet, previousIndex) => (previousSet.setNumber || previousIndex + 1) === setNumber,
  )
}

function hasMultipleWeights(sets) {
  return new Set(sets.map((set) => Number(set.weight))).size > 1
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function createTodayExercise() {
  return {
    exerciseId: `today-${Date.now()}`,
    name: 'Ejercicio extra',
    description: '',
    plannedSeries: 0,
    plannedRepetitions: 0,
    plannedWeight: 0,
    benchHeight: '',
    grip: '',
    completed: false,
    skipped: false,
    performedSets: [{ id: `set-${Date.now()}`, setNumber: 1, reps: 10, weight: 0 }],
  }
}

function createTodayExerciseFromTemplate(templateExercise) {
  const series = Number(templateExercise.series) || 0
  const repetitions = Number(templateExercise.repetitions) || 0
  const weight = Number(templateExercise.weight) || 0

  return {
    exerciseId: templateExercise.id,
    name: templateExercise.name,
    description: templateExercise.description || '',
    plannedSeries: series,
    plannedRepetitions: repetitions,
    plannedWeight: weight,
    benchHeight: templateExercise.benchHeight || '',
    grip: templateExercise.grip || '',
    completed: false,
    skipped: false,
    performedSets: Array.from({ length: series || 1 }, (_, index) => ({
      id: `set-${Date.now()}-${index + 1}`,
      setNumber: index + 1,
      reps: repetitions,
      weight,
    })),
  }
}

function createExampleWorkout() {
  const timestamp = Date.now()

  return {
    id: `workout-example-${timestamp}`,
    sessionId: 'push-session',
    sessionName: 'Ejemplo empuje',
    startedAt: new Date().toISOString(),
    exercises: [
      {
        exerciseId: 'bench-press',
        name: 'Press banca',
        description: 'Ejemplo con fallo en segunda serie y bajada de peso.',
        plannedSeries: 4,
        plannedRepetitions: 12,
        plannedWeight: 60,
        benchHeight: 4,
        grip: 'Medio',
        completed: false,
        skipped: false,
        performedSets: [
          { id: `example-set-${timestamp}-1`, setNumber: 1, reps: 12, weight: 60 },
          { id: `example-set-${timestamp}-2`, setNumber: 2, reps: 8, weight: 60 },
          { id: `example-set-${timestamp}-3`, setNumber: 2, reps: 4, weight: 50 },
          { id: `example-set-${timestamp}-4`, setNumber: 3, reps: 10, weight: 55 },
        ],
      },
      {
        exerciseId: 'shoulder-press',
        name: 'Press hombro',
        description: 'Ejemplo con una serie menos que la plantilla.',
        plannedSeries: 3,
        plannedRepetitions: 10,
        plannedWeight: 22,
        benchHeight: 7,
        grip: 'Neutro',
        completed: false,
        skipped: false,
        performedSets: [
          { id: `example-set-${timestamp}-5`, setNumber: 1, reps: 10, weight: 22 },
          { id: `example-set-${timestamp}-6`, setNumber: 2, reps: 8, weight: 20 },
        ],
      },
      {
        exerciseId: 'today-extra-example',
        name: 'Fondos asistidos',
        description: 'Ejercicio anadido solo para hoy.',
        plannedSeries: 3,
        plannedRepetitions: 12,
        plannedWeight: 35,
        benchHeight: '',
        grip: 'Paralelo',
        completed: false,
        skipped: false,
        performedSets: [
          { id: `example-set-${timestamp}-7`, setNumber: 1, reps: 12, weight: 35 },
          { id: `example-set-${timestamp}-8`, setNumber: 2, reps: 10, weight: 30 },
          { id: `example-set-${timestamp}-9`, setNumber: 3, reps: 9, weight: 30 },
        ],
      },
    ],
  }
}

function createExamplePreviousWorkout() {
  return {
    id: 'example-previous-workout',
    sessionId: 'push-session',
    sessionName: 'Empuje anterior',
    completedAt: '2026-04-20T18:30:00.000Z',
    exercises: [
      {
        exerciseId: 'bench-press',
        name: 'Press banca',
        benchHeight: 4,
        grip: 'Medio',
        performedSets: [
          { id: 'previous-bench-1', setNumber: 1, reps: 12, weight: 60 },
          { id: 'previous-bench-2', setNumber: 2, reps: 10, weight: 60 },
          { id: 'previous-bench-3', setNumber: 2, reps: 3, weight: 55 },
          { id: 'previous-bench-4', setNumber: 3, reps: 9, weight: 57.5 },
          { id: 'previous-bench-5', setNumber: 4, reps: 8, weight: 55 },
        ],
      },
      {
        exerciseId: 'shoulder-press',
        name: 'Press hombro',
        benchHeight: 7,
        grip: 'Neutro',
        performedSets: [
          { id: 'previous-shoulder-1', setNumber: 1, reps: 10, weight: 22 },
          { id: 'previous-shoulder-2', setNumber: 2, reps: 10, weight: 22 },
          { id: 'previous-shoulder-3', setNumber: 3, reps: 8, weight: 20 },
        ],
      },
      {
        exerciseId: 'today-extra-example',
        name: 'Fondos asistidos',
        benchHeight: '',
        grip: 'Paralelo',
        performedSets: [
          { id: 'previous-dips-1', setNumber: 1, reps: 12, weight: 30 },
          { id: 'previous-dips-2', setNumber: 2, reps: 10, weight: 30 },
          { id: 'previous-dips-3', setNumber: 3, reps: 8, weight: 25 },
        ],
      },
    ],
  }
}

function Entreno() {
  const [sessions] = useState(getSessions)
  const [history, setHistory] = useState(getTrainingHistory)
  const [workout, setWorkout] = useState(() => {
    const currentWorkout = getCurrentWorkout()

    if (currentWorkout) {
      return currentWorkout
    }

    return sessions[0] ? createWorkoutFromSession(sessions[0]) : null
  })
  const [selectedSessionId, setSelectedSessionId] = useState(
    workout?.sessionId || sessions[0]?.id || '',
  )
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [openExercises, setOpenExercises] = useState({})
  const [isSessionSelectorOpen, setIsSessionSelectorOpen] = useState(false)
  const [sessionSearch, setSessionSearch] = useState('')
  const [isExerciseSelectorOpen, setIsExerciseSelectorOpen] = useState(false)
  const [exerciseSearch, setExerciseSearch] = useState('')

  const filteredSessions = useMemo(() => {
    const normalizedSearch = normalizeText(sessionSearch)

    if (!normalizedSearch) return sessions

    return sessions.filter((session) => normalizeText(session.name).includes(normalizedSearch))
  }, [sessions, sessionSearch])

  const addableExerciseTemplates = useMemo(() => {
    const existingExerciseIds = new Set(workout?.exercises.map((exercise) => exercise.exerciseId))
    const uniqueTemplatesById = new Map()

    sessions.forEach((session) => {
      session.exercises.forEach((exercise) => {
        if (!uniqueTemplatesById.has(exercise.id) && !existingExerciseIds.has(exercise.id)) {
          uniqueTemplatesById.set(exercise.id, exercise)
        }
      })
    })

    const normalizedSearch = normalizeText(exerciseSearch)
    const templates = Array.from(uniqueTemplatesById.values())

    if (!normalizedSearch) return templates

    return templates.filter(
      (exercise) =>
        normalizeText(exercise.name).includes(normalizedSearch) ||
        normalizeText(exercise.description).includes(normalizedSearch),
    )
  }, [sessions, workout, exerciseSearch])

  useEffect(() => {
    if (workout) {
      saveCurrentWorkout(workout)
    }
  }, [workout])

  const selectSession = (sessionId) => {
    const session = sessions.find((item) => item.id === sessionId)

    if (!session) return

    setSelectedSessionId(sessionId)
    const nextWorkout = createWorkoutFromSession(session)

    setWorkout(nextWorkout)
    setOpenExercises(
      Object.fromEntries(nextWorkout.exercises.map((exercise) => [exercise.exerciseId, true])),
    )
    setIsSessionSelectorOpen(false)
    setMessage('Entreno de hoy cargado desde la plantilla. Puedes modificarlo sin cambiar la base.')
  }

  const toggleExercise = (exerciseId) => {
    const exercise = workout?.exercises.find((item) => item.exerciseId === exerciseId)

    if (exercise?.completed) return

    setOpenExercises((currentOpenExercises) => ({
      ...currentOpenExercises,
      [exerciseId]: !(currentOpenExercises[exerciseId] ?? true),
    }))
  }

  const toggleExerciseCompleted = (exerciseId) => {
    setWorkout((currentWorkout) => ({
      ...currentWorkout,
      exercises: currentWorkout.exercises.map((exercise) =>
        exercise.exerciseId === exerciseId
          ? { ...exercise, completed: !exercise.completed }
          : exercise,
      ),
    }))

    setOpenExercises((currentOpenExercises) => ({
      ...currentOpenExercises,
      [exerciseId]: false,
    }))
  }

  const updateExercise = (exerciseId, field, value) => {
    setWorkout((currentWorkout) => ({
      ...currentWorkout,
      exercises: currentWorkout.exercises.map((exercise) =>
        exercise.exerciseId === exerciseId ? { ...exercise, [field]: value } : exercise,
      ),
    }))
  }

  const updateSet = (exerciseId, setId, field, value) => {
    setWorkout((currentWorkout) => ({
      ...currentWorkout,
      exercises: currentWorkout.exercises.map((exercise) =>
        exercise.exerciseId === exerciseId
          ? {
              ...exercise,
              performedSets: exercise.performedSets.map((set) =>
                set.id === setId ? { ...set, [field]: Number(value) } : set,
              ),
            }
          : exercise,
      ),
    }))
  }

  const addSet = (exerciseId) => {
    setWorkout((currentWorkout) => ({
      ...currentWorkout,
      exercises: currentWorkout.exercises.map((exercise) => {
        if (exercise.exerciseId !== exerciseId) return exercise

        const nextSetNumber =
          Math.max(0, ...exercise.performedSets.map((set) => Number(set.setNumber) || 0)) + 1

        return {
          ...exercise,
          performedSets: [
            ...exercise.performedSets,
            {
              id: `set-${Date.now()}`,
              setNumber: nextSetNumber,
              reps: exercise.plannedRepetitions || 0,
              weight: exercise.plannedWeight || 0,
            },
          ],
        }
      }),
    }))
  }

  const addWeightStep = (exerciseId, sourceSet) => {
    setWorkout((currentWorkout) => ({
      ...currentWorkout,
      exercises: currentWorkout.exercises.map((exercise) => {
        if (exercise.exerciseId !== exerciseId) return exercise

        const sourceIndex = exercise.performedSets.findIndex((set) => set.id === sourceSet.id)
        const newSet = {
          id: `set-${Date.now()}`,
          setNumber: sourceSet.setNumber,
          reps: 0,
          weight: sourceSet.weight,
        }
        const performedSets = [...exercise.performedSets]

        performedSets.splice(sourceIndex + 1, 0, newSet)

        return { ...exercise, performedSets }
      }),
    }))
  }

  const removeSet = (exerciseId, setId) => {
    setWorkout((currentWorkout) => ({
      ...currentWorkout,
      exercises: currentWorkout.exercises.map((exercise) =>
        exercise.exerciseId === exerciseId
          ? {
              ...exercise,
              performedSets: exercise.performedSets.filter((set) => set.id !== setId),
            }
          : exercise,
      ),
    }))
  }

  const addExerciseOnlyToday = () => {
    const exercise = createTodayExercise()

    setWorkout((currentWorkout) => ({
      ...currentWorkout,
      exercises: [...currentWorkout.exercises, exercise],
    }))
    setOpenExercises((currentOpenExercises) => ({
      ...currentOpenExercises,
      [exercise.exerciseId]: true,
    }))
  }

  const addExerciseFromTemplate = (templateExercise) => {
    const exercise = createTodayExerciseFromTemplate(templateExercise)

    setWorkout((currentWorkout) => ({
      ...currentWorkout,
      exercises: [...currentWorkout.exercises, exercise],
    }))
    setOpenExercises((currentOpenExercises) => ({
      ...currentOpenExercises,
      [exercise.exerciseId]: true,
    }))
    setIsExerciseSelectorOpen(false)
    setExerciseSearch('')
  }

  const loadExampleWorkout = () => {
    const exampleWorkout = createExampleWorkout()
    const examplePreviousWorkout = createExamplePreviousWorkout()
    const historyWithoutExample = history.filter(
      (historyItem) => historyItem.id !== examplePreviousWorkout.id,
    )
    const updatedHistory = [examplePreviousWorkout, ...historyWithoutExample]

    setSelectedSessionId(exampleWorkout.sessionId)
    setHistory(updatedHistory)
    saveTrainingHistory(updatedHistory)
    setWorkout(exampleWorkout)
    setOpenExercises(
      Object.fromEntries(exampleWorkout.exercises.map((exercise) => [exercise.exerciseId, true])),
    )
    setMessage(
      'Ejemplo completo cargado con entreno actual y registro anterior para comparar en linea.',
    )
  }

  const removeExerciseOnlyToday = (exerciseId) => {
    setWorkout((currentWorkout) => ({
      ...currentWorkout,
      exercises: currentWorkout.exercises.filter((exercise) => exercise.exerciseId !== exerciseId),
    }))
  }

  const finishWorkout = async () => {
    if (!workout) return

    setIsSaving(true)
    setMessage('Enviando entreno al servidor...')

    const completedWorkout = {
      ...workout,
      completedAt: new Date().toISOString(),
    }

    try {
      const response = await fetch(TRAINING_SYNC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completedWorkout),
      })

      if (!response.ok) {
        throw new Error('El servidor no confirmo el guardado.')
      }

      const updatedHistory = [completedWorkout, ...history]

      saveTrainingHistory(updatedHistory)
      clearCurrentWorkout()
      setHistory(updatedHistory)
      setWorkout(null)
      setMessage('Servidor OK. Entreno guardado y borrador local limpiado.')
    } catch (error) {
      setMessage(`${error.message} El borrador sigue guardado en localStorage.`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100svh-73px)] flex-col">
      <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-8 pb-28 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-neon-cyan/30 bg-white p-5 shadow-glow-cyan transition-all duration-300 ease-out dark:bg-white/[0.04]">
          <div className="grid gap-4 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
                Entreno de hoy
              </p>
              <h1 className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                Registra lo que haces hoy, sin romper la plantilla.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                Selecciona una sesion base, ajusta series, reps, peso, altura o agarre solo
                para hoy. El ultimo registro del mismo ejercicio aparece al lado para comparar.
              </p>
            </div>

            <div className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
              <p>Entreno a realizar</p>
              <div className="rounded-lg border border-neon-cyan/40 bg-white/70 p-2 dark:bg-pes-black/40">
                <button
                  className="flex w-full items-center justify-between rounded-md border border-slate-200 bg-white px-4 py-3 text-left text-base font-bold text-slate-900 transition-all duration-300 ease-out hover:border-neon-pink dark:border-white/10 dark:bg-pes-black dark:text-white"
                  type="button"
                  onClick={() => setIsSessionSelectorOpen((current) => !current)}
                >
                  <span>{sessions.find((session) => session.id === selectedSessionId)?.name || '-- Seleccionar --'}</span>
                  <svg
                    className={`h-5 w-5 text-neon-cyan transition-transform duration-300 ${isSessionSelectorOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </button>

                {isSessionSelectorOpen ? (
                  <div className="mt-2 rounded-md border border-slate-200 bg-white/95 dark:border-white/10 dark:bg-pes-black/95">
                    <div className="border-b border-slate-200 p-2 dark:border-white/10">
                      <input
                        className="w-full rounded-md border border-neon-cyan/40 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-all duration-300 ease-out focus:border-neon-pink focus:shadow-glow-pink dark:bg-pes-black dark:text-white"
                        placeholder="Buscar entreno..."
                        value={sessionSearch}
                        onChange={(event) => setSessionSearch(event.target.value)}
                      />
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                      {filteredSessions.map((session) => (
                        <button
                          className={`w-full border-b border-slate-200 px-4 py-3 text-left text-sm font-semibold transition-all duration-200 last:border-b-0 dark:border-white/10 ${
                            selectedSessionId === session.id
                              ? 'bg-neon-cyan/15 text-neon-cyan'
                              : 'text-slate-800 hover:bg-neon-pink/10 hover:text-neon-pink dark:text-slate-200'
                          }`}
                          key={session.id}
                          type="button"
                          onClick={() => selectSession(session.id)}
                        >
                          {session.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-wrap justify-end gap-3">
          <button
            className="rounded-md border border-neon-cyan/50 px-4 py-3 text-sm font-bold text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:text-neon-cyan"
            type="button"
            onClick={loadExampleWorkout}
          >
            Cargar ejemplo
          </button>
          <button
            className="rounded-md border border-neon-purple/50 px-4 py-3 text-sm font-bold text-neon-purple shadow-glow-purple transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:text-neon-pink"
            type="button"
            onClick={() => setIsExerciseSelectorOpen((current) => !current)}
          >
            Anadir ejercicio solo hoy
          </button>
        </section>

        {isExerciseSelectorOpen ? (
          <section className="rounded-lg border border-neon-purple/30 bg-white p-3 shadow-glow-purple dark:bg-white/[0.04]">
            <div className="grid gap-2">
              <input
                className="w-full rounded-md border border-neon-cyan/40 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition-all duration-300 ease-out focus:border-neon-pink focus:shadow-glow-pink dark:bg-pes-black dark:text-white"
                placeholder="Buscar ejercicio para hoy..."
                value={exerciseSearch}
                onChange={(event) => setExerciseSearch(event.target.value)}
              />

              <div className="max-h-64 overflow-y-auto rounded-md border border-slate-200 dark:border-white/10">
                {addableExerciseTemplates.length > 0 ? (
                  addableExerciseTemplates.map((exercise) => (
                    <button
                      className="w-full border-b border-slate-200 px-4 py-3 text-left transition-all duration-200 last:border-b-0 hover:bg-neon-cyan/10 dark:border-white/10 dark:hover:bg-neon-purple/10"
                      key={exercise.id}
                      type="button"
                      onClick={() => addExerciseFromTemplate(exercise)}
                    >
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{exercise.name}</p>
                      <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                        {exercise.series}x{exercise.repetitions} · {exercise.weight}kg · {exercise.grip || 'Sin agarre'}
                      </p>
                    </button>
                  ))
                ) : (
                  <p className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                    No hay ejercicios disponibles con ese filtro.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  className="rounded-md border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 hover:border-neon-pink hover:text-neon-pink dark:border-white/10 dark:text-slate-300"
                  type="button"
                  onClick={() => setIsExerciseSelectorOpen(false)}
                >
                  Cerrar
                </button>
                <button
                  className="rounded-md border border-neon-cyan/50 px-3 py-2 text-xs font-bold text-neon-cyan hover:border-neon-pink hover:text-neon-pink"
                  type="button"
                  onClick={addExerciseOnlyToday}
                >
                  Crear ejercicio manual
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="grid gap-5">
          {workout?.exercises.map((exercise) => {
            const previousRecord = getLastExerciseRecord(exercise.exerciseId, history)
            const isExerciseOpen = openExercises[exercise.exerciseId] ?? true
            const setGroups = groupSetsBySetNumber(exercise.performedSets)

            return (
              <article
                className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_14px_36px_rgba(15,23,42,0.08)] transition-all duration-300 ease-out hover:border-neon-cyan/50 hover:shadow-glow-cyan dark:border-white/10 dark:bg-white/[0.04]"
                key={exercise.exerciseId}
              >
                <div className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between">
                  <button
                    className="flex min-w-0 flex-1 items-center gap-4 text-left"
                    type="button"
                    aria-expanded={isExerciseOpen}
                    onClick={() => toggleExercise(exercise.exerciseId)}
                  >
                    <span
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-neon-cyan/40 text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out dark:text-neon-cyan"
                      aria-hidden="true"
                    >
                      <svg
                        className={`h-5 w-5 transition-transform duration-300 ease-out ${isExerciseOpen ? 'rotate-180 text-neon-pink' : ''}`}
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
                    <span className="min-w-0">
                      <span className="block truncate text-xl font-black text-slate-950 dark:text-white">
                        {exercise.name}
                      </span>
                      <span className="mt-1 block text-sm text-slate-600 dark:text-slate-400">
                        {setGroups.length} series · {exercise.performedSets.length} tramos ·{' '}
                        {exercise.completed ? 'completado' : exercise.skipped ? 'omitido hoy' : 'activo'}
                      </span>
                    </span>
                  </button>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={Boolean(exercise.completed)}
                      title={exercise.completed ? 'Completado' : 'Pendiente'}
                      className="inline-flex items-center gap-2 rounded-md border border-[#39ff14]/50 px-3 py-2 text-sm font-black text-[#39ff14] shadow-[0_0_16px_rgba(57,255,20,0.28)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(57,255,20,0.45)]"
                      onClick={() => toggleExerciseCompleted(exercise.exerciseId)}
                    >
                      <span
                        className={`relative h-6 w-11 rounded-full border transition-all duration-300 ease-out ${
                          exercise.completed
                            ? 'border-[#39ff14]/80 bg-[#39ff14]/30 shadow-[0_0_14px_rgba(57,255,20,0.45)]'
                            : 'border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700'
                        }`}
                      >
                        <span
                          className={`absolute left-0.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full transition-all duration-300 ease-out ${
                            exercise.completed
                              ? 'translate-x-5 bg-[#39ff14] text-pes-black'
                              : 'translate-x-0 bg-white text-slate-500 dark:bg-slate-200 dark:text-slate-600'
                          }`}
                        >
                          {exercise.completed ? (
                            <svg
                              className="h-3 w-3"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                          ) : (
                            <svg
                              className="h-3 w-3"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M18 6 6 18" />
                              <path d="m6 6 12 12" />
                            </svg>
                          )}
                        </span>
                      </span>
                      Completado
                    </button>
                    <button
                      className="rounded-md border border-neon-pink/50 px-3 py-2 text-sm font-bold text-neon-pink shadow-glow-pink transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:text-neon-purple hover:shadow-glow-purple"
                      type="button"
                      onClick={() =>
                        updateExercise(exercise.exerciseId, 'skipped', !exercise.skipped)
                      }
                    >
                      {exercise.skipped ? 'Reactivar' : 'No hacer hoy'}
                    </button>
                    <button
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:border-white/10 dark:text-slate-400"
                      type="button"
                      onClick={() => removeExerciseOnlyToday(exercise.exerciseId)}
                    >
                      Quitar
                    </button>
                  </div>
                </div>

                <div
                  className={`grid transition-[grid-template-rows] duration-500 ease-out ${
                    isExerciseOpen && !exercise.completed ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="grid gap-4 border-t border-slate-200 p-5 dark:border-white/10">
                      <div>
                        <input
                          className="w-full bg-transparent text-xl font-black text-slate-950 outline-none transition-all duration-300 ease-out focus:text-neon-purple dark:text-white dark:focus:text-neon-pink"
                          value={exercise.name}
                          onChange={(event) =>
                            updateExercise(exercise.exerciseId, 'name', event.target.value)
                          }
                        />
                        <input
                          className="mt-2 w-full bg-transparent text-sm text-slate-600 outline-none transition-all duration-300 ease-out focus:text-neon-purple dark:text-slate-400 dark:focus:text-neon-cyan"
                          value={exercise.description}
                          placeholder="Descripcion"
                          onChange={(event) =>
                            updateExercise(exercise.exerciseId, 'description', event.target.value)
                          }
                        />
                      </div>

                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[90px_90px_120px_minmax(150px,1fr)]">
                      <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Series base
                        <input
                          className={numberInputClass}
                          type="number"
                          min="0"
                          max="99"
                          value={exercise.plannedSeries}
                          onChange={(event) =>
                            updateExercise(
                              exercise.exerciseId,
                              'plannedSeries',
                              event.target.value,
                            )
                          }
                        />
                      </label>
                      <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Reps base
                        <input
                          className={numberInputClass}
                          type="number"
                          min="0"
                          max="99"
                          value={exercise.plannedRepetitions}
                          onChange={(event) =>
                            updateExercise(
                              exercise.exerciseId,
                              'plannedRepetitions',
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
                            updateExercise(exercise.exerciseId, 'benchHeight', event.target.value)
                          }
                        />
                      </label>
                      <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Agarre
                        <input
                          className={`${textInputClass} min-w-36`}
                          value={exercise.grip}
                          onChange={(event) =>
                            updateExercise(exercise.exerciseId, 'grip', event.target.value)
                          }
                        />
                      </label>
                    </div>

                    <div className="grid gap-2 rounded-lg border border-neon-purple/30 bg-slate-50 p-3 text-xs text-slate-600 shadow-glow-purple dark:bg-pes-black/60 dark:text-slate-400 sm:grid-cols-3">
                      <p>
                        <span className="font-bold text-slate-950 dark:text-white">
                          Anterior:
                        </span>{' '}
                        {previousRecord
                          ? `${new Date(previousRecord.completedAt).toLocaleDateString('es-ES')} · ${previousRecord.sessionName}`
                          : 'Sin registro previo'}
                      </p>
                      <p>
                        <span className="font-bold text-slate-950 dark:text-white">
                          Banco:
                        </span>{' '}
                        {previousRecord?.benchHeight || '-'}
                      </p>
                      <p>
                        <span className="font-bold text-slate-950 dark:text-white">
                          Agarre:
                        </span>{' '}
                        {previousRecord?.grip || '-'}
                      </p>
                    </div>

                    <div className="grid gap-3">
                      {groupSetsBySetNumber(exercise.performedSets).map((setGroup) => {
                        const previousSets = getPreviousSetsBySetNumber(
                          previousRecord,
                          setGroup.setNumber,
                        )
                        const hasPreviousWeightChange =
                          previousSets.length > 1 && hasMultipleWeights(previousSets)
                        const hasCurrentWeightChange =
                          setGroup.sets.length > 1 && hasMultipleWeights(setGroup.sets)
                        const lastSetInGroup = setGroup.sets[setGroup.sets.length - 1]

                        return (
                          <div
                            className="rounded-lg border border-slate-200 p-3 transition-all duration-300 ease-out hover:border-neon-purple/50 hover:shadow-glow-purple dark:border-white/10"
                            key={setGroup.setNumber}
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-bold text-neon-purple dark:text-neon-cyan">
                                  Serie {setGroup.setNumber}
                                </p>
                                {hasCurrentWeightChange ? (
                                  <span className="rounded-full border border-neon-cyan/40 px-2 py-1 text-xs font-bold text-neon-cyan shadow-glow-cyan">
                                    Varios pesos hoy
                                  </span>
                                ) : null}
                                {hasPreviousWeightChange ? (
                                  <span className="rounded-full border border-neon-pink/50 px-2 py-1 text-xs font-bold text-neon-pink shadow-glow-pink">
                                    Mas de un peso anterior
                                  </span>
                                ) : null}
                              </div>

                              <button
                                className="w-fit rounded-md border border-neon-cyan/50 px-3 py-2 text-sm font-bold text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:text-neon-cyan"
                                type="button"
                                onClick={() => addWeightStep(exercise.exerciseId, lastSetInGroup)}
                              >
                                Otro peso en serie {setGroup.setNumber}
                              </button>
                            </div>

                            <div className="mt-3 grid gap-2">
                              {setGroup.sets.map((set, setIndex) => (
                                <div
                                  className="grid gap-3 rounded-md border border-slate-200/80 bg-slate-50/70 p-3 md:grid-cols-[90px_100px_150px_96px] md:items-end dark:border-white/10 dark:bg-pes-black/50"
                                  key={set.id}
                                >
                                  <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    Reps hechas
                                    <input
                                      className={numberInputClass}
                                      type="number"
                                      min="0"
                                      max="99"
                                      value={set.reps}
                                      onChange={(event) =>
                                        updateSet(
                                          exercise.exerciseId,
                                          set.id,
                                          'reps',
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </label>
                                  <label className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    Peso
                                    <input
                                      className={weightInputClass}
                                      type="number"
                                      min="0"
                                      max="999"
                                      value={set.weight}
                                      onChange={(event) =>
                                        updateSet(
                                          exercise.exerciseId,
                                          set.id,
                                          'weight',
                                          event.target.value,
                                        )
                                      }
                                    />
                                  </label>
                                  <div className="grid gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400">
                                    Anterior
                                    <div className="flex min-h-10 items-center rounded-md border border-neon-purple/30 bg-white px-3 py-2 text-sm font-bold text-slate-950 shadow-[0_0_18px_rgba(105,0,255,0.12)] dark:bg-pes-black/70 dark:text-neon-pink">
                                      {formatPreviousSet(previousSets[setIndex])}
                                    </div>
                                  </div>
                                  <button
                                    className="w-24 rounded-md border border-slate-300 px-3 py-2 text-sm font-bold text-slate-600 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:border-white/10 dark:text-slate-400"
                                    type="button"
                                    onClick={() => removeSet(exercise.exerciseId, set.id)}
                                  >
                                    Borrar
                                  </button>
                                </div>
                              ))}
                              {previousSets.length > setGroup.sets.length ? (
                                <div className="rounded-md border border-neon-pink/30 px-3 py-2 text-sm text-neon-pink shadow-[0_0_18px_rgba(255,102,255,0.12)]">
                                  La sesion anterior tuvo {previousSets.length} tramos en esta
                                  serie:{' '}
                                  {previousSets
                                    .map((previousSet) => formatPreviousSet(previousSet))
                                    .join(' + ')}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    <button
                      className="w-fit rounded-md border border-neon-cyan/50 px-4 py-3 text-sm font-bold text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:text-neon-cyan"
                      type="button"
                      onClick={() => addSet(exercise.exerciseId)}
                    >
                      Anadir serie
                    </button>
                  </div>
                  </div>
                </div>
              </article>
            )
          })}
        </section>
      </main>

      <Footer
        actionLabel="Finalizar y enviar"
        disabled={!workout || isSaving}
        isLoading={isSaving}
        message={message}
        onAction={finishWorkout}
      />
    </div>
  )
}

export default Entreno
