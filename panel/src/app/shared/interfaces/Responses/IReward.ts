export interface IReward {
  title: string
  point: string
  expire: string
  remaining: string
  percent: number
  isGray:boolean
  withDiscount?:boolean
  image?:string
}