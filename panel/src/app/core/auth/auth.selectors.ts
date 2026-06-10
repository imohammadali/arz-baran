import { createSelector } from '@ngrx/store'

import { selectAuthState } from '../core.state'
import { AuthState } from './auth.models'

export const selectAuth = createSelector(selectAuthState, (state: AuthState) => state)

export const selectIsAuthenticated = createSelector(selectAuthState, (state: AuthState) => state.isAuthenticated)
export const selectCurrentUser = createSelector(selectAuthState, (state: AuthState) => state.user)
export const selectUserLevels = createSelector(selectAuthState, (state: AuthState) => state.userLevels)
export const selectToken = createSelector(selectAuthState, (state: AuthState) => state.token)
export const selectNotificationToken = createSelector(selectAuthState, (state: AuthState) => state.notificationToken)
