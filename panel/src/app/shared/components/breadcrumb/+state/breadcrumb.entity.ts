import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity'

export const BREADCRUMB_FUTURE_KEY = 'breadcrumb'

export interface Breadcrumb {
  data?: string
  show?: boolean
  touch?: number
}

export interface BreadcrumbState extends EntityState<Breadcrumb> {
  data: string
  show: boolean
  touch?: number
}

export interface BreadcrumbPartialState {
  [BREADCRUMB_FUTURE_KEY]: BreadcrumbState
}

export const breadCrumbAdapter: EntityAdapter<Breadcrumb> = createEntityAdapter<Breadcrumb>()

export const BreadcrumbInitialState: BreadcrumbState = breadCrumbAdapter.getInitialState({
  data: '',
  show: true,
  touch: 0
} as any)
