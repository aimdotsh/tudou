import { lazy, Suspense } from 'react';
import Stat from '@/components/Stat';
import WorkoutStat from '@/components/WorkoutStat';
import useActivities from '@/hooks/useActivities';
import { formatPace, colorFromType } from '@/utils/utils';
import { yearStats } from '@assets/index';
import { loadSvgComponent } from '@/utils/svgUtils';
import { SHOW_ELEVATION_GAIN } from "@/utils/const";

const YearStat = ({ year, onClick, onClickTypeInYear }: {
  year: string, onClick: (_year: string) => void,
  onClickTypeInYear: (_year: string, _type: string) => void
}) => {
  let { activities: runs, years } = useActivities();
  // lazy Component
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
  const avgHeartRate = (heartRate / (runs.length - heartRateNullCount)).toFixed(
    0
  );

  const workoutsArr = Object.entries(workoutsCounts);
  workoutsArr.sort((a, b) => {
    return b[1][0] - a[1][0]
  });
  return (
    <div
      className="cursor-pointer"
      onClick={() => onClick(year)}
    >
      <section>
        <Stat value={year} description=" Journey" />
        {sumDistance > 0 &&
          <WorkoutStat
            key='total'
            value={runs.length.toString()}
            description={" Total"}
            distance={(sumDistance / 1000.0).toFixed(0)}
            pace=""
            className=""
            onClick={() => { }}
            color=""
          />
        }
        {workoutsArr.map(([type, count]) => (
          <WorkoutStat
            key={type}
            value={count[0].toString()}
            description={` ${type}` + "s"}
            pace=""
            distance={(count[2] / 1000.0).toFixed(0)}
            className=""
            onClick={() => {
              onClickTypeInYear(year, type);
            }}
            color=""
          />
        ))}
        {SHOW_ELEVATION_GAIN && sumElevationGain > 0 &&
          <Stat
            value={`${(sumElevationGain).toFixed(0)} `}
            description="M Elevation"
            className="pb-2"
          />
        }
        <Stat
          value={`${streak} day`}
          description=" Streak"
          className="pb-2"
        />
        {hasHeartRate && (
          <Stat value={avgHeartRate} description=" Avg Heart Rate" />
        )}
      </section>
      <Suspense fallback="loading...">
        <YearSVG
          key={svgName}
          className="my-2 md:my-4 w-full border-0 p-0"
          style={{ height: 'auto', aspectRatio: '1 / 1' }}
          preserveAspectRatio="xMidYMid meet"
        />
      </Suspense>
      <hr color="red" />
    </div>
  );
};

export default YearStat;
