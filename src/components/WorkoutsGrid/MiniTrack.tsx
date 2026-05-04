import React, { useMemo } from 'react';
import { Activity, pathForRun } from '@/utils/utils';

interface MiniTrackProps {
  activity: Activity;
  color?: string;
  size?: number;
}

const MiniTrack: React.FC<MiniTrackProps> = ({ activity, color = '#20B2AA', size = 160 }) => {
  return (
    <div className="group relative bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden border border-gray-100">
      {/* 轨迹预览区域 */}
      <div 
        style={{ width: size, height: size }}
        className="flex items-center justify-center p-4 bg-gray-50/50"
      >
        <svg 
          width="100%" 
          height="100%" 
          viewBox="-5 -5 110 110" 
          className="drop-shadow-sm"
        >
          {activity.svg_path ? (
            <path
              d={activity.svg_path}
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-all duration-500"
            />
          ) : (
            <text x="50" y="50" textAnchor="middle" className="text-gray-300 text-[10px]" fill="#ccc">No Track</text>
          )}
        </svg>
      </div>
      
      {/* 悬浮信息层 */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col items-center justify-center text-white p-3 text-center">
        <div className="text-xs font-medium mb-1 opacity-80">{activity.start_date_local.split(' ')[0]}</div>
        <div className="text-lg font-bold leading-none mb-1">{(activity.distance / 1000).toFixed(2)} km</div>
        <div className="text-[10px] opacity-90">{activity.name || activity.type}</div>
      </div>
      
      {/* 底部信息条 */}
      <div className="px-2 py-1.5 bg-white border-t border-gray-50 flex justify-between items-center">
        <span className="text-[10px] text-gray-400 font-mono">
          {(activity.distance / 1000).toFixed(1)}km
        </span>
        <span className="text-[9px] text-gray-300">
          {new Date(activity.start_date_local).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      </div>
    </div>
  );
};

export default MiniTrack;
