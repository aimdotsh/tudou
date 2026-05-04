import React, { useState, useMemo } from 'react';
import useActivities from '@/hooks/useActivities';
import MiniTrack from './MiniTrack';
import { Activity } from '@/utils/utils';
import { TYPES_MAPPING } from '@/utils/const';

const ITEMS_PER_PAGE = 24;

const WorkoutsGrid = () => {
  const { activities } = useActivities();
  const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);
  const [filterType, setFilterType] = useState('all');

  // 获取所有出现的活动类型
  const availableTypes = useMemo(() => {
    const types = new Set(activities.map(a => a.type.toLowerCase()));
    return ['all', ...Array.from(types)].filter(t => t === 'all' || TYPES_MAPPING[t as keyof typeof TYPES_MAPPING]);
  }, [activities]);

  const filteredActivities = useMemo(() => {
    return activities
      .filter(a => filterType === 'all' || a.type.toLowerCase() === filterType)
      .sort((a, b) => new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime());
  }, [activities, filterType]);

  const visibleActivities = useMemo(() => {
    return filteredActivities.slice(0, visibleCount);
  }, [filteredActivities, visibleCount]);

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          Workouts Tracks
          <span className="text-sm font-normal text-gray-400">({filteredActivities.length} tracks)</span>
        </h3>
        
        {/* 类型过滤器 */}
        <div className="flex flex-wrap gap-2">
          {availableTypes.map(type => (
            <button
              key={type}
              onClick={() => {
                setFilterType(type);
                setVisibleCount(ITEMS_PER_PAGE);
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                filterType === type 
                ? 'bg-red-500 text-white shadow-sm' 
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {type === 'all' ? 'All' : (TYPES_MAPPING[type as keyof typeof TYPES_MAPPING] || type)}
            </button>
          ))}
        </div>
      </div>

      {/* 网格容器 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {visibleActivities.map(activity => (
          <MiniTrack 
            key={activity.run_id} 
            activity={activity} 
          />
        ))}
      </div>

      {/* 加载更多 */}
      {visibleCount < filteredActivities.length && (
        <div className="flex justify-center pt-8 pb-4">
          <button
            onClick={() => setVisibleCount(prev => prev + ITEMS_PER_PAGE)}
            className="px-8 py-2.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
          >
            加载更多记录...
          </button>
        </div>
      )}
      
      {filteredActivities.length === 0 && (
        <div className="py-20 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          此分类下暂无运动记录
        </div>
      )}
    </div>
  );
};

export default WorkoutsGrid;
