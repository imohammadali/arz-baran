import { createReducer, on } from '@ngrx/store';
import { tableInitialState } from '@shared/components/table/+state/table.entity';
import { TableActions } from '@shared/components/table/+state/table.actions';

export const tableReducers = createReducer(
  tableInitialState,
  on(TableActions.setDataTable, (state: any, {tableName, totalRecords}) => ({
    ...state,
    tables: {
      ...state.tables,
      [tableName]: {
        ...state.tables[tableName],
        totalRecords: totalRecords
      }
    }
  })),
  on(TableActions.changePagination, (state: any, params ) => ({
    ...state,
    tables: {
      ...state.tables,
      [params.tableName]: {
        ...state.tables[params.tableName],
        pagination: {...params.paginate, page: params.paginate.page+1, total: 0}
      }
    }
  })),
  on(TableActions.reset, (state: any, {tableName}) => ({
    ...state,
    tables: {
      ...state.tables,
      [tableName]: {
        ...state.tables[tableName],
        pagination: null,
        totalRecords: 0
      }
    }
  })),
);
