import { Pipe, PipeTransform } from '@angular/core'

@Pipe({
  name: 'MapDataTable'
})
export class TablePipe implements PipeTransform {
  transform(value: object[], funcMap: Function): any {
    if (!funcMap) return value
    return value.map((item, index) => funcMap(item, index))
  }
}
