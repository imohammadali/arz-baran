import { ActivationEnd, Router } from "@angular/router";
import { Injectable, NgZone } from "@angular/core";
import { OverlayContainer } from "@angular/cdk/overlay";
import { select, Store } from "@ngrx/store";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { TranslateService } from "@ngx-translate/core";
import { combineLatest, merge, mergeMap, of } from "rxjs";
import {
  tap,
  withLatestFrom,
  distinctUntilChanged,
  filter,
  map,
} from "rxjs/operators";

import { selectSettingsState } from "../core.state";
import { AnimationsService } from "../animations/animations.service";

import {
  actionSettingsChangeAnimationsElements,
  actionSettingsChangeAnimationsPage,
  actionSettingsChangeAnimationsPageDisabled,
  actionSettingsChangeAutoNightMode,
  actionSettingsChangeLanguage,
  actionSettingsChangeTheme,
  actionSettingsChangeStickyHeader,
  actionSettingsChangeHour,
  actionSettingsChangeSidebar,
  actionSettingsChangeDirection,
  actionSettingsChangeMobileSidebar,
  actionSettingsLoading,
  actionSettingsGenerateCaptcha,
  actionSettingsGeneratedCaptcha,
  actionSettingsAddInProgressApi,
  actionSettingsRemoveInProgressApi,
  actionSettingsSetNotifications,
  actionSettingsSetBranch,
  actionSettingsSetBranches,
  actionSettingsSetNotificationUnread,
} from "./settings.actions";
import {
  selectEffectiveTheme,
  selectSettingsLanguage,
  selectPageAnimations,
  selectElementsAnimations,
} from "./settings.selectors";
import { State } from "./settings.model";
import { ApiService } from "@shared/services/api.service";
import { LocalStorageService } from "@shared/services/local-storage/local-storage.service";
import { TitleService } from "@shared/services/title/title.service";

export const SETTINGS_KEY = "SETTINGS";

const INIT = of("admin_panel-init-effect-trigger");

@Injectable()
export class SettingsEffects {
  hour = 0;

  changeHour = this.ngZone.runOutsideAngular(() =>
    setInterval(() => {
      const hour = new Date().getHours();
      if (hour !== this.hour) {
        this.hour = hour;
        this.ngZone.run(() =>
          this.store.dispatch(actionSettingsChangeHour({ hour })),
        );
      }
    }, 60_000),
  );

  persistSettings = createEffect(
    () =>
      this.actions$.pipe(
        ofType(
          actionSettingsChangeAnimationsElements,
          actionSettingsChangeAnimationsPage,
          actionSettingsChangeAnimationsPageDisabled,
          actionSettingsChangeAutoNightMode,
          actionSettingsChangeLanguage,
          actionSettingsChangeStickyHeader,
          actionSettingsChangeTheme,
          actionSettingsChangeSidebar,
          actionSettingsChangeMobileSidebar,
          actionSettingsChangeDirection,
          actionSettingsLoading,
          actionSettingsAddInProgressApi,
          actionSettingsRemoveInProgressApi,
          actionSettingsSetNotifications,
          actionSettingsSetBranch,
          actionSettingsSetBranches,
          actionSettingsSetNotificationUnread,
        ),
        withLatestFrom(this.store.pipe(select(selectSettingsState))),
        tap(([_, settings]) =>
          this.localStorageService.setItem(SETTINGS_KEY, settings),
        ),
      ),
    { dispatch: false },
  );

  updateRouteAnimationType = createEffect(
    () =>
      merge(
        INIT,
        this.actions$.pipe(
          ofType(
            actionSettingsChangeAnimationsElements,
            actionSettingsChangeAnimationsPage,
          ),
        ),
      ).pipe(
        withLatestFrom(
          combineLatest([
            this.store.pipe(select(selectPageAnimations)),
            this.store.pipe(select(selectElementsAnimations)),
          ]),
        ),
        tap(([_, [pageAnimations, elementsAnimations]]) =>
          this.animationsService.updateRouteAnimationType(
            pageAnimations,
            elementsAnimations,
          ),
        ),
      ),
    { dispatch: false },
  );

  updateTheme = createEffect(
    () =>
      merge(INIT, this.actions$.pipe(ofType(actionSettingsChangeTheme))).pipe(
        withLatestFrom(this.store.pipe(select(selectEffectiveTheme))),
        tap(([_, effectiveTheme]) => {
          const overlayEl = this.overlayContainer.getContainerElement();
          const classList = overlayEl.classList;
          const toRemove = Array.from(classList).filter((item: string) =>
            item.includes("-theme"),
          );
          if (toRemove.length) {
            classList.remove(...toRemove);
          }
          classList.add(effectiveTheme);
          overlayEl.setAttribute("data-theme", effectiveTheme);

          if (effectiveTheme === "dark-theme") {
            classList.add("dark");
          } else {
            classList.remove("dark");
          }
        }),
      ),
    { dispatch: false },
  );

  setTranslateServiceLanguage = createEffect(
    () =>
      this.store.pipe(
        select(selectSettingsLanguage),
        distinctUntilChanged(),
        tap((language) => {
          this.translateService.use(language);
        }),
      ),
    { dispatch: false },
  );

  setTitle = createEffect(
    () =>
      merge(
        this.actions$.pipe(ofType(actionSettingsChangeLanguage)),
        this.router.events.pipe(
          filter((event) => event instanceof ActivationEnd),
        ),
      ).pipe(
        tap(() => {
          this.titleService.setTitle(
            this.router.routerState.snapshot.root,
            this.translateService,
          );
        }),
      ),
    { dispatch: false },
  );

  generateCaptcha = createEffect(() =>
    this.actions$.pipe(
      ofType(actionSettingsGenerateCaptcha),
      mergeMap(({ size }) =>
        this._api
          .set(
            "captcha",
            "GET",
            {
              params: {
                w: size.w,
                h: size.h,
              },
            },
            () => {},
          )
          .pipe(map((data) => actionSettingsGeneratedCaptcha({ data }))),
      ),
    ),
  );

  constructor(
    private actions$: Actions,
    private store: Store<State>,
    private router: Router,
    private _api: ApiService,
    private overlayContainer: OverlayContainer,
    private localStorageService: LocalStorageService,
    private titleService: TitleService,
    private animationsService: AnimationsService,
    private translateService: TranslateService,
    private ngZone: NgZone,
  ) {}
}
