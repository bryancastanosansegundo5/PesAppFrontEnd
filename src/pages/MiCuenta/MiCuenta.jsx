import { useEffect, useState } from 'react'
import Toast from '../../components/Toast/Toast'
import {
  validarEmailOpcional,
  validarUsername,
} from '../../services/auth/authValidation'
import {
  actualizarPerfilUsuario,
  comprobarDisponibilidadUsername,
  obtenerPerfilUsuario,
} from '../../services/user/userProfileApiService'

const claseInput =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition-all duration-300 ease-out focus:border-neon-cyan focus:shadow-glow-cyan disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-pes-black dark:text-white'

const estadoUsernameInicial = {
  estado: 'idle',
  mensaje: '',
  usernameComprobado: '',
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

function MiCuenta({ usuarioActual, onPerfilActualizado }) {
  const [formulario, setFormulario] = useState({
    nombre: '',
    username: '',
    email: '',
  })
  const [perfilBase, setPerfilBase] = useState(null)
  const [estaCargando, setEstaCargando] = useState(true)
  const [estaGuardando, setEstaGuardando] = useState(false)
  const [estaComprobandoUsername, setEstaComprobandoUsername] = useState(false)
  const [errorCarga, setErrorCarga] = useState('')
  const [errorFormulario, setErrorFormulario] = useState('')
  const [estadoUsername, setEstadoUsername] = useState(estadoUsernameInicial)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const cargarPerfil = async () => {
      setEstaCargando(true)
      setErrorCarga('')

      try {
        const perfil = await obtenerPerfilUsuario()
        setPerfilBase(perfil)
        setFormulario({
          nombre: perfil?.nombre || '',
          username: perfil?.username || '',
          email: perfil?.email || '',
        })
        setEstadoUsername({
          estado: 'idle',
          mensaje: '',
          usernameComprobado: perfil?.username || '',
        })
      } catch (errorCapturado) {
        setErrorCarga(errorCapturado.message || 'No se pudo cargar tu perfil.')
      } finally {
        setEstaCargando(false)
      }
    }

    cargarPerfil()
  }, [])

  const publicarToast = (mensaje, tipo = 'info') => {
    setToast({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      mensaje,
      tipo,
    })
  }

  const manejarCambio = (campo, valor) => {
    if (errorFormulario) {
      setErrorFormulario('')
    }

    setFormulario((estadoActual) => ({
      ...estadoActual,
      [campo]: valor,
    }))

    if (campo === 'username') {
      setEstadoUsername(estadoUsernameInicial)
    }
  }

  const usernameNormalizado = formulario.username.trim()
  const usernameOriginal = perfilBase?.username || usuarioActual?.username || ''
  const usernameHaCambiado = Boolean(usernameNormalizado) && usernameNormalizado !== usernameOriginal

  const comprobarUsername = async () => {
    if (!usernameNormalizado) {
      setEstadoUsername({
        estado: 'error',
        mensaje: 'El nombre de usuario es obligatorio.',
        usernameComprobado: '',
      })
      return false
    }

    const errorUsername = validarUsername(usernameNormalizado)

    if (errorUsername) {
      setEstadoUsername({
        estado: 'error',
        mensaje: errorUsername,
        usernameComprobado: '',
      })
      return false
    }

    if (!usernameHaCambiado) {
      setEstadoUsername({
        estado: 'success',
        mensaje: 'Mantienes tu username actual.',
        usernameComprobado: usernameNormalizado,
      })
      return true
    }

    setEstaComprobandoUsername(true)
    setEstadoUsername({
      estado: 'checking',
      mensaje: 'Comprobando disponibilidad...',
      usernameComprobado: usernameNormalizado,
    })

    try {
      const disponible = await comprobarDisponibilidadUsername(usernameNormalizado)
      setEstadoUsername({
        estado: disponible ? 'success' : 'error',
        mensaje: disponible
          ? 'Username disponible.'
          : 'Ese username ya esta en uso. Prueba con otro.',
        usernameComprobado: usernameNormalizado,
      })
      return disponible
    } catch (errorCapturado) {
      setEstadoUsername({
        estado: 'error',
        mensaje: errorCapturado.message || 'No se pudo comprobar el username.',
        usernameComprobado: usernameNormalizado,
      })
      return false
    } finally {
      setEstaComprobandoUsername(false)
    }
  }

  const manejarSubmit = async (event) => {
    event.preventDefault()
    setErrorFormulario('')

    const nombre = formulario.nombre.trim()
    const username = formulario.username.trim()
    const email = formulario.email.trim()

    if (!nombre) {
      setErrorFormulario('Debes indicar tu nombre.')
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

    if (
      usernameHaCambiado &&
      (estadoUsername.usernameComprobado !== username || estadoUsername.estado !== 'success')
    ) {
      const disponible = await comprobarUsername()

      if (!disponible) {
        setErrorFormulario('Antes de guardar debes elegir un username disponible.')
        return
      }
    }

    setEstaGuardando(true)

    try {
      const usuarioActualizado = await actualizarPerfilUsuario({
        nombre,
        username,
        email,
      })

      setPerfilBase(usuarioActualizado)
      setFormulario({
        nombre: usuarioActualizado.nombre || '',
        username: usuarioActualizado.username || '',
        email: usuarioActualizado.email || '',
      })
      setEstadoUsername({
        estado: 'success',
        mensaje: 'Datos actualizados correctamente.',
        usernameComprobado: usuarioActualizado.username || '',
      })
      onPerfilActualizado(usuarioActualizado)
      publicarToast('Tu perfil se ha actualizado correctamente.')
    } catch (errorCapturado) {
      setErrorFormulario(errorCapturado.message || 'No se pudo actualizar tu perfil.')
    } finally {
      setEstaGuardando(false)
    }
  }

  const renderizarEstadoUsername = () => {
    if (!estadoUsername.mensaje) {
      return null
    }

    const clases =
      estadoUsername.estado === 'success'
        ? 'border-neon-cyan/30 bg-neon-cyan/10 text-neon-cyan'
        : estadoUsername.estado === 'checking'
          ? 'border-neon-purple/30 bg-neon-purple/10 text-neon-purple dark:text-neon-pink'
          : 'border-neon-pink/35 bg-neon-pink/10 text-neon-pink'

    return <p className={`rounded-xl border px-4 py-3 text-sm font-semibold ${clases}`}>{estadoUsername.mensaje}</p>
  }

  if (estaCargando) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-neon-cyan/25 bg-white px-5 py-6 text-sm font-semibold text-slate-700 shadow-glow-cyan dark:bg-[#080B14] dark:text-slate-200">
          Cargando tu perfil...
        </div>
      </main>
    )
  }

  if (errorCarga) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-neon-pink/30 bg-neon-pink/8 px-5 py-4 text-sm font-semibold text-neon-pink">
          {errorCarga}
        </div>
      </main>
    )
  }

  return (
    <>
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-white/[0.04]">
            <div className="space-y-4">
              <p className="inline-flex rounded-full border border-neon-cyan/35 bg-white px-4 py-2 text-sm font-semibold text-neon-purple shadow-glow-cyan dark:bg-white/5 dark:text-neon-cyan">
                Mi cuenta
              </p>
              <div>
                <h1 className="text-3xl font-black text-slate-950 sm:text-4xl dark:text-white">
                  Ajusta los datos de tu usuario.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                  Desde aqui puedes actualizar tu nombre visible, cambiar tu username y mantener
                  el email solo si te interesa conservarlo como dato de apoyo.
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-neon-cyan/25 bg-slate-50/80 p-4 dark:bg-[#080B14]">
                <p className="text-xs font-semibold uppercase tracking-wide text-neon-cyan">
                  Rol
                </p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                  {perfilBase?.rol || 'Usuario'}
                </p>
              </div>
              <div className="rounded-2xl border border-neon-purple/25 bg-slate-50/80 p-4 dark:bg-[#080B14]">
                <p className="text-xs font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-pink">
                  Estado
                </p>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                  {perfilBase?.activo ? 'Activo' : 'Inactivo'}
                </p>
              </div>
            </div>

            <div className="mt-6 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
              <p>Alta: {formatearFecha(perfilBase?.createdAt)}</p>
              <p>Ultima actualizacion: {formatearFecha(perfilBase?.updatedAt)}</p>
            </div>
          </article>

          <article className="rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_24px_60px_rgba(15,23,42,0.12)] dark:border-white/10 dark:bg-white/[0.04]">
            <div className="mb-6">
              <p className="text-sm font-semibold uppercase tracking-wide text-neon-purple dark:text-neon-cyan">
                Edicion de perfil
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                Actualiza tus datos
              </h2>
            </div>

            <form className="grid gap-4" onSubmit={manejarSubmit}>
              <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Nombre
                <input
                  className={claseInput}
                  type="text"
                  value={formulario.nombre}
                  onChange={(event) => manejarCambio('nombre', event.target.value)}
                  placeholder="Nombre visible"
                  maxLength={120}
                  required
                />
              </label>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Username
                  <input
                    className={claseInput}
                    type="text"
                    value={formulario.username}
                    onChange={(event) => manejarCambio('username', event.target.value)}
                    onBlur={comprobarUsername}
                    autoComplete="username"
                    placeholder="bryan"
                    minLength={3}
                    maxLength={60}
                    pattern="[A-Za-z0-9._-]{3,60}"
                    required
                  />
                </label>

                <button
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-neon-cyan/45 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_22px_rgba(0,255,237,0.18)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink disabled:cursor-not-allowed disabled:opacity-60 dark:bg-pes-black dark:text-neon-cyan dark:shadow-glow-cyan"
                  type="button"
                  onClick={comprobarUsername}
                  disabled={estaComprobandoUsername}
                >
                  {estaComprobandoUsername ? 'Comprobando...' : 'Comprobar username'}
                </button>
              </div>

              {renderizarEstadoUsername()}

              <label className="grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
                Email (opcional)
                <input
                  className={claseInput}
                  type="email"
                  value={formulario.email}
                  onChange={(event) => manejarCambio('email', event.target.value)}
                  autoComplete="email"
                  placeholder="usuario@pesapp.local"
                  maxLength={180}
                />
              </label>

              <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
                Si vacias el email, se guardara sin correo asociado. Antes de cambiar el username
                comprobamos que siga libre para evitar choques con otro usuario. El username debe
                tener entre 3 y 60 caracteres y solo usar letras, numeros, punto, guion o guion
                bajo.
              </p>

              {errorFormulario ? (
                <div className="rounded-xl border border-neon-pink/35 bg-neon-pink/8 px-4 py-3 text-sm text-neon-pink">
                  {errorFormulario}
                </div>
              ) : null}

              <button
                className="mt-2 inline-flex items-center justify-center rounded-xl border border-neon-cyan/45 bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-[0_0_22px_rgba(0,255,237,0.18)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-neon-pink hover:text-neon-pink hover:shadow-glow-pink disabled:cursor-not-allowed disabled:opacity-60 dark:bg-pes-black dark:text-neon-cyan dark:shadow-glow-cyan"
                type="submit"
                disabled={estaGuardando || estaComprobandoUsername}
              >
                {estaGuardando ? 'Guardando cambios...' : 'Guardar cambios'}
              </button>
            </form>
          </article>
        </section>
      </main>

      {toast ? <Toast key={toast.id} mensaje={toast.mensaje} tipo={toast.tipo} /> : null}
    </>
  )
}

export default MiCuenta
