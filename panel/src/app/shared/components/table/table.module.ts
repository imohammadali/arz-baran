import { NgModule } from '@angular/core'
import { CommonModule } from '@angular/common'
import { TableComponent } from './table.component'
import { TableModule as TablePrimeng } from 'primeng/table'
import { StoreModule } from '@ngrx/store'
import { TABLE_FUTURE_KEY } from '@shared/components/table/+state/table.entity'
import { tableReducers } from '@shared/components/table/+state/table.reducers'
import { TablePipe } from '@shared/components/table/table.pipe'
import { ColumnRendererComponent } from './column-renderer/column-renderer.component'
import { DateRenderer } from './column-renderer/renderers/date-renderer/date-renderer'
import { ActionButton } from '@shared/components/table/column-renderer/renderers/action-button/action-button'
import { BooleanRenderer } from '@shared/components/table/column-renderer/renderers/boolean-renderer/boolean-renderer'
import { ToggleRenderer } from '@shared/components/table/column-renderer/renderers/toggle-renderer/toggle'
import { IconRendererComponent } from './column-renderer/renderers/icon-renderer/icon-renderer.component'
import { TagRendererComponent } from '@shared/components/table/column-renderer/renderers/tag-renderer/tag-renderer.component'
import { ButtonRenderer } from '@shared/components/table/column-renderer/renderers/button-renderer/button-renderer'
import { TextColorRenderer } from '@shared/components/table/column-renderer/renderers/text-color-renderer/text-color-renderer'
import { LinkRenderer } from '@shared/components/table/column-renderer/renderers/link-renderer/link-renderer'
import { ThumbnailRenderer } from '@shared/components/table/column-renderer/renderers/thumbnail-renderer/thumbnail-renderer'
import { RelatedQuestionRenderer } from '@shared/components/table/column-renderer/renderers/related-question-renderer/related-question-renderer'
import { DropdownRenderer } from '@shared/components/table/column-renderer/renderers/dropdown-renderer/dropdown-renderer'

@NgModule({
  exports: [TableComponent, TablePipe],
  imports: [CommonModule, TablePrimeng, ThumbnailRenderer, RelatedQuestionRenderer, TableComponent, TablePipe, ColumnRendererComponent, DateRenderer, BooleanRenderer, ToggleRenderer, ActionButton, IconRendererComponent, TagRendererComponent, ButtonRenderer, TextColorRenderer, DropdownRenderer, LinkRenderer]
})
export class TableModule {}
