import React, { useMemo } from 'react';
import { Activity, pathForRun } from '@/utils/utils';

interface MiniTrackProps {
  activity: Activity;
  color?: string;
  size?: number;
}

const MiniTrack: React.FC<MiniTrackProps> = ({ activity, color = '#20B2AA', size = 160 }) => {
  const points = useMemo(() => {
    // 使用统一的 pathForRun 处理解密、解码和纠偏
    const path = pathForRun(activity);
    return path.map(([lng, lat]) => ({ lat, lng }));
  }, [activity]);

  const svgPath = useMemo(() => {
    if (points.length < 2) return '';

    // 计算地理边界
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    points.forEach(({ lat, lng }) => {
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });

    const centerLat = (minLat + maxLat) / 2;
    // 经度方向的缩放因子 (考虑到纬度越高，1度经度的实际距离越短)
    const lngScaleFactor = Math.cos((centerLat * Math.PI) / 180);

    const geoWidth = (maxLng - minLng) * lngScaleFactor;
    const geoHeight = maxLat - minLat;

    // 防止除以 0 (点太集中的情况)
    const safeWidth = Math.max(geoWidth, 0.0001);
    const safeHeight = Math.max(geoHeight, 0.0001);

    const padding = 15;
    const innerSize = size - padding * 2;
    
    // 计算缩放倍数，使轨迹适合 innerSize 并保持物理比例
    const scale = Math.min(innerSize / safeWidth, innerSize / safeHeight);
    
    // 居中偏移
    const offsetX = (size - safeWidth * scale) / 2;
    const offsetY = (size - geoHeight * scale) / 2;

    const transform = (lng: number, lat: number) => {
      // 物理 X = (lng - minLng) * lngScaleFactor
      const x = (lng - minLng) * lngScaleFactor * scale + offsetX;
      // 物理 Y = (lat - minLat) -> 注意 SVG Y 轴向下，所以用 maxLat 减去
      const y = (maxLat - lat) * scale + offsetY;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    };

    return `M ${transform(points[0].lng, points[0].lat)} ` + 
           points.slice(1).map(p => `L ${transform(p.lng, p.lat)}`).join(' ');
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
