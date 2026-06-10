import { ChangeDetectionStrategy, Component, Injector, OnDestroy, OnInit, signal } from '@angular/core'
import { filter, startWith, Subject, takeUntil } from 'rxjs'
import { Utility } from '@shared/services/utility'
import { SidebarComponent } from '@shared/components/sidebar/sidebar.component'
import { SimpleNavbarComponent } from '@shared/components/simple-navbar/simple-navbar.component'
import { NavigationEnd, RouterModule, RouterOutlet } from '@angular/router'
import { TranslateModule } from '@ngx-translate/core'
import { ButtonModule } from 'primeng/button'

@Component({
  selector: 'main-template',
  templateUrl: './simple-back-template.component.html',
  styleUrls: ['./simple-back-template.component.scss'],
  imports: [ButtonModule, SidebarComponent, SimpleNavbarComponent, RouterOutlet, TranslateModule, RouterModule]
})
export class SimpleBackTemplateComponent extends Utility implements OnInit, OnDestroy {
  destroy$ = new Subject()
  pageTitle = signal('')

  constructor(injector: Injector) {
    super(injector)
  }
  ngOnInit() {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$),
        startWith(null)
      )
      .subscribe(() => {
        let lastChild = this.router.routerState.snapshot.root
        while (lastChild.children.length) {
          lastChild = lastChild.children[0]
        }
        this.pageTitle.set(lastChild.data.title)
      })
  }

  ngOnDestroy(): void {
    this.destroy$.next(true)
    this.destroy$.complete()
  }
}
