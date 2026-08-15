import type { Activity } from '../types'
import { X, Dumbbell, Flame, Heart, Calendar, Clock } from 'lucide-react'
import { MuscleHeatmap, inferMusclesFromItems } from './MuscleHeatmap'

interface WorkoutSet {
  set_num?: number
  reps?: string
  weight?: string
  duration?: string
}

interface WorkoutItem {
  index: number
  name: string
  total_sets?: number
  type?: 'timer' | 'reps' | 'reps_weight'
  duration?: string
  sets?: WorkoutSet[]
}

interface WorkoutDetailModalProps {
  activity: Activity | null
  onClose: () => void
}

export function WorkoutDetailModal({ activity, onClose }: WorkoutDetailModalProps) {
  if (!activity) return null

  let setDetails: WorkoutItem[] = []
  if (activity.extra_details) {
    try {
      setDetails = typeof activity.extra_details === 'string'
        ? JSON.parse(activity.extra_details)
        : activity.extra_details
    } catch {
      setDetails = []
    }
  }

  const dateObj = new Date(activity.start_date_local)
  const formattedDate = `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日 ${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#121214] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-[#18181c]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">{activity.name || '力量训练'}</h3>
              <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3 h-3" />
                {formattedDate}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-2 px-5 py-3 bg-[#161619] border-b border-white/5 text-center text-xs">
          <div className="flex flex-col items-center justify-center py-1">
            <span className="text-gray-400 text-[11px] mb-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-purple-400" />
              运动时长
            </span>
            <span className="font-semibold text-white">{activity.moving_time.split('.')[0]}</span>
          </div>
          <div className="flex flex-col items-center justify-center py-1 border-x border-white/5">
            <span className="text-gray-400 text-[11px] mb-0.5 flex items-center gap-1">
              <Heart className="w-3 h-3 text-rose-500" />
              平均心率
            </span>
            <span className="font-semibold text-white">{activity.average_heartrate ? `${Math.round(activity.average_heartrate)} bpm` : '--'}</span>
          </div>
          <div className="flex flex-col items-center justify-center py-1">
            <span className="text-gray-400 text-[11px] mb-0.5 flex items-center gap-1">
              <Flame className="w-3 h-3 text-amber-500" />
              动作项目
            </span>
            <span className="font-semibold text-white">{setDetails.length} 项</span>
          </div>
        </div>

        {/* 人体肌肉锤炼热力分布图组件 */}
        <div className="p-4 border-b border-white/5 bg-[#141417]">
          <MuscleHeatmap activeMuscles={inferMusclesFromItems(activity.extra_details)} workoutName={activity.name} />
        </div>

        {/* Breakdown List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 no-scrollbar">
          {setDetails.length === 0 ? (
            <div className="py-12 text-center text-gray-500 text-sm">
              暂无详细分组动作明细
            </div>
          ) : (
            setDetails.map((item) => (
              <div key={item.index} className="bg-[#1a1a1e] border border-white/5 rounded-xl p-4 transition-all hover:border-purple-500/30">
                {/* Item title header */}
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-white/10 text-white font-mono text-xs font-bold flex items-center justify-center">
                      {item.index}
                    </span>
                    <span className="text-sm font-semibold text-white">{item.name}</span>
                  </div>
                  {item.duration ? (
                    <span className="text-xs font-mono font-medium text-purple-400">{item.duration}</span>
                  ) : item.total_sets ? (
                    <span className="text-xs font-medium text-gray-400">{item.total_sets} 组</span>
                  ) : null}
                </div>

                {/* Sub sets breakdown */}
                {item.sets && item.sets.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {item.sets.map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-white/[0.02] hover:bg-white/[0.05] transition-colors">
                        <span className="text-gray-400 font-medium">第 {s.set_num ?? idx + 1} 组</span>
                        <div className="flex items-center gap-4 font-mono">
                          {s.reps && <span className="text-white font-medium">{s.reps}</span>}
                          {s.duration && <span className="text-purple-300">{s.duration}</span>}
                          {s.weight && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                              {s.weight}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-white/10 bg-[#161619] text-center">
          <p className="text-[11px] text-gray-400 tracking-wide">
            高驰 (COROS) 力量训练组数明细
          </p>
        </div>
      </div>
    </div>
  )
}
