import React, { useState, useEffect, useRef } from 'react';
import {
  sortDateFunc,
  sortDateFuncReverse,
  convertMovingTime2Sec,
  Activity,
  RunIds,
} from '@/utils/utils';
import { SHOW_ELEVATION_GAIN } from "@/utils/const";

import RunRow from './RunRow';
import styles from './style.module.css';

interface IRunTableProperties {
  runs: Activity[];
  locateActivity: (_runIds: RunIds) => void;
  setActivity: (_runs: Activity[]) => void;
  runIndex: number;
  setRunIndex: (_index: number) => void;
}

type SortFunc = (_a: Activity, _b: Activity) => number;

const RunTable = ({
  runs,
  locateActivity,
  setActivity,
  runIndex,
  setRunIndex,
}: IRunTableProperties) => {
  const [sortFuncInfo, setSortFuncInfo] = useState('');
  // TODO refactor?
  const sortTypeFunc: SortFunc = (a, b) =>
    sortFuncInfo === 'Type' ? a.type > b.type ? 1:-1 : b.type < a.type ? -1:1;
  const sortKMFunc: SortFunc = (a, b) =>
    sortFuncInfo === 'KM' ? a.distance - b.distance : b.distance - a.distance;
  const sortElevationGainFunc: SortFunc = (a, b) =>
    sortFuncInfo === 'Elevation Gain'
      ? (a.elevation_gain ?? 0) - (b.elevation_gain ?? 0)
      : (b.elevation_gain ?? 0) - (a.elevation_gain ?? 0);
  const sortPaceFunc: SortFunc = (a, b) => {
    // 计算配速（秒/公里）- 配速越小越快
    const aPace = a.moving_time && a.distance ? 
      convertMovingTime2Sec(a.moving_time) / (a.distance / 1000) : 
      Number.MAX_VALUE;
    const bPace = b.moving_time && b.distance ? 
      convertMovingTime2Sec(b.moving_time) / (b.distance / 1000) : 
      Number.MAX_VALUE;
    
    // 配速小的（更快的）排在前面
    return sortFuncInfo === 'Pace'
      ? aPace - bPace  // 升序（从快到慢）
      : bPace - aPace; // 降序（从慢到快）
  };
  const sortBPMFunc: SortFunc = (a, b) => {
    return sortFuncInfo === 'BPM'
      ? (a.average_heartrate ?? 0) - (b.average_heartrate ?? 0)
      : (b.average_heartrate ?? 0) - (a.average_heartrate ?? 0);
  };
  const sortRunTimeFunc: SortFunc = (a, b) => {
    const aTotalSeconds = convertMovingTime2Sec(a.moving_time);
    const bTotalSeconds = convertMovingTime2Sec(b.moving_time);
    return sortFuncInfo === 'Time'
      ? aTotalSeconds - bTotalSeconds
      : bTotalSeconds - aTotalSeconds;
  };
  const sortNameFunc: SortFunc = (a, b) => {
    const aName = a.name || '';
    const bName = b.name || '';
    return sortFuncInfo === 'Name' 
      ? aName.localeCompare(bName)
      : bName.localeCompare(aName);
  };
  const sortDateFuncClick =
    sortFuncInfo === 'Date' ? sortDateFunc : sortDateFuncReverse;
  const sortFuncMap = new Map([
    ['Name', sortNameFunc],
    ['Type', sortTypeFunc],
    ['KM', sortKMFunc],
    ['Elevation Gain', sortElevationGainFunc],
    ['Pace', sortPaceFunc],
    ['Time', sortRunTimeFunc],
    ['Date', sortDateFuncClick],
  ]);
  if (!SHOW_ELEVATION_GAIN){
    sortFuncMap.delete('Elevation Gain')
  }

  const handleClick: React.MouseEventHandler<HTMLElement> = (e) => {
    const funcName = (e.target as HTMLElement).innerHTML;
    const f = sortFuncMap.get(funcName);

    setRunIndex(-1);
    setSortFuncInfo(sortFuncInfo === funcName ? '' : funcName);
    setActivity(runs.sort(f));
  };

  // 创建表头引用
  const tableHeaderRef = useRef<HTMLTableSectionElement>(null);
  
  // 在组件挂载后添加id，方便外部JavaScript定位
  useEffect(() => {
    if (tableHeaderRef.current) {
      tableHeaderRef.current.id = 'run-table-header';
    }
  }, []);
  
  return (
    <div className={styles.tableContainer} id="run-table-container">
      <table className={styles.runTable} cellSpacing="0" cellPadding="0">
        <thead className={styles.stickyHeader} ref={tableHeaderRef}>
          <tr>
            {Array.from(sortFuncMap.keys()).map((k) => (
              <th key={k} onClick={handleClick}>
                {k}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((run, elementIndex) => (
            <RunRow
              key={run.run_id}
              elementIndex={elementIndex}
              locateActivity={locateActivity}
              run={run}
              runIndex={runIndex}
              setRunIndex={setRunIndex}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RunTable;