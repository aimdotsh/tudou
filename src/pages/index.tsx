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
  const { siteTitle } = useSiteMetadata();
  const { activities, thisYear } = useActivities();
  const [year, setYear] = useState(thisYear);
  const [runIndex, setRunIndex] = useState(-1);
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


  const locateActivity = (runIds: RunIds) => {
    const ids = new Set(runIds);

    const selectedRuns = !runIds.length
      ? runs
      : runs.filter((r: any) => ids.has(r.run_id));

    if (!selectedRuns.length) {
      return;
    }

    const lastRun = selectedRuns.sort(sortDateFunc)[0];

    if (!lastRun) {
      return;
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
  }, [runs]);

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
            <div className="w-full pb-16 lg:w-full lg:pr-16">
              <section className="pb-0">
                <p className="leading-relaxed">
                  这里记录了我的运动轨迹和数据统计。
                  <br />
                  每一次运动都是对自己的挑战和突破。
                  <br />
                  <br />
                  Yesterday you said tomorrow.
                </p>
              </section>
              <hr color="red" />
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
          ) : (viewState.zoom ?? 0) <= 3 && IS_CHINESE ? (
            <div>
              {/* 显示当年新增地点 */}
              {locationStats.yearlyNewLocations[year] && (
                <div className="mb-4 cursor-pointer pr-4 border-r border-transparent">
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
                      <div className="text-sm ml-4 leading-relaxed" style={{color: '#20B2AA'}}>
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
                          
                          return formattedItems.length > 0 ? formattedItems.join('、') : '暂无新增地点';
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
              />
            </div>
          ) : (
            <div>
              {/* 显示当年新增地点 */}
              {locationStats.yearlyNewLocations[year] && (
                <div className="mb-4 cursor-pointer pr-4 border-r border-transparent">
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
                      <div className="text-sm ml-4 leading-relaxed" style={{color: '#20B2AA'}}>
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
                          
                          return formattedItems.length > 0 ? formattedItems.join('、') : '暂无新增地点';
                        })()}
                      </div>
                    </div>
                  </section>
                  <hr color="red" />
                </div>
              )}
              <YearsStat year={year} onClick={changeYear} onClickTypeInYear={changeTypeInYear}/>
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
