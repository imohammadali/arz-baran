import { select, Store } from '@ngrx/store';
import { SidebarPartialState } from '@shared/components/sidebar/+state/sidebar.entity';
import { SidebarSelectors } from '@shared/components/sidebar/+state/sidebar.selectors';
import { SidebarActions } from '@shared/components/sidebar/+state/sidebar.actions';
import { Injectable } from '@angular/core';
import { MenuItem } from 'primeng/api';
import {TranslateService} from "@ngx-translate/core";
import {take} from "rxjs/operators";

@Injectable()
export class SidebarFacade {
  constructor(private store: Store<SidebarPartialState>, private _translate: TranslateService) {
  }

  touchState$ = this.store.pipe(select(SidebarSelectors.touchState));
  sidebarItems$ = this.store.pipe(select(SidebarSelectors.sidebarItems));

  updateSidebarItems(items: MenuItem[]) {
    let labels = [];
    let sidebarItems = [];
    items.forEach(itemLV1 => {
      labels.push(itemLV1.label);
      if (itemLV1?.items?.length) {
        itemLV1.items.forEach(itemLV2 => {
          labels.push(itemLV2.label)
          if (itemLV2?.items?.length) {
            itemLV2.items.forEach(itemLV3 => {labels.push(itemLV3.label)})
          }
        })
      }
    })
    this._translate.get(labels).pipe(take(1)).subscribe((data: object) => {
      sidebarItems = items.map((itemLV1) => {
        return {
          ...itemLV1,
          label: data[itemLV1.label],
          items: !itemLV1?.items?.length ? undefined : itemLV1.items.map(itemLV2 => {
            return {
              ...itemLV2,
              label: data[itemLV2.label],
              items: !itemLV2?.items?.length ? undefined : itemLV2.items.map(itemLV3 => {
                return {
                  ...itemLV3,
                  label: data[itemLV3.label],
                }
              })
            }
          })
        }
      });
      this.store.dispatch(SidebarActions.updateSidebarItems({data: sidebarItems}))
    });

  }

  touchData() {
    let rnd_number = Math.floor(Math.random()*(999-100+1)+100);
    this.store.dispatch(SidebarActions.touch({randomNumber: rnd_number}))
  }

}
