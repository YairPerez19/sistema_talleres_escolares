import type { Role } from '../services/authService'
import type { TallerOption } from './auth'

/**
 * Estado compartido del formulario de autenticación.
 * @deprecated El componente visual vive en `@/components/LoginSite`.
 *   Este tipo se conserva como contrato entre `auth.tsx` y `LoginSite`.
 */
export interface AuthFormState {
  nombre: string
  email: string
  password: string
  matricula: string
  tallerId: string
  turno: 'matutino' | 'vespertino'
  showPassword: boolean
}

export type { Role, TallerOption }
