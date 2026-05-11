import React, { MouseEventHandler } from 'react';
import { intComma } from '@/utils/utils';
import { motion } from 'framer-motion';

const WorkoutStat = ({value, description, pace, className, distance, onClick, color}:
                         { value: string, description:string, pace: string, className: string, distance: string, onClick?: MouseEventHandler<HTMLDivElement> , color?: string}) =>
    (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      className={`${className || ""} pb-4 group cursor-pointer select-none`} 
      onClick={onClick}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-4xl md:text-5xl font-black italic bg-gradient-to-br from-white to-white/60 bg-clip-text text-transparent group-hover:from-orange-500 group-hover:to-orange-400 transition-all duration-300">
          {intComma(value)}
        </span>
        <span className="text-lg font-medium text-slate-500 italic uppercase tracking-widest mr-2">
          {description}
        </span>

        {distance && (
          <>
            <span className="text-4xl md:text-5xl font-black italic text-orange-500 shadow-orange-500/20 drop-shadow-md">
              {distance}
            </span>
            <span className="text-lg font-medium text-slate-500 italic uppercase tracking-widest">
              KM
            </span>
          </>
        )}

        {pace && (
          <>
            <span className="text-4xl md:text-5xl font-black italic text-sky-400">
              {pace}
            </span>
            <span className="text-lg font-medium text-slate-500 italic uppercase tracking-widest">
              Pace
            </span>
          </>
        )}
      </div>
    </motion.div>
);

export default WorkoutStat;

export default WorkoutStat;
