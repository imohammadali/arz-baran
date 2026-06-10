import { Injectable } from '@angular/core'
import { RouterStateSnapshot } from '@angular/router'
import { RouterStateSerializer } from '@ngrx/router-store'
import { RouterStateUrl } from './router.state'
import { BreadcrumbFacade } from '@shared/components/breadcrumb/+state/breadcrumb.facade'
import { environment } from '@env/environment'

@Injectable()
export class CustomSerializer implements RouterStateSerializer<RouterStateUrl> {
  constructor(private _breadcrumbFacade: BreadcrumbFacade) {}

  serialize(routerState: RouterStateSnapshot): RouterStateUrl {
    let route = routerState.root

    while (route.firstChild) {
      route = route.firstChild
    }

    const {
      url,
      root: { queryParams }
    } = routerState
    const { params, fragment } = route

    let url2 = decodeURI(url)
    let query_params_readable = { ...queryParams }
    delete query_params_readable?.page
    delete query_params_readable?.page_size
    delete query_params_readable?.q

    Object.keys(params).forEach(key => {
      if (url2.includes(params[key])) {
        url2 = url2.replace(params[key], `:${key}`)
      }
    })

    Object.keys(queryParams).forEach(key => {
      if (url2.includes(queryParams[key])) {
        url2 = url2.replace(queryParams[key], `:${key}`)
      }
    })

    ;['page=:page', 'page_size=:page_size', 'q=:q'].forEach(q => {
      if (url2.includes(q)) {
        url2 = url2.replace(q, '')
        url2 = url2.replace('&', '')
      }
      if (!Object.keys(query_params_readable).length) {
        url2 = url2.replace('?', '')
      }
    })

    this._breadcrumbFacade.setData(url2)

    return { url, params, queryParams }
  }
}
