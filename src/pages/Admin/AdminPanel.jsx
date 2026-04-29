import { useEffect, useMemo, useRef, useState } from 'react'
import Toast from '../../components/Toast/Toast'
import {
  cambiarEstadoUsuarioAdmin,
  cambiarRolUsuarioAdmin,
  crearUsuarioAdmin,
  obtenerRolesUsuario,
  obtenerUsuariosAdmin,
} from '../../services/admin/adminUsersApiService'
import {
  crearIdeaAdminVacia,
  normalizarIdeaAdmin,
} from '../../services/admin/adminIdeasModel'
import {
  cambiarEstadoIdeaAdminConRespaldo,
  recargarIdeasAdminConSincronizacion,
  sincronizarIdeasAdminPendientes,
} from '../../services/admin/adminIdeasDataService'
import { guardarIdeasAdminGuardadas } from '../../services/storage/adminIdeasStorage'
import {
  validarEmailOpcional,
  validarPassword,
  validarUsername,
} from '../../services/auth/authValidation'

const claseInput =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-pes-black dark:text-white'

const formularioInicial = {
  nombre: '',
  email: '',
  username: '',
  password: '',
  rol: 'USUARIO',
}

const claseInputArea =
  'min-h-28 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-pes-black dark:text-white'

const estadoIdeaInicial = {}

function formatearRol(rol) {
  if (rol === 'ADMIN') return 'Administrador'
  if (rol === 'COACH') return 'Coach'
  if (rol === 'USUARIO') return 'Usuario'

  return rol || 'Sin rol'
}

function formatearFecha(valor) {
  if (!valor) {
    return 'Sin fecha'
  }

  const fecha = new Date(valor)

  if (Number.isNaN(fecha.getTime())) {
    return valor
  }

  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(fecha)
}

function reemplazarUsuario(usuarios, usuarioActualizado) {
  return usuarios.map((usuario) =>
    usuario.id === usuarioActualizado.id ? usuarioActualizado : usuario,
  )
}

function ordenarUsuarios(usuarios) {
  return [...usuarios].sort((usuarioA, usuarioB) => usuarioA.id - usuarioB.id)
}

function obtenerNombreVisibleUsuario(usuario) {
  return usuario?.username || usuario?.nombre || usuario?.email || 'Usuario'
}

function reemplazarIdea(ideas, ideaOriginal, ideaActualizada) {
  return ideas.map((idea) => {
    const coincidePorId = idea.id === ideaOriginal.id
    const coincidePorClientId = ideaOriginal.clientId && idea.clientId === ideaOriginal.clientId

    return coincidePorId || coincidePorClientId ? normalizarIdeaAdmin(ideaActualizada) : idea
  })
}

function quitarEstadoPendienteIdea(idea) {
  return {
    ...idea,
    syncStatus: 'synced',
    syncError: '',
    lastSyncAttemptAt: '',
    updatedAt: new Date().toISOString(),
  }
}

function AdminPanel({ usuarioActual }) {
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [ideas, setIdeas] = useState([])
  const [ideasAbiertas, setIdeasAbiertas] = useState({})
  const [estadoIdeas, setEstadoIdeas] = useState(estadoIdeaInicial)
  const [formulario, setFormulario] = useState(formularioInicial)
  const [estaCargando, setEstaCargando] = useState(true)
  const [estaCargandoIdeas, setEstaCargandoIdeas] = useState(true)
  const [estaGuardando, setEstaGuardando] = useState(false)
  const [accionUsuarioId, setAccionUsuarioId] = useState(null)
  const [errorCarga, setErrorCarga] = useState('')
  const [errorIdeas, setErrorIdeas] = useState('')
  const [errorFormulario, setErrorFormulario] = useState('')
  const [estaRecargandoIdeas, setEstaRecargandoIdeas] = useState(false)
  const [estaAbiertoModalPendientesIdeas, setEstaAbiertoModalPendientesIdeas] = useState(false)
  const [estaSincronizandoIdeasPendientes, setEstaSincronizandoIdeasPendientes] = useState(false)
  const [ideaPendienteEliminandoId, setIdeaPendienteEliminandoId] = useState('')
  const [ideaPendienteQuitar, setIdeaPendienteQuitar] = useState(null)
  const [toast, setToast] = useState(null)
  const sincronizacionIdeasActivaRef = useRef(null)
  const ultimoEventoConexionRef = useRef(0)

  useEffect(() => {
    const cargarDatos = async () => {
      setEstaCargando(true)
      setEstaCargandoIdeas(true)
      setErrorCarga('')
      setErrorIdeas('')

      try {
        const [usuariosCargados, rolesCargados] = await Promise.all([
          obtenerUsuariosAdmin(),
          obtenerRolesUsuario(),
        ])

        setUsuarios(ordenarUsuarios(usuariosCargados))
        setRoles(rolesCargados)
        setFormulario((estadoActual) => ({
          ...estadoActual,
          rol: rolesCargados[0] || estadoActual.rol,
        }))
      } catch (errorCapturado) {
        setErrorCarga(errorCapturado.message || 'No se pudieron cargar los usuarios.')
      } finally {
        setEstaCargando(false)
      }

      try {
        const resultadoIdeas = await recargarIdeasAdminConSincronizacion()
        setIdeas(resultadoIdeas.ideas)
        setIdeasAbiertas(
          Object.fromEntries(resultadoIdeas.ideas.map((idea, indice) => [idea.id, indice === 0])),
        )
      } catch (errorCapturado) {
        setErrorIdeas(errorCapturado.message || 'No se pudieron cargar las ideas.')
      } finally {
        setEstaCargandoIdeas(false)
      }
    }

    cargarDatos()
  }, [])

  const publicarToast = (mensaje, tipo = 'info') => {
    setToast((toastActual) => ({
      id: (toastActual?.id || 0) + 1,
      mensaje,
      tipo,
    }))
  }

  const manejarCambioFormulario = (campo, valor) => {
    if (errorFormulario) {
      setErrorFormulario('')
    }

    setFormulario((estadoActual) => ({
      ...estadoActual,
      [campo]: valor,
    }))
  }

  const manejarAltaUsuario = async (event) => {
    event.preventDefault()
    setErrorFormulario('')

    const nombre = formulario.nombre.trim()
    const email = formulario.email.trim()
    const username = formulario.username.trim()
    const password = formulario.password

    if (!nombre) {
      setErrorFormulario('Debes indicar un nombre para crear la cuenta.')
      return
    }

    const errorUsername = validarUsername(username)

    if (errorUsername) {
      setErrorFormulario(errorUsername)
      return
    }

    const errorEmail = validarEmailOpcional(email)

    if (errorEmail) {
      setErrorFormulario(errorEmail)
      return
    }

    const errorPassword = validarPassword(password)

    if (errorPassword) {
      setErrorFormulario(errorPassword)
      return
    }

    setEstaGuardando(true)

    try {
      const usuarioCreado = await crearUsuarioAdmin({
        nombre,
        email,
        username,
        password,
        rol: formulario.rol,
      })

      setUsuarios((estadoActual) => ordenarUsuarios([...estadoActual, usuarioCreado]))
      setFormulario({
        ...formularioInicial,
        rol: roles[0] || formularioInicial.rol,
      })
      publicarToast(`Usuario ${obtenerNombreVisibleUsuario(usuarioCreado)} creado correctamente.`)
    } catch (errorCapturado) {
      publicarToast(errorCapturado.message || 'No se pudo crear el usuario.', 'error')
    } finally {
      setEstaGuardando(false)
    }
  }

  const manejarCambioRol = async (usuario, nuevoRol) => {
    if (usuario.rol === nuevoRol) {
      return
    }

    setAccionUsuarioId(usuario.id)

    try {
      const usuarioActualizado = await cambiarRolUsuarioAdmin(usuario.id, nuevoRol)
      setUsuarios((estadoActual) => reemplazarUsuario(estadoActual, usuarioActualizado))
      publicarToast(`Rol actualizado para ${obtenerNombreVisibleUsuario(usuario)}.`)
    } catch (errorCapturado) {
      publicarToast(errorCapturado.message || 'No se pudo actualizar el rol.', 'error')
    } finally {
      setAccionUsuarioId(null)
    }
  }

  const manejarCambioEstado = async (usuario) => {
    setAccionUsuarioId(usuario.id)

    try {
      const usuarioActualizado = await cambiarEstadoUsuarioAdmin(usuario.id, !usuario.activo)
      setUsuarios((estadoActual) => reemplazarUsuario(estadoActual, usuarioActualizado))
      publicarToast(
        usuarioActualizado.activo
          ? `Acceso concedido a ${obtenerNombreVisibleUsuario(usuario)}.`
          : `Acceso denegado a ${obtenerNombreVisibleUsuario(usuario)}.`,
      )
    } catch (errorCapturado) {
      publicarToast(errorCapturado.message || 'No se pudo cambiar el estado.', 'error')
    } finally {
      setAccionUsuarioId(null)
    }
  }

  const ideasPendientes = useMemo(
    () => ideas.filter((idea) => idea.syncStatus === 'pending'),
    [ideas],
  )
  const ideasVisibles = useMemo(() => ideas.filter((idea) => idea.activo !== false), [ideas])

  const totalIdeasCompletadas = ideasVisibles.filter((idea) => idea.completada).length
  const totalIdeasActivas = ideasVisibles.length

  const persistirIdeas = (ideasSiguientes) => {
    const ideasGuardadas = guardarIdeasAdminGuardadas(ideasSiguientes)
    setIdeas(ideasGuardadas)
    return ideasGuardadas
  }

  const alternarIdea = (idIdea) => {
    setIdeasAbiertas((estadoActual) => ({
      ...estadoActual,
      [idIdea]: !estadoActual[idIdea],
    }))
  }

  const crearNuevaIdea = () => {
    const nuevaIdea = crearIdeaAdminVacia()
    const ideasSiguientes = persistirIdeas([nuevaIdea, ...ideas])

    setIdeasAbiertas((estadoActual) => ({
      ...estadoActual,
      [nuevaIdea.id]: true,
    }))
    setEstadoIdeas((estadoActual) => ({
      ...estadoActual,
      [nuevaIdea.id]: { state: 'draft', text: 'Idea nueva guardada en local y pendiente.' },
    }))
    publicarToast(
      ideasSiguientes.length === 1
        ? 'Primera idea creada en local.'
        : 'Nueva idea creada y marcada como pendiente.',
    )
  }

  const actualizarIdea = (idIdea, campo, valor) => {
    setIdeas((ideasActuales) => {
      const ideasSiguientes = ideasActuales.map((idea) =>
        idea.id === idIdea
          ? normalizarIdeaAdmin({
              ...idea,
              [campo]: valor,
              syncStatus: 'pending',
              syncError: '',
              lastSyncAttemptAt: '',
              updatedAt: new Date().toISOString(),
            })
          : idea,
      )

      return guardarIdeasAdminGuardadas(ideasSiguientes)
    })

    setEstadoIdeas((estadoActual) => ({
      ...estadoActual,
      [idIdea]: { state: 'draft', text: 'Cambios guardados en local. Falta sincronizar.' },
    }))
  }

  const alternarEstadoActivoIdea = async (idea) => {
    const ideaActualizada = normalizarIdeaAdmin({
      ...idea,
      activo: !idea.activo,
      syncStatus: 'pending',
      syncError: '',
      lastSyncAttemptAt: '',
      updatedAt: new Date().toISOString(),
    })

    const ideasLocales = persistirIdeas(reemplazarIdea(ideas, idea, ideaActualizada))
    setEstadoIdeas((estadoActual) => ({
      ...estadoActual,
      [idea.id]: { state: 'saving', text: ideaActualizada.activo ? 'Reactivando...' : 'Quitando...' },
    }))

    try {
      const resultado = await cambiarEstadoIdeaAdminConRespaldo(ideaActualizada)
      const ideasSiguientes = persistirIdeas(reemplazarIdea(ideasLocales, ideaActualizada, resultado.idea))

      setEstadoIdeas((estadoActual) => ({
        ...estadoActual,
        [idea.id]: {
          state: resultado.pendiente ? 'draft' : 'saved',
          text: resultado.pendiente
            ? `${resultado.error?.message || 'No se pudo sincronizar ahora.'} El cambio queda pendiente en local.`
            : ideaActualizada.activo
              ? 'Idea reactivada en el servidor.'
              : 'Idea quitada de forma logica en el servidor.',
        },
      }))

      publicarToast(
        resultado.pendiente
          ? `${resultado.error?.message || 'No se pudo sincronizar ahora.'} El cambio queda en cola.`
          : ideaActualizada.activo
            ? 'Idea reactivada correctamente.'
            : 'Idea quitada correctamente.',
        resultado.pendiente ? 'error' : 'info',
      )

      setIdeas(ideasSiguientes)
    } catch (errorCapturado) {
      setEstadoIdeas((estadoActual) => ({
        ...estadoActual,
        [idea.id]: {
          state: 'error',
          text: `${errorCapturado.message} El cambio se mantiene pendiente en local.`,
        },
      }))
    }
  }

  const abrirConfirmacionQuitarIdea = (idea) => {
    setIdeaPendienteQuitar(idea)
  }

  const cerrarConfirmacionQuitarIdea = () => {
    setIdeaPendienteQuitar(null)
  }

  const confirmarQuitarIdea = async () => {
    if (!ideaPendienteQuitar) {
      return
    }

    await alternarEstadoActivoIdea(ideaPendienteQuitar)
    setIdeaPendienteQuitar(null)
  }

  const guardarIdea = async (idea) => {
    setEstadoIdeas((estadoActual) => ({
      ...estadoActual,
      [idea.id]: { state: 'saving', text: 'Guardando...' },
    }))

    try {
      const resultado = await sincronizarIdeasAdminPendientes()
      const ideasSiguientes = resultado?.ideas || ideas

      setIdeas(ideasSiguientes)
      setIdeasAbiertas((estadoActual) =>
        Object.fromEntries(ideasSiguientes.map((ideaActual) => [ideaActual.id, Boolean(estadoActual[ideaActual.id])])),
      )
      setEstadoIdeas((estadoActual) => ({
        ...estadoActual,
        [idea.id]: {
          state: 'saved',
          text:
            resultado?.sincronizados > 0
              ? 'Idea sincronizada con el servidor.'
              : resultado?.error
                ? `${resultado.error.message} La idea sigue pendiente en local.`
                : 'No habia cambios pendientes que subir.',
        },
      }))
    } catch (errorCapturado) {
      setEstadoIdeas((estadoActual) => ({
        ...estadoActual,
        [idea.id]: {
          state: 'error',
          text: `${errorCapturado.message} La idea se mantiene pendiente en local.`,
        },
      }))
    }
  }

  const sincronizarPendientesIdeas = async () => {
    if (sincronizacionIdeasActivaRef.current) {
      return sincronizacionIdeasActivaRef.current
    }

    sincronizacionIdeasActivaRef.current = sincronizarIdeasAdminPendientes().finally(() => {
      sincronizacionIdeasActivaRef.current = null
    })

    return sincronizacionIdeasActivaRef.current
  }

  const sincronizarPendientesIdeasAhora = async () => {
    setEstaSincronizandoIdeasPendientes(true)

    try {
      const resultado = await sincronizarPendientesIdeas()

      if (!resultado) {
        return
      }

      setIdeas(resultado.ideas)
      setIdeasAbiertas((estadoActual) =>
        Object.fromEntries(
          resultado.ideas.map((idea) => [idea.id, Boolean(estadoActual[idea.id])]),
        ),
      )
      setEstadoIdeas({})

      if (resultado.sincronizados > 0) {
        publicarToast(`Se sincronizaron ${resultado.sincronizados} ideas pendientes.`)
      } else if (resultado.error) {
        publicarToast(
          `${resultado.error.message} Las ideas siguen guardadas en local.`,
          'error',
        )
      } else {
        publicarToast('No habia ideas pendientes de sincronizar.')
      }
    } catch (errorCapturado) {
      publicarToast(
        `${errorCapturado.message} Las ideas pendientes siguen guardadas en local.`,
        'error',
      )
    } finally {
      setEstaSincronizandoIdeasPendientes(false)
    }
  }

  const recargarIdeas = async () => {
    setEstaRecargandoIdeas(true)
    setErrorIdeas('')

    try {
      const resultado = await recargarIdeasAdminConSincronizacion()
      setIdeas(resultado.ideas)
      setIdeasAbiertas(
        Object.fromEntries(resultado.ideas.map((idea, indice) => [idea.id, indice === 0])),
      )
      setEstadoIdeas({})
      publicarToast(
        resultado.sincronizados > 0
          ? `Se sincronizaron ${resultado.sincronizados} ideas pendientes y se recargo la lista.`
          : 'Ideas recargadas desde la base de datos.',
      )
    } catch (errorCapturado) {
      setErrorIdeas(errorCapturado.message || 'No se pudieron recargar las ideas.')
    } finally {
      setEstaRecargandoIdeas(false)
    }
  }

  const quitarIdeaDeLaCola = async (ideaPendiente) => {
    setIdeaPendienteEliminandoId(ideaPendiente.id)

    try {
      const ideasSiguientes = persistirIdeas(
        ideas.map((idea) =>
          idea.id === ideaPendiente.id ? quitarEstadoPendienteIdea(idea) : idea,
        ),
      )
      setIdeas(ideasSiguientes)
      setEstadoIdeas((estadoActual) => {
        const siguienteEstado = { ...estadoActual }
        delete siguienteEstado[ideaPendiente.id]
        return siguienteEstado
      })
      publicarToast(
        'La idea sigue en local y ya no se sincronizara automaticamente.',
      )
    } catch (errorCapturado) {
      publicarToast(`${errorCapturado.message} No se pudo quitar de la cola.`, 'error')
    } finally {
      setIdeaPendienteEliminandoId('')
    }
  }

  useEffect(() => {
    let cancelado = false

    const sincronizarAlRecuperarConexion = async () => {
      const ahora = Date.now()

      if (ahora - ultimoEventoConexionRef.current < 1200) {
        return
      }

      ultimoEventoConexionRef.current = ahora

      try {
        const resultado = await sincronizarPendientesIdeas()

        if (cancelado || !resultado) {
          return
        }

        setIdeas(resultado.ideas)
        setIdeasAbiertas((estadoActual) =>
          Object.fromEntries(
            resultado.ideas.map((idea) => [idea.id, Boolean(estadoActual[idea.id])]),
          ),
        )
        setEstadoIdeas({})

        if (resultado.sincronizados > 0) {
          publicarToast(`Se sincronizaron ${resultado.sincronizados} ideas pendientes.`)
        }
      } catch {
        if (cancelado) {
          return
        }
      }
    }

    window.addEventListener('online', sincronizarAlRecuperarConexion)
    window.addEventListener('pesapp:server-reachable', sincronizarAlRecuperarConexion)

    return () => {
      cancelado = true
      window.removeEventListener('online', sincronizarAlRecuperarConexion)
      window.removeEventListener('pesapp:server-reachable', sincronizarAlRecuperarConexion)
    }
  }, [])

  const totalActivos = usuarios.filter((usuario) => usuario.activo).length
  const totalInactivos = usuarios.length - totalActivos

  return (
    <>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-white/[0.04]">
            <div className="space-y-4">
              <p className="inline-flex rounded-full border border-neon-cyan/35 bg-white px-4 py-2 text-sm font-semibold text-neon-purple shadow-glow-cyan dark:bg-white/5 dark:text-neon-cyan">
                Administracion
              </p>
              <div>
                <h1 className="text-3xl font-black text-slate-950 sm:text-4xl dark:text-white">
                  Gestiona usuarios, roles y acceso a la app.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Desde aqui puedes dar de alta nuevas cuentas, asignar su rol y aplicar un
                  borrado logico usando el estado activo sin eliminar nada de la base de datos.
                  Por norma general trabajaremos con username y el email quedara como dato
                  opcional de apoyo.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-neon-cyan/25 bg-slate-50/80 p-4 dark:bg-[#080B14]">
                <p className="text-xs font-semibold uppercase tracking-wide text-neon-cyan">
                  Usuarios
                </p>
                <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                  {usuarios.length}
                </p>
              </div>
              <div className="rounded-2xl border border-neon-purple/25 bg-slate-50/80 p-4 dark:bg-[#080B14]">
                <p className="text-xs font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-pink">
                  Activos
                </p>
                <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                  {totalActivos}
                </p>
              </div>
              <div className="rounded-2xl border border-neon-pink/25 bg-slate-50/80 p-4 dark:bg-[#080B14]">
                <p className="text-xs font-semibold uppercase tracking-wide text-neon-pink">
                  Inactivos
                </p>
                <p className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                  {totalInactivos}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-neon-purple/20 bg-slate-50/80 p-4 dark:bg-[#080B14]">
              <p className="text-xs font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
                Ideas administrativas
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Total</p>
                  <p className="text-2xl font-black text-slate-950 dark:text-white">
                    {ideasVisibles.length}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Activas</p>
                  <p className="text-2xl font-black text-slate-950 dark:text-white">
                    {totalIdeasActivas}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Completadas</p>
                  <p className="text-2xl font-black text-slate-950 dark:text-white">
                    {totalIdeasCompletadas}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                Pendientes sync: {ideasPendientes.length}
              </p>
            </div>
          </article>

          <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
                Alta de usuario
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                Crear nueva cuenta
              </h2>
            </div>

            <form className="grid gap-4" onSubmit={manejarAltaUsuario}>
              <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Nombre
                <input
                  className={claseInput}
                  type="text"
                  value={formulario.nombre}
                  onChange={(event) => manejarCambioFormulario('nombre', event.target.value)}
                  placeholder="Nombre completo"
                  maxLength={120}
                  required
                />
              </label>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Username
                  <input
                    className={claseInput}
                    type="text"
                    value={formulario.username}
                    onChange={(event) => manejarCambioFormulario('username', event.target.value)}
                    placeholder="bryan"
                    minLength={3}
                    maxLength={60}
                    pattern="[A-Za-z0-9._-]{3,60}"
                    autoComplete="username"
                    required
                  />
                </label>

                <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Email (opcional)
                  <input
                    className={claseInput}
                    type="email"
                    value={formulario.email}
                    onChange={(event) => manejarCambioFormulario('email', event.target.value)}
                    placeholder="usuario@pesapp.local"
                    autoComplete="email"
                    maxLength={180}
                  />
                </label>
              </div>

              <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
                El username es obligatorio y sera el identificador principal para acceso y
                gestion. Debe tener entre 3 y 60 caracteres y solo usar letras, numeros, punto,
                guion o guion bajo. El email queda como dato opcional de apoyo.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Rol
                  <select
                    className={claseInput}
                    value={formulario.rol}
                    onChange={(event) => manejarCambioFormulario('rol', event.target.value)}
                    required
                  >
                    {roles.map((rol) => (
                      <option key={rol} value={rol}>
                        {formatearRol(rol)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Password
                <input
                  className={claseInput}
                  type="password"
                  value={formulario.password}
                  onChange={(event) => manejarCambioFormulario('password', event.target.value)}
                  placeholder="Minimo 8 caracteres, con letra y numero"
                  minLength={8}
                  maxLength={72}
                  required
                />
              </label>

              {errorFormulario ? (
                <div className="rounded-xl border border-neon-pink/35 bg-neon-pink/8 px-4 py-3 text-sm text-neon-pink">
                  {errorFormulario}
                </div>
              ) : null}

              <button
                className="mt-2 inline-flex items-center justify-center rounded-xl border border-neon-cyan/45 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_22px_rgba(0,255,237,0.18)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink disabled:cursor-not-allowed disabled:opacity-60 dark:bg-pes-black dark:text-neon-cyan dark:shadow-glow-cyan"
                type="submit"
                disabled={estaGuardando || roles.length === 0}
              >
                {estaGuardando ? 'Creando usuario...' : 'Dar de alta'}
              </button>
            </form>
          </article>
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
                Ideas
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                Lista de ideas del panel de administracion
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                Crea ideas con titulo y descripcion, marcalas como cumplidas cuando toque y deja
                que la cola offline las sincronice al recuperar conexion.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-xl border border-neon-cyan/45 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_22px_rgba(0,255,237,0.18)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:bg-pes-black dark:text-neon-cyan dark:shadow-glow-cyan"
                type="button"
                onClick={crearNuevaIdea}
              >
                Anadir idea
              </button>
              <button
                className="rounded-xl border border-neon-purple/40 bg-white px-5 py-3 text-sm font-black text-neon-purple shadow-glow-purple transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink dark:bg-pes-black dark:text-neon-cyan"
                type="button"
                disabled={estaRecargandoIdeas}
                onClick={recargarIdeas}
              >
                {estaRecargandoIdeas ? 'Recargando...' : 'Recargar ideas'}
              </button>
              <button
                className="rounded-xl border border-amber-400/40 bg-white px-5 py-3 text-sm font-black text-amber-600 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-amber-500 hover:text-amber-700 dark:bg-pes-black dark:text-amber-300"
                type="button"
                onClick={() => setEstaAbiertoModalPendientesIdeas(true)}
              >
                Pendientes ({ideasPendientes.length})
              </button>
            </div>
          </div>

          {estaCargandoIdeas ? (
            <div className="mt-6 rounded-2xl border border-neon-cyan/25 bg-slate-50 px-5 py-6 text-sm font-semibold text-slate-600 dark:bg-[#080B14] dark:text-slate-300">
              Cargando ideas...
            </div>
          ) : null}

          {!estaCargandoIdeas && errorIdeas ? (
            <div className="mt-6 rounded-2xl border border-neon-pink/30 bg-neon-pink/8 px-5 py-4 text-sm font-semibold text-neon-pink">
              {errorIdeas}
            </div>
          ) : null}

          {!estaCargandoIdeas && !errorIdeas ? (
            <div className="mt-6 grid gap-4">
              {ideasVisibles.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 px-5 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-[#080B14] dark:text-slate-400">
                  Aun no hay ideas creadas. Usa el boton de arriba para anadir la primera.
                </div>
              ) : null}

              {ideasVisibles.map((idea) => {
                const estaAbierta = Boolean(ideasAbiertas[idea.id])
                const estadoIdea = estadoIdeas[idea.id]

                return (
                  <article
                    className="overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50/90 transition-all duration-300 ease-out hover:border-neon-cyan/45 hover:shadow-glow-cyan dark:border-white/10 dark:bg-[#080B14]"
                    key={idea.id}
                  >
                    <div className="flex items-center justify-between gap-4 px-5 py-4">
                      <button
                        className="min-w-0 flex-1 text-left transition-all duration-300 ease-out hover:text-neon-purple dark:hover:text-neon-cyan"
                        type="button"
                        aria-expanded={estaAbierta}
                        onClick={() => alternarIdea(idea.id)}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${
                                idea.completada
                                  ? 'border border-neon-cyan/35 bg-neon-cyan/10 text-neon-cyan'
                                  : 'border border-amber-400/35 bg-amber-400/10 text-amber-600 dark:text-amber-300'
                              }`}
                            >
                              {idea.completada ? 'Cumplida' : 'Pendiente'}
                            </span>
                            {idea.syncStatus === 'pending' ? (
                              <span className="rounded-full border border-neon-pink/30 bg-neon-pink/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-neon-pink">
                                Sync pendiente
                              </span>
                            ) : null}
                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${
                                idea.activo !== false
                                  ? 'border border-neon-cyan/35 bg-neon-cyan/10 text-neon-cyan'
                                  : 'border border-neon-pink/35 bg-neon-pink/10 text-neon-pink'
                              }`}
                            >
                              {idea.activo !== false ? 'Activa' : 'Quitada'}
                            </span>
                          </div>
                          <h3 className="mt-2 truncate text-2xl font-black text-slate-950 dark:text-white">
                            {idea.titulo?.trim() || 'Idea sin titulo'}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {idea.descripcion?.trim() || 'Anade una descripcion para dar contexto a esta idea.'}
                          </p>
                        </div>
                      </button>

                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                        <button
                          className="inline-flex items-center justify-center rounded-xl border border-neon-cyan/45 bg-white px-4 py-3 text-sm font-black text-slate-950 shadow-[0_0_22px_rgba(0,255,237,0.18)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink disabled:cursor-not-allowed disabled:opacity-60 dark:bg-pes-black dark:text-neon-cyan dark:shadow-glow-cyan"
                          type="button"
                          disabled={estadoIdea?.state === 'saving'}
                          onClick={() => guardarIdea(idea)}
                        >
                          {estadoIdea?.state === 'saving' ? 'Guardando...' : 'Guardar'}
                        </button>

                        <button
                          className="rounded-md border border-neon-pink/50 px-4 py-3 text-sm font-bold text-neon-pink shadow-glow-pink transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:text-neon-purple hover:shadow-glow-purple disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          disabled={estadoIdea?.state === 'saving'}
                          onClick={() => abrirConfirmacionQuitarIdea(idea)}
                        >
                          {estadoIdea?.state === 'saving' ? 'Quitando...' : 'Quitar'}
                        </button>

                        <button
                          type="button"
                          role="switch"
                          aria-checked={idea.completada}
                          title={idea.completada ? 'Cumplida' : 'Pendiente'}
                          className="inline-flex items-center gap-2 rounded-md border border-[#39ff14]/50 px-3 py-2 text-sm font-black text-[#39ff14] shadow-[0_0_16px_rgba(57,255,20,0.28)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(57,255,20,0.45)]"
                          onClick={() => actualizarIdea(idea.id, 'completada', !idea.completada)}
                        >
                          <span
                            className={`relative h-6 w-11 rounded-full border transition-all duration-300 ease-out ${
                              idea.completada
                                ? 'border-[#39ff14]/80 bg-[#39ff14]/30 shadow-[0_0_14px_rgba(57,255,20,0.45)]'
                                : 'border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-700'
                            }`}
                          >
                            <span
                              className={`absolute left-0.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full transition-all duration-300 ease-out ${
                                idea.completada
                                  ? 'translate-x-5 bg-[#39ff14] text-pes-black'
                                  : 'translate-x-0 bg-white text-slate-500 dark:bg-slate-200 dark:text-slate-600'
                              }`}
                            >
                              {idea.completada ? (
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
                        </button>

                        <button
                          className={`inline-flex h-11 w-11 items-center justify-center rounded-xl border border-neon-cyan/40 text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out dark:text-neon-cyan ${
                            estaAbierta ? 'border-neon-pink text-neon-pink shadow-glow-pink' : ''
                          }`}
                          type="button"
                          aria-label={estaAbierta ? 'Plegar idea' : 'Desplegar idea'}
                          aria-expanded={estaAbierta}
                          onClick={() => alternarIdea(idea.id)}
                        >
                          <svg
                            className={`h-5 w-5 transition-transform duration-300 ease-out ${
                              estaAbierta ? 'rotate-180' : ''
                            }`}
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
                      </div>
                    </div>

                    <div
                      className={`grid transition-[grid-template-rows] duration-500 ease-out ${
                        estaAbierta ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                      }`}
                    >
                      <div className="overflow-hidden">
                        <div className="grid gap-5 border-t border-slate-200 p-5 dark:border-white/10">
                          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Titulo
                            <input
                              className={claseInput}
                              type="text"
                              value={idea.titulo}
                              onChange={(event) => actualizarIdea(idea.id, 'titulo', event.target.value)}
                              placeholder="Ejemplo: revisar plan de progresion"
                              maxLength={160}
                            />
                          </label>

                          <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                            Descripcion
                            <textarea
                              className={claseInputArea}
                              value={idea.descripcion}
                              onChange={(event) =>
                                actualizarIdea(idea.id, 'descripcion', event.target.value)
                              }
                              placeholder="Describe la idea, el objetivo o el siguiente paso."
                              maxLength={2000}
                            />
                          </label>

                          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-pes-black/60 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm text-slate-500 dark:text-slate-400">
                              {estadoIdea?.text ||
                                (idea.syncStatus === 'pending'
                                  ? 'Hay cambios pendientes de sincronizar.'
                                  : 'Todo sincronizado con el servidor.')}
                            </div>
                          </div>

                          {idea.syncError ? (
                            <div className="rounded-2xl border border-neon-pink/30 bg-neon-pink/8 px-4 py-3 text-sm text-neon-pink">
                              {idea.syncError}
                            </div>
                          ) : null}

                          <div className="flex flex-wrap justify-between gap-3">
                            <div className="text-xs text-slate-400 dark:text-slate-500">
                              Ultima actualizacion: {formatearFecha(idea.updatedAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : null}
        </section>

        <section className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-white/[0.04]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
                Control de accesos
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                Usuarios registrados
              </h2>
            </div>
            <div className="rounded-full border border-neon-cyan/30 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:bg-[#080B14] dark:text-slate-300">
              Tu cuenta no se puede desactivar ni cambiar de rol desde aqui
            </div>
          </div>

          {estaCargando ? (
            <div className="mt-6 rounded-2xl border border-neon-cyan/25 bg-slate-50 px-5 py-6 text-sm font-semibold text-slate-600 dark:bg-[#080B14] dark:text-slate-300">
              Cargando usuarios...
            </div>
          ) : null}

          {!estaCargando && errorCarga ? (
            <div className="mt-6 rounded-2xl border border-neon-pink/30 bg-neon-pink/8 px-5 py-4 text-sm font-semibold text-neon-pink">
              {errorCarga}
            </div>
          ) : null}

          {!estaCargando && !errorCarga ? (
            <div className="mt-6 grid gap-4">
              {usuarios.map((usuario) => {
                const esCuentaActual = usuario.id === usuarioActual?.id
                const estaAplicandoAccion = accionUsuarioId === usuario.id

                return (
                  <article
                    className="rounded-3xl border border-slate-200 bg-slate-50/90 p-5 dark:border-white/10 dark:bg-[#080B14]"
                    key={usuario.id}
                  >
                    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-black text-slate-950 dark:text-white">
                            {obtenerNombreVisibleUsuario(usuario)}
                          </h3>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                              usuario.activo
                                ? 'border border-neon-cyan/35 bg-neon-cyan/10 text-neon-cyan'
                                : 'border border-neon-pink/35 bg-neon-pink/10 text-neon-pink'
                            }`}
                          >
                            {usuario.activo ? 'Activo' : 'Inactivo'}
                          </span>
                          {esCuentaActual ? (
                            <span className="rounded-full border border-neon-purple/30 bg-neon-purple/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-neon-purple dark:text-neon-pink">
                              Tu cuenta
                            </span>
                          ) : null}
                        </div>

                        <div className="grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                          <p>Nombre: {usuario.nombre || 'Sin nombre'}</p>
                          <p>Username: {usuario.username ? `@${usuario.username}` : 'Sin username'}</p>
                          <p>Email: {usuario.email || 'Sin email'}</p>
                          <p>Alta: {formatearFecha(usuario.createdAt)}</p>
                          <p>Ultima actualizacion: {formatearFecha(usuario.updatedAt)}</p>
                        </div>
                      </div>

                      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                        <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                          Rol
                          <select
                            className={claseInput}
                            value={usuario.rol}
                            disabled={esCuentaActual || estaAplicandoAccion}
                            onChange={(event) => manejarCambioRol(usuario, event.target.value)}
                          >
                            {roles.map((rol) => (
                              <option key={`${usuario.id}-${rol}`} value={rol}>
                                {formatearRol(rol)}
                              </option>
                            ))}
                          </select>
                        </label>

                        <button
                          className={`mt-auto inline-flex min-h-12 items-center justify-center rounded-xl border px-5 py-3 text-sm font-black transition-all duration-300 ease-out disabled:cursor-not-allowed disabled:opacity-60 ${
                            usuario.activo
                              ? 'border-neon-pink/40 bg-white text-neon-pink hover:-translate-y-0.5 hover:shadow-glow-pink dark:bg-pes-black'
                              : 'border-neon-cyan/40 bg-white text-neon-cyan hover:-translate-y-0.5 hover:shadow-glow-cyan dark:bg-pes-black'
                          }`}
                          type="button"
                          role="switch"
                          aria-checked={usuario.activo}
                          disabled={esCuentaActual || estaAplicandoAccion}
                          onClick={() => manejarCambioEstado(usuario)}
                        >
                          {estaAplicandoAccion
                            ? 'Guardando...'
                            : usuario.activo
                              ? 'Denegar acceso'
                              : 'Conceder acceso'}
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : null}
        </section>
      </main>

      {estaAbiertoModalPendientesIdeas ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div
            className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-amber-400/30 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.38)] dark:bg-[#050816]"
            aria-modal="true"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-500">
                  Pendientes
                </p>
                <h2 className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                  Cola offline de ideas
                </h2>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Aqui ves las ideas guardadas en local que aun no se han subido al backend.
                </p>
              </div>

              <button
                className="rounded-full border border-slate-300 px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:border-neon-pink hover:text-neon-pink dark:border-white/10 dark:text-slate-300"
                type="button"
                onClick={() => setEstaAbiertoModalPendientesIdeas(false)}
              >
                Cerrar
              </button>
            </div>

            <div className="flex flex-wrap gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
              <button
                className="rounded-md border border-neon-cyan/50 px-4 py-3 text-sm font-bold text-neon-purple shadow-glow-cyan transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink disabled:cursor-not-allowed disabled:opacity-60 dark:text-neon-cyan"
                type="button"
                disabled={estaSincronizandoIdeasPendientes}
                onClick={sincronizarPendientesIdeasAhora}
              >
                {estaSincronizandoIdeasPendientes ? 'Sincronizando...' : 'Sincronizar ahora'}
              </button>
              <p className="self-center text-sm text-slate-500 dark:text-slate-400">
                {ideasPendientes.length === 0
                  ? 'No hay ideas pendientes.'
                  : `${ideasPendientes.length} idea${ideasPendientes.length === 1 ? '' : 's'} pendiente${ideasPendientes.length === 1 ? '' : 's'} de subida.`}
              </p>
            </div>

            <div className="max-h-[55vh] overflow-y-auto px-5 py-4">
              {ideasPendientes.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                  No hay ideas pendientes de sincronizar.
                </div>
              ) : (
                <div className="grid gap-3">
                  {ideasPendientes.map((idea) => (
                    <article
                      className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-pes-black/50"
                      key={idea.id}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-500">
                            {idea.ideaId ? 'Edicion pendiente' : 'Alta local pendiente'}
                          </p>
                          <h3 className="mt-1 text-lg font-black text-slate-950 dark:text-white">
                            {idea.titulo || 'Idea sin titulo'}
                          </h3>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {idea.descripcion || 'Sin descripcion'}
                          </p>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:border-white/10 dark:bg-pes-black dark:text-slate-400">
                          {idea.activo !== false ? 'Activa' : 'Quitada'}
                        </div>
                      </div>
                      <div className="mt-4 flex justify-end">
                        <button
                          className="rounded-md border border-neon-pink/50 px-3 py-2 text-sm font-bold text-neon-pink shadow-glow-pink transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:text-neon-purple hover:shadow-glow-purple disabled:cursor-not-allowed disabled:opacity-60"
                          type="button"
                          disabled={ideaPendienteEliminandoId === idea.id}
                          onClick={() => quitarIdeaDeLaCola(idea)}
                        >
                          {ideaPendienteEliminandoId === idea.id
                            ? 'Quitando...'
                            : 'Quitar de la cola'}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {ideaPendienteQuitar ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-neon-pink/30 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.28)] dark:bg-[#050814]">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neon-pink">
              Confirmar retirada
            </p>
            <h2 className="mt-3 text-2xl font-black text-slate-950 dark:text-white">
              Vas a quitar esta idea
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              La idea dejara de aparecer de esta lista.
            </p>
            <p className="mt-3 rounded-2xl border border-amber-400/35 bg-amber-400/10 px-4 py-3 text-sm font-semibold text-amber-700 dark:text-amber-300">
              Idea: {ideaPendienteQuitar.titulo || 'Idea sin titulo'}
            </p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                className="rounded-md border border-slate-300 px-4 py-3 text-sm font-bold text-slate-700 transition-all duration-300 ease-out hover:border-neon-cyan hover:text-neon-cyan dark:border-white/10 dark:text-slate-300"
                type="button"
                onClick={cerrarConfirmacionQuitarIdea}
              >
                Cancelar
              </button>
              <button
                className="rounded-md border border-neon-pink/50 px-4 py-3 text-sm font-bold text-neon-pink shadow-glow-pink transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-purple hover:text-neon-purple hover:shadow-glow-purple"
                type="button"
                onClick={confirmarQuitarIdea}
              >
                Quitar idea
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <Toast key={toast.id} mensaje={toast.mensaje} tipo={toast.tipo} /> : null}
    </>
  )
}

export default AdminPanel
