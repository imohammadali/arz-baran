export interface IPrizeData {
  categories: IPrizeCategory[]
  expiration: number
  id: string
  prize?: IPrize
  source: string
  source_type: number
  status: number
  updated_at: number
  remaining_apply_count: number
}

export interface IPrize {
  PublishedAt?: string
  code?: string
  created_at?: string
  description?: string
  expiration?: string
  icon?: string
  id?: string
  levels?: []
  max_discount?: number
  max_uses?: number
  name?: string
  price?: number
  rialAmount?: number
  published?: boolean
  stock?: number
  type?: number // Point?: 1 , DiscountCode?: 2, NoPrize?: 3 , Avatar?: 4, Medal?: 5 , cash: 6 , physical: 7
  updated_at?: string
  user_group?: []
  users?: []
  value?: number
  web_service?: any
  weight?: number
  purchase_price?: number
  price_in_rial?: number
  banner: []
  available: boolean
  use_expiration: string
}
export interface IPrizeCategory {
  id: string
  name: string
}
