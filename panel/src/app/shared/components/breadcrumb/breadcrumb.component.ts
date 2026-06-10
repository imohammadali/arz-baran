import { Component, OnInit, ChangeDetectionStrategy, OnDestroy, Injector } from '@angular/core'
import { map } from 'rxjs/operators'
import { BreadcrumbFacade } from './+state/breadcrumb.facade'
import { TranslateService } from '@ngx-translate/core'
import { Subject, takeUntil } from 'rxjs'
import { Utility } from '@shared/services/utility'
import { AsyncPipe } from '@angular/common';
import { Breadcrumb } from 'primeng/breadcrumb'
import { MenuItem } from 'primeng/api'

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'breadcrumb',
  templateUrl: './breadcrumb.component.html',
  imports: [AsyncPipe, Breadcrumb]
})
export class BreadcrumbComponent extends Utility implements OnInit, OnDestroy {
  home: MenuItem = { icon: 'pi pi-home', routerLink: '/', iconStyle: { 'font-size': '1.2rem' } }
  items$ = this._facade.state$.pipe(
    map(({ data }) => {
      if (!data) return []
      let labels: string[] = this.translate.instant('breadcrumb.' + data)

      if (labels?.length) {
        labels = this.translate.instant(labels)
      }
      let result = Object.values(labels).map(res => {
        return { label: res, style: { transform: 'translateY(2px)' } }
      })
      if (result.find(x => x.label == '/')) {
        return []
      }
      return result || []
    })
  )

  $show = this._facade.show$
  destroy$ = new Subject()

  constructor(
    private _facade: BreadcrumbFacade,
    injector: Injector
  ) {
    super(injector)
  }

  ngOnInit(): void {
    this.items$.pipe(takeUntil(this.destroy$)).subscribe(items => {
      if (!items?.length) return
      this.setTitle(this.translate?.instant(items[items.length - 1]?.label || ''))
    })
  }

  ngOnDestroy() {
    this.destroy$.next(true)
    this.destroy$.unsubscribe()
  }
}
