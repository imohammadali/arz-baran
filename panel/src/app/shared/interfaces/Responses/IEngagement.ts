export interface IEngagementResponse {
  engagements: IEngagement[]
}
export interface IEngagement {
  id: string
  name: string
  file: string
  link: string
  type: number
  description: string
  event: IEvent
  published: boolean
}
export interface IEvent {
  id: string
  name: string
  description: string
  key: string
  created_at: number
  updated_at: number
}
