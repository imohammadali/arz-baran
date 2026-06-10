import { Component, EventEmitter, Input, OnInit, Output, ChangeDetectionStrategy } from '@angular/core'
import { IColumn, ITableSetting } from '@shared/components/table/table'
import { ToggleSwitch } from 'primeng/toggleswitch'
import { FormsModule } from '@angular/forms'

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'toggle-renderer',
  imports: [FormsModule, ToggleSwitch],
  template: `
    <div class="toggle-select flex justify-center items-center">
      <p-toggle-switch [readonly]="true" (click)="clicked(setting, col, data)" [(ngModel)]="data[col.field]"></p-toggle-switch>
    </div>
  `
})
export class ToggleRenderer {
  @Input() data: any
  @Input() col: IColumn
  @Input() setting: ITableSetting
  @Input() index: number

  constructor() {}

  clicked(item, col, data) {
    if (item && item.onClick && item.onClick instanceof Function) {
      this.setting?.onClick('toggle', col, data, this.index)
    }
  }
}
