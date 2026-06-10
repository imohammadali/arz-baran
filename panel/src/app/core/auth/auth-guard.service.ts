import { Injectable } from '@angular/core'
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router'
import { select, Store } from '@ngrx/store'

import { AppState } from '../core.state'
import { map, Observable, of } from 'rxjs'
import { ApiService } from '@shared/services/api.service'
import { catchError, switchMap, take, tap } from 'rxjs/operators'
import { authLogout, setToken } from '@core/auth/auth.actions'
import { selectIsAuthenticated, selectToken } from '@core/auth/auth.selectors'

@Injectable({
  providedIn: 'root'
})
export class AuthGuardService {
  isUserAuthenticated = false

  constructor(
    private store: Store<AppState>,
    private _router: Router,
    private api: ApiService
  ) {
    const isAuthenticated$ = this.store.pipe(select(selectIsAuthenticated))
    isAuthenticated$.subscribe(isUserAuthenticated => {
      this.isUserAuthenticated = isUserAuthenticated
    })
  }

  canActivateChild(): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    if (!this.isUserAuthenticated) {
      return of(true)
    } else {
      this._router.navigate(['/home'])
      return of(false)
    }
  }

  canActivate(route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    const ssoToken = route.queryParams['authorization'] || route.queryParams['Authorization']
    return this.store.select(selectToken).pipe(
      take(1),
      switchMap(token => {
        if (ssoToken) {
          return this.exchangeToken(ssoToken)
        }
        if (token) {
          return of(true)
        }
        console.log('logout auth guard')
        this.store.dispatch(authLogout())
        return of(false)
      })
    )
  }

  canLoad() {
    if (this.isUserAuthenticated) {
      return of(true)
    }
    this._router.navigate(['/auth'])
    return of(false)
  }

  private exchangeToken(token: string): Observable<boolean> {
    return this.api.set('authorization/exchange-token', 'POST', { body: { token: token } }).pipe(
      tap((res: any) => this.store.dispatch(setToken({ token: res?.token, isAuthenticated: true }))),
      map(() => true),
      catchError(() => {
        console.log('logout auth guard exchange token')
        this.store.dispatch(authLogout())
        return of(false)
      })
    )
  }
}
