import { IUser } from '@shared/interfaces/Responses/IUser'
import { IPrize } from './IPrizeData'

export interface ICompetition {
  banner: string
  description: string
  end_date: string
  id: string
  name: string
  points_needed: number
  questions: any[]
  rules: string
  start_date: string
  guide: IGuide
  max_group_members: number
  min_group_members: number
  participant_type: 1 | 2
  is_participant: boolean
  answered: boolean
  has_winners: boolean
  counts_participant: number
}
export interface IGuide {
  id: string
  description: string
  media: string
  banner: string
  count_likes: number
  is_liked: boolean
  likes: any
  name: string
  views: number
}
export interface ICompetitionGroup {
  name: string
  id: string
  Status: number
  banner: string
  created_at: string
  leader: IUser
  members: IUser[]
  published: boolean
  reject_reason: string
  updated_at: string
  is_leader: boolean
}
export interface ICompetitionRecord {
  claimed: boolean
  condition: Condition
  created_at: string
  description: string
  event: string
  id: string
  is_active: boolean
  name: string
  prize?: IPrize
  progress_percentage: number
  rule_type: number
  service: null
  type: number
}
export interface Condition {
  type: number
  response_key: string
  value: number
  value_type: number
  action_type: number
  period: number
  repeat: number
  repeat_per_person: number
}
