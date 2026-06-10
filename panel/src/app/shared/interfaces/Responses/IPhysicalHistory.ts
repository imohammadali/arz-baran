import { IPrize } from './IPrizeData'

export interface IPhysicalHistory {
  id: string
  source: string
  source_type: number
  status: number
  expiration: number
  updated_at: string
  prize: IPrize
}
