import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SIDEBAR_FEATURE_KEY, SidebarState } from '@shared/components/sidebar/+state/sidebar.entity';

export class SidebarSelectors {
  static sidebarSelector = createSelector(
    createFeatureSelector(SIDEBAR_FEATURE_KEY),
    (state: SidebarState) => state
  )

  static touchState = createSelector(SidebarSelectors.sidebarSelector, (state) => state.touch);
  static sidebarItems = createSelector(SidebarSelectors.sidebarSelector, (state) => state.items);

}
