import { CommonModule } from '@angular/common'
import { ChangeDetectionStrategy, Component, Injector, OnDestroy, OnInit } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { actionSettingsSetBranch, actionSettingsSetBranches } from '@core/settings/settings.actions'
import { selectBranch, selectBranches, selectEffectiveTheme, selectNotificationUnread, selectSettingsLanguage } from '@core/settings/settings.selectors'
import { select } from '@ngrx/store'
import { TranslateModule } from '@ngx-translate/core'
import { Utility } from '@shared/services/utility'
import { DialogModule } from 'primeng/dialog'
import { RadioButton } from 'primeng/radiobutton'
import { BehaviorSubject, distinctUntilChanged, filter, Observable, startWith, Subject, takeUntil } from 'rxjs'
import { ButtonModule } from 'primeng/button'
import { BadgeModule } from 'primeng/badge'
import { NavigationEnd, RouterModule } from '@angular/router'

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'simple-navbar',
  templateUrl: './simple-navbar.component.html',
  styleUrls: [],
  imports: [ButtonModule, TranslateModule, CommonModule, DialogModule, RadioButton, FormsModule, BadgeModule, RouterModule]
})
export class SimpleNavbarComponent extends Utility implements OnInit, OnDestroy {
  theme$: Observable<string> = this.appStore.pipe(select(selectEffectiveTheme))
  language$: Observable<string> = this.appStore.pipe(select(selectSettingsLanguage))
  destroy$ = new Subject()
  selectedBranch$: Observable<any> = this.appStore.pipe(select(selectBranch))
  showSelectBranchLg = false
  branches$: Observable<any> = this.appStore.pipe(select(selectBranches))
  selectedBranchModel = null
  isNotificationUnread$ = this.appStore.pipe(select(selectNotificationUnread))

  constructor(injector: Injector) {
    super(injector)
  }
  pageTitle$ = new BehaviorSubject<string>('')
  ngOnInit(): void {
    this.router.events
      .pipe(
        takeUntil(this.destroy$),
        filter(event => event instanceof NavigationEnd),
        startWith(null)
      )
      .subscribe(() => {
        let lastChild = this.router.routerState.snapshot.root
        while (lastChild.children.length) {
          lastChild = lastChild.children[0]
        }
        this.pageTitle$.next(lastChild.data.title)
      })
    this.language$.pipe(distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(() => {
      this.getBranch()
      this.setBranch()
    })
  }
  setBranch() {
    this.selectedBranch$.pipe(takeUntil(this.destroy$)).subscribe(res => {
      this.branches$.pipe(takeUntil(this.destroy$)).subscribe(branches => {
        this.selectedBranchModel = branches.find(item => item.key === res.key)
      })
    })
  }
  getBranch() {
    this.api.set('branch/read', 'GET', { id: 'getBranchInSimpleNavbar' }, res => {
      this.appStore.dispatch(actionSettingsSetBranches({ branches: res.branches }))
      this.changeBranch()
    })
  }
  changeBranch() {
    this.appStore.dispatch(actionSettingsSetBranch({ branch: this.selectedBranchModel }))
    this.showSelectBranchLg = false
  }

  ngOnDestroy() {
    this.destroy$.next(true)
    this.destroy$.complete()
  }
}
