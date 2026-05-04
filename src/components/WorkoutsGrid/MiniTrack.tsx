import React, { useMemo } from 'react';
import * as mapboxPolyline from '@mapbox/polyline';
import { Activity } from '@/utils/utils';

interface MiniTrackProps {
  activity: Activity;
  color?: string;
  size?: number;
}

const MiniTrack: React.FC<MiniTrackProps> = ({ activity, color = '#20B2AA', size = 160 }) => {
  const points = useMemo(() => {
    if (!activity.summary_polyline) return [];
    try {
      const decoded = mapboxPolyline.decode(activity.summary_polyline);
      // polyline.decode 返回的是 [lat, lng]，我们需要转换为 [x, y]
      // 在 SVG 中，y 是向下增长的，所以我们需要反转它
      return decoded.map(([lat, lng]) => [lng, lat]);
    } catch (e) {
      console.error('Failed to decode polyline', e);
      return [];
    }
  }, [activity.summary_polyline]);

  const svgPath = useMemo(() => {
    if (points.length < 2) return '';

    // 计算边界
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    points.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });

    const width = maxX - minX;
    const height = maxY - minY;
    
    // 防止除以 0
    if (width === 0 || height === 0) return '';

    // 留出边距
    const padding = 10;
    const innerSize = size - padding * 2;
    
    // 保持纵横比
    const scale = Math.min(innerSize / width, innerSize / height);
    
    const centerX = (size - width * scale) / 2;
    const centerY = (size - height * scale) / 2;

    const transform = (x: number, y: number) => {
      const tx = (x - minX) * scale + centerX;
      const ty = size - ((y - minY) * scale + centerY); // 反转 Y 轴
      return `${tx.toFixed(2)},${ty.toFixed(2)}`;
    };

    return `M ${transform(points[0][0], points[0][1])} ` + 
           points.slice(1).map(([x, y]) => `L ${transform(x, y)}`).join(' ');
  }, [points, size]);

  return (
    <div className="relative group overflow-hidden bg-white rounded-xl shadow-sm border border-gray-100 transition-all duration-300 hover:shadow-md hover:-translate-y-1">
      <div 
        style={{ width: size, height: size }}
        className="flex items-center justify-center p-2 bg-slate-50/50"
      >
        {svgPath ? (
          <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`}>
            <path
              d={svgPath}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="drop-shadow-sm"
            />
          </svg>
        ) : (
          <div className="text-gray-300 text-xs italic">No Track</div>
        )}
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
