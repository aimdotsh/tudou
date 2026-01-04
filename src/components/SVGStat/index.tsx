import { lazy, Suspense } from 'react';
import { totalStat } from '@assets/index';
import { loadSvgComponent } from '@/utils/svgUtils';

// Lazy load both github.svg and grid.svg
const GithubSvg = lazy(() => loadSvgComponent(totalStat, './github.svg'));

const GridSvg = lazy(() => loadSvgComponent(totalStat, './grid.svg'));

const MonthofLifeSvg = lazy(() => loadSvgComponent(totalStat, './mol.svg'));

// Lazy load annual posters (2018-2026)
const annualYears = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];
const AnnualPosters = annualYears.map(year => ({
  year,
  Component: lazy(() => loadSvgComponent(totalStat, `./ayeartotal_${year}.svg`)
    .catch(() => ({ default: () => <div className="text-xs text-gray-400">Failed to load {year}</div> })))
}));


const SVGStat = () => (
  <div id="svgStat" className="flex flex-col gap-8">
    <Suspense fallback={<div className="text-center">Loading...</div>}>
      <div className="flex flex-col gap-4">
        <GridSvg className="h-auto w-full" />
        <GithubSvg className="h-auto w-full" />
      </div>

      <div className="mt-4">
        <h3 className="text-xl font-bold mb-6 text-primary flex items-center gap-2">
          <span className="w-1 h-6 bg-primary rounded-full"></span>
          Annual Running Posters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {AnnualPosters.map(({ year, Component }) => (
            <div key={year} className="bg-white/50 rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="text-sm font-semibold text-gray-500 mb-3">{year} Year</div>
              <Suspense fallback={<div className="h-40 flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded">Loading {year}...</div>}>
                <Component className="w-full h-auto" />
              </Suspense>
            </div>
          ))}
        </div>
      </div>
    </Suspense>
  </div>
);


export default SVGStat;
