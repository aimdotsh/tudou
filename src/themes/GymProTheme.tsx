import type { ThemeProps } from './types'
import { MuscleHeatmap, inferMusclesFromItems } from '../components/MuscleHeatmap'
import { StatsCards } from '../components/StatsCards'
import { ActivityLog } from '../components/ActivityLog'
import { PersonalBest } from '../components/PersonalBest'

export function GymProTheme({
  activities,
  filteredActivities,
  years,
  year,
  setYear,
  filter,
  selectedActivity,
  setSelectedActivity,
  onShareActivity,
}: ThemeProps) {
  const gymActivities = filteredActivities.filter(a => a.type === 'Gym' || a.type === 'WeightTraining' || a.extra_details)
  const currentGym = selectedActivity || gymActivities[0]

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* 顶部力量大牌与肌肉热力解剖中心 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <div className="space-y-6 flex flex-col justify-between">
          <StatsCards activities={filteredActivities} allActivities={activities} year={year} filter={filter} onSelectActivity={setSelectedActivity} />
          <PersonalBest activities={activities} onSelectActivity={setSelectedActivity} />
        </div>

        {/* 居中突出的专业肌肉解剖解剖热力图 */}
        <div>
          <MuscleHeatmap
            activeMuscles={inferMusclesFromItems(currentGym?.extra_details)}
            workoutName={currentGym?.name || '专业力量训练中心'}
            setItemsJson={currentGym?.extra_details}
            className="h-full"
          />
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
