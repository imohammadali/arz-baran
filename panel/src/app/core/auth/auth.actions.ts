import { createAction, props } from '@ngrx/store'
import { IUser } from '@shared/interfaces/Responses/IUser'
import { IUserLevel } from '@shared/interfaces/Responses/IUserLevel'

export const authLogin = createAction('[Auth] Login')
export const authLogout = createAction('[Auth] Logout')
export const setUser = createAction('[Auth] User', props<{ user: IUser }>())
export const setUserLevels = createAction('[Auth] UserLevels', props<{ userLevels: IUserLevel[] }>())
export const setToken = createAction('[Auth] Token', props<{ token: string; isAuthenticated: boolean }>())
export const setNotificationToken = createAction('[Auth] NotificationToken', props<{ notificationToken: string }>())
