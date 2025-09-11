import { useEffect, useState, useRef, useLayoutEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import Layout from '@/components/Layout';
import LocationStat from '@/components/LocationStat';
import RunMap from '@/components/RunMap';
import RunTable from '@/components/RunTable';
import SVGStat from '@/components/SVGStat';
import YearsStat from '@/components/YearsStat';
import useActivities from '@/hooks/useActivities';
import useSiteMetadata from '@/hooks/useSiteMetadata';
import { IS_CHINESE } from '@/utils/const';
import '@/styles/stickyMap.css';
import '@/styles/stickyHeader.css';
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

    if ((viewState.zoom ?? 0) > 3 && bounds) {
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
    setViewState({
      ...bounds,
    });
  }, [geoData]);

  // 确保标题与当前选中的年份同步
  useEffect(() => {
    if (!title.includes(year) && !title.includes('Run:')) {
      setTitle(`${year} Year Heatmap`);
    }
  }, [year, title]);
  
  // 处理表头固定在地图下方
  useLayoutEffect(() => {
    // 只在年份不是Total时处理表头固定
    if (year !== 'Total') {
      // 获取必要的DOM元素
      const tableHeader = document.getElementById('run-table-header');
      const mapContainer = document.querySelector('.sticky-map-container');
      const navBar = document.querySelector('nav');
      
      if (!tableHeader || !mapContainer || !navBar) return;
      
      // 计算导航栏高度
      const navHeight = navBar.offsetHeight;
      
      // 同步表头列宽与表格列宽
      const syncColumnWidths = () => {
        const tableContainer = document.getElementById('run-table-container');
        if (!tableContainer) return;
        
        const table = tableContainer.querySelector('table');
        if (!table) return;
        
        // 获取表格中的第一行（表头行）
        const headerRow = tableHeader.querySelector('tr');
        // 获取表格中的第一个数据行
        const firstDataRow = table.querySelector('tbody tr');
        
        if (!headerRow || !firstDataRow) return;
        
        // 获取表头中的所有列
        const headerCells = headerRow.querySelectorAll('th');
        // 获取数据行中的所有列
        const dataCells = firstDataRow.querySelectorAll('td');
        
        // 确保两者数量匹配
        if (headerCells.length !== dataCells.length) return;
        
        // 同步每一列的宽度
        for (let i = 0; i < headerCells.length; i++) {
          const width = dataCells[i].offsetWidth;
          (headerCells[i] as HTMLElement).style.width = `${width}px`;
          (headerCells[i] as HTMLElement).style.minWidth = `${width}px`;
          (headerCells[i] as HTMLElement).style.maxWidth = `${width}px`;
        }
      };
      
      // 处理滚动事件
      const handleScroll = () => {
        const mapRect = mapContainer.getBoundingClientRect();
        const tableContainer = document.getElementById('run-table-container');
        
        if (!tableContainer) return;
        
        // 获取表格容器的位置和尺寸信息
        const tableRect = tableContainer.getBoundingClientRect();
        const tableLeft = tableRect.left;
        const tableWidth = tableContainer.querySelector('table')?.offsetWidth || tableRect.width;
        
        // 同步列宽
        syncColumnWidths();
        
        // 如果地图底部已经滚动到导航栏下方或更上方
        if (mapRect.bottom <= navHeight) {
          // 固定表头在导航栏下方
          tableHeader.style.position = 'fixed';
          tableHeader.style.top = `${navHeight}px`;
          tableHeader.style.left = `${tableLeft}px`;
          tableHeader.style.width = `${tableWidth}px`;
          tableHeader.style.zIndex = '5';
          tableHeader.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
          
          // 添加padding-top到表格容器，防止内容跳动
          const headerHeight = tableHeader.offsetHeight;
          if (!tableContainer.style.paddingTop) {
            tableContainer.style.paddingTop = `${headerHeight}px`;
          }
        } 
        // 如果地图底部在视口中
        else if (mapRect.bottom > navHeight) {
          // 固定表头在地图底部
          tableHeader.style.position = 'fixed';
          tableHeader.style.top = `${mapRect.bottom}px`;
          tableHeader.style.left = `${tableLeft}px`;
          tableHeader.style.width = `${tableWidth}px`;
          tableHeader.style.zIndex = '5';
          tableHeader.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
          
          // 添加padding-top到表格容器，防止内容跳动
          const headerHeight = tableHeader.offsetHeight;
          if (!tableContainer.style.paddingTop) {
            tableContainer.style.paddingTop = `${headerHeight}px`;
          }
        }
      };
      
      // 添加滚动事件监听
      window.addEventListener('scroll', handleScroll);
      // 添加窗口大小变化监听
      window.addEventListener('resize', handleScroll);
      
      // 初始调用一次确保正确状态
      setTimeout(() => {
        syncColumnWidths();
        handleScroll();
      }, 300); // 延迟确保DOM已完全渲染
      
      // 监听表格容器的变化（如果有的话）
      const resizeObserver = new ResizeObserver(() => {
        syncColumnWidths();
        handleScroll();
      });
      
      const tableContainer = document.getElementById('run-table-container');
      if (tableContainer) {
        resizeObserver.observe(tableContainer);
      }
      
      // 清理函数
      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleScroll);
        
        // 断开ResizeObserver连接
        const tableContainer = document.getElementById('run-table-container');
        if (tableContainer) {
          resizeObserver.unobserve(tableContainer);
        }
        resizeObserver.disconnect();
        
        // 恢复表头和表格容器样式
        if (tableHeader) {
          tableHeader.style.position = '';
          tableHeader.style.top = '';
          tableHeader.style.left = '';
          tableHeader.style.width = '';
          tableHeader.style.zIndex = '';
          tableHeader.style.boxShadow = '';
          
          // 清除列宽样式
          const headerCells = tableHeader.querySelectorAll('th');
          headerCells.forEach((cell) => {
            (cell as HTMLElement).style.width = '';
            (cell as HTMLElement).style.minWidth = '';
            (cell as HTMLElement).style.maxWidth = '';
          });
        }
        
        if (tableContainer) {
          tableContainer.style.paddingTop = '';
        }
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
          {(viewState.zoom ?? 0) <= 3 && IS_CHINESE ? (
            <LocationStat
              changeYear={changeYear}
              changeCity={changeCity}
              changeType={changeType}
              onClickTypeInYear={changeTypeInYear}
            />
          ) : (
            <YearsStat year={year} onClick={changeYear} onClickTypeInYear={changeTypeInYear}/>
          )}
        </div>
        
        {/* 右侧内容区 */}
        <div className="w-full lg:w-4/5 flex flex-col">
          {/* 固定地图区域 */}
          <div className="sticky-map-container">
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
      {/* Enable Audiences in Vercel Analytics: https://vercel.com/docs/concepts/analytics/audiences/quickstart */}
      {import.meta.env.VERCEL && <Analytics /> }
    </Layout>
  );
};

export default Index;
