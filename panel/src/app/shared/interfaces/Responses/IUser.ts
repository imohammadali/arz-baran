export interface IUser {
  active_wallet?: boolean
  ask_for_referral?: boolean
  addresses?: any
  avatar?: string
  birth_date?: string
  education?: Job
  email?: string
  first_name?: string
  full_name?: string
  gender?: string
  group?: Group
  id?: string
  job?: Job
  last_name?: string
  mancard?: Mancard
  mobile?: string
  national_code?: string
  organization?: Organization
  point?: number
  point_record?: number
  referral_code?: string
  special_classes?: Job
  status?: number
  verify_mobile?: boolean
  toTheNextPoint?: number
  nextLevel?: string
  percent?: number
  level?: string
  created_at?: string
  code?: string
  levelLogo?: string
  allow_group_competition?: boolean
  allow_show_personal_info?: boolean
  verification: IVerification,
  last_login_ip:string
  login_at:number
  logout_at:number
}
export interface IVerification {
  level: number
  level_name: string
  next_level: number
  next_level_name: string
}
export interface Group {
  id: string
  name: string
}

export interface Mancard {
  card_number: string
  concession: string
  created_at: string
  serial: string
}

export interface Organization {
  description: string
  id: string
  name: string
}
export interface Job {
  id: string
  name: string
  type: string
}
export interface IUserScoreboard {
  id: string
  national_code: string
  point_record: number
  position: number
}
export interface IUserStatistic {
  Date: string
  Day: string
  Point: number
  type: number
  Percent: string
}
