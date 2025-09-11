import { formatPace, colorFromType, formatRunTime, convertMovingTime2Sec, Activity, RunIds, titleForRun } from '@/utils/utils';
import { SHOW_ELEVATION_GAIN } from '@/utils/const';
import styles from './style.module.css';

interface IRunRowProperties {
  elementIndex: number;
  locateActivity: (_runIds: RunIds) => void;
  run: Activity;
  runIndex: number;
  setRunIndex: (_ndex: number) => void;
}

const RunRow = ({ elementIndex, locateActivity, run, runIndex, setRunIndex }: IRunRowProperties) => {
  const distance = (run.distance / 1000.0).toFixed(2);
  const elevation_gain = run.elevation_gain?.toFixed(0);
  // 计算配速：每公里所需时间（分:秒）
  const paceParts = run.moving_time && run.distance ? 
    formatPace(convertMovingTime2Sec(run.moving_time), run.distance) : 
    null;
  const heartRate = run.average_heartrate;
  const type = run.type;
  const runTime = formatRunTime(run.moving_time);
  const handleClick = () => {
    if (runIndex === elementIndex) {
      setRunIndex(-1);
      locateActivity([]);
      return
    };
    setRunIndex(elementIndex);
    locateActivity([run.run_id]);
    
    // 滚动到地图位置
    const mapContainer = document.querySelector('.sticky-map-container');
    if (mapContainer) {
      // 使用平滑滚动效果
      mapContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <tr
      className={`${styles.runRow} ${runIndex === elementIndex ? styles.selected : ''}`}
      key={run.start_date_local}
      onClick={handleClick}
      style={{color: colorFromType(type)}}
    >
      <td>{titleForRun(run)}</td>
      <td>{type}</td>
      <td>{distance}</td>
      {SHOW_ELEVATION_GAIN && <td>{elevation_gain}</td>}
      <td>{paceParts}</td>
      <td>{runTime}</td>
      <td className={styles.runDate}>{run.start_date_local.slice(5, 11)} </td>
    </tr>
  );
};

export default RunRow;