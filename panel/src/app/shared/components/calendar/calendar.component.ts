import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core'
import { select, Store } from '@ngrx/store'
import { selectSettingsLanguage } from '@core/settings/settings.selectors'
import { AppState } from '@core/core.state'
import { FormGroup, FormsModule } from '@angular/forms'
import { Subject, takeUntil } from 'rxjs'
import { distinctUntilChanged } from 'rxjs/operators'
import moment from 'jalali-moment'
import { Calendar } from 'primeng/calendar'
import { AsyncPipe } from '@angular/common';
import { PrimeCalendar } from '@shared/components/prime-calendar/prime-calendar'

@Component({
  selector: 'calendar',
  templateUrl: './calendar.component.html',
  imports: [
    Calendar,
    AsyncPipe,
    FormsModule,
    PrimeCalendar
],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarComponent implements OnInit {
  @Input() fg: FormGroup
  @Input() fcn: string
  @Input() showTime = false
  @Input() showSeconds = false
  @Input() label: string

  val_en = null
  val_fa = null

  language$ = this.store.pipe(select(selectSettingsLanguage))
  destroy$ = new Subject()

  constructor(private store: Store<AppState>, private _cd: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.updatedDate(this.fg.get(this.fcn)?.value)
    this.fg
      .get(this.fcn)
      .valueChanges.pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(val => {
        this.updatedDate(val)
      })
  }

  updatedDate(val) {
    if (!val) {
      this.clearDate()
      return
    }
    this.val_fa = moment(moment.unix(val))
    this.val_en = moment(moment.unix(val)).toDate()
    this.fg.get(this.fcn).patchValue(val)
    this._cd.detectChanges()
  }

  clearDate() {
    this.val_fa = null
    this.val_en = null
    this._cd.detectChanges()
  }

  ngOnDestroy() {
    this.destroy$.next(true)
    this.destroy$.unsubscribe()
  }

  protected readonly moment = moment
}
