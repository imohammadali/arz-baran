import { IPrize } from './IPrizeData'
import { IUser } from './IUser'

export interface IWinner {
  prize: IPrize
  user: IUser
  mobile?: string
}
