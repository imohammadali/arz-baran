import {Pipe, PipeTransform} from "@angular/core";
import * as moment from 'jalali-moment'

@Pipe({
  name: 'persianDate'
})

export class PersianDatePipe implements PipeTransform {
  transform(value: any,time?: any,lang: string = 'fa'): any {
    if (!value) {
      return null
    }
    if (lang === 'fa') {
      moment.locale('fa');
      if (typeof value === "number") {
        return time
          ? moment.unix(value).format("DD MMMM YYYY HH:mm")
          : moment.unix(value).format("DD MMMM YYYY");
      } else {
        return time
          ? `${new Date(value).toLocaleDateString("fa-IR", {
            day: "numeric",
            month: "long",
            year: "numeric"
          })} ${new Date(value).toLocaleTimeString("fa-IR", {
            hour: "2-digit",
            minute: "2-digit"
          })}`
          : new Date(value).toLocaleDateString("fa-IR", {
            day: "numeric",
            month: "long",
            year: "numeric"
          });
      }
    } else {
      moment.locale('en');
      if (typeof value === "number") {
        return time
          ? moment.unix(value).format("DD MM YYYY HH:mm")
          : moment.unix(value).format("DD MM YYYY");
      } else {
        return time
          ? `${new Date(value).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric"
          })} ${new Date(value).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit"
          })}`
          : new Date(value).toLocaleDateString("en-US", {
            day: "numeric",
            month: "short",
            year: "numeric"
          });
      }
    }
  }
}
