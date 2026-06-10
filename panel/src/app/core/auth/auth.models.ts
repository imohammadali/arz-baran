import { AppState } from './../core.state'
import { IUser } from '@shared/interfaces/Responses/IUser'
import { IUserLevel } from '@shared/interfaces/Responses/IUserLevel'
export interface AuthState {
  isAuthenticated: boolean
  user: IUser
  token: string
  notificationToken: string
  userLevels: IUserLevel[]
}
export interface State extends AppState {
  auth: AuthState
}
