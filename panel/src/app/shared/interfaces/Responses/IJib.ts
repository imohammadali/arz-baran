export interface IJib {
  amount: number
  bankId: string
  blockAmount: number
  campaignId: number
  campaignName: string
  qr: string
}
export interface IJibResponse {
  jibs: IJib[]
  status: string
}