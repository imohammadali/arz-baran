import { Injectable, Injector } from "@angular/core";
import {
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
  HttpErrorResponse,
  HttpClient,
} from "@angular/common/http";
import { Observable, BehaviorSubject, throwError, of } from "rxjs";
import { catchError, switchMap, filter, take } from "rxjs/operators";
import { Store } from "@ngrx/store";
import { AppState } from "@core/core.state";
import { selectToken } from "@core/auth/auth.selectors";
import { selectSettingsLanguage } from "@core/settings/settings.selectors";
import { authLogout, setToken } from "@core/auth/auth.actions";
import { environment } from "@env/environment";
import { GeoService } from "@shared/services/geo.service";

@Injectable()
export class HttpBaseInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<string | null>(null);
  private http: HttpClient;

  constructor(
    private store: Store<AppState>,
    private injector: Injector,
    private geo: GeoService,
  ) {
    this.http = this.injector.get(HttpClient);
  }

  intercept(
    req: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    return this.addHeaders(req).pipe(
      switchMap((requestWithHeaders) =>
        next.handle(requestWithHeaders).pipe(
          catchError((error) => {
            if (
              error instanceof HttpErrorResponse &&
              error.status === 401 &&
              !this.isAuthRequest(requestWithHeaders)
            ) {
              return this.handle401Error(requestWithHeaders, next);
            }

            return throwError(() => error);
          }),
        ),
      ),
    );
  }
  private isAuthRequest(request: HttpRequest<any>): boolean {
    return (
      request.url.includes("authorization/refresh") ||
      request.url.includes("login")
    );
  }
  private addHeaders(request: HttpRequest<any>): Observable<HttpRequest<any>> {
    const isAuthRequest = this.isAuthRequest(request);
    return this.geo.getCoords().pipe(
      switchMap((coords) =>
        this.store.select(selectToken).pipe(
          take(1),
          switchMap((token) =>
            this.store.select(selectSettingsLanguage).pipe(
              take(1),
              switchMap((lang) => {
                let headers = request.headers
                  .set("Accept-Language", lang || "fa")
                  .set("X-Geo-Lat", String(coords?.lat ?? 0))
                  .set("X-Geo-Lng", String(coords?.lng ?? 0));
                if (!isAuthRequest && token) {
                  headers = headers.set("Authorization", token);
                }
                if (isAuthRequest) {
                  headers = headers.delete("Authorization");
                }
                return of(
                  request.clone({
                    headers,
                    withCredentials: true,
                  }),
                );
              }),
            ),
          ),
        ),
      ),
    );
  }

  private handle401Error(
    request: HttpRequest<any>,
    next: HttpHandler,
  ): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      return this.http
        .get<any>(`${environment.baseApiUrl}admin/v1/authorization/refresh`, {
          withCredentials: true,
        })
        .pipe(
          catchError((err) => {
            this.isRefreshing = false;
            this.logout();
            return throwError(() => err);
          }),
          switchMap((res) => {
            const newToken = res?.token;
            this.isRefreshing = false;
            if (!newToken) {
              this.logout();
              return throwError(() => new Error("No token received"));
            }
            this.store.dispatch(
              setToken({ token: newToken, isAuthenticated: true }),
            );
            this.refreshTokenSubject.next(newToken);
            return next.handle(
              request.clone({
                setHeaders: { Authorization: newToken },
              }),
            );
          }),
        );
    } else {
      return this.refreshTokenSubject.pipe(
        filter((token) => token != null),
        take(1),
        switchMap((token) =>
          next.handle(
            request.clone({
              setHeaders: { Authorization: token! },
            }),
          ),
        ),
      );
    }
  }
  private logout() {
    this.store.dispatch(authLogout());
  }
}
