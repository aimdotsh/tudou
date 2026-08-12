export interface Checkin {
  date: string              // YYYY-MM-DD
  pushups: boolean
  pushupsCount?: number     // reps
  pushupsSets?: number      // sets
  pushupsAt?: string        // ISO timestamp
  squats: boolean
  squatsCount?: number
  squatsSets?: number
  squatsAt?: string
  pullups: boolean
  pullupsCount?: number
  pullupsSets?: number
  pullupsAt?: string
  plank: boolean
  plankDuration?: number   // seconds
  plankSets?: number
  plankAt?: string
  kneeDrives: boolean
  kneeDrivesCount?: number
  kneeDrivesSets?: number
  kneeDrivesAt?: string
  underlegClaps: boolean
  underlegClapsCount?: number
  underlegClapsSets?: number
  underlegClapsAt?: string
  // 向后兼容旧数据
  coldShower?: boolean
  coldShowerAt?: string
}

export interface CheckinData {
  checkins: Checkin[]
}

export type CheckinItem = 'pushups' | 'squats' | 'pullups' | 'plank' | 'kneeDrives' | 'underlegClaps'

export interface GitHubUser {
  login: string
  avatar_url: string
  name: string | null
}

export interface CheckinDefaults {
  pushupsCount: number
  pushupsSets: number
  squatsCount: number
  squatsSets: number
  pullupsCount: number
  pullupsSets: number
  plankDuration: number
  plankSets: number
  kneeDrivesCount: number
  kneeDrivesSets: number
  underlegClapsCount: number
  underlegClapsSets: number
}
