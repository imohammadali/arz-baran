import { createAction, props } from '@ngrx/store';
import { IPaginate } from '@shared/components/table/table';

export class TableActions {

  static setDataTable = createAction('[Table] set data table', props<{tableName: string, totalRecords: number}>());

  static changePagination = createAction('[Table] change pagination', props<{paginate: IPaginate, tableName: string}>());

  static reset = createAction('[Table] reset table', props<{tableName: string}>());

}
