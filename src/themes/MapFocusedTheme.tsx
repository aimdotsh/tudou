import type { ThemeProps } from './types'
import { RouteMap } from '../components/RouteMap'
import { StatsCards } from '../components/StatsCards'
import { ActivityLog } from '../components/ActivityLog'
import { ChinaMap } from '../components/ChinaMap'

export function MapFocusedTheme({
  activities,
  filteredActivities,
  provinceFilteredActivities,
  years,
  year,
  setYear,
  filter,
  selectedActivity,
  setSelectedActivity,
  selectedProvince,
  setSelectedProvince,
  dark,
  onShareActivity,
}: ThemeProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 顶部大屏全宽 Map 画卷主场 */}
      <div className="w-full bg-[var(--color-card)] border border-[var(--color-border)] rounded-3xl p-3 shadow-xl overflow-hidden min-h-[480px]">
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

      {/* 中部数据与中国足迹地图并排 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <StatsCards activities={filteredActivities} allActivities={activities} year={year} filter={filter} onSelectActivity={setSelectedActivity} />
        </div>
        <div>
          <ChinaMap
            activities={filteredActivities}
            filter={filter}
            selectedProvince={selectedProvince}
            onSelectProvince={(p) => {
              setSelectedProvince(p)
              setSelectedActivity(null)
            }}
          />
        </div>
      </div>

      {/* 底部全宽活动日志 */}
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
