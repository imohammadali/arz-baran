import { AsyncPipe } from '@angular/common'
import { Component, Injector } from '@angular/core'
import { RouterModule } from '@angular/router'
import { authLogout } from '@core/auth/auth.actions'
import { selectCurrentUser } from '@core/auth/auth.selectors'
import { selectSettingsLanguage } from '@core/settings/settings.selectors'
import { TranslateModule } from '@ngx-translate/core'
import { PersianDatePipe } from '@shared/pipes/persian-date.pipe'
import { Utility } from '@shared/services/utility'
import { ButtonModule } from 'primeng/button'

@Component({
  selector: 'sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  standalone: true,
  imports: [ButtonModule, TranslateModule, AsyncPipe, PersianDatePipe, RouterModule]
})
export class SidebarComponent extends Utility {
  constructor(injector: Injector) {
    super(injector)
  }
  user$ = this.appStore.select(selectCurrentUser)
  currentLanguage$ = this.appStore.select(selectSettingsLanguage)
  logout() {
    this.appStore.dispatch(authLogout())
  }
}
