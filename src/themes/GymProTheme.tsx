import { useState } from 'react'
import type { ThemeProps } from './types'
import { MuscleHeatmap, inferMusclesFromItems } from '../components/MuscleHeatmap'
import { StatsCards } from '../components/StatsCards'
import { ActivityLog } from '../components/ActivityLog'
import { PersonalBest } from '../components/PersonalBest'
import { RouteMap } from '../components/RouteMap'

export function GymProTheme({
  activities,
  filteredActivities,
  provinceFilteredActivities,
  years,
  year,
  setYear,
  filter,
  selectedActivity,
  setSelectedActivity,
  dark,
  onShareActivity,
}: ThemeProps) {
  const [viewMode, setViewMode] = useState<'auto' | 'muscle' | 'map'>('auto')

  const gymActivities = filteredActivities.filter(a => a.type === 'Gym' || a.type === 'WeightTraining' || a.extra_details)
  const currentGym = (selectedActivity && (selectedActivity.type === 'Gym' || selectedActivity.type === 'WeightTraining' || selectedActivity.extra_details))
    ? selectedActivity
    : gymActivities[0]

  // 是否展示轨迹地图：当用户选中了有轨迹的跑步/骑行/徒步，或者手动选择了 'map' 模式
  const hasRoute = Boolean(selectedActivity?.summary_polyline && selectedActivity.summary_polyline.length > 10)
  const showMap = viewMode === 'map' || (viewMode === 'auto' && hasRoute)

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 顶部力量大牌与肌肉热力 / 轨迹地图双模态中心 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="space-y-6 flex flex-col justify-between">
          <StatsCards activities={filteredActivities} allActivities={activities} year={year} filter={filter} onSelectActivity={setSelectedActivity} />
          <PersonalBest activities={activities} onSelectActivity={setSelectedActivity} />
        </div>

        {/* 居中突出的动态展示区（肌肉热力图 / 运动轨迹地图） */}
        <div className="relative flex flex-col min-w-0">
          {/* 模式切换胶囊 */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-[var(--color-muted)] flex items-center gap-1.5">
              {showMap ? '🗺️ 运动轨迹地图' : '💪 专业肌肉解剖热力图'}
            </span>
            <div className="flex items-center gap-1 bg-[var(--color-card)] border border-[var(--color-border)] rounded-lg p-0.5 text-xs shadow-sm">
              <button
                onClick={() => setViewMode('muscle')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  !showMap ? 'bg-[var(--color-accent)] text-white shadow-sm font-medium' : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                💪 肌肉图
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  showMap ? 'bg-[var(--color-accent)] text-white shadow-sm font-medium' : 'text-[var(--color-muted)] hover:text-[var(--color-text)]'
                }`}
              >
                🗺️ 轨迹地图
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-[360px] rounded-xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-card)]">
            {showMap ? (
              <RouteMap
                activities={provinceFilteredActivities || filteredActivities}
                allActivities={activities}
                selectedActivity={selectedActivity}
                onClearSelection={() => setSelectedActivity(null)}
                selectedSport={filter}
                dark={dark}
              />
            ) : (
              <MuscleHeatmap
                activeMuscles={inferMusclesFromItems(currentGym?.extra_details)}
                workoutName={currentGym?.name || '专业力量训练中心'}
                setItemsJson={currentGym?.extra_details}
                className="h-full"
              />
            )}
          </div>
        </div>
      </div>

      {/* 底部全宽活动明细列表 */}
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
