import { AsyncPipe } from '@angular/common'
import { ChangeDetectionStrategy, Component, Injector, OnDestroy, OnInit } from '@angular/core'
import { select } from '@ngrx/store'
import { Utility } from '@shared/services/utility'
import { combineLatest, distinctUntilChanged, Observable, Subject, takeUntil } from 'rxjs'
import { actionSettingsSetBranch, actionSettingsSetBranches } from '@core/settings/settings.actions'
import { selectBranch, selectBranches, selectEffectiveTheme, selectNotificationUnread, selectSettingsLanguage, selectSettingsNotification } from '@core/settings/settings.selectors'
import { TranslateModule } from '@ngx-translate/core'
import { DialogModule } from 'primeng/dialog'
import { RadioButtonModule } from 'primeng/radiobutton'
import { FormsModule } from '@angular/forms'
import { ButtonModule } from 'primeng/button'
import { BadgeModule } from 'primeng/badge'
import { RouterModule } from '@angular/router'

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'navbar',
  templateUrl: './navbar.component.html',
  styleUrls: [],
  imports: [ButtonModule, AsyncPipe, TranslateModule, DialogModule, RadioButtonModule, FormsModule, BadgeModule, RouterModule]
})
export class NavbarComponent extends Utility implements OnInit, OnDestroy {
  theme$: Observable<string> = this.appStore.pipe(select(selectEffectiveTheme))
  language$: Observable<string> = this.appStore.pipe(select(selectSettingsLanguage))
  notifications$: Observable<any[]> = this.appStore.pipe(select(selectSettingsNotification))
  destroy$ = new Subject()
  showDrawer = false
  selectedBranchModel = null
  branches$: Observable<any> = this.appStore.pipe(select(selectBranches))
  selectedBranch$: Observable<any> = this.appStore.pipe(select(selectBranch))
  showSelectBranchLg = false
  isNotificationUnread$ = this.appStore.pipe(select(selectNotificationUnread))
  constructor(injector: Injector) {
    super(injector)
    this.showDrawer = false
  }

  ngOnInit(): void {
    this.setBranch()
    this.language$.pipe(distinctUntilChanged(), takeUntil(this.destroy$)).subscribe(() => {
      this.getBranch()
    })
  }
  setBranch() {
    combineLatest([this.selectedBranch$, this.branches$])
      .pipe(takeUntil(this.destroy$))
      .subscribe(([selectedBranch, branches]) => {
        this.selectedBranchModel = branches.find(item => item?.key === selectedBranch?.key)
      })
  }
  getBranch() {
    this.api.set('branch/read', 'GET', { id: 'getBranchInNavbar' }, res => {
      this.appStore.dispatch(actionSettingsSetBranches({ branches: res.branches }))
    })
  }

  changeBranch() {
    this.appStore.dispatch(actionSettingsSetBranch({ branch: this.selectedBranchModel }))
    this.showSelectBranchLg = false
  }

  ngOnDestroy() {
    this.destroy$.next(true)
    this.destroy$.unsubscribe()
  }
}
