import React from 'react';
import { formatPace, colorFromType, formatRunTime, convertMovingTime2Sec, Activity, RunIds, titleForRun } from '@/utils/utils';
import { SHOW_ELEVATION_GAIN } from '@/utils/const';

interface IRunRowProperties {
  elementIndex: number;
  locateActivity: (_runIds: RunIds) => void;
  run: Activity;
  runIndex: number;
  setRunIndex: (_ndex: number) => void;
  selectedRunId?: number | null;
}

const RunRow = ({ elementIndex, locateActivity, run, runIndex, setRunIndex, selectedRunId }: IRunRowProperties) => {
  const distance = (run.distance / 1000.0).toFixed(2);
  const elevation_gain = run.elevation_gain?.toFixed(0);
  const paceParts = run.moving_time && run.distance ? 
    formatPace(convertMovingTime2Sec(run.moving_time), run.distance) : 
    null;
  const heartRate = run.average_heartrate;
  const type = run.type;
  const runTime = formatRunTime(run.moving_time);
  
  const isSelected = runIndex === elementIndex || selectedRunId === run.run_id;

  const handleClick = () => {
    if (isSelected) {
      setRunIndex(-1);
      locateActivity([]);
      return;
    }
    setRunIndex(elementIndex);
    locateActivity([run.run_id]);
    
    const mapContainer = document.querySelector('.sticky-map-container');
    if (mapContainer) {
      const nav = document.querySelector('nav');
      const navHeight = nav ? nav.offsetHeight : 0;
      const yOffset = navHeight;
      const y = mapContainer.getBoundingClientRect().top + window.pageYOffset - yOffset;
      window.scrollTo({top: y, behavior: 'smooth'});
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative overflow-hidden p-4 rounded-xl transition-all duration-300 cursor-pointer border ${
        isSelected 
          ? 'bg-orange-500/10 border-orange-500/50 shadow-[0_0_20px_rgba(249,115,22,0.1)]' 
          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* 左侧：标题与基础信息 */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: colorFromType(type) }}
            ></span>
            <h3 className={`font-black italic transition-colors ${isSelected ? 'text-orange-500' : 'text-white group-hover:text-orange-400'}`}>
              {titleForRun(run)}
            </h3>
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/5 text-slate-500 tracking-tighter">
              {type}
            </span>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
            <span>{run.start_date_local.slice(0, 10)}</span>
            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
            <span className="text-slate-400">{run.location_city || 'Somewhere'}</span>
          </div>
        </div>

        {/* 右侧：核心指标 */}
        <div className="grid grid-cols-3 md:flex md:items-center gap-6 md:gap-8">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Distance</span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl font-black text-white">{distance}</span>
              <span className="text-[10px] font-bold text-slate-500 italic">KM</span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Pace</span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl font-black text-white">{paceParts || '--'}</span>
            </div>
          </div>

          <div className="flex flex-col">
            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Time</span>
            <div className="flex items-baseline gap-0.5">
              <span className="text-xl font-black text-white">{runTime}</span>
            </div>
          </div>

          {(heartRate || (SHOW_ELEVATION_GAIN && elevation_gain)) && (
            <div className="hidden lg:flex items-center gap-6 border-l border-white/5 pl-6">
              {SHOW_ELEVATION_GAIN && (
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Gain</span>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-sm font-black text-slate-300">+{elevation_gain}</span>
                    <span className="text-[10px] font-bold text-slate-600 italic">M</span>
                  </div>
                </div>
              )}
              {heartRate && (
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">BPM</span>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-sm font-black text-slate-300">{Math.round(heartRate)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* 底部装饰条 */}
      {isSelected && (
        <motion.div 
          layoutId="active-bar"
          className="absolute bottom-0 left-0 h-1 bg-orange-500 w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
      )}
    </div>
  );
};

export default RunRow;

export default RunRow;