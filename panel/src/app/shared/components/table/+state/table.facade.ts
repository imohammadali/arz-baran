import { Injectable } from '@angular/core';
import { select, Store } from '@ngrx/store';
import { TableActions } from '@shared/components/table/+state/table.actions';
import {tablePartialState, tableInitialState} from '@shared/components/table/+state/table.entity';
import { TableSelectors } from '@shared/components/table/+state/table.selectors';
import { IPaginate } from '@shared/components/table/table';

@Injectable({ providedIn: "root" })
export class TableFacade {

  tableData(tableName: string) {
    return this.store.select(TableSelectors.dataTable(tableName))
  }

  totalRecords(tableName: string) {
    return this.store.select(TableSelectors.totalRecords(tableName))
  }

  constructor(private store: Store<tablePartialState>) { }

  setData(tableName: string, totalRecords: number) {
    this.store.dispatch(TableActions.setDataTable({ tableName, totalRecords }));
  }

  changePagination(paginate: IPaginate, tableName: string) {
    this.store.dispatch(TableActions.changePagination({ paginate, tableName }));
  }

  getPagination(tableName: string) {
    return this.store.select(TableSelectors.pagination(tableName))
  }

  resetTable(tableName: string) {
    this.store.dispatch(TableActions.reset({tableName}));
  }

}
