import { Component, Input, OnInit , ChangeDetectionStrategy} from '@angular/core';

import { IconDirective } from '@shared/directives/icon.directive'

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'boolean-renderer',
  template: `
    @if (data) {
      <i icon-name="check_circle" class="text-success-500"></i>
    } @else {
      <i icon-name="cancel" class="text-danger-500"></i>
    }
    `,
  imports: [
    IconDirective
]
})
export class BooleanRenderer {
  @Input() data: any;
}
