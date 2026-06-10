import { Location } from '@angular/common'
import { ChangeDetectorRef, Injector, NgZone } from '@angular/core'
import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms'
import { Title } from '@angular/platform-browser'
import { ActivatedRoute, Router } from '@angular/router'
import { AppState } from '@core/core.state'
import { selectSettingsInProgressApi } from '@core/settings/settings.selectors'
import { environment } from '@env/environment'
import { select, Store } from '@ngrx/store'
import { TranslateService } from '@ngx-translate/core'
import { ApiService } from '@shared/services/api.service'
import { DialogService } from '@shared/services/dialog.service'
import { NotificationService } from '@shared/services/notification.service'
import moment from 'jalali-moment'
import { BehaviorSubject, Observable } from 'rxjs'
import { switchMap, take } from 'rxjs/operators'
import { GenerateTitleService } from './generate-title.service'
import { setUser, setUserLevels } from '@core/auth/auth.actions'
import { PushNotificationService } from './pushNotification.service'
import { actionSettingsSetNotificationUnread } from '@core/settings/settings.actions'
import { TableFacade } from '@shared/components/table/+state/table.facade'
import { LocalStorageService } from './local-storage/local-storage.service'
import { PermissionService } from './permission/permission.service'

type valueType = 'volume' | 'speed'

export class Utility {
  protected router: Router
  protected route: ActivatedRoute
  protected fb: FormBuilder
  protected notify: NotificationService
  protected api: ApiService
  protected tableFacade: TableFacade
  protected dialogService: DialogService
  protected storageService: LocalStorageService
  protected translate: TranslateService
  protected ngZone: NgZone
  protected permissionService: PermissionService
  protected location: Location
  protected generateTitle: GenerateTitleService
  protected title: Title
  protected cd: ChangeDetectorRef
  protected appStore: Store<AppState>
  protected pushNotification: PushNotificationService

  inProgressApi$: Observable<string[]>

  constructor(injector: Injector) {
    this.router = injector.get(Router)
    this.route = injector.get(ActivatedRoute)
    this.fb = injector.get(FormBuilder)
    this.notify = injector.get(NotificationService)
    this.api = injector.get(ApiService)
    this.tableFacade = injector.get(TableFacade)
    this.dialogService = injector.get(DialogService)
    this.storageService = injector.get(LocalStorageService)
    this.translate = injector.get(TranslateService)
    this.ngZone = injector.get(NgZone)
    this.location = injector.get(Location)
    this.permissionService = injector.get(PermissionService)
    this.generateTitle = injector.get(GenerateTitleService)
    this.title = injector.get(Title)
    this.appStore = injector.get(Store<AppState>)
    this.cd = injector.get(ChangeDetectorRef)
    this.inProgressApi$ = this.appStore.pipe(select(selectSettingsInProgressApi))
    this.pushNotification = injector.get(PushNotificationService)
    if (this.route?.routeConfig?.data?.['tour_page_name']) {
      document.body.setAttribute('page-name', this.route.routeConfig.data?.['tour_page_name'])
    }
  }
  rowsPerPageOptions = [10, 20, 30]
  goTo(redirect: string) {
    this.router.navigate([redirect])
  }

  goBack() {
    this.location.back()
  }
  hasHttp(link) {
    if (!link) {
      return false
    }
    return link.startsWith('https://') || link.startsWith('http://')
  }
  hasError(controlName: string, formGroup: FormGroup, submitted = false, errorType = 'required'): boolean {
    const control: FormControl = formGroup.get(controlName) as FormControl
    // return ((control.dirty && control.invalid) || (control.invalid && submitted)) &&
    //   control.hasError(errorType);
    return control.invalid && submitted && control.hasError(errorType)
  }

  formArrayHasError(submitted = false, formArray?: FormArray, index?: number, controlName?: string, errorType = 'required'): boolean {
    let formControl: FormControl
    if (controlName) {
      formControl = formArray.at(index).get(controlName) as FormControl
    } else {
      formControl = formArray.at(index) as FormControl
    }
    return ((formControl.dirty && formControl.invalid) || (formControl.invalid && submitted)) && formControl.hasError(errorType)
  }

  hasValidator(controlName: string, formGroup: FormGroup, validator = Validators.required) {
    return formGroup?.get(controlName)?.hasValidator(validator)
  }

  convertUnix(date) {
    return moment(date).format('x')
  }
  convertToSeconds(date) {
    return moment(date).unix()
  }

  convertDate(date: string, time?: boolean): string {
    const lang = this.storageService.getItem('SETTINGS')?.lang || 'fa'
    const ts_date = moment(date).format('x')
    if (parseInt(ts_date) > 0) {
      switch (lang) {
        case 'fa': {
          time ? (date = moment(date).format('HH:mm:ss - jYYYY/jMM/jDD')) : (date = moment(date).format('jYYYY/jMM/jDD'))
          break
        }
        case 'en': {
          time ? (date = moment(date).format('YYYY/MM/DD - HH:mm:ss')) : (date = moment(date).format('YYYY/MM/DD'))
          break
        }
      }
    } else {
      date = '-'
    }
    return date
  }

  convertToTimePass(second: number): string {
    if (second < 0) return '0'
    const lang = this.storageService.getItem('SETTINGS')?.language

    const du = moment.duration(second, 'seconds')
    const years = du.years()
    const days = du.days()
    const months = du.months()
    const hours = du.hours() ? `${du.hours()} ساعت و ` : ''
    const minutes = du.minutes() ? `${du.minutes()} دقیقه و ` : ''
    const seconds = du.seconds() ? `${du.seconds()} تانیه ` : ''
    let prevHours = '',
      yearsAgo = '',
      monthsAgo = '',
      daysAgo = ''
    switch (lang) {
      case 'fa':
        yearsAgo = years ? `${years} سال ` : ''
        monthsAgo = months ? `${months} ماه و` : ''
        daysAgo = days ? `${days} روز و ` : ''
        prevHours = yearsAgo + monthsAgo + daysAgo
        break
      case 'en':
        yearsAgo = years ? `${years} year(s)` : ''
        monthsAgo = months ? `${months} month(s)` : ''
        daysAgo = days ? `${days} day(s)` : ''
        prevHours = yearsAgo + monthsAgo + daysAgo
        break
      default:
        break
    }
    return `${prevHours} ${hours} ${minutes} ${seconds} `
  }

  convertToTimePassShort(date): string {
    if (date < 0) return '0'

    const time = moment(),
      endTime = moment(time),
      startTime = moment(date),
      dif = endTime.diff(startTime),
      du = moment.duration(dif),
      days = du.days(),
      hours = du.hours(),
      minutes = du.minutes(),
      seconds = du.seconds()

    let temp = []
    temp.push(days)
    temp.push(hours)
    temp.push(minutes)
    temp.push(seconds)
    temp = temp.map(e => {
      if (e < 10) {
        return '0' + e
      }
      return e.toString()
    })

    return temp.join(':')
  }

  checkDateValid(dateString) {
    return Math.floor(new Date(dateString).getTime() / 1000) > 0
  }

  convertUnixToDate(unix: number, time?: boolean): string {
    const lang = this.storageService.getItem('SETTINGS')?.language || 'fa'
    let date = '-'
    if (unix > 0) {
      switch (lang) {
        case 'fa':
          date = time ? moment.unix(unix).format('HH:mm:ss - jYYYY/jMM/jDD') : moment.unix(unix).format('jYYYY/jMM/jDD')
          break
        case 'en':
          date = time ? moment.unix(unix).format('YYYY/MM/DD - HH:mm:ss') : moment.unix(unix).format('YYYY/MM/DD')
          break
      }
    }
    return date
  }

  convertUnixToISO(unix): string {
    const unixLength = String(unix).length
    if (unixLength < 13) {
      unix = `${unix}${'0'.repeat(13 - unixLength)}`
    }
    return new Date(Number(unix)).toISOString()
  }

  setTitle(title: string) {
    const prefixTitle = environment.appName || ''
    title = title ? `${prefixTitle} :: ${title}` : ''
    this.title.setTitle(title)
  }
  convertFaNumberToEnNumber(value: string): string {
    if (!value) return ''
    return value.replace(/[۰-۹]/g, (char: string) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(char).toString()).replace(/[\s-]/g, '')
  }
  filterComplete(event, originalList: Observable<any>, filteredList: BehaviorSubject<object[]>, formGroup: FormGroup, ctrl_name: string, optionLabel = 'name', optionValue = 'id', multiple = true, formType: 'driven' | 'reactive' = 'reactive', ngModel?) {
    let selectedItems: object[] = []
    let selectedItem: any = null
    const filtered: any[] = []
    const query = event.query
    if (formType == 'reactive') {
      if (multiple) {
        selectedItems = formGroup.get(ctrl_name)?.value?.map(item => item?.[optionValue]) || []
      } else {
        selectedItem = formGroup.get(ctrl_name)?.value
      }
    } else {
      if (multiple) {
        selectedItems = ngModel?.value?.map(item => item?.[optionValue]) || []
      } else {
        selectedItem = ngModel
      }
    }

    originalList.pipe(take(1)).subscribe(items => {
      for (let i = 0; i < (items as any[])?.length; i++) {
        const item = (items as any[])[i]
        if (item?.[optionLabel].toLowerCase().includes(query.toLowerCase())) {
          if (multiple && !selectedItems.includes(item?.[optionValue])) {
            filtered.push(item)
          } else if (selectedItem?.value?.[optionValue] != item?.[optionValue] && multiple === false) {
            filtered.push(item)
          }
        }
      }
      filteredList.next(filtered)
    })
  }

  removeDuplicatesItems(data: any[], itemIdFromData = 'id', selfId = 'id') {
    return data.filter((item, index, self) => {
      return index === self.findIndex(e => e?.[selfId] == item?.[itemIdFromData])
    })
  }

  checkApiLoading(api_key: string): Observable<boolean> {
    return this.inProgressApi$.pipe(
      switchMap(data => {
        return new BehaviorSubject<boolean>(!!data?.includes(api_key))
      })
    )
  }
  public valueToReadable(value: number, decimals = 2, type: valueType) {
    if (value === 0) return type === 'volume' ? '0 Byte' : '0 bit/s'

    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const speed = ['bit/s', 'kbit/s', 'mbit/s', 'gbit/s', 'tbit/s', 'pbit/s', 'ebit/s', 'zbit/s', 'ybit/s']
    const volumeSizes = ['Byte', 'KByte', 'MByte', 'GByte', 'TByte', 'PByte', 'EByte', 'ZByte', 'YByte']

    const i = Math.floor(Math.log(value) / Math.log(k))

    return type === 'volume' ? parseFloat((value / Math.pow(k, i)).toFixed(dm)) + ' ' + volumeSizes[i] : parseFloat((value / Math.pow(k, i)).toFixed(dm)) + ' ' + speed[i]
  }

  hasTable = false
  getPagination(tblName: string) {
    const activePagination = this.storageService.getItem('active-table-pagination')
    const page = this.route.snapshot.queryParams?.page || 1
    const rows = this.route.snapshot.queryParams?.limit || 10
    if (tblName == activePagination?.tableName) {
      this.hasTable = true
      return {
        ...this.storageService.getItem('active-table-pagination'),
        page: parseInt(page),
        rows: parseInt(rows)
      }
    }
    setTimeout(() => {
      if (!this.hasTable) this.router.navigate([], { queryParams: { ...this.route.snapshot.queryParams, limit: undefined, page: undefined }, relativeTo: this.route })
    }, 100)
    return {
      page: 1,
      rows: 10
    }
  }
  copyToClipboard(code: string, title?: string) {
    document.addEventListener('copy', (e: ClipboardEvent) => {
      e.clipboardData.setData('text/plain', code)
      e.preventDefault()
      document.removeEventListener('copy', null)
    })
    document.execCommand('copy')
    this.notify.success({ title: title || 'card.discount_code', message: 'feedback.copied' })
  }

  shareBanner(link) {
    const baseUrl = window.location.origin
    if (navigator.canShare) {
      navigator.share({
        title: 'city banner link',
        text: 'share with your friends',
        url: this.hasHttp(link) ? link : baseUrl + link
      })
    } else {
      this.copyToClipboard(this.hasHttp(link) ? link : baseUrl + link, 'home.bannerLink')
    }
  }
  getUserProfile() {
    if (this.router.url === '/auth') return
    this.api.set('profile/me', 'GET', { id: 'getProfile' }, res => {
      this.getUserLevels(res.user)
    })
  }

  getUserLevels(user) {
    this.api.set('point-level/read', 'GET', { id: 'getUserLevel' }, res => {
      const sortedLevels = res.levels.sort((a, b) => a.min_points - b.min_points)
      const userLevels = sortedLevels.map(item => {
        return {
          ...item,
          percent: (item.min_points * 100) / sortedLevels[sortedLevels?.length - 1]?.min_points
        }
      })
      const updateUser = {
        ...user,
        level: [...userLevels].reverse().find(item => item.min_points <= user.point)?.name,
        levelLogo: [...userLevels].reverse().find(item => item.min_points <= user.point)?.logo,
        nextLevel: userLevels.find(item => item.min_points >= user.point)?.name,
        toTheNextPoint: userLevels.find(item => item.min_points >= user.point)?.min_points - user.point,
        percent: (user.point * userLevels[userLevels?.length - 1]?.percent) / sortedLevels[sortedLevels?.length - 1]?.min_points <= userLevels[userLevels?.length - 1]?.percent ? (user.point * userLevels[userLevels?.length - 1]?.percent) / sortedLevels[sortedLevels?.length - 1]?.min_points : userLevels[userLevels?.length - 1]?.percent
      }
      this.appStore.dispatch(setUser({ user: updateUser }))
      this.appStore.dispatch(setUserLevels({ userLevels: userLevels }))
    })
  }
  calcTimeDiff(endDay: Date = new Date()): boolean {
    const dDay = endDay.valueOf()
    const timeDifference = dDay - Date.now()
    return timeDifference <= 0
  }
 
  getUnreadNotifications() {
    this.api.set('notification/read', 'GET', { id: 'getNotificationsInHomePage' }, res => {
      const isNotificationUnread = res?.histories?.some(item => !item.view)
      this.appStore.dispatch(actionSettingsSetNotificationUnread({ isNotificationUnread: isNotificationUnread }))
    })
  }
}
