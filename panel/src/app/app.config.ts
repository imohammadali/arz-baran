import {
  ApplicationConfig,
  importProvidersFrom,
  isDevMode,
  provideZoneChangeDetection,
} from "@angular/core";
import { provideRouter } from "@angular/router";

import {
  HTTP_INTERCEPTORS,
  HttpClient,
  provideHttpClient,
  withInterceptorsFromDi,
} from "@angular/common/http";
import { provideAnimationsAsync } from "@angular/platform-browser/animations/async";
import { provideServiceWorker } from "@angular/service-worker";
import { AuthEffects } from "@core/auth/auth.effects";
import { metaReducers, reducers } from "@core/core.state";
import { HttpErrorInterceptor } from "@core/http-interceptors/http-error.interceptor";
import { HttpBaseInterceptor } from "@core/http-interceptors/http.interceptor";
import { CustomSerializer } from "@core/router/custom-serializer";
import { SettingsEffects } from "@core/settings/settings.effects";
import { environment } from "@env/environment";
import { provideEffects } from "@ngrx/effects";
import { provideRouterStore, RouterStateSerializer } from "@ngrx/router-store";
import { provideState, provideStore, Store } from "@ngrx/store";
import { provideStoreDevtools } from "@ngrx/store-devtools";
import { TranslateLoader, TranslateModule } from "@ngx-translate/core";
import { BREADCRUMB_FUTURE_KEY } from "@shared/components/breadcrumb/+state/breadcrumb.entity";
import { breadCrumbReducers } from "@shared/components/breadcrumb/+state/breadcrumb.reducers";
import { SidebarEffects } from "@shared/components/sidebar/+state/sidebar.effects";
import { SIDEBAR_FEATURE_KEY } from "@shared/components/sidebar/+state/sidebar.entity";
import { SidebarReducers } from "@shared/components/sidebar/+state/sidebar.reducers";
import { TABLE_FUTURE_KEY } from "@shared/components/table/+state/table.entity";
import { tableReducers } from "@shared/components/table/+state/table.reducers";
import { NotificationService } from "@shared/services/notification.service";
import { ConfirmationService, MessageService } from "primeng/api";
import { providePrimeNG } from "primeng/config";
import { DialogService } from "primeng/dynamicdialog";
import { map, Observable } from "rxjs";
import { routes } from "./app.routes";
import theme from "./theme/theme";
import { ThemeService } from "./theme/theme.service";

export class CustomLoader implements TranslateLoader {
  constructor(private http: HttpClient) {}

  public getTranslation(lang: string): Observable<any> {
    return this.http
      .get(`${environment.baseApiUrl}admin/v1/language/translator/${lang}`)
      .pipe(map((res) => res["translator"]));
  }
}
export const appConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: "fa",
        loader: {
          provide: TranslateLoader,
          useClass: CustomLoader,
          deps: [HttpClient, Store],
        },
      }),
    ),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: theme,
        options: {
          darkModeSelector: ".dark",
          cssLayer: {
            name: "primeng",
            order: "theme, base, primeng",
          },
        },
      },
      ripple: true,
      overlayOptions: {
        appendTo: "body",
      },
    }),
    provideStore(reducers, {
      metaReducers,
      runtimeChecks: {
        strictStateImmutability: false,
        strictActionImmutability: false,
      },
    }),
    provideEffects([AuthEffects, SettingsEffects, SidebarEffects]),
    provideState(SIDEBAR_FEATURE_KEY, SidebarReducers.reducer),
    provideState(BREADCRUMB_FUTURE_KEY, breadCrumbReducers),
    provideState(TABLE_FUTURE_KEY, tableReducers),
    provideRouterStore(),
    provideStoreDevtools({
      name: "admin_panel",
      maxAge: 25,
      logOnly: !isDevMode(),
    }),
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: HttpErrorInterceptor, multi: true },
    { provide: HTTP_INTERCEPTORS, useClass: HttpBaseInterceptor, multi: true },
    { provide: RouterStateSerializer, useClass: CustomSerializer },
    NotificationService,
    MessageService,
    ConfirmationService,
    DialogService,
    ThemeService,
    provideServiceWorker("service-worker.js", {
      enabled: !isDevMode(),
      registrationStrategy: "registerWhenStable:30000",
    }),
  ],
};
