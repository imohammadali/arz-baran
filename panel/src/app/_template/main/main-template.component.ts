import { AfterViewInit, ChangeDetectionStrategy, Component, Injector, OnDestroy } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { AppState } from '@core/core.state'
import { actionSettingsChangeMobileSidebar, actionSettingsChangeSidebar } from '@core/settings/settings.actions'
import { selectMobileSidebar, selectSidebar } from '@core/settings/settings.selectors'
import { select, Store } from '@ngrx/store'
import { NavbarComponent } from '@shared/components/navbar/navbar.component'
import { SidebarComponent } from '@shared/components/sidebar/sidebar.component'
import { Utility } from '@shared/services/utility'
import { Observable, Subject } from 'rxjs'
import { filter } from 'rxjs/operators'

@Component({
  selector: 'main-template',
  templateUrl: './main-template.component.html',
  styleUrls: ['./main-template.component.scss'],
  imports: [SidebarComponent, NavbarComponent, RouterOutlet]
})
export class MainTemplateComponent extends Utility implements OnDestroy, AfterViewInit {
  show_sidebar$: Observable<boolean> = this.store.pipe(select(selectSidebar))
  show_mobile_sidebar$: Observable<boolean> = this.store.pipe(select(selectMobileSidebar))
  destroy$ = new Subject()

  constructor(
    private store: Store<AppState>,
    injector: Injector
  ) {
    super(injector)
  }

  ngAfterViewInit(): void {
    this.router.events.pipe(filter(x => true))
  }

  hidden_sidebar() {
    this.store.dispatch(actionSettingsChangeMobileSidebar({ show_mobile_sidebar: false }))
    this.store.dispatch(actionSettingsChangeSidebar({ show_sidebar: false }))
  }

  ngOnDestroy(): void {
    this.destroy$.next(true)
    this.destroy$.unsubscribe()
  }
}
