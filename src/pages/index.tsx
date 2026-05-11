import { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { useLocation } from 'react-router-dom';
import Layout from '@/components/Layout';
import LocationStat from '@/components/LocationStat';
import LocationSummary from '@/components/LocationStat/LocationSummary';
import RunMap from '@/components/RunMap';
import RunTable from '@/components/RunTable';
import SVGStat from '@/components/SVGStat';
import YearsStat from '@/components/YearsStat';
import BackToTop from '@/components/BackToTop';
import { totalStat, recentStat, halfmarathonStat, newyearStat, yueyeStat, calendarStat } from '@assets/index';
import { loadSvgComponent } from '@/utils/svgUtils';
import locationStats from '@/static/location_stats.json';
import useActivities from '@/hooks/useActivities';
import useSiteMetadata from '@/hooks/useSiteMetadata';

const annualYears = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];

const AYearTotalSvgs = annualYears.reduce((acc, y) => {
  const path = `./ayeartotal_${y}.svg`;
  if (totalStat[path]) {
    acc[y] = lazy(() => loadSvgComponent(totalStat, path));
  }
  return acc;
}, {} as Record<string, any>);

const CalendarSvgs = annualYears.reduce((acc, y) => {
  const path = `./calendar_${y}.svg`;
  if (calendarStat[path]) {
    acc[y] = lazy(() => loadSvgComponent(calendarStat, path));
  }
  return acc;
}, {} as Record<string, any>);

import { IS_CHINESE, CHINA_CENTER } from '@/utils/const';
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
  // 格式化耗时显示
  const formatDuration = (movingTime: any): string => {
    if (!movingTime) return '未知耗时';

    // 如果是时间戳格式 "1970-01-01 HH:MM:SS.000000"
    if (typeof movingTime === 'string' && movingTime.includes('1970-01-01')) {
      const timeMatch = movingTime.match(/(\d{2}):(\d{2}):(\d{2})/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const seconds = parseInt(timeMatch[3]);

        if (hours > 0) {
          return `${hours}h${minutes}m`;
        }
        return `${minutes}m${seconds}s`;
      }
    }

    // 如果是数字（秒数）
    if (typeof movingTime === 'number') {
      const hours = Math.floor(movingTime / 3600);
      const minutes = Math.floor((movingTime % 3600) / 60);
      if (hours > 0) {
        return `${hours}h${minutes}m`;
      }
      return `${minutes}m`;
    }

    return '未知耗时';
  };

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
  // for auto zoom
  const bounds = getBoundsForGeoData(geoData);
  const [intervalId, setIntervalId] = useState<number>();

  // 搜索功能
  const handleSearch = (term: string) => {
    setSearchTerm(term);

    if (!term.trim()) {
      // 如果搜索词为空，显示所有运动记录
      setFilteredRuns(runs);
      setGeoData(geoJsonForRuns(runs));

      // 重置选中状态
      setRunIndex(-1);
      setSelectedRunId(null);
      updateUrlWithRunId(null);

      // 恢复原始标题
      if (!selectedRunId) {
        setTitle(`${year} Year Heatmap`);
        setDescription('');
      }
    } else {
      // 根据name进行模糊搜索
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

      // 重置选中状态
      setRunIndex(-1);
      setSelectedRunId(null);
      updateUrlWithRunId(null);

      // 更新标题显示搜索结果
      setTitle(`搜索 "${term}" - 找到 ${filtered.length} 条记录`);
    }
  };

  // 当runs数据变化时，更新filteredRuns
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
      setTitle(`搜索 "${searchTerm}" - 找到 ${filtered.length} 条记录`);
    }
  }, [runs, searchTerm]);

  const [viewState, setViewState] = useState<IViewState>({
    longitude: CHINA_CENTER[0],
    latitude: CHINA_CENTER[1],
    zoom: 3,
  });

  // URL分享功能：更新URL中的运动记录ID
  const updateUrlWithRunId = (runId: number | null) => {
    const url = new URL(window.location.href);
    if (runId) {
      url.searchParams.set('run_id', runId.toString());
    } else {
      url.searchParams.delete('run_id');
    }
    window.history.replaceState({}, '', url.toString());
  };

  // URL分享功能：从URL中读取运动记录ID
  const getRunIdFromUrl = (): number | null => {
    const urlParams = new URLSearchParams(window.location.search);
    const runIdParam = urlParams.get('run_id');
    return runIdParam ? parseInt(runIdParam, 10) : null;
  };



  const changeByItem = (
    item: string,
    name: string,
    func: (_run: Activity, _value: string) => boolean
  ) => {
    scrollToMap();
    if (name != 'Year') {
      setYear(thisYear);
    }
    const newRuns = filterAndSortRuns(activities, item, func, sortDateFunc, null, null);
    setActivity(newRuns);
    setRunIndex(-1);
    setTitle(`${item} ${name} Heatmap`);

    // 清除搜索状态
    setSearchTerm('');
    setFilteredRuns(newRuns);
    setDescription('');
  };

  const changeYear = (y: string) => {
    // default year
    setYear(y);

    // 清除选中的运动状态和URL参数
    setSelectedRunId(null);
    setRunIndex(-1);
    updateUrlWithRunId(null);
    setDescription('');

    // 当选择Total时，设置适合显示中国全貌的视图
    if (y === 'Total') {
      setViewState({
        longitude: CHINA_CENTER[0],  // 中国中心经度
        latitude: CHINA_CENTER[1],     // 中国中心纬度
        zoom: 3,                // 适合显示中国全貌的缩放级别
      });
    } else if ((viewState.zoom ?? 0) > 3 && bounds) {
      setViewState({
        ...bounds,
      });
    }

    // 强制更新标题，确保与选中的年份同步
    const newRuns = filterAndSortRuns(activities, y, filterYearRuns, sortDateFunc, null, null);
    setActivity(newRuns);

    // 清除搜索状态
    setSearchTerm('');
    setFilteredRuns(newRuns);

    // 重置地图数据为新年份的所有运动
    setGeoData(geoJsonForRuns(newRuns));

    // 确保标题更新为当前选中的年份，但不覆盖URL中指定的运动记录标题
    setTimeout(() => {
      const runIdFromUrl = getRunIdFromUrl();
      if (!runIdFromUrl) {
        setTitle(`${y} Year Heatmap`);
      }
    }, 0);

    clearInterval(intervalId);
  };

  const changeCity = (city: string) => {
    changeByItem(city, 'City', filterCityRuns);
  };

  const changeTitle = (title: string) => {
    changeByItem(title, 'Title', filterTitleRuns);
  };

  const changeType = (type: string) => {
    changeByItem(type, 'Type', filterTypeRuns);
  };

  const changeTypeInYear = (year: string, type: string) => {
    scrollToMap();
    // type in year, filter year first, then type
    if (year != 'Total') {
      setYear(year);
      setActivity(filterAndSortRuns(activities, year, filterYearRuns, sortDateFunc, type, filterTypeRuns));
    }
    else {
      setYear(thisYear);
      setActivity(filterAndSortRuns(activities, type, filterTypeRuns, sortDateFunc, null, null));
    }
    setRunIndex(-1);
    setTitle(`${year} ${type} Type Heatmap`);
  };


  const locateActivity = (runIds: RunIds, updateUrl: boolean = true) => {
    const ids = new Set(runIds);

    // Case 1: Deselect / Reset (Empty inputs)
    if (!runIds.length) {
      setGeoData(geoJsonForRuns(filteredRuns));
      setSelectedRunId(null);
      setTitle(`${year} Year Heatmap`);
      setDescription('');
      if (updateUrl) {
        updateUrlWithRunId(null);
      }
      return;
    }

    // Case 2: Filter specific runs
    const selectedRuns = filteredRuns.filter((r: any) => ids.has(r.run_id));

    if (!selectedRuns.length) {
      // If filtering yielded nothing, effectively a reset or no-op?
      // For now, let's treat it as no-op or keep things as is.
      return;
    }

    const lastRun = selectedRuns.sort(sortDateFunc)[0];

    if (!lastRun) {
      return;
    }

    // Update state for selected run
    setSelectedRunId(lastRun.run_id);
    if (updateUrl) {
      updateUrlWithRunId(lastRun.run_id);
    }

    setGeoData(geoJsonForRuns(selectedRuns));
    setTitle(titleForShow(lastRun));
    setDescription(lastRun.description || '');
    clearInterval(intervalId);
    scrollToMap();
  };

  useEffect(() => {
    // 当年份为Total时，保持中国全貌视图，不使用bounds
    if (year !== 'Total') {
      setViewState({
        ...bounds,
      });
    }
  }, [geoData, year]);

  // 页面加载时检查URL中是否有运动记录ID
  useEffect(() => {
    const runIdFromUrl = getRunIdFromUrl();
    if (runIdFromUrl && activities.length > 0) {
      // 找到对应的运动记录
      const targetRun = activities.find(run => run.run_id === runIdFromUrl);
      if (targetRun) {
        // 获取运动记录的年份
        const runYear = new Date(targetRun.start_date_local).getFullYear().toString();

        // 如果当前年份不匹配，切换到对应年份
        if (year !== runYear) {
          setYear(runYear);
          const yearRuns = filterAndSortRuns(activities, runYear, filterYearRuns, sortDateFunc, null, null);
          setActivity(yearRuns);
        }

        // 直接设置运动记录的标题，避免被年份标题覆盖
        setTitle(titleForShow(targetRun));
        setDescription(targetRun.description || '');
      }
    }
  }, [activities]);

  // 当runs数据更新后，检查是否需要选中URL中的运动记录
  useEffect(() => {
    const runIdFromUrl = getRunIdFromUrl();

    if (runIdFromUrl && filteredRuns.length > 0) {
      const runIndex = filteredRuns.findIndex(run => run.run_id === runIdFromUrl);

      if (runIndex !== -1) {
        // 设置运行索引
        setRunIndex(runIndex);

        // 调用完整的locateActivity函数，但不更新URL（因为URL已经正确）
        // 这样可以确保触发完整的动画效果
        locateActivity([runIdFromUrl], false);

        // 先滚动到地图
        scrollToMap();

        // 延迟滚动到对应的运动记录行
        setTimeout(() => {
          const tableContainer = document.getElementById('run-table-container');
          const tableRows = tableContainer?.querySelectorAll('tbody tr');

          if (tableRows && tableRows[runIndex]) {
            const targetRow = tableRows[runIndex] as HTMLElement;

            // 获取导航栏、地图和表头的高度
            const nav = document.querySelector('nav');
            const mapContainer = document.querySelector('.sticky-map-container');
            const tableHeader = document.getElementById('run-table-header');

            const navHeight = nav ? nav.offsetHeight : 0;
            const mapHeight = mapContainer ? mapContainer.clientHeight : 0;
            const headerHeight = tableHeader ? tableHeader.offsetHeight : 0;

            // 计算滚动位置：目标行位置 - 导航栏高度 - 地图高度 - 表头高度 - 一些额外空间
            const yOffset = navHeight + mapHeight + headerHeight + 20;
            const y = targetRow.getBoundingClientRect().top + window.pageYOffset - yOffset;

            // 使用平滑滚动效果
            window.scrollTo({ top: y, behavior: 'smooth' });
          }
        }, 500); // 等待地图动画完成后再滚动到记录行
      }
    }
  }, [filteredRuns]);

  // 监听浏览器前进后退按钮
  useEffect(() => {
    const handlePopState = () => {
      const runIdFromUrl = getRunIdFromUrl();
      if (runIdFromUrl && filteredRuns.length > 0) {
        const runIndex = filteredRuns.findIndex(run => run.run_id === runIdFromUrl);
        if (runIndex !== -1) {
          setRunIndex(runIndex);
          setSelectedRunId(runIdFromUrl);

          const selectedRuns = filteredRuns.filter((r: any) => r.run_id === runIdFromUrl);
          if (selectedRuns.length > 0) {
            const targetRun = selectedRuns[0];
            setGeoData(geoJsonForRuns(selectedRuns));
            setTitle(titleForShow(targetRun));
            setDescription(targetRun.description || '');
            clearInterval(intervalId);
            scrollToMap();
          }
        }
      } else {
        // 清除选中状态
        setRunIndex(-1);
        setSelectedRunId(null);
        locateActivity([]);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [filteredRuns]);

  // 确保标题与当前选中的年份同步，但不覆盖URL中指定的运动记录标题
  useEffect(() => {
    const runIdFromUrl = getRunIdFromUrl();
    if (!runIdFromUrl && !title.includes(year)) {
      setTitle(`${year} Year Heatmap`);
      setDescription('');
    }
  }, [year, title]);

  // 处理表头固定在地图下方
  useEffect(() => {
    // 只在年份不是Total时处理表头固定
    if (year !== 'Total') {
      // 使用更可靠的表头固定方法
      const cleanupFunction = initStickyHeader({
        tableHeaderId: 'run-table-header',
        tableContainerId: 'run-table-container',
        mapContainerClass: 'sticky-map-container'
      });

      // 返回清理函数
      return () => {
        destroyStickyHeader(cleanupFunction);
      };
    }
  }, [year]);

  useEffect(() => {
    // 如果已经选中了特定的运动记录，不执行动画
    if (selectedRunId) {
      return;
    }

    // 如果URL中有run_id参数，也不执行动画（等待URL处理完成）
    const runIdFromUrl = getRunIdFromUrl();
    if (runIdFromUrl) {
      return;
    }

    const runsNum = filteredRuns.length;
    // maybe change 20 ?
    const sliceNum = runsNum >= 10 ? runsNum / 10 : 1;
    let i = sliceNum;
    const id = setInterval(() => {
      if (i >= runsNum) {
        clearInterval(id);
      }

      const tempRuns = filteredRuns.slice(0, i);
      setGeoData(geoJsonForRuns(tempRuns));
      i += sliceNum;
    }, 10);
    setIntervalId(id);
  }, [filteredRuns.length, selectedRunId]);

  useEffect(() => {
    if (year !== 'Total') {
      return;
    }

    let svgStat = document.getElementById('svgStat');
    if (!svgStat) {
      return;
    }

    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName.toLowerCase() === 'path') {
        // Use querySelector to get the <desc> element and the <title> element.
        const descEl = target.querySelector('desc');
        if (descEl) {
          // If the runId exists in the <desc> element, it means that a running route has been clicked.
          const runId = Number(descEl.innerHTML);
          if (!runId) {
            return;
          }
          locateActivity([runId]);
          return;
        }

        const titleEl = target.querySelector('title');
        if (titleEl) {
          // If the runDate exists in the <title> element, it means that a date square has been clicked.
          const [runDate] = titleEl.innerHTML.match(
            /\d{4}-\d{1,2}-\d{1,2}/
          ) || [`${+thisYear + 1}`];
          const runIDsOnDate = filteredRuns
            .filter((r) => r.start_date_local.slice(0, 10) === runDate)
            .map((r) => r.run_id);
          if (!runIDsOnDate.length) {
            return;
          }
          locateActivity(runIDsOnDate);
        }
      }
    };
    svgStat.addEventListener('click', handleClick);
    return () => {
      svgStat && svgStat.removeEventListener('click', handleClick);
    };
  }, [year]);

  return (
    <Layout
      onSearch={handleSearch}
      showSearch={location.pathname === '/' || location.pathname === '/index'}
    >
      <div className="flex flex-col lg:flex-row w-full gap-10">
        {/* 左侧栏 - 导航与统计 */}
        <aside className="w-full lg:w-[400px] flex-shrink-0 space-y-8">
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

          <div className="space-y-8">
            {year === 'Total' ? (
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
                      <span className="text-4xl font-black text-white">{locationStats.cities}</span>
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Cities</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {locationStats.citiesList.slice(0, 12).map(c => (
                        <span key={c} className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.03] text-slate-400 border border-white/5 hover:border-orange-500/30 transition-colors">
                          {c}
                        </span>
                      ))}
                      <span className="text-[10px] text-slate-600 font-bold ml-1 self-center">+{locationStats.citiesList.length - 12} MORE</span>
                    </div>
                  </div>
                </div>
              </motion.section>
            ) : (
              locationStats.yearlyNewLocations[year] && (
                <motion.section 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-6 border-orange-500/10 shadow-orange-500/5"
                >
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-orange-500 mb-6 flex items-center gap-2">
                    <span className="w-8 h-[1px] bg-orange-500/30"></span>
                    {year} New Milestones
                  </h3>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {(() => {
                        const newLocs = locationStats.yearlyNewLocations[year];
                        const allNewLocations = [];
                        if (newLocs.countries) {
                          newLocs.countries.forEach(c => c !== 'Other' && allNewLocations.push({ name: c, type: 'Country', info: locationStats.locationFirstActivity?.[c] }));
                        }
                        if (newLocs.cities) {
                          newLocs.cities.forEach(c => allNewLocations.push({ name: c, type: 'City', info: locationStats.locationFirstActivity?.[c] }));
                        }
                        return allNewLocations.map((loc, idx) => (
                          <div key={idx} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all group">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-sm font-black text-white group-hover:text-orange-400 transition-colors">{loc.name}</span>
                              <span className="text-[8px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-500 font-black uppercase">{loc.type}</span>
                            </div>
                            {loc.info && (
                              <a 
                                href={`?run_id=${loc.info.run_id}`}
                                onClick={(e) => {
                                  e.preventDefault();
                                  locateActivity([loc.info.run_id]);
                                }}
                                className="text-[10px] text-slate-500 group-hover:text-slate-300 transition-colors flex items-center gap-1"
                              >
                                {loc.info.date?.slice(0, 10)} • {(loc.info.distance/1000).toFixed(1)}KM • {loc.info.type}
                              </a>
                            )}
                          </div>
                        ));
                    })()}
                  </div>
                </motion.section>
              )
            )}

            <div className="glass-card p-2 border-white/5 bg-gradient-to-b from-white/[0.02] to-transparent">
              <LocationStat
                changeYear={changeYear}
                changeCity={changeCity}
                changeType={changeType}
                onClickTypeInYear={changeTypeInYear}
                runs={runs}
                year={year}
              >
                          return <CalendarComponent className="w-full h-auto" />;
                        })()}
                      </div>
                    ) : null}
                  </Suspense>
                </div>
              </LocationStat>
            </div>
          )}
        </div>

        {/* 右侧内容区 */}
        <div className="w-full lg:w-2/3 flex flex-col">
          {/* 固定地图区域 */}
          <div className={year === 'Total' ? 'map-container' : 'sticky-map-container'}>
            <RunMap
              title={title}
              viewState={viewState}
              geoData={geoData}
              setViewState={setViewState}
              changeYear={changeYear}
              thisYear={year}
              description={description}
            />
          </div>

          {/* 可滚动内容区域 */}
          <div className="content-container" id="run-table-container">
            {year === 'Total' ? (
              <SVGStat />
            ) : (
              <RunTable
                runs={filteredRuns}
                locateActivity={locateActivity}
                setActivity={(newRuns) => {
                  setActivity(newRuns);
                  // 如果没有搜索状态，同步更新filteredRuns
                  if (!searchTerm.trim()) {
                    setFilteredRuns(newRuns);
                  }
                }}
                runIndex={runIndex}
                setRunIndex={setRunIndex}
                selectedRunId={selectedRunId}
              />
            )}
          </div>
        </div>
      </div>
      {/* 返回顶部按钮 */}
      <BackToTop />
      {/* Enable Audiences in Vercel Analytics: https://vercel.com/docs/concepts/analytics/audiences/quickstart */}
      {import.meta.env.VERCEL && <Analytics />}
    </Layout>
  );
};

export default Index;
