import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {IColumn, ITableSetting} from "@shared/components/table/table";
import { Tooltip } from 'primeng/tooltip'
import { IconDirective } from '@shared/directives/icon.directive'

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'icon-renderer',
  template: `
    <span class="d-flex justify-content-center">
      <i
        style="cursor: pointer;{{ data[col.renderer_option?.iconStyleField] || '' }}"
        [pTooltip]="data[col.renderer_option?.tooltip]"
        [class]="data[col.renderer_option?.iconClassFiled || col?.field]"
        [icon-name]="data[col.renderer_option?.iconClassFiled || col?.field]"
        (click)="clicked(col.field, col, data, index)"
      ></i>
    </span>
  `,
  imports: [Tooltip, IconDirective],
  styles: [
    `
      .pi {
        font-size: 1.3rem !important;
      }
    `
  ]
})
export class IconRendererComponent {
  @Input() index: number
  @Input() data: any
  @Input() col: IColumn
  @Input() setting: ITableSetting

  clicked(item, col, data, index?) {
    this.setting.onClick(item, col, data, index)
  }
}
