export interface IPoint {
  id?: string
  icon?: string
  title?: string
  subtitle?: string
  points?: number
  type?: number
  streak?: number
  created_at?: string
  expires_at?: string
  description?: string
  claimed?: boolean
  status?:"converted"|"disabled"|"expired"|"claimed"
  rule?: string
  expired?: boolean
}