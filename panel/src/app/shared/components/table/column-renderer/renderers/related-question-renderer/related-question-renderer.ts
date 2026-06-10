import { ChangeDetectionStrategy, Component, Injector, Input, OnInit } from '@angular/core'
import { AvatarModule } from 'primeng/avatar'
import { AsyncPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core'
import { IColumn, ITableSetting } from '@shared/components/table/table'
import { BehaviorSubject } from 'rxjs'
import { AutoCompleteModule } from 'primeng/autocomplete'
import { FormsModule, ReactiveFormsModule } from '@angular/forms'
import { Utility } from '@shared/services/utility'
import { TooltipModule } from 'primeng/tooltip'

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'related-question-renderer',
  standalone: true,
  imports: [AvatarModule, AsyncPipe, TranslateModule, AutoCompleteModule, ReactiveFormsModule, FormsModule, TooltipModule],
  template: `
    <table style="width: 100%;">
      @for (item of data[col.field]; track item; let index = $index) {
        <tr>
          <td [pTooltip]="item['title']">{{ item['title'] }}</td>
          <td>
            <div class="field p-float-label">
              <p-auto-complete
                #autocomplete
                (onFocus)="autocomplete.handleDropdownClick($event)"
                [completeOnFocus]="true"
                [multiple]="true"
                (completeMethod)="
                  filterComplete($event, questions$, questionsFiltered$, undefined, undefined, 'title', 'id', true, 'driven', ngModel[index])
                "
                [(ngModel)]="ngModel[index]"
                (ngModelChange)="setting.onClick('update_item', col, { data, childs: $event, answer_id: index })"
                [suggestions]="questionsFiltered$ | async"
                optionLabel="title"
                dataKey="id"
                [unique]="true"
                >
              </p-auto-complete>
              <label translate="form.related_question"></label>
            </div>
          </td>
        </tr>
      }
    </table>
    `
})
export class RelatedQuestionRenderer extends Utility implements OnInit {
  @Input() data
  @Input() col: IColumn
  @Input() index: number
  @Input() setting: ITableSetting

  questions$ = new BehaviorSubject([])
  questionsFiltered$ = new BehaviorSubject([])
  ngModel = {}

  constructor(injector: Injector) {
    super(injector)
  }

  ngOnInit(): void {
    this.data[this.col.field]?.forEach((answer, i) => (this.ngModel[i] = answer?.childs || []))
    this.questions$.next(this.data[this.col.renderer_option?.dataField])
  }
}
