import { createAction, props } from '@ngrx/store';
import { MenuItem } from 'primeng/api';

export class SidebarActions {
  static updateSidebarItems = createAction(
    '[Sidebar] update menu items',
    props<{data: MenuItem[]}>()
  )
  static touch = createAction(
    '[Sidebar] touch sidebar',
    props<{randomNumber: number}>()
  )
}
