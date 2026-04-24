const USERNAME_REGEX = /^[A-Za-z0-9._-]{3,60}$/
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validarUsername(username) {
  const valor = (username || '').trim()

  if (!valor) {
    return 'El nombre de usuario es obligatorio.'
  }

  if (!USERNAME_REGEX.test(valor)) {
    return 'El username debe tener entre 3 y 60 caracteres y solo usar letras, numeros, punto, guion o guion bajo.'
  }

  return ''
}

export function validarPassword(password) {
  const valor = password || ''

  if (!valor) {
    return 'La password es obligatoria.'
  }

  if (!PASSWORD_REGEX.test(valor)) {
    return 'La password debe tener entre 8 y 72 caracteres e incluir al menos una letra y un numero.'
  }

  return ''
}

export function validarEmailOpcional(email) {
  const valor = (email || '').trim()

  if (!valor) {
    return ''
  }

  if (!EMAIL_REGEX.test(valor)) {
    return 'El email no tiene un formato valido.'
  }

  return ''
}
