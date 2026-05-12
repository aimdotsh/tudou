import { lazy, Suspense } from 'react';
import Stat from '@/components/Stat';
import WorkoutStat from '@/components/WorkoutStat';
import useActivities from '@/hooks/useActivities';
import { yearStats } from '@assets/index';
import { loadSvgComponent } from '@/utils/svgUtils';
import { SHOW_ELEVATION_GAIN } from "@/utils/const";
import { motion } from 'framer-motion';

const YearStat = ({ year, onClick, onClickTypeInYear, children }: {
  year: string, onClick: (_year: string) => void,
  onClickTypeInYear: (_year: string, _type: string) => void,
  children?: React.ReactNode
}) => {
  let { activities: runs, years } = useActivities();
  const svgName = year === 'Total' ? 'all' : year;
  const YearSVG = lazy(() => loadSvgComponent(yearStats, `./year_${svgName}.svg`));

  if (years.includes(year)) {
    runs = runs.filter((run) => run.start_date_local.slice(0, 4) === year);
  }
  let sumDistance = 0;
  let streak = 0;
  let sumElevationGain = 0;
  let heartRate = 0;
  let heartRateNullCount = 0;
  const workoutsCounts: { [key: string]: [number, number, number] } = {};

  runs.forEach((run) => {
    sumDistance += run.distance || 0;
    sumElevationGain += run.elevation_gain || 0;
    if (run.average_speed) {
      if (workoutsCounts[run.type]) {
        var [oriCount, oriSecondsAvail, oriMetersAvail] = workoutsCounts[run.type]
        workoutsCounts[run.type] = [oriCount + 1, oriSecondsAvail + (run.distance || 0) / run.average_speed, oriMetersAvail + (run.distance || 0)]
      } else {
        workoutsCounts[run.type] = [1, (run.distance || 0) / run.average_speed, run.distance]
      }
    }
    if (run.average_heartrate) {
      heartRate += run.average_heartrate;
    } else {
      heartRateNullCount++;
    }
    if (run.streak) {
      streak = Math.max(streak, run.streak);
    }
  });
  const hasHeartRate = !(heartRate === 0);
  const avgHeartRate = (heartRate / (runs.length - heartRateNullCount)).toFixed(0);

  const workoutsArr = Object.entries(workoutsCounts);
  workoutsArr.sort((a, b) => b[1][0] - a[1][0]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group"
    >
      <div 
        className="glass-card p-6 border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-300 cursor-pointer overflow-hidden relative"
        onClick={() => onClick(year)}
      >
        <div className="absolute -top-4 -right-4 text-8xl font-black italic text-white/[0.02] pointer-events-none group-hover:text-orange-500/[0.05] transition-colors">
          {year === 'Total' ? 'ALL' : year}
        </div>

        <section className="relative z-10 space-y-6">
          <div className="flex items-center gap-4">
            <Stat value={year} description=" Journey" className="!p-0" />
            <div className="h-[1px] flex-grow bg-white/5"></div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {sumDistance > 0 &&
              <WorkoutStat
                key='total'
                value={runs.length.toString()}
                description={" Total Workouts"}
                distance={(sumDistance / 1000.0).toFixed(0)}
                pace=""
                className="bg-orange-500/5 border-orange-500/10"
                onClick={() => { }}
                color=""
              />
            }
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {workoutsArr.map(([type, count]) => (
                <WorkoutStat
                  key={type}
                  value={count[0].toString()}
                  description={` ${type}`}
                  pace=""
                  distance={(count[2] / 1000.0).toFixed(0)}
                  className="bg-white/[0.02] border-white/5"
                  onClick={() => onClickTypeInYear(year, type)}
                  color=""
                />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-8 pt-4 border-t border-white/5">
            {SHOW_ELEVATION_GAIN && sumElevationGain > 0 &&
              <Stat
                value={`${(sumElevationGain).toFixed(0)}`}
                description="M Gain"
                className="!p-0 scale-75 origin-left"
              />
            }
            <Stat
              value={`${streak}`}
              description="D Streak"
              className="!p-0 scale-75 origin-left"
            />
            {hasHeartRate && (
              <Stat value={avgHeartRate} description=" Avg BPM" className="!p-0 scale-75 origin-left" />
            )}
          </div>
        </section>

        {children && (
          <div className="mt-8 relative z-10 border-t border-white/5 pt-8">
            {children}
          </div>
        )}

        <div className="mt-8 rounded-xl overflow-hidden shadow-2xl border border-white/5 group-hover:border-orange-500/20 transition-colors">
          <Suspense fallback={<div className="h-40 flex items-center justify-center text-xs text-slate-500 italic animate-pulse">Loading Visual Stats...</div>}>
            <YearSVG
              key={svgName}
              className="w-full h-auto transform group-hover:scale-105 transition-transform duration-700"
              style={{ aspectRatio: '1 / 1' }}
              preserveAspectRatio="xMidYMid meet"
            />
          </Suspense>
        </div>
      </div>
    </motion.div>
  );
};

export default YearStat;
