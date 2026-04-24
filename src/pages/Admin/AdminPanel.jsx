import { useEffect, useState } from 'react'
import Toast from '../../components/Toast/Toast'
import {
  cambiarEstadoUsuarioAdmin,
  cambiarRolUsuarioAdmin,
  crearUsuarioAdmin,
  obtenerRolesUsuario,
  obtenerUsuariosAdmin,
} from '../../services/admin/adminUsersApiService'

const claseInput =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-pes-black dark:text-white'

const formularioInicial = {
  nombre: '',
  email: '',
  password: '',
  rol: 'USUARIO',
}

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

function AdminPanel({ usuarioActual }) {
  const [usuarios, setUsuarios] = useState([])
  const [roles, setRoles] = useState([])
  const [formulario, setFormulario] = useState(formularioInicial)
  const [estaCargando, setEstaCargando] = useState(true)
  const [estaGuardando, setEstaGuardando] = useState(false)
  const [accionUsuarioId, setAccionUsuarioId] = useState(null)
  const [errorCarga, setErrorCarga] = useState('')
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const cargarDatos = async () => {
      setEstaCargando(true)
      setErrorCarga('')

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
    }

    cargarDatos()
  }, [])

  const publicarToast = (mensaje, tipo = 'info') => {
    setToast({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      mensaje,
      tipo,
    })
  }

  const manejarCambioFormulario = (campo, valor) => {
    setFormulario((estadoActual) => ({
      ...estadoActual,
      [campo]: valor,
    }))
  }

  const manejarAltaUsuario = async (event) => {
    event.preventDefault()
    setEstaGuardando(true)

    try {
      const usuarioCreado = await crearUsuarioAdmin({
        nombre: formulario.nombre.trim(),
        email: formulario.email.trim(),
        password: formulario.password,
        rol: formulario.rol,
      })

      setUsuarios((estadoActual) => ordenarUsuarios([...estadoActual, usuarioCreado]))
      setFormulario({
        ...formularioInicial,
        rol: roles[0] || formularioInicial.rol,
      })
      publicarToast(`Usuario ${usuarioCreado.email} creado correctamente.`)
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
      publicarToast(`Rol actualizado para ${usuario.email}.`)
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
          ? `Acceso concedido a ${usuario.email}.`
          : `Acceso denegado a ${usuario.email}.`,
      )
    } catch (errorCapturado) {
      publicarToast(errorCapturado.message || 'No se pudo cambiar el estado.', 'error')
    } finally {
      setAccionUsuarioId(null)
    }
  }

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
                  Email
                  <input
                    className={claseInput}
                    type="email"
                    value={formulario.email}
                    onChange={(event) => manejarCambioFormulario('email', event.target.value)}
                    placeholder="usuario@pesapp.local"
                    maxLength={180}
                    required
                  />
                </label>

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
                            {usuario.nombre}
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
                          <p>{usuario.email}</p>
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

      {toast ? <Toast key={toast.id} mensaje={toast.mensaje} tipo={toast.tipo} /> : null}
    </>
  )
}

export default AdminPanel
