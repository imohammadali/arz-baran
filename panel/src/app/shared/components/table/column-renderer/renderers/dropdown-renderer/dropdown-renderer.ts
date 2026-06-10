import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core'
import { IColumn, ITableSetting } from '@shared/components/table/table'
import { BehaviorSubject } from 'rxjs'
import { Select } from 'primeng/select'
import { AsyncPipe } from '@angular/common'
import { FormsModule } from '@angular/forms'

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'dropdown-renderer',
  imports: [AsyncPipe, FormsModule, Select],
  template: ` <div class="field p-float-label">
    <p-select
      [disabled]="data[col.renderer_option?.disabled_field]"
      appendTo="body"
      [filter]="false"
      [showClear]="false"
      (onChange)="change(setting, col, $event.value)"
      [options]="data[col.renderer_option?.list_field] | async"
      [ngModel]="data[col.field] || 'idle'"
      [optionLabel]="col.renderer_option?.optionLabel || 'name'"
      [optionValue]="col.renderer_option?.optionValue || 'id'"
    ></p-select>
    <label [translate]="'table.column.' + col.label"></label>
  </div>`
})
export class DropdownRenderer implements OnInit {
  @Input() data: any
  @Input() list$ = new BehaviorSubject([])
  @Input() col: IColumn
  @Input() setting: ITableSetting
  @Input() index: number

  constructor() {}

  change(item, col, data) {
    if (this.data[col.field] == data) return
    if (item && item.onClick && item.onClick instanceof Function) {
      this.setting?.onClick('dropdown', col, { ...this.data, selectedItem: data, index: this.index }, this.index)
    }
  }

  ngOnInit(): void {}
}
