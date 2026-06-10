export interface ITicket {
  answer_counts: number
  callcenter_phone: string
  category: ICategory
  description: string
  id: string
  notif_counts: number
  status: 1 | 2 | 3 | 4
  title: string
  threads: IThread[]
  ticket_number: string
  created_at: string
  rate: IRate
}
export interface ICategory {
  name: string
  id: string
}
export interface IThread {
  id: string
  message: string
  user: string
  attachments: string[]
  seen?: boolean
  seen_at: number
  send_at: number
  sender: number
}
export interface IRate {
  comment: string
  created_at: string
  stars: number
}
