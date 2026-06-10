import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core'
import { IColumn, ITableSetting } from '@shared/components/table/table'
import { NgStyle } from '@angular/common'
import { ButtonModule } from 'primeng/button'
import { TranslatePipe } from '@ngx-translate/core'

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'button-renderer',
  imports: [ButtonModule, TranslatePipe, NgStyle],
  template: `
    @for (button of data[col.field]; track button) {
      <p-button [ngStyle]="{ whiteSpace: 'nowrap' }" [label]="'table.column.' + button.label | translate" (click)="clicked(setting, col, data)" [severity]="button?.severity || 'primary'" [rounded]="button?.rounded ?? false" />
    }
  `
})
export class ButtonRenderer {
  @Input() col: IColumn
  @Input() setting: ITableSetting
  @Input() data: any
  @Input() rendererOption

  clicked(item, col, data) {
    if (item && item.onClick && item.onClick instanceof Function) {
      this.setting?.onClick(col.field, col, data)
    }
  }
}
