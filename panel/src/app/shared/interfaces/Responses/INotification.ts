export interface INotification {
  created_at: number
  event: string
  id: string
  image_url: string
  message: string
  title: string
  trigger_link: string
  user: string
  view: boolean
  viewed_at: number
}
export interface INotificationsMessage {
  id: string
  title: string
  message: string
  trigger_link: string
  image_url: string
  event: string
  priority: number
  trigger_time: string
}
export interface INotificationsMessageResponse {
  message: string
  messages: INotificationsMessage[]
}
