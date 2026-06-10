import { Injectable } from '@angular/core'
import { Router } from '@angular/router'
import { Actions, createEffect, ofType } from '@ngrx/effects'
import { tap, withLatestFrom } from 'rxjs/operators'

import { authLogin, authLogout, setNotificationToken, setToken, setUser, setUserLevels } from './auth.actions'
import { select, Store } from '@ngrx/store'
import { State } from './auth.models'
import { selectAuthState } from '@core/core.state'
import { LocalStorageService } from '@shared/services/local-storage/local-storage.service'

export const AUTH_KEY = 'AUTH'

@Injectable()
export class AuthEffects {
  login = createEffect(
    () =>
      this.actions$.pipe(
        ofType(authLogin),
        tap(() => this.localStorageService.setItem(AUTH_KEY, { isAuthenticated: true }))
      ),
    { dispatch: false }
  )

  logout = createEffect(
    () =>
      this.actions$.pipe(
        ofType(authLogout),
        tap(() => {
          this.localStorageService.removeItem(AUTH_KEY)
          this.router.navigate(['auth'])
        })
      ),
    { dispatch: false }
  )
  setUserLevels = createEffect(
    () =>
      this.actions$.pipe(
        ofType(setUserLevels, setToken, setUser, setNotificationToken),
        withLatestFrom(this.store.pipe(select(selectAuthState))),
        tap(([_, auth]) => this.localStorageService.setItem(AUTH_KEY, auth))
      ),
    { dispatch: false }
  )

  constructor(
    private actions$: Actions,
    private localStorageService: LocalStorageService,
    private router: Router,
    private store: Store<State>
  ) {}
}
