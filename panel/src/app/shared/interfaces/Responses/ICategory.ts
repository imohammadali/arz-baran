import { IService } from '@shared/interfaces/Responses/IService';

export interface ICategory {
  id:string
  category:string
  boxes:IService[]
}
