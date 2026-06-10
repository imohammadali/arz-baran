import { ViewportScroller } from '@angular/common'
import { ChangeDetectionStrategy, Component, Injector, OnDestroy, OnInit, Renderer2 } from '@angular/core'
import { Event, NavigationEnd, RouterOutlet, Scroll } from '@angular/router'
import { routeAnimations } from '@core/animations/route.animations'
import { selectIsAuthenticated, selectNotificationToken } from '@core/auth/auth.selectors'
import { actionSettingsSetBranches } from '@core/settings/settings.actions'
import { selectEffectiveTheme, selectRtlDirection, selectSettingsLanguage } from '@core/settings/settings.selectors'
import { select } from '@ngrx/store'
import { GeoService } from '@shared/services/geo.service'
import { Utility } from '@shared/services/utility'
import { ClipboardService } from 'ngx-clipboard'
import { ToastModule } from 'primeng/toast'
import { Observable, Subject, takeUntil } from 'rxjs'
import { distinctUntilChanged, filter, pairwise } from 'rxjs/operators'
import { ConfirmDialogModule } from 'primeng/confirmdialog'
import { TranslateModule } from '@ngx-translate/core'
import { ButtonModule } from 'primeng/button'
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [routeAnimations],
  imports: [ToastModule, RouterOutlet, ConfirmDialogModule, TranslateModule, ButtonModule]
})
export class AppComponent extends Utility implements OnInit, OnDestroy {
  isAuthenticated$: Observable<boolean> | undefined
  language$: Observable<string> | undefined
  theme$: Observable<string> | undefined
  rtl$: Observable<boolean> | undefined
  destroy$ = new Subject()

  constructor(
    private geo: GeoService,
    public renderer: Renderer2,
    injector: Injector,
    private clipboardService: ClipboardService,
    private viewportScroller: ViewportScroller
  ) {
    super(injector)
    this.geo.init()
    this.router.events
      .pipe(
        filter((e: Event): e is Scroll => e instanceof Scroll),
        pairwise()
      )
      .subscribe(([previousEvent, event]) => {
        if (event.position) {
          // Back/forward: restore saved position
          this.viewportScroller.scrollToPosition(event.position)
        } else if (event.anchor) {
          // Hash navigation
          this.viewportScroller.scrollToAnchor(event.anchor)
        } else {
          if ('urlAfterRedirects' in previousEvent.routerEvent && 'urlAfterRedirects' in event.routerEvent) {
            const prevPath = previousEvent.routerEvent.urlAfterRedirects.split('?')[0]
            const currPath = event.routerEvent.urlAfterRedirects.split('?')[0]
            if (prevPath !== currPath) {
              this.viewportScroller.scrollToPosition([0, 0])
            }
          }
        }
      })
  }

  ngOnInit() {
    this.removeInitialLoader()
    this.storageService.testLocalStorage()
    this.getBranch()
    this.isAuthenticated$ = this.appStore.pipe(select(selectIsAuthenticated))
    this.language$ = this.appStore.pipe(select(selectSettingsLanguage))
    this.theme$ = this.appStore.pipe(select(selectEffectiveTheme))
    this.rtl$ = this.appStore.pipe(select(selectRtlDirection))
    this.theme$.pipe(distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(theme => {
      this.renderer.setAttribute(document.documentElement, 'data-theme', theme)

      if (theme === 'dark-theme') {
        this.renderer.addClass(document.documentElement, 'dark')
      } else {
        this.renderer.removeClass(document.documentElement, 'dark')
      }
    })

    this.rtl$.pipe(distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(rtl => {
      if (rtl) {
        this.renderer.setAttribute(document.documentElement, 'dir', 'rtl')
      } else {
        this.renderer.setAttribute(document.documentElement, 'dir', 'ltr')
      }
    })
    this.clipboardService.copyResponse$.pipe(takeUntil(this.destroy$)).subscribe(re => {
      if (re.isSuccess) {
        this.notify.success({ message: 'feedback.copied' })
      }
    })
    this.connectForPushNotification()
    this.pushNotification.requestNotificationPermission()
    this.pushNotification.messages$.pipe(takeUntil(this.destroy$)).subscribe(notification => {
      this.notify.info({ title: notification.title, message: notification.message, data: { image_url: notification.image_url, link: notification.trigger_link } })
      this.getUnreadNotifications()
    })
    this.router.events.pipe(filter(event => event instanceof NavigationEnd)).subscribe(() => {
      if (this.router.url !== '/auth') {
        this.getUnreadNotifications()
      }
    })
  }
  getBranch() {
    this.api.set('branch/read', 'GET', { id: 'getBranchInApp' }, res => {
      this.appStore.dispatch(actionSettingsSetBranches({ branches: res.branches }))
    })
  }
  connectForPushNotification() {
    this.appStore
      .select(selectNotificationToken)
      .pipe(takeUntil(this.destroy$))
      .subscribe(notificationToken => {
        this.pushNotification.connect(notificationToken)
      })
  }

  removeInitialLoader() {
    const loader = document.getElementById('app-initial-loader')
    if (loader) {
      loader.classList.add('fade-out')
      loader.addEventListener('transitionend', () => {
        loader.remove()
      })
    }
  }

  ngOnDestroy() {
    this.destroy$.next(true)
    this.destroy$.unsubscribe()
  }
}
