import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '@/components/Layout';
import RunMap from '@/components/RunMap';
import RunTable from '@/components/RunTable';
import SVGStat from '@/components/SVGStat';
import YearsStat from '@/components/YearsStat';
import BackToTop from '@/components/BackToTop';
import locationStats from '@/static/location_stats.json';
import useActivities from '@/hooks/useActivities';
import useSiteMetadata from '@/hooks/useSiteMetadata';

import { CHINA_CENTER } from '@/utils/const';
import '@/styles/stickyMap.css';
import '@/styles/stickyHeader.css';
import { initStickyHeader, destroyStickyHeader } from '@/utils/stickyHeader';
import {
  Activity,
  IViewState,
  filterAndSortRuns,
  filterCityRuns,
  filterTitleRuns,
  filterTypeRuns,
  filterYearRuns,
  geoJsonForRuns,
  getBoundsForGeoData,
  scrollToMap,
  sortDateFunc,
  titleForShow,
  RunIds,
} from '@/utils/utils';

const Index = () => {
  const location = useLocation();
  const { siteTitle } = useSiteMetadata();
  const { activities, thisYear } = useActivities();
  const [year, setYear] = useState('Total');
  const [runIndex, setRunIndex] = useState(-1);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [runs, setActivity] = useState(
    filterAndSortRuns(activities, 'Total', filterYearRuns, sortDateFunc, null, null)
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRuns, setFilteredRuns] = useState(runs);
  const [title, setTitle] = useState('Total Heatmap');
  const [description, setDescription] = useState<string>('');
  const [geoData, setGeoData] = useState(geoJsonForRuns(runs));
  const bounds = getBoundsForGeoData(geoData);
  const [intervalId, setIntervalId] = useState<number>();

  const [viewState, setViewState] = useState<IViewState>({
    longitude: CHINA_CENTER[0],
    latitude: CHINA_CENTER[1],
    zoom: 3,
  });

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setFilteredRuns(runs);
      setGeoData(geoJsonForRuns(runs));
      setRunIndex(-1);
      setSelectedRunId(null);
      updateUrlWithRunId(null);
      if (!selectedRunId) {
        setTitle(`${year} Year Heatmap`);
        setDescription('');
      }
    } else {
      const lowerTerm = term.toLowerCase();
      const filtered = runs.filter(run => {
        const nameMatch = run.name && run.name.toLowerCase().includes(lowerTerm);
        const countryMatch = run.location_country && run.location_country.toLowerCase().includes(lowerTerm);
        const provinceMatch = run.location_province && run.location_province.toLowerCase().includes(lowerTerm);
        const cityMatch = run.location_city && run.location_city.toLowerCase().includes(lowerTerm);
        return nameMatch || countryMatch || provinceMatch || cityMatch;
      });
      setFilteredRuns(filtered);
      setGeoData(geoJsonForRuns(filtered));
      setRunIndex(-1);
      setSelectedRunId(null);
      updateUrlWithRunId(null);
      setTitle(`Search Result: ${filtered.length} found`);
    }
  };

  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredRuns(runs);
    } else {
      const lowerTerm = searchTerm.toLowerCase();
      const filtered = runs.filter(run => {
        const nameMatch = run.name && run.name.toLowerCase().includes(lowerTerm);
        const countryMatch = run.location_country && run.location_country.toLowerCase().includes(lowerTerm);
        const provinceMatch = run.location_province && run.location_province.toLowerCase().includes(lowerTerm);
        const cityMatch = run.location_city && run.location_city.toLowerCase().includes(lowerTerm);
        return nameMatch || countryMatch || provinceMatch || cityMatch;
      });
      setFilteredRuns(filtered);
      setGeoData(geoJsonForRuns(filtered));
    }
  }, [runs, searchTerm]);

  const updateUrlWithRunId = (runId: number | null) => {
    const url = new URL(window.location.href);
    if (runId) {
      url.searchParams.set('run_id', runId.toString());
    } else {
      url.searchParams.delete('run_id');
    }
    window.history.replaceState({}, '', url.toString());
  };

  const getRunIdFromUrl = (): number | null => {
    const urlParams = new URLSearchParams(window.location.search);
    const runIdParam = urlParams.get('run_id');
    return runIdParam ? parseInt(runIdParam, 10) : null;
  };

  const changeYear = (y: string) => {
    setYear(y);
    setSelectedRunId(null);
    setRunIndex(-1);
    updateUrlWithRunId(null);
    setDescription('');

    if (y === 'Total') {
      setViewState({
        longitude: CHINA_CENTER[0],
        latitude: CHINA_CENTER[1],
        zoom: 3,
      });
    } else if ((viewState.zoom ?? 0) > 3 && bounds) {
      setViewState({ ...bounds });
    }

    const newRuns = filterAndSortRuns(activities, y, filterYearRuns, sortDateFunc, null, null);
    setActivity(newRuns);
    setSearchTerm('');
    setFilteredRuns(newRuns);
    setGeoData(geoJsonForRuns(newRuns));

    setTimeout(() => {
      const runIdFromUrl = getRunIdFromUrl();
      if (!runIdFromUrl) {
        setTitle(`${y} Year Heatmap`);
      }
    }, 0);
    clearInterval(intervalId);
  };

  const changeTypeInYear = (year: string, type: string) => {
    scrollToMap();
    if (year != 'Total') {
      setYear(year);
      setActivity(filterAndSortRuns(activities, year, filterYearRuns, sortDateFunc, type, filterTypeRuns));
    } else {
      setYear(thisYear);
      setActivity(filterAndSortRuns(activities, type, filterTypeRuns, sortDateFunc, null, null));
    }
    setRunIndex(-1);
    setTitle(`${year} ${type} Type Heatmap`);
  };

  const locateActivity = (runIds: RunIds, updateUrl: boolean = true) => {
    const ids = new Set(runIds);
    if (!runIds.length) {
      setGeoData(geoJsonForRuns(filteredRuns));
      setSelectedRunId(null);
      setTitle(`${year} Year Heatmap`);
      setDescription('');
      if (updateUrl) updateUrlWithRunId(null);
      return;
    }
    const selectedRuns = filteredRuns.filter((r: any) => ids.has(r.run_id));
    if (!selectedRuns.length) return;
    const lastRun = selectedRuns.sort(sortDateFunc)[0];
    if (!lastRun) return;

    setSelectedRunId(lastRun.run_id);
    if (updateUrl) updateUrlWithRunId(lastRun.run_id);
    setGeoData(geoJsonForRuns(selectedRuns));
    setTitle(titleForShow(lastRun));
    setDescription(lastRun.description || '');
    clearInterval(intervalId);
    scrollToMap();
  };

  useEffect(() => {
    if (year !== 'Total') {
      setViewState({ ...bounds });
    }
  }, [geoData, year]);

  useEffect(() => {
    const runIdFromUrl = getRunIdFromUrl();
    if (runIdFromUrl && activities.length > 0) {
      const targetRun = activities.find(run => run.run_id === runIdFromUrl);
      if (targetRun) {
        const runYear = new Date(targetRun.start_date_local).getFullYear().toString();
        if (year !== runYear) {
          setYear(runYear);
          const yearRuns = filterAndSortRuns(activities, runYear, filterYearRuns, sortDateFunc, null, null);
          setActivity(yearRuns);
        }
        setTitle(titleForShow(targetRun));
        setDescription(targetRun.description || '');
      }
    }
  }, [activities]);

  useEffect(() => {
    const runIdFromUrl = getRunIdFromUrl();
    if (runIdFromUrl && filteredRuns.length > 0) {
      const index = filteredRuns.findIndex(run => run.run_id === runIdFromUrl);
      if (index !== -1) {
        setRunIndex(index);
        locateActivity([runIdFromUrl], false);
        scrollToMap();
      }
    }
  }, [filteredRuns]);

  useEffect(() => {
    if (year !== 'Total') {
      const cleanupFunction = initStickyHeader({
        tableHeaderId: 'run-table-header',
        tableContainerId: 'run-table-container',
        mapContainerClass: 'sticky-map-container'
      });
      return () => { destroyStickyHeader(cleanupFunction); };
    }
  }, [year]);

  useEffect(() => {
    if (selectedRunId || getRunIdFromUrl()) return;
    const runsNum = filteredRuns.length;
    const sliceNum = runsNum >= 10 ? runsNum / 10 : 1;
    let i = sliceNum;
    const id = setInterval(() => {
      if (i >= runsNum) clearInterval(id);
      const tempRuns = filteredRuns.slice(0, i);
      setGeoData(geoJsonForRuns(tempRuns));
      i += sliceNum;
    }, 10);
    setIntervalId(id);
    return () => clearInterval(id);
  }, [filteredRuns.length, selectedRunId]);

  return (
    <Layout
      onSearch={handleSearch}
      showSearch={location.pathname === '/' || location.pathname === '/index'}
    >
      <div className="flex flex-col lg:flex-row w-full gap-10">
        {/* 左侧栏 - 导航与统计 */}
        <aside className="w-full lg:w-[400px] flex-shrink-0 space-y-8 px-4 lg:px-0">
          <div className="pt-4 lg:pt-8">
            <motion.h1 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-6xl font-black italic tracking-tighter bg-gradient-to-r from-orange-500 via-orange-400 to-yellow-500 bg-clip-text text-transparent"
            >
              <a href="/">{siteTitle}</a>
            </motion.h1>
            <p className="text-slate-500 font-medium mt-2 tracking-widest uppercase text-[10px]">Sports Data Visualization 2.0</p>
          </div>

          <div className="space-y-8 pb-20">
            {year === 'Total' && (
              <motion.section 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-8 shadow-2xl relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                  <svg className="w-32 h-32 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                </div>

                <div className="space-y-8 relative z-10">
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-black italic text-orange-500">{locationStats.years}</span>
                      <span className="text-xl font-bold text-slate-400 uppercase italic">Years</span>
                    </div>
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                      {locationStats.yearsList.join(' • ')}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-6 py-6 border-y border-white/5">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white">{locationStats.countries}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Nations</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tight">{locationStats.countriesList.filter(c => c !== 'Other').slice(0, 3).join(', ')}...</p>
                    </div>
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-white">{locationStats.provinces}</span>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">Regions</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-tight">{locationStats.provincesList.slice(0, 3).join(', ')}...</p>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white">{locationStats.cities}</span>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cities</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {locationStats.citiesList.slice(0, 12).map(c => (
                        <span key={c} className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.03] text-slate-400 border border-white/5">
                          {c}
                        </span>
                      ))}
                      <span className="text-[10px] text-slate-600 font-bold ml-1 self-center">+{locationStats.citiesList.length - 12} MORE</span>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}

            <YearsStat 
              year={year} 
              onClick={changeYear} 
              onClickTypeInYear={changeTypeInYear} 
            />
          </div>
        </aside>

        {/* 右侧主区域 - 地图与交互 */}
        <main className="flex-grow space-y-8 min-w-0 pt-4 lg:pt-8 pb-20 px-4 lg:px-0">
          <div className="glass-card overflow-hidden shadow-2xl shadow-black/50 border-white/5 relative group">
            {/* 地图标题浮层 */}
            <div className="absolute top-8 left-8 z-10 pointer-events-none">
              <AnimatePresence mode="wait">
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                  className="space-y-2"
                >
                  <h2 className="text-4xl font-black italic text-white tracking-tighter drop-shadow-2xl">
                    {title}
                  </h2>
                  {description && (
                    <p className="text-sm font-bold text-orange-400 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full w-fit border border-white/10 shadow-lg">
                      {description}
                    </p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
            
            <div className="sticky-map-container h-[500px] lg:h-[750px] relative">
              <RunMap
                activities={activities}
                runIndex={runIndex}
                viewState={viewState}
                setViewState={setViewState}
                geoData={geoData}
                locateActivity={locateActivity}
                year={year}
              />
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
            id="run-table-container"
          >
             {year === 'Total' ? (
                <div className="glass-card p-10 border-white/5 bg-gradient-to-br from-white/[0.02] to-transparent overflow-hidden" id="svgStat">
                   <div className="flex items-center gap-4 mb-10">
                     <h3 className="text-2xl font-black italic text-white uppercase tracking-widest">Global Matrix</h3>
                     <div className="h-[1px] flex-grow bg-white/5"></div>
                   </div>
                   <div className="filter contrast-125 saturate-150">
                     <SVGStat />
                   </div>
                </div>
              ) : (
                <div className="glass-card shadow-2xl border-white/5 bg-white/[0.01]">
                  <RunTable
                    runs={filteredRuns}
                    locateActivity={locateActivity}
                    setActivity={(newRuns) => {
                      setActivity(newRuns);
                      if (!searchTerm.trim()) setFilteredRuns(newRuns);
                    }}
                    runIndex={runIndex}
                    setRunIndex={setRunIndex}
                    selectedRunId={selectedRunId}
                  />
                </div>
              )}
          </motion.div>
        </main>
      </div>
      
      <BackToTop />
      {import.meta.env.VERCEL && <Analytics />}
    </Layout>
  );
};

export default Index;
