import { createReducer, on } from '@ngrx/store';
import { BreadcrumbInitialState } from '@shared/components/breadcrumb/+state/breadcrumb.entity';
import { BreadcrumbActions } from '@shared/components/breadcrumb/+state/breadcrumb.actions';

export const breadCrumbReducers = createReducer(
  BreadcrumbInitialState,
  on(BreadcrumbActions.setData, (state, {data}) => ({
    ...state,
    data: data,
  })),
  on(BreadcrumbActions.show, (state, { show }) => ({
    ...state,
    show: show
  })),
  on(BreadcrumbActions.touch, (state, { randomNumber }) => ({
    ...state,
    touch: randomNumber
  }))
);
