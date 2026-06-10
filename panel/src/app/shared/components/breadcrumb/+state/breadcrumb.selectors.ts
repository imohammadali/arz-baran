import { createFeatureSelector, createSelector } from '@ngrx/store';
import { BreadcrumbState, BREADCRUMB_FUTURE_KEY } from '@shared/components/breadcrumb/+state/breadcrumb.entity';

const breadcrumbSelector = createFeatureSelector<BreadcrumbState>(BREADCRUMB_FUTURE_KEY);

export class BreadcrumbSelectors {

  static state = createSelector(
    breadcrumbSelector,
    (state: BreadcrumbState) => state
  );

  static touch = createSelector(
    breadcrumbSelector,
    (state: BreadcrumbState) => state.touch
  );

  static show = createSelector(
    breadcrumbSelector,
    (state: BreadcrumbState) => state.show
  );

  static data = createSelector(
    breadcrumbSelector,
    (state: BreadcrumbState) => state.data
  );

}
