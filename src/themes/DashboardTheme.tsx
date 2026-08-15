import type { ThemeProps } from './types'
import { StatsCards } from '../components/StatsCards'
import { ContributionHeatmap } from '../components/ContributionHeatmap'
import { ActivityLog } from '../components/ActivityLog'
import { RouteMap } from '../components/RouteMap'
import { CalendarWidget } from '../components/CalendarWidget'
import { ProfileCard } from '../components/ProfileCard'
import { PersonalBest } from '../components/PersonalBest'
import { ChinaMap } from '../components/ChinaMap'

export function DashboardTheme({
  activities,
  filteredActivities,
  sportFilteredActivities,
  provinceFilteredActivities,
  years,
  year,
  setYear,
  filter,
  selectedActivity,
  setSelectedActivity,
  selectedProvince,
  setSelectedProvince,
  heatmapYear,
  dark,
  onShareActivity,
}: ThemeProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_380px] gap-6 items-start animate-in fade-in duration-300">
      {/* Left column */}
      <div className="space-y-6 min-w-0 overflow-hidden">
        <StatsCards activities={filteredActivities} allActivities={activities} year={year} filter={filter} onSelectActivity={setSelectedActivity} />
        <ContributionHeatmap activities={sportFilteredActivities} year={heatmapYear} filter={filter} onSelectActivity={setSelectedActivity} />
        <ActivityLog
          activities={filteredActivities}
          years={years}
          year={year}
          setYear={setYear}
          selectedActivity={selectedActivity}
          onSelectActivity={setSelectedActivity}
          onShareActivity={onShareActivity}
          filter={filter}
        />
      </div>

      {/* Right column */}
      <div className="flex flex-col gap-6 min-w-0 overflow-hidden">
        <ProfileCard activities={activities} filter={filter} />
        <ChinaMap
          activities={filteredActivities}
          filter={filter}
          selectedProvince={selectedProvince}
          onSelectProvince={(p) => {
            setSelectedProvince(p)
            setSelectedActivity(null)
          }}
        />
        <RouteMap
          activities={provinceFilteredActivities}
          allActivities={activities}
          selectedActivity={selectedActivity}
          selectedYear={year}
          selectedSport={filter}
          dark={dark}
          onClearSelection={() => setSelectedActivity(null)}
        />
        <PersonalBest activities={activities} onSelectActivity={setSelectedActivity} />
        <CalendarWidget activities={filteredActivities} onSelectActivity={setSelectedActivity} />
      </div>
    </div>
  )
}
