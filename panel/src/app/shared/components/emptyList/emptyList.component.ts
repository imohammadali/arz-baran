import { Component } from '@angular/core'
import { TranslateModule } from '@ngx-translate/core'

@Component({
  selector: 'app-empty-list',
  template: `
    <div class="flex lg:items-center flex-col gap-8 mt-5">
      <div class="flex justify-center">
        <img src="img/empty.png" alt="" width="100" height="100" />
      </div>
      <div class="flex justify-center">
        <span class="text-sm font-semibold" translate="feedback.empty.list"></span>
      </div>
    </div>
  `,
  styleUrl: './emptyList.component.scss',
  standalone: true,
  imports: [TranslateModule]
})
export class EmptyListComponent {}
