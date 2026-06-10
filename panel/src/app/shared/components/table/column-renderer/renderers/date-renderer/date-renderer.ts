import { ChangeDetectionStrategy, Component, Input } from '@angular/core'
import { IColumn } from '@shared/components/table/table'
import moment from 'jalali-moment'
import { select, Store } from '@ngrx/store'
import { AppState } from '@core/core.state'
import { selectSettingsLanguage } from '@core/settings/settings.selectors'
import { AsyncPipe } from '@angular/common'

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'date-renderer',
  imports: [AsyncPipe],
  template: ` <span class="whitespace-nowrap">{{ transform(data[col.field], language$ | async) }}</span> `
})
export class DateRenderer {
  @Input() data: any
  @Input() col: IColumn
  language$ = this.store.pipe(select(selectSettingsLanguage))

  constructor(private store: Store<AppState>) {}

  transform(value: any, lang: string) {
    if (!value) return '-'
    let gregorianDate = moment(value, 'X').format('YYYY-MM-DD HH:mm:ss')
    let jalaliDate = moment(gregorianDate, 'YYYY-MM-DD HH:mm:ss').format('jYYYY/jMM/jDD HH:mm:ss')
    if (lang === 'fa') {
      return `${this.col?.renderer_option?.show_time ? gregorianDate.split(' ')[1] + ' - ' : ''}${jalaliDate.split(' ')[0]}`
    } else {
      return `${gregorianDate.split(' ')[0]}${this.col?.renderer_option?.show_time ? ' - ' + gregorianDate.split(' ')[1] : ''}`
    }
  }
}
