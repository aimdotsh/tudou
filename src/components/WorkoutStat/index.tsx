import React, { MouseEventHandler } from 'react';
import { intComma } from '@/utils/utils';
import { motion } from 'framer-motion';

const WorkoutStat = ({value, description, pace, className, distance, onClick, color}:
                         { value: string, description:string, pace: string, className: string, distance: string, onClick?: MouseEventHandler<HTMLDivElement> , color?: string}) =>
    (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className={`${className || ""} p-4 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] transition-all duration-300 group cursor-pointer select-none`} 
      onClick={onClick}
    >
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <div className="flex flex-col">
          <span className="text-3xl font-black italic bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent group-hover:from-orange-500 group-hover:to-orange-300 transition-all duration-300">
            {intComma(value)}
          </span>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
            {description}
          </span>
        </div>

        {distance && (
          <div className="flex flex-col border-l border-white/5 pl-4">
            <span className="text-3xl font-black italic text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.15)]">
              {distance}
            </span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              KM
            </span>
          </div>
        )}

        {pace && (
          <div className="flex flex-col border-l border-white/5 pl-4">
            <span className="text-3xl font-black italic text-sky-400">
              {pace}
            </span>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">
              Avg Pace
            </span>
          </div>
        )}
      </div>
    </motion.div>
);

export default WorkoutStat;
