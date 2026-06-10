import { Action, createReducer, on } from '@ngrx/store';
import { SidebarActions } from '@shared/components/sidebar/+state/sidebar.actions';

export class SidebarReducers {
  static sidebarReducer = createReducer(
    {
      touch: 0,
      items: []
    },
    on(SidebarActions.updateSidebarItems, (state, {data}) => ({
      ...state,
      items: data
    })),
    on(SidebarActions.touch, (state, {randomNumber}) => ({
      ...state,
      touch: randomNumber
    }))
  )

  static reducer(state: any, action: Action) {
    return SidebarReducers.sidebarReducer(state, action);
  }

}
