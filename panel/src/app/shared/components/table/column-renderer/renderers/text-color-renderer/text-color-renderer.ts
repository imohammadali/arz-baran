import { Component, Input, OnInit , ChangeDetectionStrategy} from '@angular/core';
import {IColumn} from "@shared/components/table/table";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'text-color-renderer',
  template: `
    <span [class]="data[col?.renderer_option?.textColorClass]">{{data[col.field]}}</span>
  `,
  styleUrls: ['./text-color-renderer.scss']
})
export class TextColorRenderer {
  @Input() data: any;
  @Input() col: IColumn;
}
