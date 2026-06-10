import { Component, Input, ChangeDetectionStrategy } from '@angular/core'
import { IColumn, ITableSetting } from '@shared/components/table/table'

import { Tag } from 'primeng/tag'
import { TranslatePipe } from '@ngx-translate/core'
import { SummeryPipe } from '@shared/pipes/summery.pipe'
import { Tooltip } from 'primeng/tooltip'

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'tag-renderer',
  template: `
    <div [pTooltip]="col?.renderer_option?.show_tooltip ? tooltipContent : null">
      @if (data[col.field]?.length > 0) {
        @for (field of [].concat(data[col.field]); track field; let i = $index) {
          @if (col?.renderer_option?.max_tag ? i < col?.renderer_option?.max_tag : true) {
            <p-tag
              [rounded]="col.renderer_option?.rounded"
              [severity]="field?.severity"
              [styleClass]="data[col.renderer_option?.classField] + ' me-1 ' + field?.class"
              [value]="field.label | summery: col?.renderer_option?.max_char"
              [class.whitespace-nowrap]="[].concat(data[col.field]).length == 1"
              >
            </p-tag>
          }
        }
        @if (col?.renderer_option?.max_tag ? data[col.field]?.length > col?.renderer_option?.max_tag : false) {
          <span class="text-xl">...</span>
        }
      } @else {
        -
      }
    </div>
    <ng-template #tooltipContent>
      @for (field of [].concat(data[col.field]); track field; let i = $index) {
        <p-tag
          [rounded]="col.renderer_option?.rounded"
          [severity]="field?.severity"
          [styleClass]="data[col.renderer_option?.classField] + ' me-1 ' + field?.class"
          [value]="field.label"
          >
        </p-tag>
      }
    </ng-template>
    `,
  imports: [Tag, SummeryPipe, Tooltip]
})
export class TagRendererComponent {
  @Input() data: any
  @Input() col: IColumn
  @Input() setting: ITableSetting
}
