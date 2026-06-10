import { AuthState } from './auth.models'
import { authLogin, authLogout, setNotificationToken, setToken, setUser, setUserLevels } from './auth.actions'
import { createReducer, on, Action } from '@ngrx/store'

export const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  userLevels: null,
  token: '',
  notificationToken: ''
}

const reducer = createReducer(
  initialState,
  on(authLogin, state => ({ ...state, isAuthenticated: true })),
  on(authLogout, state => ({ ...state, isAuthenticated: false })),
  on(setUser, (state, action) => ({ ...state, ...action })),
  on(setUserLevels, (state, action) => ({ ...state, ...action })),
  on(setToken, (state, action) => ({ ...state, ...action })),
  on(setNotificationToken, (state, action) => ({ ...state, ...action }))
)

export function authReducer(state: AuthState | undefined, action: Action): AuthState {
  return reducer(state, action)
}
