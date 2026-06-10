export interface ISocialProject {
  name: string;
  id: string;
  description: string;
  start_date: string;
  end_date: string;
  points_needed: number;
  banner?: string;
  points_collected?: number;
  remaining_points?: number;
  counts_participant?: number;
}
