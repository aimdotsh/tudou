import type { Activity, SportFilter } from '../types'

export type ThemeLayoutPreset = 'dashboard' | 'classic' | 'map_focused' | 'gym_pro'

export interface ThemeProps {
  activities: Activity[]
  filteredActivities: Activity[]
  sportFilteredActivities: Activity[]
  provinceFilteredActivities: Activity[]
  years: number[]
  year: number | null
  setYear: (y: number | null) => void
  filter: SportFilter
  selectedActivity: Activity | null
  setSelectedActivity: (a: Activity | null) => void
  selectedProvince: string | null
  setSelectedProvince: (p: string | null) => void
  heatmapYear: number
  dark: boolean
  onShareActivity: (act: Activity) => void
}
