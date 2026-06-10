import { Component, Input, ChangeDetectionStrategy } from '@angular/core'
import { IColumn, ITableSetting } from '@shared/components/table/table'
import { Tooltip } from 'primeng/tooltip'
import { ColorPicker } from 'primeng/colorpicker'
import { FormsModule } from '@angular/forms'

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'color-code-renderer',
  imports: [ColorPicker, FormsModule],
  template: `
    <span class="flex justify-center items-center">
      <label style="direction: ltr" class="ms-2">{{ data[col.field] }}</label>
      <p-colorPicker [ngModel]="data[col.field]" />
    </span>
  `
})
export class ColorCodeRendererComponent {
  @Input() index: number
  @Input() data: any
  @Input() col: IColumn
  @Input() setting: ITableSetting

  clicked(item, col, data, index?) {
    this.setting.onClick(item, col, data, index)
  }
}
