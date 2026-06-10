import { ChangeDetectionStrategy, Component, Injector } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { selectIsAuthenticated } from '@core/auth/auth.selectors'
import { select } from '@ngrx/store'
import { TranslateModule } from '@ngx-translate/core'
import { Utility } from '@shared/services/utility'
import { Button, ButtonModule } from 'primeng/button'

@Component({
  selector: 'app-error-template',
  templateUrl: './error-template.component.html',
  styleUrls: ['./error-template.component.scss'],
  imports: [ButtonModule, TranslateModule]
})
export class ErrorTemplateComponent extends Utility {
  isLoggedIn = toSignal(this.appStore.pipe(select(selectIsAuthenticated)), { initialValue: false })
  constructor(injector: Injector) {
    super(injector)
  }
}
