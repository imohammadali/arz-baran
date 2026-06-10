import { AsyncPipe, NgStyle } from '@angular/common'
import { ChangeDetectionStrategy, Component, EventEmitter, Injector, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { selectSettingsInProgressApi } from '@core/settings/settings.selectors'
import { select } from '@ngrx/store'
import { TranslateDirective, TranslatePipe } from '@ngx-translate/core'
import { PrimeCalendar } from '@shared/components/prime-calendar/prime-calendar'
import { TableFacade } from '@shared/components/table/+state/table.facade'
import { ColumnRendererComponent } from '@shared/components/table/column-renderer/column-renderer.component'
import { IColumn, IPaginate, ITable } from '@shared/components/table/table'
import { TablePipe } from '@shared/components/table/table.pipe'
import { IconDirective } from '@shared/directives/icon.directive'
import { LocalStorageService } from '@shared/services/local-storage/local-storage.service'
import { PermissionService } from '@shared/services/permission/permission.service'
import { Utility } from '@shared/services/utility'
import moment from 'jalali-moment'
import { ButtonModule } from 'primeng/button'
import { Checkbox } from 'primeng/checkbox'
import { Draggable, Droppable } from 'primeng/dragdrop'
import { FloatLabel } from 'primeng/floatlabel'
import { InputText } from 'primeng/inputtext'
import { Paginator } from 'primeng/paginator'
import { Popover } from 'primeng/popover'
import { Select } from 'primeng/select'
import { Skeleton } from 'primeng/skeleton'
import { Table, TableModule } from 'primeng/table'
import { Tooltip } from 'primeng/tooltip'
import { TreeSelect } from 'primeng/treeselect'
import { BehaviorSubject, Subject, takeUntil } from 'rxjs'
import { distinctUntilChanged, take } from 'rxjs/operators'

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'data-table',
  templateUrl: './table.component.html',
  imports: [TableModule, AsyncPipe, TablePipe, FormsModule, Droppable, Checkbox, TranslatePipe, Draggable, Select, TreeSelect, PrimeCalendar, NgStyle, Skeleton, ColumnRendererComponent, Paginator, Tooltip, IconDirective, Popover, InputText, FloatLabel, TranslateDirective, ButtonModule]
})
export class TableComponent extends Utility implements OnInit, OnDestroy {
  @ViewChild('paginator') paginator: Paginator
  @ViewChild('dt') dt: Table

  @Input() dataTable$: BehaviorSubject<any[]> = new BehaviorSubject<any[]>([])
  @Input() settingTable$: BehaviorSubject<ITable>
  @Input() selection$: BehaviorSubject<any[]>
  @Input() resetPagination$: Subject<any> = new Subject<any>()
  @Input() resetFilterGlobal$: BehaviorSubject<string> = new BehaviorSubject<string>('')

  @Output() selectedRows: EventEmitter<object[]> = new EventEmitter<object[]>()
  @Output() onSelectedAllRows: EventEmitter<boolean> = new EventEmitter<boolean>()
  @Output() filters: EventEmitter<object[]> = new EventEmitter<object[]>()
  @Output() pagination: EventEmitter<object> = new EventEmitter<object>()

  rowHoverIndex = -1
  countFirstRow = 0
  limit = 10
  destroy$ = new Subject()
  inProgressApis$ = this.appStore.pipe(select(selectSettingsInProgressApi))
  loading$ = new BehaviorSubject(true)
  depth_columns$ = new BehaviorSubject(1)
  selection = []
  filter = null
  tableColumns$ = new BehaviorSubject([])
  language = ''
  showFilter$ = new BehaviorSubject(false)
  toggleFilter$ = new BehaviorSubject(0)
  tableName = null
  filterGlobal = null
  lazyFlag: any = true

  constructor(
    private _tableFacade: TableFacade,
    private _localStorage: LocalStorageService,
    private _permissionService: PermissionService,
    private _router: Router,
    private _route: ActivatedRoute,
    injector: Injector
  ) {
    super(injector)
    this.language = this._localStorage.getItem('SETTINGS')?.language || 'en'
  }

  get colSpanEmptyTAble(): number {
    return this.settingTable$.value.columns.filter(column => !column.is_hidden).length + (this.settingTable$.value?.setting?.selection ? 2 : 1)
  }

  ngOnInit(): void {
    this.settingTable$.pipe(takeUntil(this.destroy$)).subscribe(data => {
      let temp_column = data.columns
      let depth = 0
      let getDepthColumns = (columns: IColumn[]) => {
        if (Array.isArray(columns)) return 1 + Math.max(...columns.map(t => getDepthColumns(t.sub_columns)))
        else return 0
      }
      if (getDepthColumns(temp_column) != -Infinity) {
        this.depth_columns$.next(getDepthColumns(temp_column))
      }
    })
    this._route.queryParams.pipe(takeUntil(this.destroy$), distinctUntilChanged()).subscribe(q => {
      if (q?.page && q?.page_size) {
        if (this._localStorage.getItem('active-table-pagination')?.tableName == this.settingTable$.value.setting.tableName) {
          this.countFirstRow = (parseInt(q?.page) - 1) * parseInt(q?.page_size)
          this.limit = parseInt(q?.page_size)
        }
      }
      this.filterGlobal = q?.q || ''
    })

    this.resetPagination$.pipe(takeUntil(this.destroy$)).subscribe(_ => {
      this.resetPaginator()
    })

    this.selection$?.pipe(takeUntil(this.destroy$)).subscribe(rows => {
      this.selectRows(rows)
    })
    this.inProgressApis$.pipe(takeUntil(this.destroy$)).subscribe(keys => {
      this.settingTable$.pipe(take(1)).subscribe(setting => {
        if (keys?.includes(setting?.setting?.tableName)) {
          this.loading$.next(true)
          this.dataTable$.next(Array(10).fill(0))
        } else {
          if (this.dataTable$.value.filter(y => y === 0).length == 10) {
            this.dataTable$.next([])
          }
          this.loading$.next(false)
        }
      })
    })
    this.toggleFilter$.next(this.settingTable$.value?.columns?.filter(column => !!column?.filter?.key)?.length)
    this.saveColumns()
  }

  paginate(event: IPaginate) {
    const tableName = this.settingTable$.value?.setting?.tableName
    this._tableFacade.changePagination(event, tableName)
    this.countFirstRow = event.first
    this.limit = event.rows
    this._localStorage.setItem('active-table-pagination', {
      tableName,
      ...event,
      page: event?.page + 1
    })
    this._router
      .navigate([], {
        queryParams: { ...this._route.snapshot.queryParams, page: event?.page + 1, page_size: event?.rows },
        relativeTo: this._route,
        queryParamsHandling: 'merge'
      })
      .then(() => {
        this.pagination.emit(event)
      })
  }

  resetPaginator() {
    if (!this.paginator) return
    this.paginator.first = 0
    this.paginate({
      rows: 10,
      first: 0,
      page: 0,
      pageCount: 10
    })
  }

  rowIsHover(Index: number) {
    this.rowHoverIndex = Index
  }

  clickRow(button, column, data) {
    this.settingTable$.pipe(take(1)).subscribe(setting => {
      setting?.setting.onClick(button, column, data)
    })
  }

  totalRecord(tblName: string) {
    return this._tableFacade.totalRecords(tblName)
  }

  override getPagination(tblName: string) {
    return this._tableFacade.getPagination(tblName)
  }

  onSelectionChange(e) {
    this.selectedRows.emit(e || [])
  }

  onSelectedAll({ checked }) {
    this.onSelectedAllRows.emit(checked)
  }

  onFilters(e) {
    e.filters = { ...e.filters, q: [{ value: e.filters?.['global']?.value || this.filterGlobal || '' }] }
    delete e.filters?.global
    let filters = [
      ...Object.entries(e?.filters).map(filter => {
        if (filter.length) {
          filter[1] = filter?.[1][0]
        }
        return filter
      })
    ].reduce((obj, [key, value]) => {
      let v = ''
      switch (typeof value['value']) {
        case 'object': {
          let stringify = obj => {
            let cache = []
            let str = JSON.stringify(obj, function (key, value) {
              if (typeof value === 'object' && value !== null) {
                if (cache.indexOf(value) !== -1) {
                  return
                }
                cache.push(value)
              }
              return value
            })
            cache = null
            return str
          }
          v = stringify(value['value'])
          break
        }
        default: {
          v = value['value']?.toString()?.trim()
        }
      }
      return ((obj[key] = v), obj)
    }, {})
    Object?.keys(filters).forEach(f => {
      if (moment(filters[f], 'YYYY-MM-DD', true).isValid()) {
        filters[f] = moment(filters[f]).toISOString()
      }
    })
    if (e?.sortField) {
      filters = {
        ...filters,
        sort: e?.sortOrder === 1 ? e.sortField : `-${e.sortField}`,
        all: true
      }
    }
    this.filter = { ...e, filters: filters, sort: { type: e?.sortOrder, field: e?.sortField } }
    this.filters.emit(this.filter)
    let queryParams = { ...this._route.snapshot.queryParams }
    this.filter?.filters?.q ? (queryParams.q = this.filter?.filters?.q) : delete queryParams?.q
    this._router.navigate([], { queryParams: queryParams })
  }

  onRowReorder(fromIndex, toIndex) {
    this.dataTable$.pipe(take(1)).subscribe(data => {
      const item = data[fromIndex]
      data.splice(fromIndex, 1)
      data.splice(toIndex, 0, item)
      this.dataTable$.next(data.map((data, index) => this.settingTable$.value?.mapData(data, index) || data))
    })
  }

  colReorderFromIndex = null
  colReorderToIndex = null
  onColReorder() {
    const tblName = this.settingTable$.value.setting.tableName
    let columns = this._localStorage.getItem('table-columns')?.[tblName] || []
    if (this.colReorderFromIndex === this.colReorderToIndex) return

    columns.splice(this.colReorderToIndex, 0, columns?.splice(this.colReorderFromIndex, 1)?.[0])

    let data = {
      [tblName]: columns
    }
    let tables = {
      ...this._localStorage.getItem('table-columns'),
      ...data
    }
    this._localStorage.setItem('table-columns', tables)
    this.saveColumns()
  }

  selectRows(selectRows: any[]) {
    this.selection = selectRows || []
    this.selectedRows.emit(selectRows || [])
  }

  saveColumns() {
    const tblName = this.settingTable$.value.setting.tableName
    let savedColumns = this._localStorage.getItem('table-columns')?.[tblName] || []
    if (savedColumns) {
      let columns = this.settingTable$.value.columns
        .filter(column => {
          if (!column?.permissions) return true
          return this._permissionService.checkAccess(column.permissions)
        })
        .map(column => {
          const existColumn = savedColumns?.find(c => c?.label == column.label)
          if (existColumn) return { ...existColumn }
          return { is_hidden: !!column.is_hidden, label: column.label }
        })

      let tempColumns = savedColumns.map(y => y.label)
      columns = columns?.sort((item1, item2) => tempColumns.indexOf(item1.label) - tempColumns.indexOf(item2.label))

      columns?.forEach(column => {
        this.toggleColumn(column?.label, column.is_hidden)
      })

      this.tableColumns$.next(columns)
      this._localStorage.setItem('table-columns', {
        ...this._localStorage.getItem('table-columns'),
        [tblName]: columns
      })

      // sort by saved columns in local storage
      columns = columns.map(y => y.label)
      this.settingTable$.next({
        ...this.settingTable$.value,
        columns: this.settingTable$.value.columns
          .filter(column => {
            if (!column?.permissions) return true
            return this._permissionService.checkAccess(column.permissions)
          })
          ?.sort((item1, item2) => columns.indexOf(item1.label) - columns.indexOf(item2.label))
      })
      return
    }
    this.settingTable$.next({
      ...this.settingTable$.value,
      columns: this.settingTable$.value.columns.filter(column => {
        if (!column?.permissions) return true
        return this._permissionService.checkAccess(column.permissions)
      })
    })
    let data = {
      [tblName]: this.settingTable$.value.columns.map(column => ({ is_hidden: !!column.is_hidden, label: column.label }))
    }
    let tables = {
      ...this._localStorage.getItem('table-columns'),
      ...data
    }
    this._localStorage.setItem('table-columns', tables)
    this.tableColumns$.next(data[tblName])
  }

  toggleColumn(columnName: string, value: boolean) {
    const tblName = this.settingTable$.value.setting.tableName
    let columns = this._localStorage.getItem('table-columns')?.[tblName]
    if (!columns) return
    columns = columns?.map(column => {
      if (column?.label == columnName) {
        return { ...column, is_hidden: value }
      }
      return column
    })
    let tables = {
      ...this._localStorage.getItem('table-columns'),
      [tblName]: columns
    }
    this._localStorage.setItem('table-columns', tables)
    this.tableColumns$.next(columns)
    const filteredHiddenColumns = (columns || []).filter(column => column?.is_hidden)?.map(column => column?.label) || []
    this.settingTable$.next({
      ...this.settingTable$.value,
      columns: this.settingTable$.value.columns.map(column => ({ ...column, is_hidden: filteredHiddenColumns?.includes(column.label) }))
    })
  }

  getDepthColumns(i) {
    let a = new BehaviorSubject([])
    switch (i) {
      case 0: {
        a.next(this.settingTable$.value.columns)
        break
      }
      case 1: {
        let level2 = new BehaviorSubject([])
        this.settingTable$.value.columns.forEach(c => {
          if (c?.sub_columns?.length) {
            level2.next(level2.value.concat(c.sub_columns))
          }
        })
        a.next(level2.value)
        break
      }
      case 2: {
        let level3 = new BehaviorSubject([])
        this.settingTable$.value.columns.forEach(c => {
          c?.sub_columns?.forEach(cc => {
            if (cc?.sub_columns?.length) {
              level3.next(level3.value.concat(cc.sub_columns))
            }
          })
        })
        a.next(level3.value)
        break
      }
    }
    return a
  }

  defaultMapData(item) {
    return { ...item }
  }

  ngOnDestroy(): void {
    this.settingTable$.pipe(take(1)).subscribe(setting => {
      this._tableFacade.resetTable(setting.setting.tableName)
    })
    this.destroy$.next(true)
    this.destroy$.unsubscribe()
  }
}
