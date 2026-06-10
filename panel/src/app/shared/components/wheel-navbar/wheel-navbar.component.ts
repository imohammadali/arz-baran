import { AsyncPipe } from '@angular/common'
import { Component, Injector, OnDestroy } from '@angular/core'
import { selectEffectiveTheme } from '@core/settings/settings.selectors'
import { select } from '@ngrx/store'
import { TranslateModule } from '@ngx-translate/core'
import { Utility } from '@shared/services/utility'
import { Observable, Subject } from 'rxjs'
import { ButtonModule } from 'primeng/button'
import { RouterModule } from '@angular/router'

@Component({
  selector: 'wheel-navbar',
  templateUrl: './wheel-navbar.component.html',
  styleUrls: [],
  imports: [ButtonModule, AsyncPipe, TranslateModule, RouterModule]
})
export class WheelNavbarComponent extends Utility implements OnDestroy {
  theme$: Observable<string> = this.appStore.pipe(select(selectEffectiveTheme))
  destroy$ = new Subject()

  constructor(injector: Injector) {
    super(injector)
  }

  ngOnDestroy() {
    this.destroy$.next(true)
    this.destroy$.unsubscribe()
  }
}
