import { IPrize } from '@shared/interfaces/Responses/IPrizeData';

export interface ICardData {
  id:string,
  price?:number,
  prize?: IPrize,
  expiration?: string
}
