import { Injectable } from '@angular/core'
import { BehaviorSubject } from 'rxjs'
import { IUser } from '@shared/interfaces/Responses/IUser'

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  selectedContacts$ = new BehaviorSubject<IUser[]>([])

  constructor() {}

  addContact(contact: IUser): void {
    this.selectedContacts$.next([...this.selectedContacts$.value, contact])
  }

  removeContact(contact: IUser): void {
    const newContacts = this.selectedContacts$.value.filter(item => item.id !== contact.id)
    this.selectedContacts$.next(newContacts)
  }
  removeAllContact() {
    this.selectedContacts$.next([])
  }
}
