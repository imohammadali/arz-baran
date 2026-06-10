import { Component, Input, OnInit, ChangeDetectionStrategy } from '@angular/core'
import { IActionButton, IColumn, ITableSetting } from '@shared/components/table/table'
import { BehaviorSubject, Observable } from 'rxjs'
import { PermissionService } from '@shared/services/permission/permission.service'
import { select, Store } from '@ngrx/store'
import { selectSettingsLanguage } from '@core/settings/settings.selectors'
import { AppState } from '@core/core.state'
import { AsyncPipe } from '@angular/common';
import { Tooltip } from 'primeng/tooltip'
import { HasPermissionDirective } from '@shared/services/permission/permission.directive'
import { IconDirective } from '@shared/directives/icon.directive'

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'action-button-renderer',
  template: `
    <div class="action-button">
      @for (item of actionButton$ | async; track item) {
        @if (!item?.is_hidden) {
          <span (click)="clicked(item, col, data)" [pTooltip]="item?.options?.tooltip">
            <i *hasPermission="item?.permissions" [style]="data[item?.options?.styleField]"
              class="{{data[item?.options?.classField]}} {{insertClass(item.button)}}"
            [icon-name]="rewriteIcon(item.button)" [class.disabled]="item?.disabled"></i>
          </span>
        }
      }
    </div>
    `,
  imports: [
    AsyncPipe,
    Tooltip,
    HasPermissionDirective,
    IconDirective
],
  styleUrls: ['./action-button.scss']
})
export class ActionButton implements OnInit {
  @Input() data: any
  @Input() col: IColumn
  @Input() setting: ITableSetting
  @Input() index: number

  actionButton$ = new BehaviorSubject<IActionButton[]>([])

  ngOnInit() {
    let action_buttons = this.setting?.actionButton?.map(button => {
      return {
        ...button,
        icon: button?.options?.classField || this.rewriteIcon(button.button),
        command: () => {
          this.clicked(button, this.col, this.data)
        },
        style: button?.options?.styleField,
        is_hidden: (button.is_hidden && this.data?.[button?.options?.condition_field] === false) || false,
        visible: (!button.is_hidden && this.data?.[button?.options?.condition_field] !== false) || false,
        disabled: button.disabled || false,
        tooltipOptions: {
          tooltipLabel: button?.options?.tooltip,
          tooltipPosition: 'top'
        }
      }
    })
    this.actionButton$.next(action_buttons || [])
  }

  clicked(item, col, data) {
    this.setting.onClick(item.button, col, data, this.index)
  }

  rewriteIcon(button): string {
    switch (button) {
      case 'delete':
        return 'delete'
      case 'edit':
        return 'edit_square'
      case 'copy':
        return 'content_copy'
      case 'password':
        return 'key'
      case 'export':
        return 'file_export'
      case 'change_national_code':
        return 'icon icon-change'
      case 'view':
        return 'visibility'
      case 'flow':
        return 'icon icon-flow-sheet'
      case 'comment':
        return 'chat'
      case'download':
        return'download'
      default:
        return button
    }
  }

  insertClass(button): string {
    switch (button) {
      case 'delete':
        return 'text-danger-500'
      case 'edit':
        return 'text-info-500'
      case 'copy':
        return ''
      case 'password':
        return ''
      case 'export':
        return ''
      case 'change_national_code':
        return ''
      case 'view':
        return ''
      case 'flow':
        return ''
      case 'comment':
        return ''
      default:
        return ''
    }
  }
}
