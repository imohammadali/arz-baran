import { createAction, props } from '@ngrx/store';

export class BreadcrumbActions {

  static setData = createAction('[Breadcrumb] set data',
    props<{data: string}>()
  );

  static show = createAction(
    '[Breadcrumb] show breadcrumb',
    props<{ show: boolean }>()
  );

  static touch = createAction(
    '[Breadcrumb] touch breadcrumb',
    props<{ randomNumber: number }>()
  );

}
