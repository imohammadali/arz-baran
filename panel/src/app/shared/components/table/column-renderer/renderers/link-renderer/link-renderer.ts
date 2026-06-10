import { Component, Input, ChangeDetectionStrategy } from '@angular/core'
import { IColumn, ITableSetting } from '@shared/components/table/table'
import { Router } from '@angular/router'


@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'link-renderer',
  template: `
    @if (col?.renderer_option?.is_link_field) {
      <span [class.is_link]="data?.[col?.renderer_option?.is_link_field]"
      (click)="clicked(col, data)">{{ data[col.field] }}</span>
    } @else {
      <span class="is_link" (click)="clicked(col, data)">{{ data[col.field] }}</span>
    }
    `,
  imports: [],
  styles: [
    `
      .is_link {
        text-decoration: underline;
        color: var(--main-info-color);
      }
    `
  ]
})
export class LinkRenderer {
  @Input() data: any
  @Input() col: IColumn
  @Input() setting: ITableSetting

  constructor(private _router: Router) {}

  clicked(col, data) {
    if (!col?.renderer_option?.path || (!data?.[col?.renderer_option?.is_link_field] && col?.renderer_option?.is_link_field)) return
    let fullPath = col?.renderer_option.path
      .split('/')
      ?.map(p => {
        if (p.includes(':')) {
          p = data[p.replace(':', '')]
        }
        return p
      })
      .join('/')
    if (fullPath) {
      switch (col.renderer_option?.target) {
        case 'blank': {
          const url = location.origin + '/admin' + String(this._router.createUrlTree([fullPath]))
          window.open(url, '_blank')
          break
        }
        default:
        case 'self': {
          this._router.navigate([fullPath])
          break
        }
      }
    }
  }
}
