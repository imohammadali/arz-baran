export interface ILotteryData {
  id: string
  name: string
  end_date: string
  remaining_chance: number
  spin_interval: number
  current_required_point: number
  prizes: ILotteryPrize[]
}
export interface ILotteryPrize {
  id: string
  code: any
  description: string
  expiration: string
  price: number
  icon: string
  name: string
  type?: 1 | 2 | 3
  value: number
}
