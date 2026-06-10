import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { interval, Observable, takeWhile } from "rxjs";

import { AppState } from "@core/core.state";
import {
  actionSettingsAddInProgressApi,
  actionSettingsLoading,
  actionSettingsRemoveInProgressApi,
} from "@core/settings/settings.actions";
import {
  selectSettingsInProgressApi,
  selectSettingsLoading,
} from "@core/settings/settings.selectors";
import { environment } from "@env/environment";
import { select, Store } from "@ngrx/store";
import { switchMap } from "rxjs/operators";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
interface Options {
  id?: string;
  notify?: boolean;
  force?: boolean;
  headers?: any;
  body?: any;
  formData?: boolean;
  params?: any;
  options?: any;
  ignore_prefix_api?: any;
  api_version?: string;
  part?: "aaa" | "ticketing" | "contactcenter";
  ignore_branch?: boolean;
  permission?: {
    [key: string]: ("delete" | "update" | "read" | "write" | "export")[];
  };
  disable_loading?: boolean;
  observe?: string;
}
type SuccessCallback = (res: any) => void;
type ErrorCallback = (err: any) => void;

@Injectable({ providedIn: "root" })
export class ApiService {
  showLoading$: Observable<boolean>;
  inProgressApis$: Observable<string[]>;
  countApiCall = 0;
  branch = null;
  constructor(
    private _http: HttpClient,
    private store: Store<AppState>,
  ) {
    this.showLoading$ = this.store.pipe(select(selectSettingsLoading));
    this.inProgressApis$ = this.store.pipe(select(selectSettingsInProgressApi));
  }
  private _requests: Observable<ArrayBuffer>[] = [];

  private async _trigger(
    key: string,
    success: SuccessCallback,
    error: ErrorCallback,
    options: Options,
  ) {
    this._requests[key] = this._requests[key].subscribe(
      (res: any) => {
        this.remove(key, options?.disable_loading);
        success(res);
      },
      (err: any) => {
        setTimeout((_) => {
          this.remove(key, options?.disable_loading);
          if (error) error(err);
        }, 10);
      },
    );
  }

  setLoading(show: boolean) {
    this.store.dispatch(actionSettingsLoading({ show_loading: show }));
  }

  setSpecificLoading(show: boolean, apiKey: string) {
    if (show) {
      this.store.dispatch(actionSettingsAddInProgressApi({ apiKey: apiKey }));
    } else {
      this.store.dispatch(
        actionSettingsRemoveInProgressApi({ apiKey: apiKey }),
      );
    }
  }

  public formData(params: any): FormData {
    const formData = new FormData();
    for (const key in params) {
      formData.append(key, params[key]);
    }
    return formData;
  }

  private _bodyHandler(method: Method, options: Options): any {
    if (!options.body) return null;
    if (options.formData) return this.formData(options.body);
    return options.body;
  }

  public httpParams(params: any): HttpParams {
    let httpParams: HttpParams = new HttpParams();
    for (const key in params) {
      if ((Array.isArray(params[key]) && !params[key].length) || !params[key])
        continue;
      httpParams = httpParams.append(key.toString(), params[key].toString());
    }
    return httpParams;
  }

  public set(
    url: string,
    method: Method,
    options: Options,
    success?: SuccessCallback,
    error?: ErrorCallback,
  ): Observable<any> {
    const key: string = options.id || url;
    const req = this._http.request(
      method,
      (options?.ignore_prefix_api ? "" : environment.baseApiUrl) +
        "admin/" +
        (options?.api_version ? options?.api_version : "v1") +
        `/${url}`,
      {
        headers: options.headers || {},
        body: this._bodyHandler(method, options),
        params: this.httpParams(options.params),
        observe: options?.observe ? options?.observe : "body",
        ...options.options,
      },
    );

    if (!!success && (!this._requests[key] || options.force)) {
      if (!options?.disable_loading) {
        this.setSpecificLoading(true, key);
      }
      this._requests[key] = req;
      this._trigger(key, success, error, options);
    }
    return req;
  }

  public remove(key: string, disable_loading: boolean): void {
    if (this._requests[key]) {
      this._requests[key].unsubscribe();
      delete this._requests[key];
      if (!disable_loading) {
        this.setSpecificLoading(false, key);
      }
    }
  }

  waitForRefreshToken(item: string) {
    return interval(1000)
      .pipe(
        switchMap(() => this.inProgressApis$),
        takeWhile((array) => array.includes(item), true),
      )
      .toPromise();
  }

  public downloadFile(
    method: string,
    route: string,
    part: "aaa" | "ticketing" | "contactcenter",
    filename: string = null,
    body?: any,
    ignore_prefix_api = false,
    api_version = "v1",
  ): void {
    if (method == "POST") {
      this.set(
        route,
        "POST",
        {
          id: body?.id,
          body: body,
          ignore_prefix_api: ignore_prefix_api,
          options: { responseType: "blob" },
          api_version: api_version,
          part: part,
        },
        (response) => {
          const dataType = response.type;
          const binaryData = [];
          binaryData.push(response);
          const downloadLink = document.createElement("a");
          downloadLink.href = window.URL.createObjectURL(
            new Blob(binaryData, { type: dataType }),
          );
          if (filename) downloadLink.setAttribute("download", filename);
          document.body.appendChild(downloadLink);
          downloadLink.click();
        },
      );
    } else if (method == "GET") {
      this.set(
        route,
        "GET",
        {
          id: body?.id,
          params: body,
          ignore_prefix_api: ignore_prefix_api,
          options: { responseType: "blob" },
          api_version: api_version,
          part: part,
        },
        (response) => {
          const dataType = response.type;
          const binaryData = [];
          binaryData.push(response);
          const downloadLink = document.createElement("a");
          downloadLink.href = window.URL.createObjectURL(
            new Blob(binaryData, { type: dataType }),
          );
          if (filename) downloadLink.setAttribute("download", filename);
          document.body.appendChild(downloadLink);
          downloadLink.click();
        },
      );
    }
  }
}
