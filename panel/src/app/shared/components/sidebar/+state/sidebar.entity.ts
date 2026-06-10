import { createEntityAdapter, EntityAdapter } from '@ngrx/entity';
import { MenuItem } from 'primeng/api';

export const SIDEBAR_FEATURE_KEY = 'sidebar';

export interface SidebarState {
  items: MenuItem[],
  touch: number
}

export interface SidebarPartialState {
  [SIDEBAR_FEATURE_KEY]: SidebarState
}

export const SidebarAdapter: EntityAdapter<any> = createEntityAdapter();
