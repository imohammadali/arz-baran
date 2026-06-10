import { createEntityAdapter, EntityAdapter, EntityState } from '@ngrx/entity'

export const TABLE_FUTURE_KEY = 'table'

export interface TableState extends EntityState<any> {
  tables: object
}

export interface tablePartialState {
  [TABLE_FUTURE_KEY]: TableState
}

export const tableAdapter: EntityAdapter<TableState> = createEntityAdapter<TableState>()

export const tableInitialState: TableState = tableAdapter.getInitialState({
  tables: {}
} as any)
