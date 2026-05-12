import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  sortDateFunc,
  sortDateFuncReverse,
  convertMovingTime2Sec,
  Activity,
  RunIds,
} from '@/utils/utils';
import { SHOW_ELEVATION_GAIN } from "@/utils/const";
import RunRow from './RunRow';

interface IRunTableProperties {
  runs: Activity[];
  locateActivity: (_runIds: RunIds) => void;
  setActivity: (_runs: Activity[]) => void;
  runIndex: number;
  setRunIndex: (_index: number) => void;
  selectedRunId?: number | null;
}

type SortFunc = (_a: Activity, _b: Activity) => number;

const RunTable = ({
  runs,
  locateActivity,
  setActivity,
  runIndex,
  setRunIndex,
  selectedRunId,
}: IRunTableProperties) => {
  const [sortFuncInfo, setSortFuncInfo] = useState('Date');

  const sortTypeFunc: SortFunc = (a, b) =>
    sortFuncInfo === 'Type' ? a.type > b.type ? 1:-1 : b.type < a.type ? -1:1;
  const sortKMFunc: SortFunc = (a, b) =>
    sortFuncInfo === 'KM' ? a.distance - b.distance : b.distance - a.distance;
  const sortElevationGainFunc: SortFunc = (a, b) =>
    sortFuncInfo === 'Elevation'
      ? (a.elevation_gain ?? 0) - (b.elevation_gain ?? 0)
      : (b.elevation_gain ?? 0) - (a.elevation_gain ?? 0);
  const sortPaceFunc: SortFunc = (a, b) => {
    const aPace = a.moving_time && a.distance ? 
      convertMovingTime2Sec(a.moving_time) / (a.distance / 1000) : 
      Number.MAX_VALUE;
    const bPace = b.moving_time && b.distance ? 
      convertMovingTime2Sec(b.moving_time) / (b.distance / 1000) : 
      Number.MAX_VALUE;
    return sortFuncInfo === 'Pace' ? aPace - bPace : bPace - aPace;
  };
  const sortBPMFunc: SortFunc = (a, b) => {
    return sortFuncInfo === 'BPM'
      ? (a.average_heartrate ?? 0) - (b.average_heartrate ?? 0)
      : (b.average_heartrate ?? 0) - (a.average_heartrate ?? 0);
  };
  const sortRunTimeFunc: SortFunc = (a, b) => {
    const aTotalSeconds = convertMovingTime2Sec(a.moving_time);
    const bTotalSeconds = convertMovingTime2Sec(b.moving_time);
    return sortFuncInfo === 'Time' ? aTotalSeconds - bTotalSeconds : bTotalSeconds - aTotalSeconds;
  };
  const sortNameFunc: SortFunc = (a, b) => {
    const aName = a.name || '';
    const bName = b.name || '';
    return sortFuncInfo === 'Name' ? aName.localeCompare(bName) : bName.localeCompare(aName);
  };
  const sortDateFuncClick = sortFuncInfo === 'Date' ? sortDateFunc : sortDateFuncReverse;

  const sortFuncMap = new Map([
    ['Date', sortDateFuncClick],
    ['KM', sortKMFunc],
    ['Pace', sortPaceFunc],
    ['Time', sortRunTimeFunc],
    ['BPM', sortBPMFunc],
    ['Name', sortNameFunc],
    ['Type', sortTypeFunc],
  ]);

  if (SHOW_ELEVATION_GAIN) {
    sortFuncMap.set('Elevation', sortElevationGainFunc);
  }

  const handleSort = (funcName: string) => {
    const f = sortFuncMap.get(funcName);
    setRunIndex(-1);
    setSortFuncInfo(funcName);
    setActivity([...runs].sort(f));
  };

  return (
    <div className="w-full space-y-6" id="run-table-container">
      {/* 排序控制栏 */}
      <div className="flex flex-wrap items-center gap-2 p-4 bg-white/[0.02] border-b border-white/5 overflow-x-auto no-scrollbar rounded-t-xl" id="run-table-header">
        <span className="text-[10px] font-black uppercase text-slate-500 mr-2 tracking-widest">Sort By:</span>
        {Array.from(sortFuncMap.keys()).map((k) => (
          <button
            key={k}
            onClick={() => handleSort(k)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all duration-200 border ${
              sortFuncInfo === k 
                ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20' 
                : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white'
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      {/* 记录列表 */}
      <div className="px-4 pb-6 space-y-3">
        <AnimatePresence mode="popLayout">
          {runs.map((run, elementIndex) => (
            <motion.div
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3, delay: Math.min(elementIndex * 0.05, 1) }}
              key={run.run_id}
            >
              <RunRow
                elementIndex={elementIndex}
                locateActivity={locateActivity}
                run={run}
                runIndex={runIndex}
                setRunIndex={setRunIndex}
                selectedRunId={selectedRunId}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RunTable;