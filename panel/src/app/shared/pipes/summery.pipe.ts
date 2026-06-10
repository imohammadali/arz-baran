import {Pipe, PipeTransform} from "@angular/core";

@Pipe({
  name: 'summery'
})

export class SummeryPipe implements PipeTransform {
  transform(value: string, limit?: number): any {
    if (!value) {
      return null
    }
    if (!limit) return value
    if (value.length > limit) {
      return value.substr(0, limit) + " ...";
    }
    return value
  }
}
