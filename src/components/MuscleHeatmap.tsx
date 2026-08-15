export type MuscleGroup =
  | 'shoulders' // 三角肌/肩部
  | 'chest'     // 胸大肌
  | 'biceps'    // 肱二头肌
  | 'triceps'   // 肱三头肌
  | 'abs'       // 腹肌/核心
  | 'quads'     // 股四头肌/大腿前侧
  | 'lats'      // 背阔肌/上背
  | 'lower_back'// 竖脊肌/下背
  | 'glutes'    // 臀大肌
  | 'hamstrings'// 腘绳肌/大腿后侧
  | 'calves'    // 小腿

interface MuscleHeatmapProps {
  activeMuscles?: MuscleGroup[]
  workoutName?: string
  className?: string
}

// 根据动作名称自动推导所锤炼的肌肉群
export function inferMusclesFromItems(setItemsJson?: string | null): MuscleGroup[] {
  const muscles = new Set<MuscleGroup>()
  if (!setItemsJson) {
    // 默认展示全身/核心基础肌肉
    return ['quads', 'shoulders', 'biceps', 'hamstrings', 'glutes']
  }

  let items: any[] = []
  try {
    items = typeof setItemsJson === 'string' ? JSON.parse(setItemsJson) : setItemsJson
  } catch {
    items = []
  }

  items.forEach((item) => {
    const name = (item.name || '').toLowerCase()
    if (name.includes('蹲') || name.includes('squat')) {
      muscles.add('quads')
      muscles.add('glutes')
    }
    if (name.includes('硬拉') || name.includes('deadlift')) {
      muscles.add('hamstrings')
      muscles.add('lower_back')
      muscles.add('glutes')
    }
    if (name.includes('弯举') || name.includes('curl') || name.includes('二头')) {
      muscles.add('biceps')
    }
    if (name.includes('推') || name.includes('press') || name.includes('胸')) {
      muscles.add('chest')
      muscles.add('shoulders')
      muscles.add('triceps')
    }
    if (name.includes('肩') || name.includes('热身') || name.includes('飞鸟')) {
      muscles.add('shoulders')
    }
    if (name.includes('划船') || name.includes('引体') || name.includes('背')) {
      muscles.add('lats')
      muscles.add('biceps')
    }
    if (name.includes('跑') || name.includes('腹') || name.includes('核心')) {
      muscles.add('abs')
      muscles.add('quads')
    }
  })

  return muscles.size > 0 ? Array.from(muscles) : ['quads', 'shoulders', 'biceps', 'hamstrings', 'glutes']
}

export function MuscleHeatmap({ activeMuscles = ['quads', 'shoulders', 'biceps', 'glutes', 'hamstrings'], workoutName = '力量训练', className = '' }: MuscleHeatmapProps) {
  const isTarget = (m: MuscleGroup) => activeMuscles.includes(m)

  const muscleLabels: Record<MuscleGroup, string> = {
    shoulders: '三角肌/肩',
    chest: '胸大肌',
    biceps: '肱二头肌',
    triceps: '肱三头肌',
    abs: '腹肌核心',
    quads: '股四头肌',
    lats: '背阔肌',
    lower_back: '下背竖脊肌',
    glutes: '臀大肌',
    hamstrings: '腘绳肌',
    calves: '小腿肌群',
  }

  return (
    <div className={`relative flex flex-col items-center justify-center p-6 bg-[#0d0d10] border border-white/10 rounded-2xl overflow-hidden shadow-2xl ${className}`}>
      {/* Background glow ambiance */}
      <div className="absolute inset-0 bg-gradient-to-b from-purple-900/10 via-transparent to-amber-900/10 pointer-events-none" />

      {/* Top Header */}
      <div className="z-10 text-center mb-4">
        <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-medium tracking-wide">
          🏋️ 肌肉热力分布图
        </span>
        <h4 className="text-white font-bold text-base mt-1.5 tracking-tight">{workoutName} 肌群目标</h4>
      </div>

      {/* Main Human Anatomy SVG Container (Front & Back) */}
      <div className="z-10 flex items-center justify-center gap-8 md:gap-16 my-2">
        {/* === 正面 FRONT === */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-semibold text-gray-400 mb-3 tracking-widest uppercase">正面</span>
          <div className="relative w-36 h-72">
            <svg viewBox="0 0 100 200" className="w-full h-full drop-shadow-lg">
              <defs>
                <filter id="heat-glow-front" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* 人体基础浅色线框轮廓 */}
              {/* 头部 */}
              <circle cx="50" cy="20" r="11" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
              {/* 颈部 */}
              <rect x="46" y="31" width="8" height="6" rx="2" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              {/* 躯干外轮廓 */}
              <path d="M 30,42 L 70,42 L 64,115 L 36,115 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" rx="4" />
              {/* 手臂线框 */}
              <rect x="18" y="44" width="10" height="38" rx="5" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <rect x="72" y="44" width="10" height="38" rx="5" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              {/* 腿部线框 */}
              <rect x="36" y="118" width="12" height="72" rx="6" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
              <rect x="52" y="118" width="12" height="72" rx="6" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />

              {/* === 高亮发光肌肉热力图层 === */}
              {/* 1. 肩部 / 三角肌 */}
              {isTarget('shoulders') && (
                <g filter="url(#heat-glow-front)">
                  <ellipse cx="27" cy="45" rx="9" ry="6" fill="#d97706" opacity="0.85" />
                  <ellipse cx="73" cy="45" rx="9" ry="6" fill="#d97706" opacity="0.85" />
                </g>
              )}

              {/* 2. 胸大肌 */}
              {isTarget('chest') && (
                <g filter="url(#heat-glow-front)">
                  <rect x="33" y="46" width="16" height="18" rx="4" fill="#ea580c" opacity="0.85" />
                  <rect x="51" y="46" width="16" height="18" rx="4" fill="#ea580c" opacity="0.85" />
                </g>
              )}

              {/* 3. 肱二头肌 */}
              {isTarget('biceps') && (
                <g filter="url(#heat-glow-front)">
                  <ellipse cx="23" cy="58" rx="5" ry="10" fill="#c026d3" opacity="0.9" />
                  <ellipse cx="77" cy="58" rx="5" ry="10" fill="#c026d3" opacity="0.9" />
                </g>
              )}

              {/* 4. 腹肌 / 核心 */}
              {isTarget('abs') && (
                <g filter="url(#heat-glow-front)">
                  <rect x="38" y="68" width="24" height="36" rx="4" fill="#e11d48" opacity="0.8" />
                </g>
              )}

              {/* 5. 股四头肌 (大腿前侧) */}
              {isTarget('quads') && (
                <g filter="url(#heat-glow-front)">
                  <rect x="37" y="120" width="10" height="42" rx="5" fill="#b45309" opacity="0.9" />
                  <rect x="53" y="120" width="10" height="42" rx="5" fill="#b45309" opacity="0.9" />
                </g>
              )}
            </svg>
          </div>
        </div>

        {/* === 背面 BACK === */}
        <div className="flex flex-col items-center">
          <span className="text-xs font-semibold text-gray-400 mb-3 tracking-widest uppercase">背面</span>
          <div className="relative w-36 h-72">
            <svg viewBox="0 0 100 200" className="w-full h-full drop-shadow-lg">
              <defs>
                <filter id="heat-glow-back" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* 背面基础浅色线框轮廓 */}
              <circle cx="50" cy="20" r="11" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" />
              <rect x="46" y="31" width="8" height="6" rx="2" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              <path d="M 30,42 L 70,42 L 64,115 L 36,115 Z" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" rx="4" />
              <rect x="18" y="44" width="10" height="38" rx="5" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <rect x="72" y="44" width="10" height="38" rx="5" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <rect x="36" y="118" width="12" height="72" rx="6" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
              <rect x="52" y="118" width="12" height="72" rx="6" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />

              {/* === 背面高亮肌肉图层 === */}
              {/* 1. 上背 / 背阔肌 */}
              {isTarget('lats') && (
                <g filter="url(#heat-glow-back)">
                  <path d="M 34,46 Q 50,60 66,46 L 60,82 Q 50,90 40,82 Z" fill="#7c3aed" opacity="0.85" />
                </g>
              )}

              {/* 2. 肱三头肌 */}
              {isTarget('triceps') && (
                <g filter="url(#heat-glow-back)">
                  <ellipse cx="23" cy="58" rx="5" ry="10" fill="#a855f7" opacity="0.85" />
                  <ellipse cx="77" cy="58" rx="5" ry="10" fill="#a855f7" opacity="0.85" />
                </g>
              )}

              {/* 3. 下背 / 竖脊肌 */}
              {isTarget('lower_back') && (
                <g filter="url(#heat-glow-back)">
                  <rect x="42" y="78" width="16" height="24" rx="3" fill="#ea580c" opacity="0.85" />
                </g>
              )}

              {/* 4. 臀大肌 */}
              {isTarget('glutes') && (
                <g filter="url(#heat-glow-back)">
                  <circle cx="42" cy="112" r="10" fill="#d97706" opacity="0.9" />
                  <circle cx="58" cy="112" r="10" fill="#d97706" opacity="0.9" />
                </g>
              )}

              {/* 5. 腘绳肌 (大腿后侧) */}
              {isTarget('hamstrings') && (
                <g filter="url(#heat-glow-back)">
                  <rect x="37" y="126" width="10" height="38" rx="5" fill="#b45309" opacity="0.9" />
                  <rect x="53" y="126" width="10" height="38" rx="5" fill="#b45309" opacity="0.9" />
                </g>
              )}
            </svg>
          </div>
        </div>
      </div>

      {/* Target Muscle Badges Bar */}
      <div className="z-10 mt-4 flex flex-wrap items-center justify-center gap-1.5 max-w-md">
        {activeMuscles.map((m) => (
          <span
            key={m}
            className="px-2.5 py-1 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold text-xs transition-all shadow-sm"
          >
            {muscleLabels[m] || m}
          </span>
        ))}
      </div>
    </div>
  )
}
