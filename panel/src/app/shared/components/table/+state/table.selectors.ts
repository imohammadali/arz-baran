import { createFeatureSelector, createSelector } from '@ngrx/store';
import { TableState, TABLE_FUTURE_KEY } from '@shared/components/table/+state/table.entity';


export class TableSelectors {

  static tableSelector = createFeatureSelector<TableState>(TABLE_FUTURE_KEY);

  static tables = createSelector(
    TableSelectors.tableSelector,
    (state: TableState) => (state.tables)
  );

  static dataTable = (props: string) => createSelector(TableSelectors.tables, (state: any) => state[props]?.data || []);
  static totalRecords = (props: string) => createSelector(TableSelectors.tables, (state: any) => state[props]?.totalRecords || 0);
  static pagination = (props: string) => createSelector(TableSelectors.tables, (state: any) => state[props]?.pagination || {});


}
