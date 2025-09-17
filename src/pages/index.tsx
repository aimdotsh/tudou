import { useEffect, useState, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
import Layout from '@/components/Layout';
import LocationStat from '@/components/LocationStat';
import LocationSummary from '@/components/LocationStat/LocationSummary';
import RunMap from '@/components/RunMap';
import RunTable from '@/components/RunTable';
import SVGStat from '@/components/SVGStat';
import YearsStat from '@/components/YearsStat';
import BackToTop from '@/components/BackToTop';
import locationStats from '@/static/location_stats.json';
import useActivities from '@/hooks/useActivities';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import { IS_CHINESE } from '@/utils/const';
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

  const { siteTitle } = useSiteMetadata();
  const { activities, thisYear } = useActivities();
  const [year, setYear] = useState(thisYear);
  const [runIndex, setRunIndex] = useState(-1);
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [runs, setActivity] = useState(
    filterAndSortRuns(activities, year, filterYearRuns, sortDateFunc, null, null)
  );
  const [title, setTitle] = useState(`${thisYear} Year Heatmap`);
  const [geoData, setGeoData] = useState(geoJsonForRuns(runs));
  // for auto zoom
  const bounds = getBoundsForGeoData(geoData);
  const [intervalId, setIntervalId] = useState<number>();

  const [viewState, setViewState] = useState<IViewState>({
    ...bounds,
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
    setActivity(filterAndSortRuns(activities, item, func, sortDateFunc, null, null));
    setRunIndex(-1);
    setTitle(`${item} ${name} Heatmap`);
  };

  const changeYear = (y: string) => {
    // default year
    setYear(y);

    // 当选择Total时，设置适合显示中国全貌的视图
    if (y === 'Total') {
      setViewState({
        longitude: 104.195397,  // 中国中心经度
        latitude: 35.86166,     // 中国中心纬度
        zoom: 3,                // 适合显示中国全貌的缩放级别
      });
    } else if ((viewState.zoom ?? 0) > 3 && bounds) {
      setViewState({
        ...bounds,
      });
    }

    // 强制更新标题，确保与选中的年份同步
    setActivity(filterAndSortRuns(activities, y, filterYearRuns, sortDateFunc, null, null));
    setRunIndex(-1);
    
    // 确保标题更新为当前选中的年份
    setTimeout(() => {
      setTitle(`${y} Year Heatmap`);
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

  const changeTypeInYear = (year:string, type: string) => {
    scrollToMap();
    // type in year, filter year first, then type
    if(year != 'Total'){
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

    const selectedRuns = !runIds.length
      ? runs
      : runs.filter((r: any) => ids.has(r.run_id));

    if (!selectedRuns.length) {
      // 清除选中状态和URL
      setSelectedRunId(null);
      if (updateUrl) {
        updateUrlWithRunId(null);
      }
      return;
    }

    const lastRun = selectedRuns.sort(sortDateFunc)[0];

    if (!lastRun) {
      return;
    }
    
    // 更新选中的运动记录ID和URL
    setSelectedRunId(lastRun.run_id);
    if (updateUrl) {
      updateUrlWithRunId(lastRun.run_id);
    }
    
    setGeoData(geoJsonForRuns(selectedRuns));
    setTitle(titleForShow(lastRun));
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
      }
    }
  }, [activities]);

  // 当runs数据更新后，检查是否需要选中URL中的运动记录
  useEffect(() => {
    const runIdFromUrl = getRunIdFromUrl();
    
    if (runIdFromUrl && runs.length > 0) {
      const runIndex = runs.findIndex(run => run.run_id === runIdFromUrl);
      
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
            window.scrollTo({top: y, behavior: 'smooth'});
          }
        }, 500); // 等待地图动画完成后再滚动到记录行
      }
    }
  }, [runs]);

  // 监听浏览器前进后退按钮
  useEffect(() => {
    const handlePopState = () => {
      const runIdFromUrl = getRunIdFromUrl();
      if (runIdFromUrl && runs.length > 0) {
        const runIndex = runs.findIndex(run => run.run_id === runIdFromUrl);
        if (runIndex !== -1) {
          setRunIndex(runIndex);
          setSelectedRunId(runIdFromUrl);
          
          const selectedRuns = runs.filter((r: any) => r.run_id === runIdFromUrl);
          if (selectedRuns.length > 0) {
            const targetRun = selectedRuns[0];
            setGeoData(geoJsonForRuns(selectedRuns));
            setTitle(titleForShow(targetRun));
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
  }, [runs]);

  // 确保标题与当前选中的年份同步
  useEffect(() => {
    if (!title.includes(year) && !title.includes('Run:')) {
      setTitle(`${year} Year Heatmap`);
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
    
    const runsNum = runs.length;
    // maybe change 20 ?
    const sliceNum = runsNum >= 10 ? runsNum / 10 : 1;
    let i = sliceNum;
    const id = setInterval(() => {
      if (i >= runsNum) {
        clearInterval(id);
      }

      const tempRuns = runs.slice(0, i);
      setGeoData(geoJsonForRuns(tempRuns));
      i += sliceNum;
    }, 10);
    setIntervalId(id);
  }, [runs.length, selectedRunId]);

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
          const runIDsOnDate = runs
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
    <Layout>
      <div className="flex flex-col lg:flex-row w-full">
        {/* 左侧栏 */}
        <div className="w-full lg:w-1/4">
          <h1 className="my-12 text-5xl font-extrabold italic">
            <a href="/">{siteTitle}</a>
          </h1>
          {year === 'Total' ? (
            <div className="w-full pb-16 pl-4 sm:pl-4 md:pl-4 lg:w-full lg:pr-16 lg:pl-0">
              <div className="cursor-pointer">
                <section>
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl font-bold text-red-500 mr-2">{locationStats.years}</span>
                      <span style={{color: '#20B2AA'}}>年里我走过</span>
                    </div>
                    <div className="text-sm ml-4" style={{color: '#20B2AA'}}>
                      {locationStats.yearsList.join('、')}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl font-bold text-red-500 mr-2">{locationStats.countries}</span>
                      <span style={{color: '#20B2AA'}}>个国家</span>
                    </div>
                    <div className="text-sm ml-4" style={{color: '#20B2AA'}}>
                      {locationStats.countriesList.filter(c => c !== 'Other').join('、')}
                      {locationStats.countriesList.includes('Other') && locationStats.countriesList.length > 1 ? '等' : ''}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl font-bold text-red-500 mr-2">{locationStats.provinces}</span>
                      <span style={{color: '#20B2AA'}}>个省份</span>
                    </div>
                    <div className="text-sm ml-4" style={{color: '#20B2AA'}}>
                      {locationStats.provincesList.join('、')}
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <div className="flex items-center mb-2">
                      <span className="text-2xl font-bold text-red-500 mr-2">{locationStats.cities}</span>
                      <span style={{color: '#20B2AA'}}>个城市</span>
                    </div>
                    <div className="text-sm ml-4 leading-relaxed" style={{color: '#20B2AA'}}>
                      {locationStats.citiesList.join('、')}
                    </div>
                  </div>
                </section>
                <hr color="red" />
              </div>
              <YearsStat year={year} onClick={changeYear} onClickTypeInYear={changeTypeInYear}/>
            </div>
          ) : (
            <div>
              {/* 显示当年新增地点 */}
              {locationStats.yearlyNewLocations[year] && (
                <div className="mb-4 cursor-pointer border-r border-transparent pl-4 sm:pl-4 md:pl-4 lg:pl-0 pr-4">
                  <section>
                    <div className="mb-4">
                      <div className="flex items-center mb-2">
                        <span style={{color: '#20B2AA'}}>{year}年新增<span className="text-2xl font-bold text-red-500 mx-1">
                          {(() => {
                            const newLocs = locationStats.yearlyNewLocations[year];
                            const formattedItems = [];
                            
                            // 处理新增国家
                            if (newLocs.countries && newLocs.countries.length > 0) {
                              newLocs.countries.forEach(country => {
                                if (country !== 'Other') {
                                  formattedItems.push(country);
                                }
                              });
                            }
                            
                            // 处理新增省份和城市的组合
                            const provinces = newLocs.provinces || [];
                            const cities = newLocs.cities || [];
                            
                            // 为每个城市找到对应的省份（使用自动生成的关联关系）
                            cities.forEach(city => {
                              const matchedProvince = locationStats.cityProvinceMap[city];
                              
                              if (matchedProvince) {
                                formattedItems.push(`${matchedProvince}-${city}`);
                              } else {
                                formattedItems.push(city);
                              }
                            });
                            
                            // 添加单独的新增省份（没有对应城市的）
                            provinces.forEach(province => {
                              const hasMatchingCity = cities.some(city => {
                                return locationStats.cityProvinceMap[city] === province;
                              });
                              
                              if (!hasMatchingCity) {
                                formattedItems.push(province);
                              }
                            });
                            
                            return formattedItems.length;
                          })()}
                        </span><span style={{color: '#20B2AA'}}>处地点：</span></span>
                      </div>
                      <div className="text-sm leading-relaxed" style={{color: '#20B2AA'}}>
                        {(() => {
                          const newLocs = locationStats.yearlyNewLocations[year];
                          
                          // 收集所有新增地点信息
                          const allNewLocations = [];
                          
                          // 处理新增国家
                          if (newLocs.countries && newLocs.countries.length > 0) {
                            newLocs.countries.forEach((country, index) => {
                              if (country !== 'Other') {
                                const activityInfo = locationStats.locationFirstActivity?.[country];
                                allNewLocations.push({
                                  name: country,
                                  displayText: country,
                                  activityInfo,
                                  type: 'country',
                                  key: `country-${country}-${index}`
                                });
                              }
                            });
                          }
                          
                          // 处理新增省份和城市的组合
                          const provinces = newLocs.provinces || [];
                          const cities = newLocs.cities || [];
                          
                          // 为每个城市找到对应的省份（使用自动生成的关联关系）
                          cities.forEach((city, index) => {
                            const matchedProvince = locationStats.cityProvinceMap[city];
                            const activityInfo = locationStats.locationFirstActivity?.[city];
                            
                            let displayText;
                            if (matchedProvince) {
                              displayText = `${matchedProvince}-${city}`;
                            } else {
                              displayText = city;
                            }
                            
                            allNewLocations.push({
                              name: city,
                              displayText,
                              activityInfo,
                              type: 'city',
                              key: `city-${city}-${index}`
                            });
                          });
                          
                          // 添加单独的新增省份（没有对应城市的）
                          provinces.forEach((province, index) => {
                            const hasMatchingCity = cities.some(city => {
                              return locationStats.cityProvinceMap[city] === province;
                            });
                            
                            if (!hasMatchingCity) {
                              const activityInfo = locationStats.locationFirstActivity?.[province];
                              allNewLocations.push({
                                name: province,
                                displayText: province,
                                activityInfo,
                                type: 'province',
                                key: `province-${province}-${index}`
                              });
                            }
                          });
                          
                          // 按时间倒序排列（最新的在前）
                          allNewLocations.sort((a, b) => {
                            const dateA = a.activityInfo?.date || '0000-00-00';
                            const dateB = b.activityInfo?.date || '0000-00-00';
                            return dateB.localeCompare(dateA);
                          });
                          
                          // 生成排序后的JSX元素
                          const formattedItems = allNewLocations.map((location) => {
                            if (location.activityInfo) {
                              const distance = location.activityInfo.distance ? `${(location.activityInfo.distance / 1000).toFixed(1)}km` : '未知距离';
                              const duration = location.activityInfo.moving_time ? formatDuration(location.activityInfo.moving_time) : '未知耗时';
                              
                              // 创建运动详情的超链接
                              const handleActivityClick = (e: React.MouseEvent) => {
                                e.preventDefault();
                                if (location.activityInfo?.run_id) {
                                  // 直接调用 locateActivity 来定位到该运动记录
                                  locateActivity([location.activityInfo.run_id]);
                                }
                              };
                              
                              return (
                                <div key={location.key} className="mb-1" style={{color: '#20B2AA'}}>
                                  <span className="font-bold">{location.displayText}</span>
                                  （首次 Workout： 
                                  <a 
                                    href={`?run_id=${location.activityInfo.run_id}`}
                                    onClick={handleActivityClick}
                                    className="cursor-pointer"
                                    style={{color: '#20B2AA', textDecoration: 'none'}}
                                  >
                                    {location.activityInfo.type} {location.activityInfo.date?.slice(0, 10)} {location.activityInfo.name} {distance} {duration}
                                  </a>
                                  ）
                                </div>
                              );
                            } else {
                              return (
                                <div key={location.key} className="mb-1" style={{color: '#20B2AA'}}>
                                  <span className="font-bold">{location.displayText}</span>
                                </div>
                              );
                            }
                          });
                          
                          return formattedItems.length > 0 ? (
                            <div>
                              {formattedItems}
                            </div>
                          ) : '暂无新增地点';
                        })()}
                      </div>
                    </div>
                  </section>
                  <hr color="red" />
                </div>
              )}
              <LocationStat
                changeYear={changeYear}
                changeCity={changeCity}
                changeType={changeType}
                onClickTypeInYear={changeTypeInYear}
                runs={runs}
                year={year}
              />
            </div>
          )}
        </div>
        
        {/* 右侧内容区 */}
        <div className="w-full lg:w-4/5 flex flex-col">
          {/* 固定地图区域 */}
          <div className={year === 'Total' ? 'map-container' : 'sticky-map-container'}>
            <RunMap
              title={title}
              viewState={viewState}
              geoData={geoData}
              setViewState={setViewState}
              changeYear={changeYear}
              thisYear={year}
            />
          </div>
          
          {/* 可滚动内容区域 */}
          <div className="content-container" id="run-table-container">
            {year === 'Total' ? (
              <SVGStat />
            ) : (
              <RunTable
                runs={runs}
                locateActivity={locateActivity}
                setActivity={setActivity}
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
      {import.meta.env.VERCEL && <Analytics /> }
    </Layout>
  );
};

export default Index;
