import { lazy, Suspense } from 'react';
import { totalStat } from '@assets/index';
import { loadSvgComponent } from '@/utils/svgUtils';
import { motion } from 'framer-motion';

const GithubSvg = lazy(() => loadSvgComponent(totalStat, './github.svg'));
const GridSvg = lazy(() => loadSvgComponent(totalStat, './grid.svg'));

const annualYears = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];
const AnnualPosters = annualYears.map(year => ({
  year,
  Component: lazy(() => loadSvgComponent(totalStat, `./ayeartotal_${year}.svg`)
    .catch(() => ({ default: () => <div className="text-[10px] text-slate-600 italic">Historical data unavailable for {year}</div> })))
}));

const SVGStat = () => (
  <div id="svgStat" className="space-y-16">
    <Suspense fallback={<div className="h-40 flex items-center justify-center text-xs text-slate-500 animate-pulse">Initializing Data Visualization Matrix...</div>}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-4 lg:p-8 overflow-hidden shadow-inner">
          <GridSvg className="h-auto w-full filter contrast-125 saturate-150" />
        </div>
        <div className="rounded-2xl border border-white/5 bg-white/[0.01] p-4 lg:p-8 overflow-hidden shadow-inner">
          <GithubSvg className="h-auto w-full filter contrast-125 saturate-150" />
        </div>
      </motion.div>

      <div className="pt-12">
        <div className="flex items-center gap-4 mb-10">
          <h3 className="text-xl font-black italic text-white uppercase tracking-[0.3em]">
            Annual Records
          </h3>
          <div className="h-[1px] flex-grow bg-white/5"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
          {AnnualPosters.map(({ year, Component }, idx) => (
            <motion.div 
              key={year}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(idx * 0.1, 1) }}
              className="group glass-card p-6 border-white/5 hover:border-orange-500/20 transition-all duration-500 bg-gradient-to-br from-white/[0.02] to-transparent"
            >
              <div className="flex justify-between items-center mb-6">
                <span className="text-2xl font-black italic text-white/20 group-hover:text-orange-500/40 transition-colors">#{year}</span>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2 py-1 bg-white/5 rounded">Report</span>
              </div>
              <Suspense fallback={<div className="h-48 flex items-center justify-center text-xs text-slate-600 italic animate-pulse">Loading {year} Record...</div>}>
                <div className="rounded-lg overflow-hidden shadow-2xl transition-transform duration-700 group-hover:scale-[1.02]">
                  <Component className="w-full h-auto" />
                </div>
              </Suspense>
            </motion.div>
          ))}
        </div>
      </div>
    </Suspense>
  </div>
);

export default SVGStat;
