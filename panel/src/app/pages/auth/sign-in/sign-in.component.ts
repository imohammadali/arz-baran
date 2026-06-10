import { CommonModule } from '@angular/common'
import { Component, Injector, OnDestroy, OnInit } from '@angular/core'
import { FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms'
import { DomSanitizer, SafeHtml } from '@angular/platform-browser'
import { setNotificationToken, setToken } from '@core/auth/auth.actions'
import { actionSettingsChangeDirection, actionSettingsChangeLanguage, actionSettingsSetBranch, actionSettingsSetBranches } from '@core/settings/settings.actions'
import { selectBranch, selectBranches, selectEffectiveTheme, selectSettingsLanguage } from '@core/settings/settings.selectors'
import { select } from '@ngrx/store'
import { TranslateModule } from '@ngx-translate/core'
import { DrawerComponent } from '@shared/components/drawer/drawer.component'
import { IRule } from '@shared/interfaces/Responses/IRule'
import { Utility } from '@shared/services/utility'
import { CustomValidators } from '@shared/validators/custom-validators'
import * as moment from 'jalali-moment'
import { ButtonModule } from 'primeng/button'
import { FloatLabelModule } from 'primeng/floatlabel'
import { InputOtpModule } from 'primeng/inputotp'
import { InputTextModule } from 'primeng/inputtext'
import { MessageModule } from 'primeng/message'
import { RadioButtonModule } from 'primeng/radiobutton'
import { SelectButtonChangeEvent, SelectButtonModule } from 'primeng/selectbutton'
import { BehaviorSubject, distinctUntilChanged, Observable, Subject, takeUntil } from 'rxjs'
@Component({
  selector: 'sign-in',
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.scss'],
  standalone: true,
  imports: [DrawerComponent, ButtonModule, SelectButtonModule, FormsModule, TranslateModule, CommonModule, ReactiveFormsModule, MessageModule, RadioButtonModule, InputOtpModule, InputTextModule, FloatLabelModule]
})
export class SignInComponent extends Utility implements OnInit, OnDestroy {
  stateOptions = [
    { label: 'فا', value: 'fa' },
    { label: 'En', value: 'en' }
  ]
  language$: Observable<string> = this.appStore.pipe(select(selectSettingsLanguage))
  showSelectBranch = false
  showEnterPhone = false
  showEnterOtp = false
  branches = []
  selectedBranch$: Observable<any> = this.appStore.pipe(select(selectBranch))
  selectedBranchModel: any = null
  branches$: Observable<any> = this.appStore.pipe(select(selectBranches))
  theme$: Observable<string> = this.appStore.pipe(select(selectEffectiveTheme))
  phoneFormGroup: FormGroup
  otpFormGroup: FormGroup
  submittedPhone = false
  submittedOtp = false
  rules$ = new BehaviorSubject<IRule>(null)
  showRules: boolean = false
  toExpireOTP = new BehaviorSubject(90)
  timerInterval = null
  destroy$ = new Subject()
  loadingSubmitPhone = false
  loadingSubmitOtp = false
  protected readonly moment = moment
  lightDescription: SafeHtml
  darkDescription: SafeHtml
  constructor(
    injector: Injector,
    private sanitizer: DomSanitizer
  ) {
    super(injector)
  }

  ngOnInit() {
    this.branches$.subscribe(res => {
      this.branches = res
      this.resetBranch()
    })
    this.getRules()
    this.migrateForm()
    this.route.queryParams.subscribe(params => {
      if (params['referral_code']) {
        localStorage.setItem('referral_code', params['referral_code'])
      }
    })
    localStorage.removeItem('referralModalShown')
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
    this.api.set('branch/read', 'GET', { id: 'getBranchInSignIn' }, res => {
      this.appStore.dispatch(actionSettingsSetBranches({ branches: res.branches }))
      this.changeBranch()
    })
  }

  getRules() {
    this.api.set('privacy-policy/read', 'GET', {}, res => {
      this.lightDescription = this.sanitizer.bypassSecurityTrustHtml(res?.privacy_policy?.light_description)
      this.darkDescription = this.sanitizer.bypassSecurityTrustHtml(res?.privacy_policy?.dark_description)
      this.rules$.next(res?.privacy_policy)
      this.cd.detectChanges()
    })
  }

  changeLanguage(event: SelectButtonChangeEvent) {
    const language = event.value
    switch (language) {
      case 'en': {
        this.appStore.dispatch(actionSettingsChangeLanguage({ language: 'en' }))
        this.appStore.dispatch(actionSettingsChangeDirection({ rtl: false }))
        break
      }
      case 'fa': {
        this.appStore.dispatch(actionSettingsChangeLanguage({ language: 'fa' }))
        this.appStore.dispatch(actionSettingsChangeDirection({ rtl: true }))
        break
      }
      default: {
        this.appStore.dispatch(actionSettingsChangeLanguage({ language: 'en' }))
        this.appStore.dispatch(actionSettingsChangeDirection({ rtl: false }))
      }
    }
  }

  changeBranch() {
    this.appStore.dispatch(actionSettingsSetBranch({ branch: this.selectedBranchModel }))
    this.showSelectBranch = false
  }

  resetBranch() {
    this.selectedBranch$.subscribe(res => {
      this.selectedBranchModel = this.branches.find(item => item.key === res.key)
    })
  }

  submitPhone() {
    this.submittedPhone = true
    if (this.phoneFormGroup.invalid) return
    this.loadingSubmitPhone = true
    this.cd.detectChanges()
    const fv = this.phoneFormGroup.getRawValue()
    fv.mobile = this.convertFaNumberToEnNumber(fv.mobile)
    this.api.set(
      'authorization/login',
      'POST',
      {
        body: fv
      },
      res => {
        this.showEnterOtp = true
        this.showEnterPhone = false
        this.submittedPhone = false
        this.loadingSubmitPhone = false
        this.cd.detectChanges()
        this.otpFormGroup.reset()
        setTimeout(() => {
          this.notify.success({
            title: 'auth.send_code',
            message: res?.message
          })
        })
        this.startTimer(res.expiration)
      },
      () => {
        this.loadingSubmitPhone = false
        this.cd.detectChanges()
      }
    )
  }
  authentication() {
    this.api.set('sso/authorization', 'GET', {}, res => {
      if (res.url) {
        window.open(res.url, '_self')
      } else {
        this.notify.error({ title: 'profile.authentication', message: res.message })
      }
    })
  }
  submitOtp() {
    this.submittedOtp = true
    if (this.otpFormGroup.invalid) return
    this.loadingSubmitOtp = true
    this.cd.detectChanges()
    const fv = this.otpFormGroup.getRawValue()
    fv.code = this.convertFaNumberToEnNumber(fv.code)
    const phoneForm = this.phoneFormGroup.getRawValue()
    phoneForm.mobile = this.convertFaNumberToEnNumber(phoneForm.mobile)
    this.api.set(
      'authorization/verify',
      'POST',
      {
        body: { ...fv, mobile: phoneForm.mobile }
      },
      res => {
        if (res?.sso_required) {
          this.authentication()
        } else {
          this.loadingSubmitOtp = false
          this.cd.detectChanges()
          this.appStore.dispatch(setToken({ token: res?.token, isAuthenticated: true }))
          this.appStore.dispatch(setNotificationToken({ notificationToken: res?.notification_token }))
          this.router.navigate(['/home'])
        }
      },
      () => {
        this.loadingSubmitOtp = false
        this.cd.detectChanges()
      }
    )
  }
  migrateForm() {
    this.phoneFormGroup = this.fb.group({
      mobile: ['', [Validators.required, Validators.minLength(10), CustomValidators.iranianPhoneNumberValidator()]]
    })
    this.otpFormGroup = this.fb.group({
      code: ['', [Validators.required, Validators.minLength(6)]]
    })
  }

  startTimer(expiration) {
    clearInterval(this.timerInterval)
    this.toExpireOTP.next(expiration)
    this.timerInterval = setInterval(() => {
      if (this.toExpireOTP.value > 0) {
        this.toExpireOTP.next(this.toExpireOTP.value - 1)
      } else {
        clearInterval(this.timerInterval)
      }
    }, 1000)
  }

  stopTimer() {
    clearInterval(this.timerInterval)
  }

  editPhone() {
    this.stopTimer()
    this.showEnterOtp = false
    this.submittedOtp = false
    this.onEnterPhone()
  }

  onEnterPhone() {
    this.showEnterPhone = true
    this.phoneFormGroup.reset()
    this.submittedPhone = false
  }

  ngOnDestroy(): void {
    clearInterval(this.timerInterval)
    this.destroy$.next(true)
    this.destroy$.unsubscribe()
  }
}
