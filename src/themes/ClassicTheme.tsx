import type { ThemeProps } from './types'
import { StatsCards } from '../components/StatsCards'
import { ContributionHeatmap } from '../components/ContributionHeatmap'
import { ActivityLog } from '../components/ActivityLog'
import { RouteMap } from '../components/RouteMap'
import { ProfileCard } from '../components/ProfileCard'

export function ClassicTheme({
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
  heatmapYear,
  dark,
  onShareActivity,
}: ThemeProps) {
  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* 顶部经典 Profile 与核心里程黑卡 */}
      <ProfileCard activities={activities} filter={filter} />

      {/* 经典大通栏 Stats 统计与贡献热力图 */}
      <StatsCards activities={filteredActivities} allActivities={activities} year={year} filter={filter} onSelectActivity={setSelectedActivity} />

      <ContributionHeatmap activities={sportFilteredActivities} year={heatmapYear} filter={filter} onSelectActivity={setSelectedActivity} />

      {/* 轨迹地图大看板 */}
      <div className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-2xl p-4 shadow-sm">
        <RouteMap
          activities={provinceFilteredActivities}
          allActivities={activities}
          selectedActivity={selectedActivity}
          selectedYear={year}
          selectedSport={filter}
          dark={dark}
          onClearSelection={() => setSelectedActivity(null)}
        />
      </div>

      {/* 经典流式时间轴活动列表 */}
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
  )
}
