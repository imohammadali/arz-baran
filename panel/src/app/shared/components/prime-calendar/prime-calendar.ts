import { animate, AnimationEvent, state, style, transition, trigger } from '@angular/animations'
import { CommonModule, NgClass, NgIf, NgStyle } from '@angular/common'
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ContentChildren, DOCUMENT, ElementRef, EventEmitter, forwardRef, Inject, Input, NgZone, OnDestroy, OnInit, Output, QueryList, Renderer2, TemplateRef, ViewChild, ViewEncapsulation } from '@angular/core'
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms'
import { TranslateService } from '@ngx-translate/core'
import { IconDirective } from '@shared/directives/icon.directive'
import { NotificationService } from '@shared/services/notification.service'
import moment from 'jalali-moment'
import { OverlayService, PrimeTemplate } from 'primeng/api'
import { ButtonDirective, ButtonModule } from 'primeng/button'
import { PrimeNG } from 'primeng/config'
import { DatePicker } from 'primeng/datepicker'
import { ConnectedOverlayScrollHandler, DomHandler } from 'primeng/dom'
import { InputTextModule } from 'primeng/inputtext'
import { Popover } from 'primeng/popover'
import { Ripple } from 'primeng/ripple'
import { ObjectUtils, UniqueComponentId, ZIndexUtils } from 'primeng/utils'
import { BehaviorSubject, Subscription } from 'rxjs'

export const CALENDAR_VALUE_ACCESSOR: any = {
  provide: NG_VALUE_ACCESSOR,
  useExisting: forwardRef(() => PrimeCalendar),
  multi: true
}

export interface LocaleSettings {
  firstDayOfWeek?: number
  dayNames?: string[]
  dayNamesShort?: string[]
  dayNamesMin?: string[]
  monthNames?: string[]
  monthNamesShort?: string[]
  today?: string
  clear?: string
  dateFormat?: string
  weekHeader?: string
}

export type CalendarTypeView = 'date' | 'month' | 'year'

@Component({
  selector: 'prime-calendar',
  templateUrl: 'prime-calendar.html',
  animations: [
    trigger('overlayAnimation', [
      state(
        'visibleTouchUI',
        style({
          transform: 'translate(-50%,-50%)',
          opacity: 1
        })
      ),
      transition('void => visible', [
        style({
          opacity: 0,
          transform: 'scaleY(0.8)'
        }),
        animate('{{showTransitionParams}}', style({ opacity: 1, transform: '*' }))
      ]),
      transition('visible => void', [animate('{{hideTransitionParams}}', style({ opacity: 0 }))]),
      transition('void => visibleTouchUI', [
        style({
          opacity: 0,
          transform: 'translate3d(-50%, -40%, 0) scale(0.9)'
        }),
        animate('{{showTransitionParams}}')
      ]),
      transition('visibleTouchUI => void', [
        animate(
          '{{hideTransitionParams}}',
          style({
            opacity: 0,
            transform: 'translate3d(-50%, -40%, 0) scale(0.9)'
          })
        )
      ])
    ])
  ],
  host: {
    class: 'p-element p-inputwrapper',
    '[class.p-inputwrapper-filled]': 'filled',
    '[class.p-inputwrapper-focus]': 'focus',
    '[class.p-calendar-clearable]': 'showClear && !disabled'
  },
  styleUrls: ['./prime-calendar.scss'],
  providers: [CALENDAR_VALUE_ACCESSOR],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgClass, NgStyle, NgIf, CommonModule, ButtonDirective, InputTextModule, Popover, Ripple, DatePicker, IconDirective, ButtonModule],
  encapsulation: ViewEncapsulation.None
})
export class PrimeCalendar implements OnInit, OnDestroy, ControlValueAccessor {
  @Input() style: any

  @Input() styleClass: string

  @Input() inputStyle: any

  @Input() inputId: string

  @Input() name: string

  @Input() inputStyleClass: string

  @Input() placeholder: string

  @Input() ariaLabelledBy: string

  @Input() iconAriaLabel: string

  @Input() disabled: any

  @Input() dateFormat: string

  @Input() miladiFormat: string

  @Input() format: string

  @Input() multipleSeparator: string = ','

  @Input() rangeSeparator: string = '-'

  @Input() inline: boolean = false

  @Input() showOtherMonths: boolean = true

  @Input() selectOtherMonths: boolean

  @Input() showIcon: boolean = true

  @Input() icon: string

  @Input() appendTo: any

  @Input() minDateFeedback: string

  @Input() maxDateFeedback: string

  @Input() readonlyInput: boolean

  @Input() shortYearCutoff: any = '+10'

  @Input() monthNavigator: boolean

  @Input() yearNavigator: boolean

  @Input() hourFormat: string = '24'

  @Input() timeOnly: boolean

  @Input() stepHour: number = 1

  @Input() stepMinute: number = 1

  @Input() stepSecond: number = 1

  @Input() showSeconds: boolean = false

  @Input() required: boolean

  @Input() showOnFocus: boolean = true

  @Input() showWeek: boolean = false

  @Input() showClear: boolean = false

  @Input() dataType: string = 'date'

  @Input() selectionMode: string = 'single'

  @Input() maxDateCount: number

  @Input() showButtonBar: boolean

  @Input() todayButtonStyleClass: string = 'p-button-text'

  @Input() clearButtonStyleClass: string = 'p-button-text'

  @Input() autoZIndex: boolean = true

  @Input() baseZIndex: number = 0

  @Input() panelStyleClass: string

  @Input() panelStyle: any

  @Input() keepInvalid: boolean = false

  @Input() hideOnDateTimeSelect: boolean = true

  @Input() touchUI: boolean

  @Input() timeSeparator: string = ':'

  @Input() focusTrap: boolean = true

  @Input() showTransitionOptions: string = '.12s cubic-bezier(0, 0, 0.2, 1)'

  @Input() hideTransitionOptions: string = '.1s linear'

  @Output() onFocus: EventEmitter<any> = new EventEmitter()

  @Output() onBlur: EventEmitter<any> = new EventEmitter()

  @Output() onClose: EventEmitter<any> = new EventEmitter()

  @Output() onSelect: EventEmitter<any> = new EventEmitter()

  @Output() onClear: EventEmitter<any> = new EventEmitter()

  @Output() onInput: EventEmitter<any> = new EventEmitter()

  @Output() onTodayClick: EventEmitter<any> = new EventEmitter()

  @Output() onClearClick: EventEmitter<any> = new EventEmitter()

  @Output() onMonthChange: EventEmitter<any> = new EventEmitter()

  @Output() onYearChange: EventEmitter<any> = new EventEmitter()

  @Output() onClickOutside: EventEmitter<any> = new EventEmitter()

  @Output() onShow: EventEmitter<any> = new EventEmitter()

  @ContentChildren(PrimeTemplate) templates: QueryList<any>

  @Input() tabindex: number

  @ViewChild('container', { static: false })
  containerViewChild: ElementRef

  @ViewChild('inputfield', { static: false })
  inputfieldViewChild: ElementRef

  @ViewChild('jumpDayOverlay', { static: false })
  jumpDayOverlay: Popover

  @ViewChild('contentWrapper', { static: false }) set content(content: ElementRef) {
    this.contentViewChild = content

    if (this.contentViewChild) {
      if (this.isMonthNavigate) {
        Promise.resolve(null).then(() => this.updateFocus())
        this.isMonthNavigate = false
      } else {
        if (!this.focus) {
          this.initFocusableCell()
        }
      }
    }
  }

  contentViewChild: ElementRef

  value: any

  momentValue$ = new BehaviorSubject<moment.Moment>(null)

  dates: any[]

  months: any[]

  weekDays: string[]

  currentMonth: number

  currentYear: number

  currentHour: number

  currentMinute: number

  currentSecond: number

  pm: boolean

  mask: HTMLDivElement

  maskClickListener: VoidFunction | null

  overlay: HTMLDivElement

  responsiveStyleElement: any

  overlayVisible: boolean

  onModelChange: Function = () => {}

  onModelTouched: Function = () => {}

  calendarElement: any

  timePickerTimer: any

  documentClickListener: VoidFunction | null

  animationEndListener: VoidFunction | null

  ticksTo1970: number

  yearOptions: number[]

  focus: boolean

  isKeydown: boolean

  filled: boolean

  inputFieldValue: string = null

  _minDate: moment.Moment

  _maxDate: moment.Moment

  _showTime: boolean

  _yearRange: string

  preventDocumentListener: boolean

  dateTemplate: TemplateRef<any>

  headerTemplate: TemplateRef<any>

  footerTemplate: TemplateRef<any>

  disabledDateTemplate: TemplateRef<any>

  decadeTemplate: TemplateRef<any>

  previousIconTemplate: TemplateRef<any>

  nextIconTemplate: TemplateRef<any>

  triggerIconTemplate: TemplateRef<any>

  clearIconTemplate: TemplateRef<any>

  decrementIconTemplate: TemplateRef<any>

  incrementIconTemplate: TemplateRef<any>

  _disabledDates: Array<moment.Moment>

  _disabledDays: Array<number>

  selectElement: any

  todayElement: any

  focusElement: any

  scrollHandler: ConnectedOverlayScrollHandler | null

  documentResizeListener: VoidFunction | null

  navigationState: any = null

  isMonthNavigate: boolean

  initialized: boolean

  translationSubscription: Subscription

  _locale: LocaleSettings = {
    firstDayOfWeek: 0,
    dayNames: ['شنبه', 'یک شنبه', 'دو شنبه ', 'سه شنبه', 'چهار شنبه', 'پنج شنبه', 'جمعه'],
    dayNamesShort: ['ش', 'یک', 'دو', 'س', 'چ', 'پ', 'ج'],
    dayNamesMin: ['ش', 'یک', 'دو', 'س', 'چ', 'پ', 'ج'],
    monthNames: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'],
    monthNamesShort: ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'],
    today: 'امروز',
    clear: 'پاک کردن',
    dateFormat: 'yy/mm/dd'
  }

  _responsiveOptions: any[]

  currentView: string

  attributeSelector: string

  _numberOfMonths: number = 1

  _firstDayOfWeek: number

  _view: CalendarTypeView = 'date'

  preventFocus: boolean

  @Input() get view(): CalendarTypeView {
    return this._view
  }

  set view(view: CalendarTypeView) {
    this._view = view
    this.currentView = this._view
  }

  @Input() get defaultDate(): moment.Moment {
    return this._defaultDate
  }

  set defaultDate(defaultDate: moment.Moment) {
    this._defaultDate = defaultDate

    if (this.initialized) {
      const date = defaultDate || moment()
      this.currentMonth = date.jMonth()
      this.currentYear = date.jYear()
      this.initTime(date)
      this.createMonths(this.currentMonth, this.currentYear)
    }
  }

  _defaultDate: moment.Moment

  @Input() get minDate(): moment.Moment {
    return this._minDate
  }

  set minDate(date: moment.Moment) {
    this._minDate = date

    if (this.currentMonth != undefined && this.currentMonth != null && this.currentYear) {
      this.createMonths(this.currentMonth, this.currentYear)
    }

    if (this._minDate > moment(this.value, this.format)) {
      if (this.minDateFeedback) {
        let parts = this.minDateFeedback.split(':')
        this._notify.error({
          message: this._translate.instant(parts[0], {
            date1: this._translate.instant(parts[1]),
            date2: this._translate.instant(parts[2])
          })
        })
      }
      this.clear()
    }
  }

  @Input() get maxDate(): moment.Moment {
    return this._maxDate
  }

  set maxDate(date: moment.Moment) {
    this._maxDate = date

    if (this.currentMonth != undefined && this.currentMonth != null && this.currentYear) {
      this.createMonths(this.currentMonth, this.currentYear)
    }

    if (this._maxDate < moment(this.value, this.format)) {
      if (this.maxDateFeedback) {
        let parts = this.maxDateFeedback.split(':')
        this._notify.error({
          message: this._translate.instant(parts[0], {
            date1: this._translate.instant(parts[1]),
            date2: this._translate.instant(parts[2])
          })
        })
      }
      this.clear()
    }
  }

  @Input() get disabledDates(): moment.Moment[] {
    return this._disabledDates
  }

  set disabledDates(disabledDates: moment.Moment[]) {
    this._disabledDates = disabledDates
    if (this.currentMonth != undefined && this.currentMonth != null && this.currentYear) {
      this.createMonths(this.currentMonth, this.currentYear)
    }
  }

  @Input() get disabledDays(): number[] {
    return this._disabledDays
  }

  set disabledDays(disabledDays: number[]) {
    this._disabledDays = disabledDays

    if (this.currentMonth != undefined && this.currentMonth != null && this.currentYear) {
      this.createMonths(this.currentMonth, this.currentYear)
    }
  }

  @Input() get yearRange(): string {
    return this._yearRange
  }

  set yearRange(yearRange: string) {
    this._yearRange = yearRange

    if (yearRange) {
      const years = yearRange.split(':')
      const yearStart = parseInt(years[0])
      const yearEnd = parseInt(years[1])

      this.populateYearOptions(yearStart, yearEnd)
    }
  }

  @Input() get showTime(): boolean {
    return this._showTime
  }

  set showTime(showTime: boolean) {
    this._showTime = showTime

    if (this.currentHour === undefined) {
      this.initTime(this.value || moment())
    }
    this.updateInputfield()
  }

  get locale() {
    return this._locale
  }

  @Input() get responsiveOptions(): any[] {
    return this._responsiveOptions
  }

  set responsiveOptions(responsiveOptions: any[]) {
    this._responsiveOptions = responsiveOptions

    this.destroyResponsiveStyleElement()
    this.createResponsiveStyle()
  }

  @Input() get numberOfMonths(): number {
    return this._numberOfMonths
  }

  set numberOfMonths(numberOfMonths: number) {
    this._numberOfMonths = numberOfMonths

    this.destroyResponsiveStyleElement()
    this.createResponsiveStyle()
  }

  @Input() get firstDayOfWeek(): number {
    return this._firstDayOfWeek
  }

  set firstDayOfWeek(firstDayOfWeek: number) {
    this._firstDayOfWeek = firstDayOfWeek

    this.createWeekDays()
  }

  @Input()
  set locale(newLocale: LocaleSettings) {
    console.warn('Locale property has no effect, use new i18n API instead.')
  }

  private window: Window

  constructor(
    @Inject(DOCUMENT) private document: Document,
    public el: ElementRef,
    public renderer: Renderer2,
    public cd: ChangeDetectorRef,
    private zone: NgZone,
    private _translate: TranslateService,
    private _notify: NotificationService,
    private config: PrimeNG,
    public overlayService: OverlayService
  ) {
    this.window = this.document.defaultView as Window
  }

  ngOnInit() {
    if (this.timeOnly) {
      this.miladiFormat = `${this.hourFormat == '24' ? 'HH' : 'hh'}:mm${this.showSeconds ? ':ss' : ''}`
    }
    this.format = this.miladiFormat || this.format
    this.attributeSelector = UniqueComponentId()
    const date = this.defaultDate || moment()
    this.createResponsiveStyle()
    this.currentMonth = date.jMonth()
    this.currentYear = date.jYear()
    this.currentView = this.view

    if (this.view === 'date') {
      this.createWeekDays()
      this.initTime(date)
      this.createMonths(this.currentMonth, this.currentYear)
      this.ticksTo1970 = ((1970 - 1) * 365 + Math.floor(1970 / 4) - Math.floor(1970 / 100) + Math.floor(1970 / 400)) * 24 * 60 * 60 * 10000000
    }

    this.translationSubscription = this.config.translationObserver.subscribe(() => {
      this.createWeekDays()
      this.cd.markForCheck()
    })

    this.initialized = true
  }

  ngAfterContentInit() {
    this.templates.forEach(item => {
      switch (item.getType()) {
        case 'date':
          this.dateTemplate = item.template
          break

        case 'decade':
          this.decadeTemplate = item.template
          break

        case 'disabledDate':
          this.disabledDateTemplate = item.template
          break

        case 'header':
          this.headerTemplate = item.template
          break

        case 'previousicon':
          this.previousIconTemplate = item.template
          break

        case 'nexticon':
          this.nextIconTemplate = item.template
          break

        case 'triggericon':
          this.triggerIconTemplate = item.template
          break

        case 'clearicon':
          this.clearIconTemplate = item.template
          break

        case 'decrementicon':
          this.decrementIconTemplate = item.template
          break

        case 'incrementicon':
          this.incrementIconTemplate = item.template
          break

        case 'footer':
          this.footerTemplate = item.template
          break

        default:
          this.dateTemplate = item.template
          break
      }
    })
    if (this.defaultDate) {
      this.updateModel(this.defaultDate)
    }
  }

  ngAfterViewInit() {
    if (this.inline) {
      this.contentViewChild && this.contentViewChild.nativeElement.setAttribute(this.attributeSelector, '')

      if (!this.disabled) {
        this.initFocusableCell()
        if (this.numberOfMonths === 1) {
          this.contentViewChild.nativeElement.style.width = DomHandler.getOuterWidth(this.containerViewChild.nativeElement) + 'px'
        }
      }
    }
  }

  populateYearOptions(start: any, end: any) {
    this.yearOptions = []

    for (let i = start; i <= end; i++) {
      this.yearOptions.push(i)
    }
  }

  createWeekDays() {
    this.weekDays = []
    let dayIndex = this.locale.firstDayOfWeek
    for (let i = 0; i < 7; i++) {
      this.weekDays.push(this.locale.dayNamesMin[dayIndex ?? 0])
      dayIndex = dayIndex == 6 ? 0 : (dayIndex ?? 0) + 1
    }
  }

  monthPickerValues() {
    let monthPickerValues = []
    for (let i = 0; i <= 11; i++) {
      monthPickerValues.push(this.locale.monthNamesShort[i])
    }
    return monthPickerValues
  }

  yearPickerValues() {
    let yearPickerValues = []
    let base = this.currentYear - (this.currentYear % 10)
    for (let i = 0; i < 10; i++) {
      yearPickerValues.push(base + i)
    }

    return yearPickerValues
  }

  createMonths(month: number, year: number) {
    this.months = this.months = []
    for (let i = 0; i < this.numberOfMonths; i++) {
      let m = month + i
      let y = year
      if (m > 11) {
        m = (m % 11) - 1
        y = year + 1
      }

      this.months.push(this.createMonth(m, y))
    }
  }

  getWeekNumber(date: moment.Moment) {
    let checkDate = moment(date.unix())
    checkDate.jDate(checkDate.jDate() + 4 - (checkDate.jDay() || 7))
    let time = checkDate.unix()
    checkDate.jMonth(0)
    checkDate.jDate(1)
    return Math.floor(Math.round((time - checkDate.unix()) / 86400000) / 7) + 1
  }

  createMonth(month: number, year: number) {
    let dates = []
    let firstDay = this.getFirstDayOfMonthIndex(month, year)
    let daysLength = this.getDaysCountInMonth(month, year)
    let prevMonthDaysLength = this.jDaysCountInPrevMonth(month, year)
    let dayNo = 1
    let today = moment()
    let weekNumbers = []
    let monthRows = Math.ceil((daysLength + firstDay) / 7)

    for (let i = 0; i < monthRows; i++) {
      let week = []

      if (i == 0) {
        for (let j = prevMonthDaysLength - firstDay + 1; j <= prevMonthDaysLength; j++) {
          let prev = this.getPreviousMonthAndYear(month, year)
          week.push({
            day: j,
            month: prev.month,
            year: prev.year,
            otherMonth: true,
            today: this.isToday(today, j, prev.month, prev.year),
            selectable: this.isSelectable(j, prev.month, prev.year, true)
          })
        }

        let remainingDaysLength = 7 - week.length
        for (let j = 0; j < remainingDaysLength; j++) {
          week.push({
            day: dayNo,
            month: month,
            year: year,
            today: this.isToday(today, dayNo, month, year),
            selectable: this.isSelectable(dayNo, month, year, false)
          })
          dayNo++
        }
      } else {
        for (let j = 0; j < 7; j++) {
          if (dayNo > daysLength) {
            let next = this.getNextMonthAndYear(month, year)
            week.push({
              day: dayNo - daysLength,
              month: next.month,
              year: next.year,
              otherMonth: true,
              today: this.isToday(today, dayNo - daysLength, next.month, next.year),
              selectable: this.isSelectable(dayNo - daysLength, next.month, next.year, true)
            })
          } else {
            week.push({
              day: dayNo,
              month: month,
              year: year,
              today: this.isToday(today, dayNo, month, year),
              selectable: this.isSelectable(dayNo, month, year, false)
            })
          }

          dayNo++
        }
      }

      if (this.showWeek) {
        weekNumbers.push(this.getWeekNumber(moment([week[0].year, week[0].month, week[0].day])))
      }

      dates.push(week)
    }

    return {
      month: month,
      year: year,
      dates: dates,
      weekNumbers: weekNumbers
    }
  }

  initTime(date: moment.Moment) {
    this.pm = date.hours() > 11

    if (this.showTime) {
      this.currentMinute = date.minutes()
      this.currentSecond = date.seconds()
      this.setCurrentHourPM(date.hours())
    } else if (this.timeOnly) {
      this.currentMinute = 0
      this.currentHour = 0
      this.currentSecond = 0
    }
  }

  navBackward(event: any) {
    if (this.disabled) {
      event.preventDefault()
      return
    }

    this.isMonthNavigate = true

    if (this.currentView === 'month') {
      this.decrementYear()
      setTimeout(() => {
        this.updateFocus()
      }, 1)
    } else if (this.currentView === 'year') {
      this.decrementDecade()
      setTimeout(() => {
        this.updateFocus()
      }, 1)
    } else {
      if (this.currentMonth === 0) {
        this.currentMonth = 11
        this.decrementYear()
      } else {
        this.currentMonth--
      }

      this.onMonthChange.emit({
        month: this.currentMonth + 1,
        year: this.currentYear
      })
      this.createMonths(this.currentMonth, this.currentYear)
    }
  }

  navForward(event: any) {
    if (this.disabled) {
      event.preventDefault()
      return
    }

    this.isMonthNavigate = true

    if (this.currentView === 'month') {
      this.incrementYear()
      setTimeout(() => {
        this.updateFocus()
      }, 1)
    } else if (this.currentView === 'year') {
      this.incrementDecade()
      setTimeout(() => {
        this.updateFocus()
      }, 1)
    } else {
      if (this.currentMonth === 11) {
        this.currentMonth = 0
        this.incrementYear()
      } else {
        this.currentMonth++
      }

      this.onMonthChange.emit({
        month: this.currentMonth + 1,
        year: this.currentYear
      })
      this.createMonths(this.currentMonth, this.currentYear)
    }
  }

  decrementYear() {
    this.currentYear--

    if (this.yearNavigator && this.currentYear < this.yearOptions[0]) {
      let difference = this.yearOptions[this.yearOptions.length - 1] - this.yearOptions[0]
      this.populateYearOptions(this.yearOptions[0] - difference, this.yearOptions[this.yearOptions.length - 1] - difference)
    }
  }

  decrementDecade() {
    this.currentYear = this.currentYear - 10
  }

  incrementDecade() {
    this.currentYear = this.currentYear + 10
  }

  incrementYear() {
    this.currentYear++

    if (this.yearNavigator && this.currentYear > this.yearOptions[this.yearOptions.length - 1]) {
      let difference = this.yearOptions[this.yearOptions.length - 1] - this.yearOptions[0]
      this.populateYearOptions(this.yearOptions[0] + difference, this.yearOptions[this.yearOptions.length - 1] + difference)
    }
  }

  switchToMonthView(event: any) {
    this.setCurrentView('month')
    event.preventDefault()
  }

  switchToYearView(event: any) {
    this.setCurrentView('year')
    event.preventDefault()
  }

  onDateSelect(event: any, dateMeta: any) {
    if ((dateMeta != null && this.disabled) || !dateMeta.selectable) {
      event.preventDefault()
      return
    }

    if (this.isMultipleSelection() && this.isSelected(dateMeta)) {
      this.value = this.value.filter((date: any, i: number) => {
        return !this.isDateEquals(date, dateMeta)
      })
      if (this.value.length === 0) {
        this.value = null
      }
      this.updateModel(this.value)
    } else {
      if (this.shouldSelectDate(dateMeta)) {
        this.selectDate(dateMeta)
      }
    }

    if (this.isSingleSelection() && this.hideOnDateTimeSelect) {
      setTimeout(() => {
        event?.preventDefault()
        this.hideOverlay()

        if (this.mask) {
          this.disableModality()
        }

        this.cd.markForCheck()
      }, 150)
    }

    this.updateInputfield()
    event?.preventDefault()
  }

  shouldSelectDate(dateMeta: any) {
    if (this.isMultipleSelection()) return this.maxDateCount != null ? this.maxDateCount > (this.value ? this.value.length : 0) : true
    else return true
  }

  onMonthSelect(event: any, index: number) {
    if (this.view === 'month') {
      this.onDateSelect(event, {
        year: this.currentYear,
        month: index,
        day: 1,
        selectable: true
      })
    } else {
      this.currentMonth = index
      this.createMonths(this.currentMonth, this.currentYear)
      this.setCurrentView('date')
      this.onMonthChange.emit({
        month: this.currentMonth + 1,
        year: this.currentYear
      })
    }
  }

  onYearSelect(event: any, year: number) {
    if (this.view === 'year') {
      this.onDateSelect(event, {
        year: year,
        month: 0,
        day: 1,
        selectable: true
      })
    } else {
      this.currentYear = year
      this.setCurrentView('month')
      this.onYearChange.emit({
        month: this.currentMonth + 1,
        year: this.currentYear
      })
    }
  }

  updateInputfield() {
    let formattedValue = ''

    if (this.value) {
      if (this.isSingleSelection()) {
        formattedValue = this.formatDateTime(this.value)
      } else if (this.isMultipleSelection()) {
        for (let i = 0; i < this.value.length; i++) {
          let dateAsString = this.formatDateTime(this.value[i])
          formattedValue += dateAsString
          if (i !== this.value.length - 1) {
            formattedValue += this.multipleSeparator + ' '
          }
        }
      } else if (this.isRangeSelection()) {
        if (this.value && this.value.length) {
          let startDate = this.value[0]
          let endDate = this.value[1]

          formattedValue = this.formatDateTime(startDate)
          if (endDate) {
            formattedValue += ' ' + this.rangeSeparator + ' ' + this.formatDateTime(endDate)
          }
        }
      }
    }

    this.inputFieldValue = formattedValue
    this.updateFilledState()
    if (this.inputfieldViewChild && this.inputfieldViewChild.nativeElement) {
      this.inputfieldViewChild.nativeElement.value = this.inputFieldValue
    }
  }

  formatDateTime(date: any) {
    let formattedValue = this.keepInvalid ? date : null

    if (this.isValidDate(date)) {
      if (this.timeOnly) {
        formattedValue = this.formatTime(date)
      } else {
        formattedValue = this.formatDate(date, this.getDateFormat())
        if (this.showTime) {
          formattedValue += ' ' + this.formatTime(date)
        }
      }
    }

    return formattedValue
  }

  setCurrentHourPM(hours: number) {
    if (this.hourFormat == '12') {
      this.pm = hours > 11
      if (hours >= 12) {
        this.currentHour = hours == 12 ? 12 : hours - 12
      } else {
        this.currentHour = hours == 0 ? 12 : hours
      }
    } else {
      this.currentHour = hours
    }
  }

  setCurrentView(currentView: CalendarTypeView) {
    this.currentView = currentView
    this.cd.detectChanges()
    this.alignOverlay()
  }

  selectDate(dateMeta: any) {
    let date = moment(dateMeta.year + '-' + (dateMeta.month + 1) + '-' + dateMeta.day, 'jYYYY-jM-jD').locale('fa')

    if (this.showTime) {
      if (this.hourFormat == '12') {
        if (this.currentHour === 12) date.hour(this.pm ? 12 : 0)
        else date.hour(this.pm ? this.currentHour + 12 : this.currentHour)
      } else {
        date.hour(dateMeta?.hour ?? this.currentHour)
      }

      date.minute(dateMeta?.minute ?? this.currentMinute)
      date.second(dateMeta?.second ?? this.currentSecond)
    }

    if (this.minDate && this.minDate > date) {
      date = this.minDate
      this.setCurrentHourPM(date.hours())
      this.currentMinute = date.minutes()
      this.currentSecond = date.seconds()
    }

    if (this.maxDate && this.maxDate < date) {
      date = this.maxDate
      this.setCurrentHourPM(date.hours())
      this.currentMinute = date.minutes()
      this.currentSecond = date.seconds()
    }

    if (this.isSingleSelection()) {
      this.updateModel(date)
    } else if (this.isMultipleSelection()) {
      this.updateModel(this.value ? [...this.value, date] : [date])
    } else if (this.isRangeSelection()) {
      if (this.value && this.value.length) {
        let startDate = this.value[0]
        let endDate = this.value[1]

        if (!endDate && date.unix() >= startDate.unix()) {
          endDate = date
        } else {
          startDate = date
          endDate = null
        }

        this.updateModel([startDate, endDate])
      } else {
        this.updateModel([date, null])
      }
    }
    if (this.format) {
      this.onSelect.emit(+moment(date).format(this.format))
    } else {
      this.onSelect.emit(date)
    }
  }

  updateModel(value: any) {
    if (this.format) {
      this.value = value ? moment(value, this.format).locale('en').format(this.format) : null
      this.format.toLowerCase() == 'x' && !!this.value && !isNaN(this.value) ? (this.value = +this.value) : null
    } else {
      this.value = value
    }
    this.momentValue$.next(value ? moment(value, this.format).locale('fa') : moment().locale('fa'))
    if (this.dataType == 'date') {
      this.onModelChange(this.value)
    } else if (this.dataType == 'string') {
      if (this.isSingleSelection()) {
        this.onModelChange(this.formatDateTime(this.value))
      } else {
        let stringArrValue = null
        if (this.value) {
          stringArrValue = this.value.map((date: any) => this.formatDateTime(date))
        }
        this.onModelChange(stringArrValue)
      }
    }
  }

  getFirstDayOfMonthIndex(month: number, year: number) {
    let day = moment()
    day.jDate(1)
    day.jMonth(month)
    day.jYear(year)

    const dayIndex = day.jDay() + this.getSundayIndex()
    return dayIndex >= 7 ? dayIndex - 7 : dayIndex
  }

  getDaysCountInMonth(month: number, year: number) {
    const newDate = moment().jYear(year).jMonth(month).jDate(32)

    const temp = this.daylightSavingAdjust(newDate).jDate()

    return 32 - temp
  }

  jDaysCountInPrevMonth(month: number, year: number) {
    let prev = this.getPreviousMonthAndYear(month, year)
    return this.getDaysCountInMonth(prev.month, prev.year)
  }

  getPreviousMonthAndYear(month: number, year: number) {
    let m, y

    if (month === 0) {
      m = 11
      y = year - 1
    } else {
      m = month - 1
      y = year
    }

    return { month: m, year: y }
  }

  getNextMonthAndYear(month: number, year: number) {
    let m, y

    if (month === 11) {
      m = 0
      y = year + 1
    } else {
      m = month + 1
      y = year
    }

    return { month: m, year: y }
  }

  getSundayIndex() {
    let firstDayOfWeek = this.getFirstDateOfWeek()

    return firstDayOfWeek > 0 ? 7 - firstDayOfWeek : 0
  }

  isSelected(dateMeta: any): any {
    if (this.value) {
      if (this.isSingleSelection()) {
        return this.isDateEquals(this.value, dateMeta)
      } else if (this.isMultipleSelection()) {
        let selected = false
        for (let date of this.value) {
          selected = this.isDateEquals(date, dateMeta)
          if (selected) {
            break
          }
        }

        return selected
      } else if (this.isRangeSelection()) {
        if (this.value[1]) return this.isDateEquals(this.value[0], dateMeta) || this.isDateEquals(this.value[1], dateMeta) || this.isDateBetween(this.value[0], this.value[1], dateMeta)
        else return this.isDateEquals(this.value[0], dateMeta)
      }
    } else {
      return false
    }
  }

  isComparable() {
    return this.value != null && typeof this.value !== 'string'
  }

  isMonthSelected(month: number) {
    if (this.isComparable() && !this.isMultipleSelection()) {
      const [start, end] = this.isRangeSelection() ? this.value : [this.value, this.value]
      const selected = moment([this.currentYear, month, 1])
      return selected >= start && selected <= (end ?? start)
    }
    return false
  }

  isMonthDisabled(month: number) {
    for (let day = 1; day < this.getDaysCountInMonth(month, this.currentYear) + 1; day++) {
      if (this.isSelectable(day, month, this.currentYear, false)) {
        return false
      }
    }
    return true
  }

  isYearSelected(year: number) {
    if (this.isComparable()) {
      let value = this.isRangeSelection() ? this.value[0] : this.value
      value = moment(value, this.format)
      return !this.isMultipleSelection() ? value?.jYear() === year : false
    }

    return false
  }

  isDateEquals(value: any, dateMeta: any) {
    if (this.isValidDate(value)) {
      value = moment(value, this.format)
    } else {
      return false
    }

    if (value && ObjectUtils.isDate(value.toDate())) return value?.jDate() === dateMeta.day && value?.jMonth() === dateMeta.month && value?.jYear() === dateMeta.year
    else return false
  }

  isDateBetween(start: any, end: any, dateMeta: any) {
    let between: boolean = false
    if (start && end) {
      let date: moment.Moment = moment(dateMeta.year, dateMeta.month, dateMeta.day)
      return start.unix() <= date.unix() && end.unix() >= date.unix()
    }

    return between
  }

  isSingleSelection(): boolean {
    return this.selectionMode === 'single'
  }

  isRangeSelection(): boolean {
    return this.selectionMode === 'range'
  }

  isMultipleSelection(): boolean {
    return this.selectionMode === 'multiple'
  }

  isToday(today: any, day: number, month: number, year: number): boolean {
    return today.jDate() === day && today.jMonth() === month && today.jYear() === year
  }

  isSelectable(day: number, month: number, year: number, otherMonth: boolean): boolean {
    let validMin = true
    let validMax = true
    let validDate = true
    let validDay = true

    if (otherMonth && !this.selectOtherMonths) {
      return false
    }

    if (this.minDate) {
      if (this.minDate.jYear() > year) {
        validMin = false
      } else if (this.minDate.jYear() === year) {
        if (this.minDate.jMonth() > month) {
          validMin = false
        } else if (this.minDate.jMonth() === month) {
          if (this.minDate.jDate() > day) {
            validMin = false
          }
        }
      }
    }

    if (this.maxDate) {
      if (this.maxDate.jYear() < year) {
        validMax = false
      } else if (this.maxDate.jYear() === year) {
        if (this.maxDate.jMonth() < month) {
          validMax = false
        } else if (this.maxDate.jMonth() === month) {
          if (this.maxDate.jDate() < day) {
            validMax = false
          }
        }
      }
    }

    if (this.disabledDates) {
      validDate = !this.isDateDisabled(day, month, year)
    }

    if (this.disabledDays) {
      validDay = !this.isDayDisabled(day, month, year)
    }

    return validMin && validMax && validDate && validDay
  }

  isDateDisabled(day: number, month: number, year: number): boolean {
    if (this.disabledDates) {
      for (let disabledDate of this.disabledDates) {
        if (disabledDate.jYear() === year && disabledDate.jMonth() === month && disabledDate.jDate() === day) {
          return true
        }
      }
    }

    return false
  }

  isDayDisabled(day: number, month: number, year: number): boolean {
    if (this.disabledDays) {
      let weekday = moment([year, month, day])
      let weekdayNumber = weekday.jDay()
      return this.disabledDays.indexOf(weekdayNumber) !== -1
    }
    return false
  }

  onInputFocus(event: Event) {
    this.focus = true
    if (this.showOnFocus) {
      this.showOverlay()
    }
    this.onFocus.emit(event)
  }

  onInputClick() {
    if (this.showOnFocus && !this.overlayVisible) {
      this.showOverlay()
    }
  }

  onInputBlur(event: Event) {
    this.focus = false
    this.onBlur.emit(event)
    if (!this.keepInvalid) {
      this.updateInputfield()
    }
    this.onModelTouched()
  }

  onButtonClick(event: any, inputfield: any) {
    if (!this.overlayVisible) {
      inputfield.focus()
      this.showOverlay()
    } else {
      this.hideOverlay()
    }
  }

  clear() {
    this.inputFieldValue = null
    this.value = null
    this.onModelChange(this.value)
    this.onSelect.emit(this.value)
    this.onClear.emit()
  }

  onOverlayClick(event: any) {
    this.overlayService.add({
      originalEvent: event,
      target: this.el.nativeElement
    })
  }

  jMonthName(index: number) {
    return this.locale.monthNames[index]
  }

  getYear(month: any) {
    return this.currentView === 'month' ? this.currentYear : month.year
  }

  switchViewButtonDisabled() {
    return this.numberOfMonths > 1 || this.disabled
  }

  onPrevButtonClick(event: any) {
    this.navigationState = { backward: true, button: true }
    this.navBackward(event)
  }

  onNextButtonClick(event: any) {
    this.navigationState = { backward: false, button: true }
    this.navForward(event)
  }

  onContainerButtonKeydown(event: any) {
    switch (event.which) {
      //tab
      case 9:
        if (!this.inline) {
          this.trapFocus(event)
        }
        break

      //escape
      case 27:
        this.overlayVisible = false
        event.preventDefault()
        break

      default:
        //Noop
        break
    }
  }

  onInputKeydown(event: any) {
    this.isKeydown = true
    if (event.keyCode === 40 && this.contentViewChild) {
      this.trapFocus(event)
    } else if (event.keyCode === 27) {
      if (this.overlayVisible) {
        this.overlayVisible = false
        event.preventDefault()
      }
    } else if (event.keyCode === 13) {
      if (this.overlayVisible) {
        this.overlayVisible = false
        event.preventDefault()
      }
    } else if (event.keyCode === 9 && this.contentViewChild) {
      DomHandler.getFocusableElements(this.contentViewChild.nativeElement).forEach(el => (el.tabIndex = '-1'))
      if (this.overlayVisible) {
        this.overlayVisible = false
      }
    }
  }

  onDateCellKeydown(event: any, date: any, groupIndex: number) {
    const cellContent = event.currentTarget
    const cell = cellContent.parentElement

    switch (event.which) {
      //down arrow
      case 40: {
        cellContent.tabIndex = '-1'
        let cellIndex = DomHandler.index(cell)
        let nextRow = cell.parentElement.nextElementSibling
        if (nextRow) {
          let focusCell = nextRow.children[cellIndex].children[0]
          if (DomHandler.hasClass(focusCell, 'p-disabled')) {
            this.navigationState = { backward: false }
            this.navForward(event)
          } else {
            nextRow.children[cellIndex].children[0].tabIndex = '0'
            nextRow.children[cellIndex].children[0].focus()
          }
        } else {
          this.navigationState = { backward: false }
          this.navForward(event)
        }
        event.preventDefault()
        break
      }

      //up arrow
      case 38: {
        cellContent.tabIndex = '-1'
        let cellIndex = DomHandler.index(cell)
        let prevRow = cell.parentElement.previousElementSibling
        if (prevRow) {
          let focusCell = prevRow.children[cellIndex].children[0]
          if (DomHandler.hasClass(focusCell, 'p-disabled')) {
            this.navigationState = { backward: true }
            this.navBackward(event)
          } else {
            focusCell.tabIndex = '0'
            focusCell.focus()
          }
        } else {
          this.navigationState = { backward: true }
          this.navBackward(event)
        }
        event.preventDefault()
        break
      }

      //left arrow
      case 37: {
        cellContent.tabIndex = '-1'
        let prevCell = cell.previousElementSibling
        if (prevCell) {
          let focusCell = prevCell.children[0]
          if (DomHandler.hasClass(focusCell, 'p-disabled') || DomHandler.hasClass(focusCell.parentElement, 'p-datepicker-weeknumber')) {
            this.navigateToMonth(true, groupIndex)
          } else {
            focusCell.tabIndex = '0'
            focusCell.focus()
          }
        } else {
          this.navigateToMonth(true, groupIndex)
        }
        event.preventDefault()
        break
      }

      //right arrow
      case 39: {
        cellContent.tabIndex = '-1'
        let nextCell = cell.nextElementSibling
        if (nextCell) {
          let focusCell = nextCell.children[0]
          if (DomHandler.hasClass(focusCell, 'p-disabled')) {
            this.navigateToMonth(false, groupIndex)
          } else {
            focusCell.tabIndex = '0'
            focusCell.focus()
          }
        } else {
          this.navigateToMonth(false, groupIndex)
        }
        event.preventDefault()
        break
      }

      //enter
      //space
      case 13:
      case 32: {
        this.onDateSelect(event, date)
        event.preventDefault()
        break
      }

      //escape
      case 27: {
        this.overlayVisible = false
        event.preventDefault()
        break
      }

      //tab
      case 9: {
        if (!this.inline) {
          this.trapFocus(event)
        }
        break
      }

      default:
        //no op
        break
    }
  }

  onMonthCellKeydown(event: any, index: number) {
    const cell = event.currentTarget
    switch (event.which) {
      //arrows
      case 38:
      case 40: {
        cell.tabIndex = '-1'
        var cells = cell.parentElement.children
        var cellIndex = DomHandler.index(cell)
        let nextCell = cells[event.which === 40 ? cellIndex + 3 : cellIndex - 3]
        if (nextCell) {
          nextCell.tabIndex = '0'
          nextCell.focus()
        }
        event.preventDefault()
        break
      }

      //left arrow
      case 37: {
        cell.tabIndex = '-1'
        let prevCell = cell.previousElementSibling
        if (prevCell) {
          prevCell.tabIndex = '0'
          prevCell.focus()
        } else {
          this.navigationState = { backward: true }
          this.navBackward(event)
        }

        event.preventDefault()
        break
      }

      //right arrow
      case 39: {
        cell.tabIndex = '-1'
        let nextCell = cell.nextElementSibling
        if (nextCell) {
          nextCell.tabIndex = '0'
          nextCell.focus()
        } else {
          this.navigationState = { backward: false }
          this.navForward(event)
        }

        event.preventDefault()
        break
      }

      //enter
      case 13: {
        this.onMonthSelect(event, index)
        event.preventDefault()
        break
      }

      //escape
      case 27: {
        this.overlayVisible = false
        event.preventDefault()
        break
      }

      //tab
      case 9: {
        if (!this.inline) {
          this.trapFocus(event)
        }
        break
      }

      default:
        //no op
        break
    }
  }

  onYearCellKeydown(event: any, index: number) {
    const cell = event.currentTarget

    switch (event.which) {
      //arrows
      case 38:
      case 40: {
        cell.tabIndex = '-1'
        var cells = cell.parentElement.children
        var cellIndex = DomHandler.index(cell)
        let nextCell = cells[event.which === 40 ? cellIndex + 2 : cellIndex - 2]
        if (nextCell) {
          nextCell.tabIndex = '0'
          nextCell.focus()
        }
        event.preventDefault()
        break
      }

      //left arrow
      case 37: {
        cell.tabIndex = '-1'
        let prevCell = cell.previousElementSibling
        if (prevCell) {
          prevCell.tabIndex = '0'
          prevCell.focus()
        } else {
          this.navigationState = { backward: true }
          this.navBackward(event)
        }

        event.preventDefault()
        break
      }

      //right arrow
      case 39: {
        cell.tabIndex = '-1'
        let nextCell = cell.nextElementSibling
        if (nextCell) {
          nextCell.tabIndex = '0'
          nextCell.focus()
        } else {
          this.navigationState = { backward: false }
          this.navForward(event)
        }

        event.preventDefault()
        break
      }

      //enter
      //space
      case 13:
      case 32: {
        this.onYearSelect(event, index)
        event.preventDefault()
        break
      }

      //escape
      case 27: {
        this.overlayVisible = false
        event.preventDefault()
        break
      }

      //tab
      case 9: {
        this.trapFocus(event)
        break
      }

      default:
        //no op
        break
    }
  }

  navigateToMonth(prev: any, groupIndex: number) {
    if (prev) {
      if (this.numberOfMonths === 1 || groupIndex === 0) {
        this.navigationState = { backward: true }
        this.navBackward(event)
      } else {
        let prevMonthContainer = this.contentViewChild.nativeElement.children[groupIndex - 1]
        let cells = DomHandler.find(prevMonthContainer, '.p-datepicker-calendar td span:not(.p-disabled):not(.p-ink)')
        let focusCell = cells[cells.length - 1]
        focusCell.tabIndex = '0'
        focusCell.focus()
      }
    } else {
      if (this.numberOfMonths === 1 || groupIndex === this.numberOfMonths - 1) {
        this.navigationState = { backward: false }
        this.navForward(event)
      } else {
        let nextMonthContainer = this.contentViewChild.nativeElement.children[groupIndex + 1]
        let focusCell = DomHandler.findSingle(nextMonthContainer, '.p-datepicker-calendar td span:not(.p-disabled):not(.p-ink)')
        focusCell.tabIndex = '0'
        focusCell.focus()
      }
    }
  }

  updateFocus() {
    let cell

    if (this.navigationState) {
      if (this.navigationState.button) {
        this.initFocusableCell()

        if (this.navigationState.backward) DomHandler.findSingle(this.contentViewChild.nativeElement, '.p-datepicker-prev-button').focus()
        else DomHandler.findSingle(this.contentViewChild.nativeElement, '.p-datepicker-next-button').focus()
      } else {
        if (this.navigationState.backward) {
          let cells

          if (this.currentView === 'month') {
            cells = DomHandler.find(this.contentViewChild.nativeElement, '.p-monthpicker .p-monthpicker-month:not(.p-disabled)')
          } else if (this.currentView === 'year') {
            cells = DomHandler.find(this.contentViewChild.nativeElement, '.p-yearpicker .p-yearpicker-year:not(.p-disabled)')
          } else {
            cells = DomHandler.find(this.contentViewChild.nativeElement, '.p-datepicker-calendar td span:not(.p-disabled):not(.p-ink)')
          }

          if (cells && cells.length > 0) {
            cell = cells[cells.length - 1]
          }
        } else {
          if (this.currentView === 'month') {
            cell = DomHandler.findSingle(this.contentViewChild.nativeElement, '.p-monthpicker .p-monthpicker-month:not(.p-disabled)')
          } else if (this.currentView === 'year') {
            cell = DomHandler.findSingle(this.contentViewChild.nativeElement, '.p-yearpicker .p-yearpicker-year:not(.p-disabled)')
          } else {
            cell = DomHandler.findSingle(this.contentViewChild.nativeElement, '.p-datepicker-calendar td span:not(.p-disabled):not(.p-ink)')
          }
        }

        if (cell) {
          cell.tabIndex = '0'
          cell.focus()
        }
      }

      this.navigationState = null
    } else {
      this.initFocusableCell()
    }
  }

  initFocusableCell() {
    const contentEl = this.contentViewChild?.nativeElement
    let cell: any

    if (this.currentView === 'month') {
      let cells = DomHandler.find(contentEl, '.p-monthpicker .p-monthpicker-month:not(.p-disabled)')
      let selectedCell = DomHandler.findSingle(contentEl, '.p-monthpicker .p-monthpicker-month.p-highlight')
      cells.forEach(cell => (cell.tabIndex = -1))
      cell = selectedCell || cells[0]

      if (cells.length === 0) {
        let disabledCells = DomHandler.find(contentEl, '.p-monthpicker .p-monthpicker-month.p-disabled[tabindex = "0"]')
        disabledCells.forEach(cell => (cell.tabIndex = -1))
      }
    } else if (this.currentView === 'year') {
      let cells = DomHandler.find(contentEl, '.p-yearpicker .p-yearpicker-year:not(.p-disabled)')
      let selectedCell = DomHandler.findSingle(contentEl, '.p-yearpicker .p-yearpicker-year.p-highlight')
      cells.forEach(cell => (cell.tabIndex = -1))
      cell = selectedCell || cells[0]

      if (cells.length === 0) {
        let disabledCells = DomHandler.find(contentEl, '.p-yearpicker .p-yearpicker-year.p-disabled[tabindex = "0"]')
        disabledCells.forEach(cell => (cell.tabIndex = -1))
      }
    } else {
      cell = DomHandler.findSingle(contentEl, 'span.p-highlight')
      if (!cell) {
        let todayCell = DomHandler.findSingle(contentEl, 'td.p-datepicker-today span:not(.p-disabled):not(.p-ink)')
        if (todayCell) cell = todayCell
        else cell = DomHandler.findSingle(contentEl, '.p-datepicker-calendar td span:not(.p-disabled):not(.p-ink)')
      }
    }

    if (cell) {
      cell.tabIndex = '0'

      if (!this.preventFocus && (!this.navigationState || !this.navigationState.button)) {
        setTimeout(() => {
          if (!this.disabled) {
            cell.focus()
          }
        }, 1)
      }

      this.preventFocus = false
    }
  }

  trapFocus(event: any) {
    let focusableElements = DomHandler.getFocusableElements(this.contentViewChild.nativeElement)

    if (focusableElements && focusableElements.length > 0) {
      if (!focusableElements[0].ownerDocument.activeElement) {
        focusableElements[0].focus()
      } else {
        let focusedIndex = focusableElements.indexOf(focusableElements[0].ownerDocument.activeElement)

        if (event.shiftKey) {
          if (focusedIndex == -1 || focusedIndex === 0) {
            if (this.focusTrap) {
              focusableElements[focusableElements.length - 1].focus()
            } else {
              if (focusedIndex === -1) return this.hideOverlay()
              else if (focusedIndex === 0) return
            }
          } else {
            focusableElements[focusedIndex - 1].focus()
          }
        } else {
          if (focusedIndex == -1 || focusedIndex === focusableElements.length - 1) {
            if (!this.focusTrap && focusedIndex != -1) return this.hideOverlay()
            else focusableElements[0].focus()
          } else {
            focusableElements[focusedIndex + 1].focus()
          }
        }
      }
    }

    event.preventDefault()
  }

  onMonthDropdownChange(m: string) {
    this.currentMonth = parseInt(m)
    this.onMonthChange.emit({
      month: this.currentMonth + 1,
      year: this.currentYear
    })
    this.createMonths(this.currentMonth, this.currentYear)
  }

  onYearDropdownChange(y: string) {
    this.currentYear = parseInt(y)
    this.onYearChange.emit({
      month: this.currentMonth + 1,
      year: this.currentYear
    })
    this.createMonths(this.currentMonth, this.currentYear)
  }

  convertTo24Hour(hours: number, pm: boolean) {
    if (this.hourFormat == '12') {
      if (hours === 12) {
        return pm ? 12 : 0
      } else {
        return pm ? hours + 12 : hours
      }
    }
    return hours
  }

  validateTime(hour: number, minute: number, second: number, pm: boolean) {
    let value = this.value
    const convertedHour = this.convertTo24Hour(hour, pm)
    if (this.isRangeSelection()) {
      value = this.value[1] || this.value[0]
    }
    if (this.isMultipleSelection()) {
      value = this.value[this.value.length - 1]
    }
    if (['string', 'number'].includes(typeof value)) {
      value = moment(value, this.format).locale('en')
    }
    const valueDateString = value ? value.format() : null
    if (this.minDate && valueDateString && this.minDate.format() === valueDateString) {
      if (this.minDate.hours() > convertedHour) {
        return false
      }
      if (this.minDate.hours() === convertedHour) {
        if (this.minDate.minutes() > minute) {
          return false
        }
        if (this.minDate.minutes() === minute) {
          if (this.minDate.seconds() > second) {
            return false
          }
        }
      }
    }

    if (this.maxDate && valueDateString && this.maxDate.format() === valueDateString) {
      if (this.maxDate.hours() < convertedHour) {
        return false
      }
      if (this.maxDate.hours() === convertedHour) {
        if (this.maxDate.minutes() < minute) {
          return false
        }
        if (this.maxDate.minutes() === minute) {
          if (this.maxDate.seconds() < second) {
            return false
          }
        }
      }
    }
    return true
  }

  incrementHour(event: any) {
    const prevHour = this.currentHour
    let newHour = this.currentHour + this.stepHour
    let newPM = this.pm

    if (this.hourFormat == '24') newHour = newHour >= 24 ? newHour - 24 : newHour
    else if (this.hourFormat == '12') {
      // Before the AM/PM break, now after
      if (prevHour < 12 && newHour > 11) {
        newPM = !this.pm
      }
      newHour = newHour >= 13 ? newHour - 12 : newHour
    }

    if (this.validateTime(newHour, this.currentMinute, this.currentSecond, newPM)) {
      this.currentHour = newHour
      this.pm = newPM
    }
    event.preventDefault()
  }

  onTimePickerElementMouseDown(event: Event, type: number, direction: number) {
    if (!this.disabled) {
      this.repeat(event, null, type, direction)
      event.preventDefault()
    }
  }

  onTimePickerElementMouseUp(event: Event) {
    if (!this.disabled) {
      this.clearTimePickerTimer()
      this.updateTime()
    }
  }

  onTimePickerElementMouseLeave() {
    if (!this.disabled && this.timePickerTimer) {
      this.clearTimePickerTimer()
      this.updateTime()
    }
  }

  repeat(event: Event, interval: number, type: number, direction: number) {
    let i = interval || 500

    this.clearTimePickerTimer()
    this.timePickerTimer = setTimeout(() => {
      this.repeat(event, 100, type, direction)
      this.cd.markForCheck()
    }, i)

    switch (type) {
      case 0:
        if (direction === 1) this.incrementHour(event)
        else this.decrementHour(event)
        break

      case 1:
        if (direction === 1) this.incrementMinute(event)
        else this.decrementMinute(event)
        break

      case 2:
        if (direction === 1) this.incrementSecond(event)
        else this.decrementSecond(event)
        break
    }

    this.updateInputfield()
  }

  clearTimePickerTimer() {
    if (this.timePickerTimer) {
      clearTimeout(this.timePickerTimer)
      this.timePickerTimer = null
    }
  }

  decrementHour(event: any) {
    let newHour = this.currentHour - this.stepHour
    let newPM = this.pm

    if (this.hourFormat == '24') newHour = newHour < 0 ? 24 + newHour : newHour
    else if (this.hourFormat == '12') {
      // If we were at noon/midnight, then switch
      if (this.currentHour === 12) {
        newPM = !this.pm
      }
      newHour = newHour <= 0 ? 12 + newHour : newHour
    }

    if (this.validateTime(newHour, this.currentMinute, this.currentSecond, newPM)) {
      this.currentHour = newHour
      this.pm = newPM
    }

    event.preventDefault()
  }

  incrementMinute(event: any) {
    let newMinute = this.currentMinute + this.stepMinute
    newMinute = newMinute > 59 ? newMinute - 60 : newMinute
    if (this.validateTime(this.currentHour, newMinute, this.currentSecond, this.pm)) {
      this.currentMinute = newMinute
    }

    event.preventDefault()
  }

  decrementMinute(event: any) {
    let newMinute = this.currentMinute - this.stepMinute
    newMinute = newMinute < 0 ? 60 + newMinute : newMinute
    if (this.validateTime(this.currentHour, newMinute, this.currentSecond, this.pm)) {
      this.currentMinute = newMinute
    }

    event.preventDefault()
  }

  incrementSecond(event: any) {
    let newSecond = this.currentSecond + this.stepSecond
    newSecond = newSecond > 59 ? newSecond - 60 : newSecond
    if (this.validateTime(this.currentHour, this.currentMinute, newSecond, this.pm)) {
      this.currentSecond = newSecond
    }

    event.preventDefault()
  }

  decrementSecond(event: any) {
    let newSecond = this.currentSecond - this.stepSecond
    newSecond = newSecond < 0 ? 60 + newSecond : newSecond
    if (this.validateTime(this.currentHour, this.currentMinute, newSecond, this.pm)) {
      this.currentSecond = newSecond
    }

    event.preventDefault()
  }

  updateTime() {
    let value = this.value
    if (this.isRangeSelection()) {
      value = this.value[1] || this.value[0]
    }
    if (this.isMultipleSelection()) {
      value = this.value[this.value.length - 1]
    }
    value = value ? moment(value, this.format) : moment()

    if (this.hourFormat == '12') {
      if (this.currentHour === 12) value.hour(this.pm ? 12 : 0)
      else value.hour(this.pm ? this.currentHour + 12 : this.currentHour)
    } else {
      value.hour(this.currentHour)
    }

    value.minute(this.currentMinute)
    value.second(this.currentSecond)
    if (this.isRangeSelection()) {
      if (this.value[1]) value = [this.value[0], value]
      else value = [value, null]
    }

    if (this.isMultipleSelection()) {
      value = [...this.value.slice(0, -1), value]
    }
    this.updateModel(value)
    this.onSelect.emit(value)
    this.updateInputfield()
  }

  toggleAMPM(event: any) {
    const newPM = !this.pm
    if (this.validateTime(this.currentHour, this.currentMinute, this.currentSecond, newPM)) {
      this.pm = newPM
      this.updateTime()
    }
    event.preventDefault()
  }

  onUserInput(event: any) {
    // IE 11 Workaround for input placeholder : https://github.com/primefaces/primeng/issues/2026
    if (!this.isKeydown) {
      return
    }
    this.isKeydown = false

    let val = event.target.value

    if (this.isSingleSelection() && !this.timeOnly) {
      if (this._showTime) {
        let parts = val.split(' ')
        val = moment.from(parts?.[0], 'fa').locale('en').format(this.getDateFormatForMoment())
        val = `${val} ${parts?.[1]}`
      } else {
        val = moment.from(val, 'fa').locale('en').format(this.getDateFormatForMoment())
      }
    }

    try {
      let value = this.parseValueFromString(val)
      if (this.isValidSelection(value)) {
        this.updateModel(value)
        this.updateUI()
      }
    } catch (err) {
      //invalid date
      let value = this.keepInvalid ? val : null
      this.updateModel(value)
    }
    this.filled = val != null && val.length
    this.onInput.emit(event)
  }

  isValidSelection(value: any): boolean {
    let isValid = true
    if (this.isSingleSelection()) {
      if (!this.isSelectable(value.jDate(), value.jMonth(), value.jYear(), false)) {
        isValid = false
      }
    } else if (value.every((v: any) => this.isSelectable(v.jDate(), v.jMonth(), v.jYear(), false))) {
      if (this.isRangeSelection()) {
        isValid = value.length > 1 && value[1] > value[0] ? true : false
      }
    }
    return isValid
  }

  parseValueFromString(text: string): moment.Moment | moment.Moment[] {
    if (!text || text.trim().length === 0) {
      return null
    }

    let value: any

    if (this.isSingleSelection()) {
      value = this.parseDateTime(text)
    } else if (this.isMultipleSelection()) {
      let tokens = text.split(this.multipleSeparator)
      value = []
      for (let token of tokens) {
        value.push(this.parseDateTime(token.trim()))
      }
    } else if (this.isRangeSelection()) {
      let tokens = text.split(' ' + this.rangeSeparator + ' ')
      value = []
      for (let i = 0; i < tokens.length; i++) {
        value[i] = this.parseDateTime(tokens[i].trim())
      }
    }

    return value
  }

  parseDateTime(text: string): moment.Moment {
    let date: moment.Moment
    let parts: string[] = text.split(' ')

    if (this.timeOnly) {
      date = moment()
      this.populateTime(date, parts[0], parts[1])
    } else {
      const dateFormat = this.getDateFormat()
      if (this.showTime) {
        let ampm = this.hourFormat == '12' ? parts.pop() : null
        let timeString = parts.pop()

        date = this.parseDate(parts.join(' '), dateFormat)

        this.populateTime(date, timeString, ampm)
      } else {
        date = this.parseDate(text, dateFormat)
      }
    }

    return date
  }

  populateTime(value: any, timeString: string, ampm: any) {
    if (this.hourFormat == '12' && !ampm) {
      throw 'Invalid Time'
    }

    this.pm = ampm === 'PM' || ampm === 'pm'
    let time = this.parseTime(timeString)
    value.hour(time.hour)
    value.minute(time.minute)
    value.second(time.second)
  }

  isValidDate(date: moment.Moment) {
    return date != null && moment(date, this.format).isValid()
  }

  updateUI() {
    let propValue = this.value
    if (Array.isArray(propValue)) {
      propValue = propValue[0]
    }

    let val = this.defaultDate && this.isValidDate(this.defaultDate) && !this.value ? this.defaultDate : propValue && this.isValidDate(propValue) ? propValue : moment()
    val = ['string', 'number'].includes(typeof val) ? moment(val, this.format) : val
    this.currentMonth = val.jMonth()
    this.currentYear = val.jYear()
    this.createMonths(this.currentMonth, this.currentYear)

    if (this.showTime || this.timeOnly) {
      this.setCurrentHourPM(val.hours())
      this.currentMinute = val.minutes()
      this.currentSecond = val.seconds()
    }
  }

  showOverlay() {
    if (!this.overlayVisible) {
      this.updateUI()

      if (!this.touchUI) {
        this.preventFocus = true
      }

      this.overlayVisible = true
    }
  }

  hideOverlay() {
    this.overlayVisible = false
    this.clearTimePickerTimer()

    if (this.touchUI) {
      this.disableModality()
    }

    this.cd.markForCheck()
  }

  toggle() {
    if (!this.inline) {
      if (!this.overlayVisible) {
        this.showOverlay()
        this.inputfieldViewChild.nativeElement.focus()
      } else {
        this.hideOverlay()
      }
    }
  }

  onOverlayAnimationStart(event: AnimationEvent) {
    switch (event.toState) {
      case 'visible':
      case 'visibleTouchUI':
        if (!this.inline) {
          this.overlay = event.element
          this.overlay.setAttribute(this.attributeSelector, '')
          this.appendOverlay()
          this.updateFocus()
          if (this.autoZIndex) {
            if (this.touchUI) ZIndexUtils.set('modal', this.overlay, this.baseZIndex || this.config.zIndex.modal)
            else ZIndexUtils.set('overlay', this.overlay, this.baseZIndex || this.config.zIndex.overlay)
          }

          this.alignOverlay()
          this.onShow.emit(event)
        }
        break

      case 'void':
        this.onOverlayHide()
        this.onClose.emit(event)
        break
    }
  }

  onOverlayAnimationDone(event: AnimationEvent) {
    switch (event.toState) {
      case 'visible':
      case 'visibleTouchUI':
        if (!this.inline) {
          this.bindDocumentClickListener()
          this.bindDocumentResizeListener()
          this.bindScrollListener()
        }
        break

      case 'void':
        if (this.autoZIndex) {
          ZIndexUtils.clear(event.element)
        }
        break
    }
  }

  appendOverlay() {
    if (this.appendTo) {
      if (this.appendTo === 'body') this.document.body.appendChild(this.overlay)
      else DomHandler.appendChild(this.overlay, this.appendTo)
    }
  }

  restoreOverlayAppend() {
    if (this.overlay && this.appendTo) {
      this.el.nativeElement.appendChild(this.overlay)
    }
  }

  alignOverlay() {
    if (this.touchUI) {
      this.enableModality(this.overlay)
    } else if (this.overlay) {
      if (this.appendTo) {
        if (this.view === 'date') {
          this.overlay.style.width = DomHandler.getOuterWidth(this.overlay) + 'px'
          this.overlay.style.minWidth = DomHandler.getOuterWidth(this.inputfieldViewChild.nativeElement) + 'px'
        } else {
          this.overlay.style.width = DomHandler.getOuterWidth(this.inputfieldViewChild.nativeElement) + 'px'
        }

        DomHandler.absolutePosition(this.overlay, this.inputfieldViewChild.nativeElement)
      } else {
        DomHandler.relativePosition(this.overlay, this.inputfieldViewChild.nativeElement)
      }
    }
  }

  enableModality(element: any) {
    if (!this.mask && this.touchUI) {
      this.mask = this.renderer.createElement('div')
      this.renderer.setStyle(this.mask, 'zIndex', String(parseInt(element.style.zIndex) - 1))
      let maskStyleClass = 'p-component-overlay p-datepicker-mask p-datepicker-mask-scrollblocker p-component-overlay p-component-overlay-enter'
      DomHandler.addMultipleClasses(this.mask, maskStyleClass)

      this.maskClickListener = this.renderer.listen(this.mask, 'click', (event: any) => {
        this.disableModality()
      })
      this.renderer.appendChild(this.document.body, this.mask)
      DomHandler.addClass(this.document.body, 'p-overflow-hidden')
    }
  }

  disableModality() {
    if (this.mask) {
      DomHandler.addClass(this.mask, 'p-component-overlay-leave')
      if (!this.animationEndListener) {
        this.animationEndListener = this.renderer.listen(this.mask, 'animationend', this.destroyMask.bind(this))
      }
    }
  }

  destroyMask() {
    if (!this.mask) {
      return
    }
    this.renderer.removeChild(this.document.body, this.mask)
    let bodyChildren = this.document.body.children
    let hasBlockerMasks: boolean
    for (let i = 0; i < bodyChildren.length; i++) {
      let bodyChild = bodyChildren[i]
      if (DomHandler.hasClass(bodyChild, 'p-datepicker-mask-scrollblocker')) {
        hasBlockerMasks = true
        break
      }
    }

    if (!hasBlockerMasks) {
      DomHandler.removeClass(this.document.body, 'p-overflow-hidden')
    }

    this.unbindAnimationEndListener()
    this.unbindMaskClickListener()
    this.mask = null
  }

  unbindMaskClickListener() {
    if (this.maskClickListener) {
      this.maskClickListener()
      this.maskClickListener = null
    }
  }

  unbindAnimationEndListener() {
    if (this.animationEndListener && this.mask) {
      this.animationEndListener()
      this.animationEndListener = null
    }
  }

  writeValue(value: any): void {
    this.value = value
    if (this.value) {
      try {
        if (!this.timeOnly) {
          this.value = moment(value, typeof value == 'number' ? (value.toString().length == 10 ? 'X' : 'x') : value).toISOString()
        }
      } catch {
        if (this.keepInvalid) {
          this.value = value
        }
      }
    }

    if (!this.timeOnly) {
      if (this.value) {
        const val = moment(this.value)
        let dateMeta = {
          day: val.jDate(),
          month: val.jMonth(),
          year: val.jYear(),
          hour: this.showTime ? val.hour() : null,
          minute: this.showTime ? val.minute() : null,
          second: this.showSeconds ? val.second() : null,
          selectable: true
        }
        setTimeout(_ => this.onDateSelect(null, dateMeta))
      } else {
        this.value = this.format && this.format.toLowerCase() == 'x' && !value ? this.updateModel(null) : value
      }
    }

    this.updateInputfield()
    this.updateUI()
    this.cd.markForCheck()
  }

  registerOnChange(fn: Function): void {
    this.onModelChange = fn
  }

  registerOnTouched(fn: Function): void {
    this.onModelTouched = fn
  }

  setDisabledState(val: boolean): void {
    this.disabled = val
    this.cd.markForCheck()
  }

  getDateFormat() {
    return this.dateFormat || this.locale.dateFormat
  }

  getDateFormatForMoment() {
    let temp = []
    this.getDateFormat()
      .split('')
      .forEach((y, i) => {
        switch (y) {
          case 'y': {
            temp.push('Y', 'Y')
            break
          }
          case 'm': {
            temp.push('M')
            break
          }
          case 'M': {
            const afterChar = this.getDateFormat().split('')?.[i + 1]
            const beforeChar = this.getDateFormat().split('')?.[i + 1]
            if (afterChar == 'M' || beforeChar == 'M') {
              temp.push('M', 'M')
            } else {
              temp.push('M', 'M', 'M')
            }
            break
          }
          case 'd': {
            temp.push('D')
            break
          }
          case 'D': {
            const afterChar = this.getDateFormat().split('')?.[i + 1]
            const beforeChar = this.getDateFormat().split('')?.[i + 1]
            if (afterChar == 'D' || beforeChar == 'D') {
              temp.push('D', 'D')
            } else {
              temp.push('D', 'D', 'D')
            }
            break
          }
          default: {
            temp.push(y)
          }
        }
      })
    return temp.join('')
  }

  getFirstDateOfWeek() {
    return this._firstDayOfWeek || this.locale?.firstDayOfWeek
  }

  // Ported from jquery-ui datepicker formatDate
  formatDate(date: any, format: any) {
    if (!date) {
      return ''
    }
    date = ['string', 'number'].includes(typeof date) ? moment(date, this.format).locale('fa') : date
    date = moment(date).locale('fa')
    let iFormat: number
    const lookAhead = (match: string) => {
        const matches = iFormat + 1 < format.length && format.charAt(iFormat + 1) === match
        if (matches) {
          iFormat++
        }
        return matches
      },
      formatNumber = (match: any, value: any, len: any) => {
        let num = '' + value
        if (lookAhead(match)) {
          while (num.length < len) {
            num = '0' + num
          }
        }
        return num
      },
      formatName = (match: any, value: any, shortNames: any, longNames: any) => {
        return lookAhead(match) ? longNames[value] : shortNames[value]
      }
    let output = ''
    let literal = false

    if (date) {
      for (iFormat = 0; iFormat < format.length; iFormat++) {
        if (literal) {
          if (format.charAt(iFormat) === "'" && !lookAhead("'")) {
            literal = false
          } else {
            output += format.charAt(iFormat)
          }
        } else {
          switch (format.charAt(iFormat)) {
            case 'd':
              output += formatNumber('d', date.date(), 2)
              break
            case 'D':
              output += formatName('D', date.date(), this.locale.dayNamesShort, this.locale.dayNames)
              break
            case 'o':
              output += formatNumber('o', Math.round((moment([date.year(), date.month(), date.date()]).unix() - moment([date.year(), 0, 0]).unix()) / 86400000), 3)
              break
            case 'm':
              output += formatNumber('m', date.month() + 1, 2)
              break
            case 'M':
              output += formatName('M', date.month(), this.locale.monthNamesShort, this.locale.monthNames)
              break
            case 'y':
              output += lookAhead('y') ? date.year() : (date.year() % 100 < 10 ? '0' : '') + (date.year() % 100)
              break
            case '@':
              output += date.valueOf()
              break
            case '!':
              output += date.valueOf() * 10000 + this.ticksTo1970
              break
            case "'":
              if (lookAhead("'")) {
                output += "'"
              } else {
                literal = true
              }
              break
            default:
              output += format.charAt(iFormat)
          }
        }
      }
    }
    return output
  }

  formatTime(date: any) {
    if (!date) {
      return ''
    }
    date = ['string', 'number'].includes(typeof date) ? moment(date, this.format) : date
    let output = ''
    let hours = date.hour()
    const minutes = date.minute()
    const seconds = date.second()

    if (this.hourFormat == '12' && hours > 11 && hours != 12) {
      hours -= 12
    }

    if (this.hourFormat == '12') {
      output += hours === 0 ? 12 : hours < 10 ? '0' + hours : hours
    } else {
      output += hours < 10 ? '0' + hours : hours
    }
    output += ':'
    output += minutes < 10 ? '0' + minutes : minutes

    if (this.showSeconds) {
      output += ':'
      output += seconds < 10 ? '0' + seconds : seconds
    }

    if (this.hourFormat == '12') {
      output += date.hour() > 11 ? ' PM' : ' AM'
    }

    return output
  }

  parseTime(value: string) {
    const tokens: string[] = value.split(':')
    const validTokenLength = this.showSeconds ? 3 : 2

    if (tokens.length !== validTokenLength) {
      throw 'Invalid time'
    }

    let h = parseInt(tokens[0])
    const m = parseInt(tokens[1])
    const s = this.showSeconds ? parseInt(tokens[2]) : null

    if (isNaN(h) || isNaN(m) || h > 23 || m > 59 || (this.hourFormat == '12' && h > 12) || (this.showSeconds && (isNaN(s) || s > 59))) {
      throw 'Invalid time'
    } else {
      if (this.hourFormat == '12' && h !== 12 && this.pm) {
        h += 12
      }

      return { hour: h, minute: m, second: s }
    }
  }

  // Ported from jquery-ui datepicker parseDate
  parseDate(value: any, format: string) {
    if (format == null || value == null) {
      throw 'Invalid arguments'
    }

    value = typeof value === 'object' ? value.format() : value + ''
    if (value === '') {
      return null
    }

    let iFormat: number,
      dim,
      extra,
      iValue = 0,
      shortYearCutoff = typeof this.shortYearCutoff !== 'string' ? this.shortYearCutoff : (moment().jYear() % 100) + parseInt(this.shortYearCutoff, 10),
      year = -1,
      month = -1,
      day = -1,
      doy = -1,
      literal = false,
      date,
      lookAhead = (match: any) => {
        const matches = iFormat + 1 < format.length && format.charAt(iFormat + 1) === match
        if (matches) {
          iFormat++
        }
        return matches
      },
      getNumber = (match: any) => {
        const isDoubled = lookAhead(match),
          size = match === '@' ? 14 : match === '!' ? 20 : match === 'y' && isDoubled ? 4 : match === 'o' ? 3 : 2,
          minSize = match === 'y' ? size : 1,
          digits = new RegExp('^\\d{' + minSize + ',' + size + '}'),
          num = value.substring(iValue).match(digits)
        if (!num) {
          throw 'Missing number at position ' + iValue
        }
        iValue += num[0].length
        return parseInt(num[0], 10)
      },
      getName = (match: any, shortNames: any, longNames: any) => {
        let index = -1
        const arr = lookAhead(match) ? longNames : shortNames
        const names = []

        for (let i = 0; i < arr.length; i++) {
          names.push([i, arr[i]])
        }
        names.sort((a, b) => {
          return -(a[1].length - b[1].length)
        })

        for (let i = 0; i < names.length; i++) {
          const name = names[i][1]
          if (value.substr(iValue, name.length).toLowerCase() === name.toLowerCase()) {
            index = names[i][0]
            iValue += name.length
            break
          }
        }

        if (index !== -1) {
          return index + 1
        } else {
          throw 'Unknown name at position ' + iValue
        }
      },
      checkLiteral = () => {
        if (value.charAt(iValue) !== format.charAt(iFormat)) {
          throw 'Unexpected literal at position ' + iValue
        }
        iValue++
      }

    if (this.view === 'month') {
      day = 1
    }

    for (iFormat = 0; iFormat < format.length; iFormat++) {
      if (literal) {
        if (format.charAt(iFormat) === "'" && !lookAhead("'")) {
          literal = false
        } else {
          checkLiteral()
        }
      } else {
        switch (format.charAt(iFormat)) {
          case 'd':
            day = getNumber('d')
            break
          case 'D':
            getName('D', this.locale.dayNamesShort, this.locale.dayNames)
            break
          case 'o':
            doy = getNumber('o')
            break
          case 'm':
            month = getNumber('m')
            break
          case 'M':
            month = getName('M', this.locale.monthNamesShort, this.locale.monthNames)
            break
          case 'y':
            year = getNumber('y')
            break
          case '@':
            date = moment(getNumber('@'))
            year = date.jYear()
            month = date.jMonth() + 1
            day = date.jDate()
            break
          case '!':
            date = moment((getNumber('!') - this.ticksTo1970) / 10000)
            year = date.jYear()
            month = date.jMonth() + 1
            day = date.jDate()
            break

          case "'":
            if (lookAhead("'")) {
              checkLiteral()
            } else {
              literal = true
            }
            break
          default:
            checkLiteral()
        }
      }
    }

    if (iValue < value.length) {
      extra = value.substr(iValue)
      if (!/^\s+/.test(extra)) {
        throw 'Extra/unparsed characters found in date: ' + extra
      }
    }
    if (year === -1) {
      year = moment().jYear()
    } else if (year < 100) {
      year += moment().jYear() - (moment().jYear() % 100) + (year <= shortYearCutoff ? 0 : -100)
    }

    if (doy > -1) {
      month = 1
      day = doy
      do {
        dim = this.getDaysCountInMonth(year, month - 1)
        if (day <= dim) {
          break
        }
        month++
        day -= dim
      } while (true)
    }
    date = this.daylightSavingAdjust(moment([year, month - 1, day]))
    if (date.locale('en').year() !== year || date.locale('en').month() + 1 !== month || date.locale('en').date() !== day) {
      throw 'Invalid date' // E.g. 31/02/00
    }

    return date
  }

  daylightSavingAdjust(date: any) {
    if (!date) {
      return null
    }
    date = ['string', 'number'].includes(typeof date) ? moment(date, this.format) : date
    date.hour(date.hours() > 12 ? date.hours() + 2 : 0)

    return date
  }

  updateFilledState() {
    this.filled = this.inputFieldValue && this.inputFieldValue != ''
  }

  onTodayButtonClick(event: any) {
    let date: moment.Moment = moment()
    let dateMeta = {
      day: date.jDate(),
      month: date.jMonth(),
      year: date.jYear(),
      otherMonth: date.jMonth() !== this.currentMonth || date.jYear() !== this.currentYear,
      today: true,
      selectable: true
    }

    this.onDateSelect(event, dateMeta)
    this.onTodayClick.emit(event)
  }

  onClearButtonClick(event: any) {
    this.updateModel(null)
    this.updateInputfield()
    this.hideOverlay()
    this.onClearClick.emit(event)
  }

  createResponsiveStyle() {
    if (this.numberOfMonths > 1 && this.responsiveOptions) {
      if (!this.responsiveStyleElement) {
        this.responsiveStyleElement = this.renderer.createElement('style')
        this.responsiveStyleElement.type = 'text/css'
        this.renderer.appendChild(this.document.body, this.responsiveStyleElement)
      }

      let innerHTML = ''
      if (this.responsiveOptions) {
        let responsiveOptions = [...this.responsiveOptions]
          .filter(o => !!(o.breakpoint && o.numMonths))
          .sort(
            (o1, o2) =>
              -1 *
              o1.breakpoint.localeCompare(o2.breakpoint, undefined, {
                numeric: true
              })
          )

        for (let i = 0; i < responsiveOptions.length; i++) {
          let { breakpoint, numMonths } = responsiveOptions[i]
          let styles = `
                        .p-datepicker[${this.attributeSelector}] .p-datepicker-group:nth-child(${numMonths}) .p-datepicker-next {
                            display: inline-flex !important;
                        }
                    `

          for (let j = numMonths; j < this.numberOfMonths; j++) {
            styles += `
                            .p-datepicker[${this.attributeSelector}] .p-datepicker-group:nth-child(${j + 1}) {
                                display: none !important;
                            }
                        `
          }

          innerHTML += `
                        @media screen and (max-width: ${breakpoint}) {
                            ${styles}
                        }
                    `
        }
      }

      this.responsiveStyleElement.innerHTML = innerHTML
    }
  }

  destroyResponsiveStyleElement() {
    if (this.responsiveStyleElement) {
      this.responsiveStyleElement.remove()
      this.responsiveStyleElement = null
    }
  }

  bindDocumentClickListener() {
    if (!this.documentClickListener) {
      this.zone.runOutsideAngular(() => {
        const documentTarget: any = this.el ? this.el.nativeElement.ownerDocument : this.document

        this.documentClickListener = this.renderer.listen(documentTarget, 'mousedown', event => {
          if (this.isOutsideClicked(event) && this.overlayVisible) {
            this.zone.run(() => {
              this.hideOverlay()
              this.onClickOutside.emit(event)

              this.cd.markForCheck()
            })
          }
        })
      })
    }
  }

  unbindDocumentClickListener() {
    if (this.documentClickListener) {
      this.documentClickListener()
      this.documentClickListener = null
    }
  }

  bindDocumentResizeListener() {
    if (!this.documentResizeListener && !this.touchUI) {
      this.documentResizeListener = this.renderer.listen(this.window, 'resize', this.onWindowResize.bind(this))
    }
  }

  unbindDocumentResizeListener() {
    if (this.documentResizeListener) {
      this.documentResizeListener()
      this.documentResizeListener = null
    }
  }

  bindScrollListener() {
    if (!this.scrollHandler) {
      this.scrollHandler = new ConnectedOverlayScrollHandler(this.containerViewChild.nativeElement, () => {
        if (this.overlayVisible) {
          this.hideOverlay()
        }
      })
    }

    this.scrollHandler.bindScrollListener()
  }

  unbindScrollListener() {
    if (this.scrollHandler) {
      this.scrollHandler.unbindScrollListener()
    }
  }

  isOutsideClicked(event: Event) {
    return !(this.el.nativeElement.isSameNode(event.target) || this.isNavIconClicked(event) || this.el.nativeElement.contains(event.target) || (this.overlay && this.overlay.contains(<Node>event.target)))
  }

  isNavIconClicked(event: Event) {
    return DomHandler.hasClass(event.target, 'p-datepicker-prev') || DomHandler.hasClass(event.target, 'p-datepicker-prev-icon') || DomHandler.hasClass(event.target, 'p-datepicker-next') || DomHandler.hasClass(event.target, 'p-datepicker-next-icon')
  }

  onWindowResize() {
    if (this.overlayVisible && !DomHandler.isTouchDevice()) {
      this.hideOverlay()
    }
  }

  onOverlayHide() {
    this.currentView = this.view

    if (this.mask) {
      this.destroyMask()
    }

    this.unbindDocumentClickListener()
    this.unbindDocumentResizeListener()
    this.unbindScrollListener()
    this.overlay = null
    this.onModelTouched()
  }

  jumpDaySubmit(count) {
    if (count > 0) {
      if (!this.value) this.value = moment()
      this.updateModel(moment(this.value, this.format).add(count, 'day'))
    } else if (count < 0) {
      if (!this.value) this.value = moment()
      this.updateModel(moment(this.value, this.format).subtract(Math.abs(count), 'day'))
    } else {
      this.updateModel(moment().format(this.format))
    }
    this.jumpDayOverlay.hide()
    this.updateInputfield()
  }

  ngOnDestroy() {
    if (this.scrollHandler) {
      this.scrollHandler.destroy()
      this.scrollHandler = null
    }

    if (this.translationSubscription) {
      this.translationSubscription.unsubscribe()
    }

    if (this.overlay && this.autoZIndex) {
      ZIndexUtils.clear(this.overlay)
    }

    this.destroyResponsiveStyleElement()
    this.clearTimePickerTimer()
    this.restoreOverlayAppend()
    this.onOverlayHide()
  }
}
