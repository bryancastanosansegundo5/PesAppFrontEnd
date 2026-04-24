const SESSIONS_KEY = 'pesapp-training-sessions'
const CURRENT_WORKOUT_KEY = 'pesapp-current-workout'
const HISTORY_KEY = 'pesapp-training-history'

export const TRAINING_SYNC_ENDPOINT = '/api/trainings'
export const SESSION_TEMPLATES_SYNC_ENDPOINT = '/api/sesiones-entrenamiento'

export const defaultSessions = [
  {
    id: 'push-session',
    name: 'Empuje',
    exercises: [
      {
        id: 'bench-press',
        name: 'Press banca',
        description: 'Press horizontal controlando bajada y bloqueo.',
        series: 4,
        repetitions: 12,
        weight: 60,
        benchHeight: 4,
        grip: 'Medio',
      },
      {
        id: 'shoulder-press',
        name: 'Press hombro',
        description: 'Empuje vertical sin arquear la espalda.',
        series: 3,
        repetitions: 10,
        weight: 22,
        benchHeight: 7,
        grip: 'Neutro',
      },
    ],
  },
  {
    id: 'pull-session',
    name: 'Tiron',
    exercises: [
      {
        id: 'lat-pulldown',
        name: 'Jalon al pecho',
        description: 'Tirar hacia clavicula manteniendo pecho alto.',
        series: 4,
        repetitions: 10,
        weight: 55,
        benchHeight: 2,
        grip: 'Prono',
      },
      {
        id: 'seated-row',
        name: 'Remo sentado',
        description: 'Remar con pausa corta al final del recorrido.',
        series: 4,
        repetitions: 12,
        weight: 48,
        benchHeight: 3,
        grip: 'Cerrado',
      },
    ],
  },
]

const defaultHistory = [
  {
    id: 'sample-history-1',
    sessionId: 'push-session',
    sessionName: 'Empuje',
    completedAt: '2026-04-20T18:30:00.000Z',
    exercises: [
      {
        exerciseId: 'bench-press',
        name: 'Press banca',
        benchHeight: 4,
        grip: 'Medio',
        performedSets: [
          { id: 'set-1', reps: 12, weight: 60 },
          { id: 'set-2', reps: 10, weight: 60 },
          { id: 'set-2-drop-1', reps: 3, weight: 55 },
          { id: 'set-3', reps: 9, weight: 57.5 },
          { id: 'set-4', reps: 8, weight: 55 },
        ],
      },
      {
        exerciseId: 'shoulder-press',
        name: 'Press hombro',
        benchHeight: 7,
        grip: 'Neutro',
        performedSets: [
          { id: 'set-1', reps: 10, weight: 22 },
          { id: 'set-2', reps: 10, weight: 22 },
          { id: 'set-3', reps: 8, weight: 20 },
        ],
      },
    ],
  },
]

function readJson(key, fallback) {
  try {
    const value = window.localStorage.getItem(key)
    return value ? JSON.parse(value) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  window.localStorage.setItem(key, JSON.stringify(value))
}

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export function getSessions() {
  const sessions = readJson(SESSIONS_KEY, null)

  if (Array.isArray(sessions) && sessions.length > 0) {
    return sessions
  }

  writeJson(SESSIONS_KEY, defaultSessions)
  return defaultSessions
}

export function saveSessions(sessions) {
  writeJson(SESSIONS_KEY, sessions)
}

export function createEmptySession() {
  return {
    id: createId('session'),
    name: 'Nueva sesion',
    exercises: [],
  }
}

export function createEmptyExercise() {
  return {
    id: createId('exercise'),
    name: 'Nuevo ejercicio',
    description: '',
    series: 4,
    repetitions: 10,
    weight: 0,
    benchHeight: '',
    grip: '',
  }
}

export function getCurrentWorkout() {
  return readJson(CURRENT_WORKOUT_KEY, null)
}

export function saveCurrentWorkout(workout) {
  writeJson(CURRENT_WORKOUT_KEY, workout)
}

export function clearCurrentWorkout() {
  window.localStorage.removeItem(CURRENT_WORKOUT_KEY)
}

export function getTrainingHistory() {
  const history = readJson(HISTORY_KEY, null)

  if (Array.isArray(history)) {
    return history
  }

  writeJson(HISTORY_KEY, defaultHistory)
  return defaultHistory
}

export function saveTrainingHistory(history) {
  writeJson(HISTORY_KEY, history)
}

export function createWorkoutFromSession(session) {
  return {
    id: createId('workout'),
    sessionId: session.id,
    sessionName: session.name,
    startedAt: new Date().toISOString(),
    exercises: session.exercises.map((exercise) => ({
      exerciseId: exercise.id,
      name: exercise.name,
      description: exercise.description,
      plannedSeries: Number(exercise.series) || 0,
      plannedRepetitions: Number(exercise.repetitions) || 0,
      plannedWeight: Number(exercise.weight) || 0,
      benchHeight: exercise.benchHeight,
      grip: exercise.grip,
      skipped: false,
      performedSets: Array.from({ length: Number(exercise.series) || 0 }, (_, index) => ({
        id: createId(`set-${index + 1}`),
        setNumber: index + 1,
        reps: Number(exercise.repetitions) || 0,
        weight: Number(exercise.weight) || 0,
      })),
    })),
  }
}

export function getLastExerciseRecord(exerciseId, history) {
  const sortedHistory = [...history].sort(
    (first, second) => new Date(second.completedAt) - new Date(first.completedAt),
  )

  for (const session of sortedHistory) {
    const exercise = session.exercises.find((item) => item.exerciseId === exerciseId)

    if (exercise) {
      return {
        ...exercise,
        completedAt: session.completedAt,
        sessionName: session.sessionName,
      }
    }
  }

  return null
}
