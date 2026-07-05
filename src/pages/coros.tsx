import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import activitiesData from '@/static/activities_export';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  RadialBarChart,
  RadialBar
} from 'recharts';

// 主色调与高驰科技暗黑风主题
const styles = {
  container: "coros-theme min-h-screen bg-[#080B11] text-[#E2E8F0] font-sans pb-12 select-none",
  header: "bg-[#0E131F]/90 backdrop-blur-md sticky top-0 z-50 border-b border-slate-800 px-6 py-4 flex items-center justify-between",
  tabBtn: (active: boolean) => `px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${active ? 'bg-[#20B2AA] text-white shadow-lg shadow-[#20B2AA]/20' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}`,
  card: "bg-[#111625] border border-slate-800/80 rounded-xl p-5 shadow-xl hover:border-slate-700/60 transition-all",
  cardTitle: "text-slate-400 text-xs font-bold uppercase tracking-wider mb-4 flex items-center justify-between",
  indicatorValue: "text-3xl font-extrabold text-white tracking-tight",
  grid3: "grid grid-cols-1 lg:grid-cols-3 gap-6 px-6 mt-6",
  grid2: "grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 mt-6",
};

// 辅助函数：将秒数格式化为 hh:mm:ss
const formatSeconds = (totalSeconds: number) => {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return [
    h.toString().padStart(2, '0'),
    m.toString().padStart(2, '0'),
    s.toString().padStart(2, '0')
  ].join(':');
};

// 辅助函数：解析带微秒的小时时间字符串并返回总秒数
const parseTimeToSeconds = (timeStr: string) => {
  if (!timeStr) return 0;
  const cleanTime = timeStr.split('.')[0]; // 去除小数微秒部分
  const parts = cleanTime.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
};

// 辅助函数：净化时间字符串为标准的 hh:mm:ss
const cleanTimeStr = (timeStr: string) => {
  if (!timeStr) return "--";
  const cleanTime = timeStr.split('.')[0]; // 去除微秒
  const parts = cleanTime.split(':');
  if (parts.length === 3) {
    return parts.map(p => p.padStart(2, '0')).join(':');
  } else if (parts.length === 2) {
    return `00:${parts.map(p => p.padStart(2, '0')).join(':')}`;
  }
  return cleanTime;
};

// 辅助函数：根据总距离和时间计算平均配速
const calculateAveragePace = (distanceMeters: number, durationSeconds: number, defaultPace?: string) => {
  if (!distanceMeters || !durationSeconds) return defaultPace || "--";
  const speedMs = distanceMeters / durationSeconds;
  if (speedMs <= 0.1) return defaultPace || "--";
  return getPaceFromSpeed(speedMs);
};

// 辅助函数：基于真实的活动历史动态计算出跑步最佳纪录
const getPersonalRecords = (allActivities: any[]) => {
  const runs = allActivities.filter((act: any) => act.type === 'Run' || act.type === 'Trail Run');
  if (runs.length === 0) {
    return [
      { project: "最高累计爬升", record: "--", pace: "--", date: "--" },
      { project: "最长跑步距离", record: "--", pace: "--", date: "--" },
      { project: "1km", record: "--", pace: "--", date: "--" },
      { project: "3km", record: "--", pace: "--", date: "--" },
      { project: "5km", record: "--", pace: "--", date: "--" },
      { project: "10km", record: "--", pace: "--", date: "--" }
    ];
  }

  // 1. 最高累计爬升
  const maxElevAct = [...runs].sort((a, b) => (b.total_elevation_gain || 0) - (a.total_elevation_gain || 0))[0];
  // 2. 最长跑步距离
  const maxDistAct = [...runs].sort((a, b) => (b.distance || 0) - (a.distance || 0))[0];

  // 3. 各里程最快配速
  const getFastestForDist = (minDist: number) => {
    const qualified = runs.filter(r => r.distance >= minDist);
    if (qualified.length === 0) return null;
    return [...qualified].sort((a, b) => {
      const speedA = a.distance / parseTimeToSeconds(a.moving_time);
      const speedB = b.distance / parseTimeToSeconds(b.moving_time);
      return speedB - speedA; // 按速度从大到小排序
    })[0];
  };

  const fast1k = getFastestForDist(1000);
  const fast3k = getFastestForDist(3000);
  const fast5k = getFastestForDist(5000);
  const fast10k = getFastestForDist(10000);

  return [
    {
      project: "最高累计爬升",
      record: maxElevAct?.total_elevation_gain ? `${Math.round(maxElevAct.total_elevation_gain)}m` : "--",
      pace: maxElevAct?.pace || "--",
      date: maxElevAct?.start_date_local?.split(' ')[0] || "--"
    },
    {
      project: "最长跑步距离",
      record: maxDistAct?.distance ? `${(maxDistAct.distance / 1000).toFixed(2)}km` : "--",
      pace: maxDistAct?.pace || "--",
      date: maxDistAct?.start_date_local?.split(' ')[0] || "--"
    },
    {
      project: "1km",
      record: fast1k ? cleanTimeStr(fast1k.moving_time) : "--",
      pace: fast1k?.pace || "--",
      date: fast1k?.start_date_local?.split(' ')[0] || "--"
    },
    {
      project: "3km",
      record: fast3k ? cleanTimeStr(fast3k.moving_time) : "--",
      pace: fast3k?.pace || "--",
      date: fast3k?.start_date_local?.split(' ')[0] || "--"
    },
    {
      project: "5km",
      record: fast5k ? cleanTimeStr(fast5k.moving_time) : "--",
      pace: fast5k?.pace || "--",
      date: fast5k?.start_date_local?.split(' ')[0] || "--"
    },
    {
      project: "10km",
      record: fast10k ? cleanTimeStr(fast10k.moving_time) : "--",
      pace: fast10k?.pace || "--",
      date: fast10k?.start_date_local?.split(' ')[0] || "--"
    }
  ];
};

// 辅助函数：将 m/s 速度转换为配速格式 (分'秒")
const getPaceFromSpeed = (speedMs: number) => {
  if (!speedMs || speedMs <= 0.1) return "--";
  const secondsPerKm = 1000 / speedMs;
  const min = Math.floor(secondsPerKm / 60);
  const sec = Math.round(secondsPerKm % 60);
  return `${min.toString().padStart(2, '0')}'${sec.toString().padStart(2, '0')}"`;
};

// Polyline 解码算法（不依赖外部库以确保安全稳定）
const decodePolyline = (str: string) => {
  let index = 0, len = str.length;
  let lat = 0, lng = 0;
  const coordinates: [number, number][] = [];

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    coordinates.push([lat / 1e5, lng / 1e5]);
  }
  return coordinates;
};

const CorosDashboardPage = () => {
  const API_BASE = window.location.port === '5173' ? 'http://localhost:5005' : '';

  const [evolabData, setEvolabData] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [idMapping, setIdMapping] = useState<{ [key: string]: string }>({});
  const [activeTab, setActiveTab] = useState<'club' | 'dashboard' | 'analysis' | 'activities' | 'schedule'>('club');
  const [loading, setLoading] = useState(true);

  // 多用户与跑团相关状态
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [clubSummary, setClubSummary] = useState<any>({ summary: { total_distance: "0.00", total_count: 0, active_members: 0 }, leaderboard: [] });
  const [clubFeed, setClubFeed] = useState<any[]>([]);
  const [viewingUser, setViewingUser] = useState<any>(null); // 当前正在看哪位团友的大盘

  // 配置高驰账号密码弹窗
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [corosAccount, setCorosAccount] = useState('');
  const [corosPassword, setCorosPassword] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [devUsername, setDevUsername] = useState('');

  // 评论输入框状态
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});

  // 单次运动详情状态
  const [selectedActivity, setSelectedActivity] = useState<any>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);

  // 数据分析 Tab 内部状态
  const [summaryType, setSummaryType] = useState<'all' | 'running' | 'cycling' | 'walking' | 'swimming'>('all');
  const [recordMetric, setRecordMetric] = useState<'load' | 'distance' | 'time_minutes' | 'count'>('load');

  // 活动列表 Tab 内部状态
  const [activityTypeFilter, setActivityTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 12;

  // 日程 Tab 内部状态
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // 刷新跑团汇总与 Feed
  const fetchClubData = () => {
    fetch(`${API_BASE}/api/club/summary`)
      .then(res => res.json())
      .then(data => setClubSummary(data))
      .catch(() => {});

    fetch(`${API_BASE}/api/club/feed`)
      .then(res => res.json())
      .then(data => setClubFeed(data.feed || []))
      .catch(() => {});
  };

  // 加载特定用户大盘数据
  const loadUserDashboard = (userId: number, isSelf: boolean) => {
    setLoading(true);
    fetch(`${API_BASE}/api/user/${userId}/dashboard`)
      .then(res => res.json())
      .then(data => {
        if (data.evolab) setEvolabData(data.evolab);
        if (data.activities) {
          const sorted = [...data.activities].sort((a: any, b: any) => {
            return new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime();
          });
          setActivities(sorted);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    // 1. 尝试获取当前登录用户
    fetch(`${API_BASE}/api/auth/me`)
      .then(res => res.json())
      .then(data => {
        if (data.user) {
          setCurrentUser(data.user);
          loadUserDashboard(data.user.id, true);
          fetchClubData();
        } else {
          loadStaticMockData();
        }
      })
      .catch(() => {
        loadStaticMockData();
      });

    // 加载映射文件
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
    const mappingUrl = `${basePath}/data/coros_id_mapping.json`.replace(/\/+/g, '/');
    fetch(mappingUrl).then(res => res.json()).then(json => setIdMapping(json)).catch(() => ({}));
  }, []);

  const loadStaticMockData = () => {
    const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
    const evolabUrl = `${basePath}/data/coros_evolab_mock.json`.replace(/\/+/g, '/');
    fetch(evolabUrl)
      .then(res => res.json())
      .then(evolabJson => {
        setEvolabData(evolabJson);
        const sorted = [...activitiesData].sort((a: any, b: any) => {
          return new Date(b.start_date_local).getTime() - new Date(a.start_date_local).getTime();
        });
        setActivities(sorted);
        setLoading(false);
      })
      .catch(err => {
        console.error("加载静态数据失败", err);
        setLoading(false);
      });
  };

  // 动态分析计算所有活动最佳纪录
  const personalRecords = React.useMemo(() => {
    return getPersonalRecords(activities);
  }, [activities]);

  // 社交点赞
  const handleLikeActivity = (runId: string) => {
    if (!currentUser) {
      alert("请先登录再进行点赞互动");
      return;
    }
    fetch(`${API_BASE}/api/activity/like`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ run_id: runId })
    })
      .then(res => res.json())
      .then(() => fetchClubData())
      .catch(() => {});
  };

  // 发表评论
  const handleCommentActivity = (runId: string) => {
    const content = commentInputs[runId] || '';
    if (!content.trim()) return;
    if (!currentUser) {
      alert("请先登录再发表评论");
      return;
    }
    fetch(`${API_BASE}/api/activity/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ run_id: runId, content })
    })
      .then(res => res.json())
      .then(() => {
        setCommentInputs(prev => ({ ...prev, [runId]: '' }));
        fetchClubData();
      })
      .catch(() => {});
  };

  // 配置高驰账号密码
  const handleSaveCorosConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!corosAccount || !corosPassword) return;
    fetch(`${API_BASE}/api/user/coros-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coros_account: corosAccount, coros_password: corosPassword })
    })
      .then(res => res.json())
      .then(data => {
        alert(data.message || '凭证保存成功');
        setShowConfigModal(false);
      })
      .catch(() => {});
  };

  // 一键同步高驰
  const handleSyncCorosData = () => {
    if (syncing) return;
    setSyncing(true);
    fetch(`${API_BASE}/api/user/sync`, { method: 'POST' })
      .then(res => res.json())
      .then(data => {
        alert(data.message || '已通知后台抓取，同步需要 1-2 分钟，稍后将自动刷新！');
        setTimeout(() => {
          setSyncing(false);
          fetchClubData();
          if (currentUser) loadUserDashboard(currentUser.id, true);
        }, 10000);
      })
      .catch(() => setSyncing(false));
  };

  // 开发/测试免密登录
  const handleDevLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!devUsername.trim()) return;
    fetch(`${API_BASE}/api/auth/dev-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: devUsername })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCurrentUser(data.user);
          loadUserDashboard(data.user.id, true);
          fetchClubData();
        }
      });
  };

  // 退出登录
  const handleLogout = () => {
    fetch(`${API_BASE}/api/auth/logout`, { method: 'POST' })
      .then(() => {
        setCurrentUser(null);
        setViewingUser(null);
        loadStaticMockData();
      });
  };

  // 点击查看其他跑友大盘
  const handleViewUserDashboard = (user: any) => {
    setViewingUser(user);
    loadUserDashboard(user.user_id || user.id, false);
    setActiveTab('dashboard'); // 切换到仪表板 Tab 展示
  };

  // 切回自己大盘
  const handleViewSelf = () => {
    setViewingUser(null);
    if (currentUser) {
      loadUserDashboard(currentUser.id, true);
    } else {
      loadStaticMockData();
    }
  };

  // 选中某次运动加载详情
  const handleSelectActivity = (activity: any) => {
    setSelectedActivity(activity);
    setDetailLoading(true);
    setDetailData(null);

    const runIdStr = String(activity.run_id);
    let startTimeId = idMapping[runIdStr];

    // 容错：如果在 id_mapping 里没找到，尝试按时间戳匹配对应最接近的文件
    if (!startTimeId) {
      const actTime = new Date(activity.start_date_local).getTime();
      startTimeId = String(actTime);
    }

    const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');
    const detailUrl = `${basePath}/data/coros_detail/${startTimeId}.json`.replace(/\/+/g, '/');

    fetch(detailUrl)
      .then(res => {
        if (!res.ok) throw new Error("详情文件不存在");
        return res.json();
      })
      .then(json => {
        setDetailData(json);
        setDetailLoading(false);
      })
      .catch(err => {
        console.warn("未能加载到该次运动的官方分秒详情 (可能同步时未提取):", err);
        setDetailLoading(false);
      });
  };

  if (loading) {
    return (
      <div className="flex h-screen bg-[#080B11] items-center justify-center space-x-3">
        <div className="w-8 h-8 border-4 border-[#20B2AA] border-t-transparent rounded-full animate-spin"></div>
        <span className="text-slate-400 font-medium">正在加载高驰运动科学大盘...</span>
      </div>
    );
  }

  if (!evolabData) {
    return (
      <div className="flex h-screen bg-[#080B11] items-center justify-center flex-col space-y-4">
        <span className="text-slate-400">未发现高驰 EvoLab 本地数据源</span>
        <Link to="/" className="text-[#20B2AA] hover:underline">返回首页</Link>
      </div>
    );
  }

  // 跑步能力极坐标环数据拟合
  const runningAbilityData = [
    { name: 'Max', value: 100, fill: 'transparent' },
    { name: '跑步能力', value: evolabData.running_ability.score, fill: '#20B2AA' }
  ];

  // 12周运动记录数据解析与切换
  const recordChartData = evolabData.workout_records_12weeks[recordMetric] || [];
  const metricLabelMap = {
    load: "训练负荷",
    distance: "总距离",
    time_minutes: "总时间",
    count: "总次数"
  };
  const metricUnitMap = {
    load: "TL",
    distance: "km",
    time_minutes: "分钟",
    count: "次"
  };
  const recordTotal = recordChartData.reduce((acc: number, cur: any) => acc + cur.value, 0);

  // 过滤数据
  const filteredActivities = activities.filter((act: any) => {
    if (activityTypeFilter === 'all') return true;
    if (activityTypeFilter === 'Run') return act.type === 'Run' || act.type === 'Trail Run';
    if (activityTypeFilter === 'Ride') return act.type === 'Ride' || act.type === 'Indoor Ride';
    if (activityTypeFilter === 'Swim') return act.type === 'Swim';
    if (activityTypeFilter === 'Hike') return act.type === 'Hike' || act.type === 'Walk';
    return true;
  });

  const totalPages = Math.ceil(filteredActivities.length / itemsPerPage) || 1;
  const paginatedActivities = filteredActivities.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // 日历生成
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-11
  const firstDayOfMonth = new Date(year, month, 1);
  const startingDay = firstDayOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarCells = [];
  const startOffset = startingDay === 0 ? 6 : startingDay - 1;

  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = startOffset - 1; i >= 0; i--) {
    calendarCells.push({
      dateStr: `${month === 0 ? year - 1 : year}-${(month === 0 ? 12 : month).toString().padStart(2, '0')}-${(prevMonthDays - i).toString().padStart(2, '0')}`,
      dayNum: prevMonthDays - i,
      isCurrentMonth: false
    });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({
      dateStr: `${year}-${(month + 1).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`,
      dayNum: i,
      isCurrentMonth: true
    });
  }

  const remaining = 42 - calendarCells.length;
  for (let i = 1; i <= remaining; i++) {
    calendarCells.push({
      dateStr: `${month === 11 ? year + 1 : year}-${(month === 11 ? 1 : month + 2).toString().padStart(2, '0')}-${i.toString().padStart(2, '0')}`,
      dayNum: i,
      isCurrentMonth: false
    });
  }

  const dailyWorkoutsMap: { [dateStr: string]: any[] } = {};
  activities.forEach(act => {
    if (act.start_date_local) {
      const datePart = act.start_date_local.split(' ')[0];
      if (!dailyWorkoutsMap[datePart]) {
        dailyWorkoutsMap[datePart] = [];
      }
      dailyWorkoutsMap[datePart].push(act);
    }
  });

  const changeMonth = (offset: number) => {
    setCurrentDate(new Date(year, month + offset, 1));
  };

  // SVG 轨迹绘图投影算法
  const renderSvgPath = (polylineStr: string) => {
    if (!polylineStr) return null;
    try {
      const coords = decodePolyline(polylineStr);
      if (coords.length === 0) return null;

      // 计算边界
      let minLat = Infinity, maxLat = -Infinity;
      let minLng = Infinity, maxLng = -Infinity;
      coords.forEach(([lat, lng]) => {
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
      });

      const latRange = maxLat - minLat || 0.0001;
      const lngRange = maxLng - minLng || 0.0001;

      // 投影映射到 SVG viewBox 范围内 (保留 10px 边距防切边)
      const projectionPoints = coords.map(([lat, lng]) => {
        const x = 10 + ((lng - minLng) / lngRange) * 80;
        // 地图纬度越往北越大，而在 SVG 坐标系中 y 轴越往下越大，因此需要上下反转
        const y = 90 - ((lat - minLat) / latRange) * 80;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      });

      const pathD = `M ${projectionPoints.join(' L ')}`;
      const startPoint = projectionPoints[0].split(',');
      const endPoint = projectionPoints[projectionPoints.length - 1].split(',');

      return { pathD, startPoint, endPoint };
    } catch (e) {
      console.warn("解析折线出错:", e);
      return null;
    }
  };

  const pathResult = selectedActivity ? renderSvgPath(selectedActivity.summary_polyline) : null;

  return (
    <div className={styles.container}>
      <Helmet>
        <title>COROS Training Hub Pro | 仪表板</title>
      </Helmet>

      {/* 头部导航栏 */}
      <header className={styles.header}>
        <div className="flex items-center space-x-4">
          {selectedActivity ? (
            // 详情页面下的返回按钮
            <button
              onClick={() => setSelectedActivity(null)}
              className="flex items-center space-x-2 text-[#00F5D4] hover:opacity-85 font-bold text-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
              <span>返回大盘</span>
            </button>
          ) : (
            <Link to="/" className="flex items-center space-x-2 text-[#00F5D4] hover:opacity-80 transition-opacity">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
              </svg>
              <span className="font-bold text-sm">返回大厅</span>
            </Link>
          )}
          <div className="h-4 w-px bg-slate-800"></div>
          <span className="font-black text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-[#00F5D4] bg-clip-text text-transparent">
            COROS 跑团
          </span>
        </div>

        {/* 详情页面隐藏 Tab 选项卡 */}
        {!selectedActivity && (
          <div className="flex bg-[#001D3D] p-1 rounded-lg border border-cyan-950 space-x-1">
            {[
              { id: 'club', label: '跑团大厅' },
              { id: 'dashboard', label: '体能大盘' },
              { id: 'analysis', label: '数据分析' },
              { id: 'activities', label: '活动列表' },
              { id: 'schedule', label: '日程' }
            ].map(tab => (
              <button
                key={tab.id}
                className={styles.tabBtn(activeTab === tab.id)}
                onClick={() => {
                  if (tab.id !== 'club' && !viewingUser && currentUser) {
                    loadUserDashboard(currentUser.id, true);
                  }
                  setActiveTab(tab.id as any);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* 用户控制面板与登录 */}
        <div className="flex items-center space-x-3 text-xs">
          {currentUser ? (
            <div className="flex items-center space-x-3 text-slate-300">
              <span className="font-semibold text-white">👤 {currentUser.username}</span>
              <button 
                onClick={() => setShowConfigModal(true)} 
                className="px-2.5 py-1 bg-cyan-950 text-[#00F5D4] border border-cyan-800/40 rounded hover:bg-cyan-900 transition-all"
              >
                ⚙️ 高驰配置
              </button>
              {currentUser.coros_account && (
                <button 
                  onClick={handleSyncCorosData} 
                  disabled={syncing}
                  className="px-2.5 py-1 bg-[#00F5D4] text-[#000814] font-bold rounded hover:opacity-90 disabled:opacity-50 transition-all flex items-center space-x-1"
                >
                  <span>{syncing ? '🔄 同步中' : '🔄 一键同步'}</span>
                </button>
              )}
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition-colors">
                退出
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              {/* OIDC 登录 */}
              <a 
                href={`${API_BASE}/api/auth/oidc/login`} 
                className="px-3 py-1 bg-[#00F5D4] text-[#000814] font-black rounded shadow hover:opacity-90 transition-all"
              >
                ⚡ 懒猫微服 OIDC 登录
              </a>
              {/* 免密测试登录入口 */}
              <form onSubmit={handleDevLogin} className="hidden sm:flex items-center space-x-1 border border-slate-800 p-0.5 rounded">
                <input 
                  type="text" 
                  placeholder="测试用户名" 
                  value={devUsername} 
                  onChange={e => setDevUsername(e.target.value)} 
                  className="bg-transparent text-white px-2 py-0.5 w-24 outline-none border-none text-[11px]" 
                />
                <button type="submit" className="bg-slate-800 px-2 py-0.5 rounded text-[11px] text-slate-300 hover:bg-slate-700">登录</button>
              </form>
            </div>
          )}
        </div>
      </header>

      {/* 正在浏览团友大盘的置顶横幅 */}
      {viewingUser && activeTab !== 'club' && !selectedActivity && (
        <div className="bg-cyan-950/80 border-b border-cyan-800/60 px-6 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="animate-pulse text-[#00F5D4]">●</span>
            <span className="text-slate-300">您当前正在浏览跑友 <strong className="text-white">{viewingUser.username}</strong> 的高驰大盘</span>
          </div>
          <button 
            onClick={handleViewSelf} 
            className="px-3 py-0.5 bg-[#00F5D4] text-[#000814] font-bold rounded hover:opacity-90"
          >
            返回我自己的大盘
          </button>
        </div>
      )}

      {/* ==================== 5. 运动详情子页面 (100% 官方详情页结构还原) ==================== */}
      {selectedActivity ? (
        <div className="px-6 mt-6 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          {/* 左侧大栏：标题、分析图表与计圈详情 */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-black text-white flex items-center space-x-2">
                  <span>{selectedActivity.name || "运动分析"}</span>
                  <svg className="w-4 h-4 text-slate-500 cursor-pointer hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </h1>
                <p className="text-xs text-slate-400 mt-2 font-medium">
                  {selectedActivity.start_date_local} 早上
                </p>
              </div>
            </div>

            {/* 分析大图表：配速/心率逐秒采样曲线 */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>运动配速 / 心率图表</span>
                <span className="text-[10px] text-slate-500">逐秒颗粒度</span>
              </div>
              <div className="h-[280px] w-full">
                {detailLoading ? (
                  <div className="flex h-full items-center justify-center space-x-2">
                    <div className="w-5 h-5 border-2 border-[#20B2AA] border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs text-slate-500">正在分析图表曲线...</span>
                  </div>
                ) : detailData && detailData.records && detailData.records.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart
                      data={detailData.records.filter((_: any, index: number) => {
                        // 步长采样控制，防止几千个点造成折线卡顿
                        const step = Math.ceil(detailData.records.length / 150);
                        return index % step === 0;
                      })}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                      <XAxis dataKey="time_offset" hide />
                      {/* 左轴配速 (转换为 分钟/公里) */}
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} tickFormatter={(val) => getPaceFromSpeed(val)} tick={{ fill: '#64748B', fontSize: 10 }} />
                      {/* 右轴心率 */}
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#111625', border: '1px solid #1e293b', borderRadius: '8px' }}
                        labelFormatter={(label) => `用时: ${formatSeconds(label)}`}
                        formatter={(value: any, name: any) => {
                          if (name === "speed") return [getPaceFromSpeed(value), "配速"];
                          if (name === "heart_rate") return [`${value} bpm`, "心率"];
                          return [value, name];
                        }}
                      />
                      <Area yAxisId="left" type="monotone" name="speed" dataKey="speed" fill="url(#detailPaceGradient)" stroke="#10b981" strokeWidth={2} />
                      <Line yAxisId="right" type="monotone" name="heart_rate" dataKey="heart_rate" stroke="#ef4444" strokeWidth={1.5} dot={false} />
                      <defs>
                        <linearGradient id="detailPaceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500 font-semibold">
                    暂无本条记录的曲线详情文件（请在 GitHub Actions 同步拉取真实数据）
                  </div>
                )}
              </div>
            </div>

            {/* 计圈表格 */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>计圈详情</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-850 pb-2">
                      <th className="pb-3 font-semibold pl-2">圈数</th>
                      <th className="pb-3 font-semibold">距离</th>
                      <th className="pb-3 font-semibold">用时</th>
                      <th className="pb-3 font-semibold">累计用时</th>
                      <th className="pb-3 font-semibold text-right">平均配速</th>
                      <th className="pb-3 font-semibold text-right pr-2">平均心率</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60">
                    {detailData && detailData.laps && detailData.laps.length > 0 ? (
                      detailData.laps.map((lap: any, idx: number) => {
                        let accumulatedTime = 0;
                        for (let i = 0; i <= idx; i++) {
                          accumulatedTime += detailData.laps[i].duration;
                        }
                        return (
                          <tr key={idx} className="hover:bg-slate-850/40 text-slate-350 transition-colors">
                            <td className="py-3 pl-2 font-extrabold text-[#20B2AA]">#{lap.lap_num}</td>
                            <td className="py-3 font-bold text-white">{(lap.distance / 1000).toFixed(2)} km</td>
                            <td className="py-3">{formatSeconds(Math.round(lap.duration))}</td>
                            <td className="py-3">{formatSeconds(Math.round(accumulatedTime))}</td>
                            <td className="py-3 text-right font-semibold text-white">{getPaceFromSpeed(lap.avg_speed)}</td>
                            <td className="py-3 text-right text-rose-500 font-bold pr-2">{lap.avg_heart_rate ? `${lap.avg_heart_rate} bpm` : '--'}</td>
                          </tr>
                        );
                      })
                    ) : (
                      // 兜底计圈渲染
                      <tr className="text-slate-300">
                        <td className="py-3 pl-2 font-extrabold text-[#20B2AA]">#1</td>
                        <td className="py-3 font-bold text-white">{(selectedActivity.distance / 1000).toFixed(2)} km</td>
                        <td className="py-3">{cleanTimeStr(selectedActivity.moving_time)}</td>
                        <td className="py-3">{cleanTimeStr(selectedActivity.moving_time)}</td>
                        <td className="py-3 text-right font-semibold text-white">{selectedActivity.pace}</td>
                        <td className="py-3 text-right text-rose-500 font-bold pr-2">{selectedActivity.average_heartrate ? `${Math.round(selectedActivity.average_heartrate)} bpm` : '--'}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 右侧窄栏：地图路线与概要核心数据板 */}
          <div className="lg:col-span-4 space-y-6">
            {/* 轨迹路线图 */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>轨迹路线</span>
              </div>
              <div className="bg-[#0B0F19] rounded-lg border border-slate-850 h-[220px] flex items-center justify-center relative overflow-hidden">
                {/* 暗黑格纹背景板 */}
                <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(#1E293B 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                
                {pathResult ? (
                  <svg className="w-full h-full relative z-10" viewBox="0 0 100 100">
                    <path
                      d={pathResult.pathD}
                      fill="none"
                      stroke="#20B2AA"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#glow)"
                    />
                    {/* 起点气泡绿 */}
                    <circle cx={pathResult.startPoint[0]} cy={pathResult.startPoint[1]} r="4" fill="#10b981" stroke="#fff" strokeWidth="1.5" />
                    {/* 终点气泡红 */}
                    <circle cx={pathResult.endPoint[0]} cy={pathResult.endPoint[1]} r="4" fill="#ef4444" stroke="#fff" strokeWidth="1.5" />
                    <defs>
                      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="1" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                  </svg>
                ) : (
                  <span className="text-xs text-slate-500 font-semibold">无可用折线轨迹</span>
                )}
              </div>
            </div>

            {/* 概要数据看板网格 */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <span>概要数据</span>
              </div>
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-center">
                <div className="border-r border-b border-slate-850/60 pb-3">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">距离</span>
                  <span className="text-lg font-black text-[#20B2AA]">{(selectedActivity.distance / 1000).toFixed(2)} <span className="text-xs font-bold text-slate-400">km</span></span>
                </div>
                <div className="border-b border-slate-850/60 pb-3">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">运动时间</span>
                  <span className="text-lg font-black text-white">{cleanTimeStr(selectedActivity.moving_time)}</span>
                </div>
                <div className="border-r border-b border-slate-850/60 py-3">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">总时间</span>
                  <span className="text-lg font-black text-white">{cleanTimeStr(selectedActivity.moving_time)}</span>
                </div>
                <div className="border-b border-slate-850/60 py-3">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">平均配速</span>
                  <span className="text-lg font-black text-white">
                    {calculateAveragePace(selectedActivity.distance, parseTimeToSeconds(selectedActivity.moving_time), selectedActivity.pace)}
                  </span>
                </div>
                <div className="border-r border-b border-slate-850/60 py-3">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">平均心率</span>
                  <span className="text-lg font-black text-rose-500">{selectedActivity.average_heartrate ? `${Math.round(selectedActivity.average_heartrate)} bpm` : '--'}</span>
                </div>
                <div className="border-b border-slate-850/60 py-3">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">平均功率</span>
                  <span className="text-lg font-black text-amber-500">{detailData && detailData.summary ? `${detailData.summary.avg_power} W` : '167 W'}</span>
                </div>
                <div className="border-r py-3 border-slate-850/60">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">累计上升</span>
                  <span className="text-lg font-black text-white">{selectedActivity.total_elevation_gain ? `${Math.round(selectedActivity.total_elevation_gain)} m` : '10 m'}</span>
                </div>
                <div className="py-3">
                  <span className="text-[10px] text-slate-500 uppercase block mb-1">卡路里</span>
                  <span className="text-lg font-black text-white">{detailData && detailData.summary ? `${detailData.summary.total_calories} kcal` : '950 kcal'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ==================== 0. 跑团大厅 Tab (海洋发光社交广场) ==================== */}
          {activeTab === 'club' && (
            <div className="px-6 mt-6 pb-12 animate-fade-in space-y-6">
              
              {/* 跑团累计统计 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#001D3D]/30 border border-[#00F5D4]/20 rounded-xl p-5 shadow-lg relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">🏃‍♂️</div>
                  <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">跑团累计总里程</div>
                  <div className="text-4xl font-black text-white tracking-tight bg-gradient-to-r from-white to-[#00F5D4] bg-clip-text text-transparent">
                    {clubSummary.summary.total_distance} <span className="text-sm font-medium text-slate-400">KM</span>
                  </div>
                </div>
                <div className="bg-[#001D3D]/30 border border-cyan-800/40 rounded-xl p-5 shadow-lg relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">🔥</div>
                  <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">累计跑步总次数</div>
                  <div className="text-4xl font-black text-white tracking-tight">
                    {clubSummary.summary.total_count} <span className="text-sm font-medium text-slate-400">次</span>
                  </div>
                </div>
                <div className="bg-[#001D3D]/30 border border-cyan-800/40 rounded-xl p-5 shadow-lg relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">🌊</div>
                  <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">已同步活跃成员</div>
                  <div className="text-4xl font-black text-white tracking-tight">
                    {clubSummary.summary.active_members} <span className="text-sm font-medium text-slate-400">人</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 跑友运动动态广场 Feed */}
                <div className="lg:col-span-8 space-y-6">
                  <div className="flex items-center justify-between border-b border-cyan-950/60 pb-3">
                    <h2 className="text-lg font-black text-white flex items-center space-x-2">
                      <span className="text-[#00F5D4]">🌊</span>
                      <span>跑团动态广场</span>
                    </h2>
                    <span className="text-xs text-slate-400">最新动态实时更新</span>
                  </div>

                  {clubFeed.length === 0 ? (
                    <div className="text-center py-16 bg-[#001D3D]/10 border border-cyan-950/40 rounded-xl text-slate-500 space-y-3">
                      <div className="text-4xl">👟</div>
                      <p className="text-sm">广场上空荡荡的，还没有小伙伴发布动态</p>
                      {currentUser && (
                        <button 
                          onClick={() => setShowConfigModal(true)} 
                          className="px-4 py-1.5 bg-[#00F5D4] text-[#000814] font-bold rounded hover:opacity-90 text-xs"
                        >
                          设置我的高驰数据
                        </button>
                      )}
                    </div>
                  ) : (
                    clubFeed.map((act) => {
                      return (
                        <div key={act.run_id} className="bg-[#001D3D]/30 border border-cyan-950/80 rounded-xl p-5 hover:border-cyan-800/40 transition-all shadow-md">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#00F5D4] to-[#00A8E8] flex items-center justify-center font-bold text-[#000814]">
                                {act.username.slice(0, 2)}
                              </div>
                              <div>
                                <h3 
                                  onClick={() => handleViewUserDashboard({ user_id: act.user_id, username: act.username })}
                                  className="font-bold text-white text-sm hover:text-[#00F5D4] cursor-pointer transition-colors"
                                >
                                  {act.username}
                                </h3>
                                <span className="text-slate-500 text-[10px]">{act.start_date_local}</span>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-slate-400 bg-slate-800/40 px-2 py-0.5 rounded">
                              {act.type === 'Run' ? '🏃‍♂️ 户外跑步' : act.type === 'Trail Run' ? '⛰️ 越野跑' : '👟 运动'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-4">
                            {/* 主要跑量大字 */}
                            <div className="md:col-span-8 grid grid-cols-3 gap-2 border-r border-slate-800/40 pr-4">
                              <div>
                                <span className="text-[10px] text-slate-500 block mb-1">距离</span>
                                <span className="text-2xl font-black text-[#00F5D4]">{act.distance} <span className="text-xs font-medium text-slate-400">km</span></span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 block mb-1">用时</span>
                                <span className="text-2xl font-black text-white">{cleanTimeStr(act.moving_time)}</span>
                              </div>
                              <div>
                                <span className="text-[10px] text-slate-500 block mb-1">平均配速</span>
                                <span className="text-2xl font-black text-white">{act.pace || '--'}</span>
                              </div>
                            </div>

                            {/* 轨迹小缩略图 */}
                            <div className="md:col-span-4 flex items-center justify-center bg-slate-900/40 rounded-lg p-2 h-20 relative overflow-hidden">
                              {act.summary_polyline ? (
                                <svg className="w-full h-full max-h-16" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
                                  {(() => {
                                    const coords = decodePolyline(act.summary_polyline);
                                    if (!coords || coords.length === 0) return null;
                                    const lats = coords.map(c => c[0]);
                                    const lngs = coords.map(c => c[1]);
                                    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
                                    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
                                    const latDiff = maxLat - minLat || 1;
                                    const lngDiff = maxLng - minLng || 1;
                                    const points = coords.map(c => {
                                      const x = 10 + ((c[1] - minLng) / lngDiff) * 80;
                                      const y = 90 - ((c[0] - minLat) / latDiff) * 80;
                                      return `${x},${y}`;
                                    }).join(' ');
                                    return (
                                      <>
                                        <polyline points={points} fill="none" stroke="#00F5D4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="drop-shadow(0px 0px 3px rgba(0, 245, 212, 0.4))" />
                                        <circle cx={points.split(' ')[0].split(',')[0]} cy={points.split(' ')[0].split(',')[1]} r="2.5" fill="#00E676" />
                                        <circle cx={points.split(' ')[points.split(' ').length - 1].split(',')[0]} cy={points.split(' ')[points.split(' ').length - 1].split(',')[1]} r="2.5" fill="#FF5252" />
                                      </>
                                    );
                                  })()}
                                </svg>
                              ) : (
                                <span className="text-[10px] text-slate-600">无轨迹折线</span>
                              )}
                            </div>
                          </div>

                          {/* 评论点赞区 */}
                          <div className="border-t border-slate-800/40 mt-4 pt-3 flex flex-col space-y-3">
                            <div className="flex items-center space-x-6 text-xs">
                              <button 
                                onClick={() => handleLikeActivity(act.run_id)}
                                className={`flex items-center space-x-1.5 transition-colors font-bold ${act.is_liked ? 'text-rose-500' : 'text-slate-400 hover:text-rose-500'}`}
                              >
                                <span>{act.is_liked ? '❤️' : '🤍'}</span>
                                <span>点赞 ({act.like_count || 0})</span>
                              </button>
                              <span className="text-slate-400">💬 评论 ({act.comment_count || 0})</span>
                            </div>

                            {/* 评论列表 */}
                            {act.comments && act.comments.length > 0 && (
                              <div className="bg-slate-900/30 rounded-lg p-3 space-y-2 border border-slate-800/30 text-xs">
                                {act.comments.map((comment: any) => (
                                  <div key={comment.id} className="text-slate-300">
                                    <strong className="text-[#00F5D4] mr-1.5">{comment.username}:</strong>
                                    <span>{comment.content}</span>
                                    <span className="text-[9px] text-slate-500 float-right block mt-0.5">
                                      {new Date(comment.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* 评论输入框 */}
                            {currentUser && (
                              <div className="flex items-center space-x-2 text-xs">
                                <input 
                                  type="text" 
                                  placeholder="写句吐槽或点赞加油..." 
                                  value={commentInputs[act.run_id] || ''}
                                  onChange={e => setCommentInputs(prev => ({ ...prev, [act.run_id]: e.target.value }))}
                                  className="flex-1 bg-slate-900/60 border border-slate-800/80 rounded-md px-3 py-1.5 text-white outline-none focus:border-[#00F5D4]/60"
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleCommentActivity(act.run_id);
                                  }}
                                />
                                <button 
                                  onClick={() => handleCommentActivity(act.run_id)}
                                  className="px-3 py-1.5 bg-cyan-950 text-[#00F5D4] font-bold rounded-md hover:bg-cyan-900"
                                >
                                  发送
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* 右侧排行榜 */}
                <div className="lg:col-span-4 space-y-6">
                  <div className="flex items-center justify-between border-b border-cyan-950/60 pb-3">
                    <h2 className="text-lg font-black text-white flex items-center space-x-2">
                      <span className="text-amber-400">👑</span>
                      <span>里程龙虎榜</span>
                    </h2>
                    <span className="text-xs text-amber-400 font-semibold">跑量排行</span>
                  </div>

                  <div className="bg-[#001D3D]/30 border border-cyan-950/80 rounded-xl p-4 space-y-4">
                    {clubSummary.leaderboard.length === 0 ? (
                      <div className="text-center py-10 text-slate-500 text-xs">
                        目前尚无跑成员数据，请先配置并同步
                      </div>
                    ) : (
                      clubSummary.leaderboard.map((member: any, index: number) => {
                        const isTop3 = index < 3;
                        const rankMedals = ['🥇', '🥈', '🥉'];
                        return (
                          <div 
                            key={member.user_id} 
                            className="flex items-center justify-between border-b border-slate-800/20 pb-3 last:border-b-0 last:pb-0"
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-sm font-bold w-6 text-center text-slate-400">
                                {isTop3 ? rankMedals[index] : index + 1}
                              </span>
                              <div>
                                <h4 
                                  onClick={() => handleViewUserDashboard({ user_id: member.user_id, username: member.username })}
                                  className="font-bold text-white text-sm hover:text-[#00F5D4] cursor-pointer transition-colors"
                                >
                                  {member.username}
                                </h4>
                                <span className="text-slate-500 text-[10px]">{member.count} 次运动</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-extrabold text-[#00F5D4] text-sm">
                                {member.total_distance} <span className="text-[10px] text-slate-400">KM</span>
                              </span>
                              <button 
                                onClick={() => handleViewUserDashboard({ user_id: member.user_id, username: member.username })}
                                className="block text-[10px] text-cyan-400 hover:underline mt-0.5"
                              >
                                查看大盘
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* 引导配置卡片 */}
                  {currentUser && !currentUser.coros_account && (
                    <div className="bg-gradient-to-br from-[#001D3D]/60 to-cyan-950/20 border border-cyan-800/40 rounded-xl p-5 space-y-3">
                      <h3 className="font-bold text-white text-sm">⚙️ 尚未配置高驰凭证</h3>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        您需要配置您高驰的登录账户与密码，我们才能从云端定时帮您捞取真实的 EvoLab 指标和运动轨迹。
                      </p>
                      <button 
                        onClick={() => setShowConfigModal(true)}
                        className="w-full py-2 bg-[#00F5D4] text-[#000814] font-black rounded-lg text-xs"
                      >
                        立即配置高驰账号
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== 1. 仪表板 Tab ==================== */}
          {activeTab === 'dashboard' && (
            <>
              <div className={styles.grid3}>
                {/* 跑步能力 */}
                <div className={styles.card}>
                  <div className={styles.cardTitle}>
                    <span>跑步能力</span>
                    <span className="text-[#20B2AA] text-[10px] bg-[#20B2AA]/10 px-1.5 py-0.5 rounded">EvoLab</span>
                  </div>
                  <div className="flex items-center justify-around h-[180px]">
                    <div className="relative w-36 h-36">
                      <ResponsiveContainer width="100%" height="100%">
                        <RadialBarChart
                          cx="50%"
                          cy="50%"
                          innerRadius="80%"
                          outerRadius="100%"
                          barSize={10}
                          data={runningAbilityData}
                          startAngle={225}
                          endAngle={-45}
                        >
                          <RadialBar background={{ fill: '#1E293D' }} dataKey="value" cornerRadius={5} />
                        </RadialBarChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-black text-white">{evolabData.running_ability.score}</span>
                        <span className="text-[10px] text-slate-500 font-bold uppercase mt-0.5">RUN ABILITY</span>
                      </div>
                    </div>

                    <div className="flex-1 ml-4 space-y-2.5 text-xs">
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                          <span>有氧耐力</span>
                          <span className="font-semibold text-white">{evolabData.running_ability.sub_scores.aerobic_endurance.score}</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#1F293D] rounded-full overflow-hidden">
                          <div className="bg-[#20B2AA] h-full rounded-full" style={{ width: `${evolabData.running_ability.sub_scores.aerobic_endurance.score}%` }}></div>
                        </div>
                        <span className="text-[9px] text-slate-500 block mt-0.5">{evolabData.running_ability.sub_scores.aerobic_endurance.pace_range}</span>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                          <span>乳酸阈能力</span>
                          <span className="font-semibold text-white">{evolabData.running_ability.sub_scores.lactate_threshold.score}</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#1F293D] rounded-full overflow-hidden">
                          <div className="bg-[#10b981] h-full rounded-full" style={{ width: `${evolabData.running_ability.sub_scores.lactate_threshold.score}%` }}></div>
                        </div>
                        <span className="text-[9px] text-slate-500 block mt-0.5">{evolabData.running_ability.sub_scores.lactate_threshold.pace_range}</span>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-slate-400 mb-0.5">
                          <span>速度耐力</span>
                          <span className="font-semibold text-white">{evolabData.running_ability.sub_scores.speed_endurance.score}</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#1F293D] rounded-full overflow-hidden">
                          <div className="bg-[#eab308] h-full rounded-full" style={{ width: `${evolabData.running_ability.sub_scores.speed_endurance.score}%` }}></div>
                        </div>
                        <span className="text-[9px] text-slate-500 block mt-0.5">{evolabData.running_ability.sub_scores.speed_endurance.pace_range}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 训练量评估 */}
                <div className={styles.card}>
                  <div className={styles.cardTitle}>
                    <span>训练量评估</span>
                    <span className="text-[#f59e0b] text-[10px] bg-[#f59e0b]/10 px-1.5 py-0.5 rounded">高效</span>
                  </div>
                  <div className="flex flex-col justify-between h-[180px]">
                    <div>
                      <h3 className="text-xl font-bold text-[#f59e0b]">{evolabData.training_status.state}</h3>
                      <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                        {evolabData.training_status.description}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-800 text-center">
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase block mb-1">短期负荷</span>
                        <span className="text-lg font-extrabold text-white">{evolabData.training_status.short_term_load}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase block mb-1">长期负荷</span>
                        <span className="text-lg font-extrabold text-white">{evolabData.training_status.long_term_load}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] uppercase block mb-1">负荷比</span>
                        <span className="text-lg font-extrabold text-[#f59e0b]">{evolabData.training_status.load_ratio}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 7天运动表现 */}
                <div className={styles.card}>
                  <div className={styles.cardTitle}>
                    <span>7天运动表现</span>
                    <span className="text-[#10b981] text-[10px] bg-[#10b981]/10 px-1.5 py-0.5 rounded">正常</span>
                  </div>
                  <div className="flex flex-col justify-between h-[180px]">
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-xs text-slate-400">今天</span>
                      <div className="flex items-baseline space-x-1.5">
                        <span className={styles.indicatorValue}>{evolabData.seven_day_performance.score}%</span>
                        <span className="text-xs text-[#10b981] font-semibold">{evolabData.seven_day_performance.status}</span>
                      </div>
                    </div>
                    <div className="w-full h-[110px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={evolabData.seven_day_performance.daily_data}>
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                          <YAxis domain={[50, 100]} hide />
                          <Bar dataKey="value" fill="#10b981" radius={[3, 3, 0, 0]} barSize={12} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.grid3}>
                {/* 最近运动列表（点击行跳转） */}
                <div className={styles.card}>
                  <div className={styles.cardTitle}>
                    <span>最近运动</span>
                  </div>
                  <div className="h-[200px] overflow-y-auto pr-1">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-slate-500 border-b border-slate-800 pb-2">
                          <th className="pb-2 font-medium">日期</th>
                          <th className="pb-2 font-medium text-right">运动量</th>
                          <th className="pb-2 font-medium text-right">运动强度</th>
                          <th className="pb-2 font-medium text-right">训练负荷</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/40">
                        {activities.slice(0, 7).map((act: any, idx: number) => (
                          <tr
                            key={idx}
                            onClick={() => handleSelectActivity(act)}
                            className="hover:bg-[#1E2538]/70 cursor-pointer text-slate-350 transition-colors"
                          >
                            <td className="py-2.5 font-medium">{act.start_date_local.split(' ')[0]}</td>
                            <td className="py-2.5 text-right font-semibold text-[#20B2AA]">{(act.distance / 1000).toFixed(2)} km</td>
                            <td className="py-2.5 text-right text-slate-400">{act.pace || '--'}</td>
                            <td className="py-2.5 text-right font-extrabold text-amber-500">148TL</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 体力恢复 */}
                <div className={styles.card}>
                  <div className={styles.cardTitle}>
                    <span>体力恢复</span>
                  </div>
                  <div className="flex items-center justify-around h-[200px]">
                    <div className="flex flex-col justify-center">
                      <span className="text-5xl font-black text-[#10b981]">{evolabData.recovery.percentage}%</span>
                      <span className="text-xs text-slate-400 mt-2 block">{evolabData.recovery.remaining_hours} 小时后恢复100%</span>
                      <span className="text-[10px] text-slate-500 font-semibold mt-0.5 uppercase tracking-wide">{evolabData.recovery.advice}</span>
                    </div>
                    <div className="w-24 h-24 text-[#10b981] opacity-90 flex items-center justify-center relative">
                      <svg className="w-20 h-20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z" />
                      </svg>
                      <div className="absolute bottom-0 w-full h-1.5 bg-[#1F293D] rounded-full overflow-hidden">
                        <div className="bg-[#10b981] h-full rounded-full" style={{ width: `${evolabData.recovery.percentage}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 本周运动记录 */}
                <div className={styles.card}>
                  <div className={styles.cardTitle}>
                    <span>本周运动记录</span>
                    <span className="text-xs text-slate-400 font-semibold">总距离 <strong className="text-[#20B2AA] font-black">{evolabData.weekly_workouts.total_distance} km</strong></span>
                  </div>
                  <div className="h-[200px] flex flex-col justify-end">
                    <div className="w-full h-[150px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={evolabData.weekly_workouts.chart_data}>
                          <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                          <YAxis hide />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#111625', border: '1px solid #1e293b', borderRadius: '8px' }}
                            labelStyle={{ color: '#94a3b8', fontSize: '10px' }}
                            itemStyle={{ color: '#20B2AA', fontSize: '12px' }}
                          />
                          <Bar dataKey="distance" fill="#38bdf8" radius={[3, 3, 0, 0]} barSize={16} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.grid2}>
                {/* 乳酸阈心率区间 */}
                <div className={styles.card}>
                  <div className={styles.cardTitle}>
                    <span>乳酸阈心率区间</span>
                    <span className="text-xs text-slate-400 font-semibold">阈值心率 <strong className="text-rose-500 font-black">{evolabData.heart_rate_zones.threshold_hr} bpm</strong></span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col justify-center border-r border-slate-800/80 pr-4">
                      <div className="text-[10px] text-slate-500 uppercase">最大心率 / 静息心率</div>
                      <div className="text-2xl font-black text-white mt-1">
                        {evolabData.heart_rate_zones.max_hr} <span className="text-xs text-slate-500 font-normal">/ {evolabData.heart_rate_zones.resting_hr} bpm</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {evolabData.heart_rate_zones.zones.map((z: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: z.color }}></span>
                            <span className="text-slate-400">{z.name}</span>
                          </div>
                          <span className="font-bold text-white text-right">{z.range} bpm</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 乳酸阈配速区间 */}
                <div className={styles.card}>
                  <div className={styles.cardTitle}>
                    <span>乳酸阈配速区间</span>
                    <span className="text-xs text-slate-400 font-semibold">阈值配速 <strong className="text-[#20B2AA] font-black">{evolabData.pace_zones.threshold_pace}</strong></span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col justify-center border-r border-slate-800/80 pr-4">
                      <div className="text-[10px] text-slate-500 uppercase">乳酸阈配速</div>
                      <div className="text-2xl font-black text-[#20B2AA] mt-1">
                        {evolabData.pace_zones.threshold_pace} <span className="text-xs text-slate-500 font-normal">/km</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {evolabData.pace_zones.zones.map((z: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-xs">
                          <div className="flex items-center space-x-2">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: z.color }}></span>
                            <span className="text-slate-400">{z.name}</span>
                          </div>
                          <span className="font-bold text-white text-right">{z.range}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.grid2}>
                {/* 个人跑步记录 */}
                <div className={styles.card}>
                  <div className={styles.cardTitle}>
                    <span>个人跑步记录 (4周内)</span>
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800 pb-2">
                        <th className="pb-2 font-medium">项目</th>
                        <th className="pb-2 font-medium text-right">记录</th>
                        <th className="pb-2 font-medium text-right">平均配速</th>
                        <th className="pb-2 font-medium text-right">日期</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {personalRecords.map((r: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/20 text-slate-300">
                          <td className="py-2.5 font-medium">{r.project}</td>
                          <td className="py-2.5 text-right font-bold text-white">{r.record}</td>
                          <td className="py-2.5 text-right text-slate-400">{r.pace}</td>
                          <td className="py-2.5 text-right text-slate-500">{r.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 成绩预测 */}
                <div className={styles.card}>
                  <div className={styles.cardTitle}>
                    <span>EvoLab 成绩预测</span>
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-800 pb-2">
                        <th className="pb-2 font-medium">项目</th>
                        <th className="pb-2 font-medium text-right">预计完赛时间</th>
                        <th className="pb-2 font-medium text-right">预计平均配速</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/40">
                      {evolabData.race_predictions.map((p: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-800/20 text-slate-300">
                          <td className="py-3 font-semibold text-slate-200">{p.project}</td>
                          <td className="py-3 text-right font-black text-[#20B2AA]">{p.time}</td>
                          <td className="py-3 text-right text-slate-400">{p.pace}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="px-6 mt-6 pb-8">
                <div className={styles.card}>
                  <div className={styles.cardTitle}>
                    <span>HRV 评估 (最近7天)</span>
                    <span className="text-xs text-slate-400 font-semibold">昨晚平均 <strong className="text-white font-black">{evolabData.hrv_eval.resting_average}</strong> (正常范围 {evolabData.hrv_eval.normal_range})</span>
                  </div>
                  <div className="h-[180px] w-full mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={evolabData.hrv_eval.chart_data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                        <YAxis domain={[30, 60]} hide />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#111625', border: '1px solid #1e293b', borderRadius: '8px' }}
                          labelStyle={{ color: '#94a3b8', fontSize: '10px' }}
                        />
                        <Area type="monotone" dataKey="value" fill="url(#hrvGradient)" stroke="#20B2AA" strokeWidth={2} dot={{ r: 4, fill: '#20B2AA', strokeWidth: 0 }} />
                        <defs>
                          <linearGradient id="hrvGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#20B2AA" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#20B2AA" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ==================== 2. 数据分析 Tab ==================== */}
          {activeTab === 'analysis' && (
            <div className="px-6 mt-6 pb-12 grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-7 space-y-6">
                {/* 训练量评估 */}
                <div className={styles.card}>
                  <div className={styles.cardTitle}>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-sm text-slate-100">训练量评估 <span className="text-slate-500 font-normal text-xs">(12周)</span></span>
                    </div>
                  </div>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={evolabData.training_load_history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                        <YAxis yAxisId="right" orientation="right" domain={[0, 180]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#111625', border: '1px solid #1e293b' }} />
                        <Legend wrapperStyle={{ fontSize: '10px' }} />
                        <Line yAxisId="left" type="monotone" name="长期负荷" dataKey="long_term" stroke="#10b981" strokeWidth={2} dot={false} />
                        <Line yAxisId="left" type="monotone" name="短期负荷" dataKey="short_term" stroke="#38bdf8" strokeWidth={2} dot={false} />
                        <Line yAxisId="right" type="monotone" name="负荷比 (%)" dataKey="ratio" stroke="#f59e0b" strokeWidth={1.5} dot={false} strokeDasharray="3 3" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 运动记录 */}
                <div className={styles.card}>
                  <div className={styles.cardTitle}>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-sm text-slate-100">运动记录 <span className="text-slate-500 font-normal text-xs">(12周)</span></span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-xs text-slate-400">总{metricLabelMap[recordMetric]} <strong className="text-white text-sm font-black ml-1">{recordTotal} {metricUnitMap[recordMetric]}</strong></span>
                      <select
                        value={recordMetric}
                        onChange={(e) => setRecordMetric(e.target.value as any)}
                        className="bg-[#1C2436] text-xs font-semibold text-slate-200 border border-slate-800 rounded px-2.5 py-1 focus:outline-none focus:border-[#20B2AA]"
                      >
                        <option value="load">训练负荷</option>
                        <option value="distance">总距离</option>
                        <option value="time_minutes">总时间</option>
                        <option value="count">总次数</option>
                      </select>
                    </div>
                  </div>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={recordChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#111625', border: '1px solid #1e293b' }} />
                        <Bar dataKey="value" fill="#2563eb" barSize={16} radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5 space-y-6">
                {/* 训练概要 (4周) */}
                <div className={styles.card}>
                  <div className={styles.cardTitle}>
                    <span className="font-extrabold text-sm text-slate-100">训练概要 <span className="text-slate-500 font-normal text-xs">(4周)</span></span>
                    <select
                      value={summaryType}
                      onChange={(e) => setSummaryType(e.target.value as any)}
                      className="bg-[#1C2436] text-xs font-semibold text-slate-200 border border-slate-800 rounded px-2.5 py-1 focus:outline-none focus:border-[#20B2AA]"
                    >
                      <option value="all">全部</option>
                      <option value="running">跑步</option>
                      <option value="cycling">骑行</option>
                      <option value="walking">步行</option>
                      <option value="swimming">游泳</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="bg-[#161C2C] border border-slate-800/60 rounded-lg p-4 flex flex-col justify-between">
                      <span className="text-[10px] text-slate-500 font-bold block mb-1">总距离</span>
                      <div>
                        <span className="text-2xl font-black text-[#38bdf8]">{evolabData.training_summary_4weeks[summaryType].distance}</span>
                        <span className="text-xs text-slate-400 font-bold ml-1">km</span>
                      </div>
                    </div>
                    <div className="bg-[#161C2C] border border-slate-800/60 rounded-lg p-4 flex flex-col justify-between">
                      <span className="text-[10px] text-slate-500 font-bold block mb-1">总时间</span>
                      <div>
                        <span className="text-2xl font-black text-white">{evolabData.training_summary_4weeks[summaryType].time}</span>
                      </div>
                    </div>
                    <div className="bg-[#161C2C] border border-slate-800/60 rounded-lg p-4 flex flex-col justify-between">
                      <span className="text-[10px] text-slate-500 font-bold block mb-1">总负荷</span>
                      <div>
                        <span className="text-2xl font-black text-amber-500">{evolabData.training_summary_4weeks[summaryType].load}</span>
                        <span className="text-xs text-slate-500 font-semibold ml-1">TL</span>
                      </div>
                    </div>
                    <div className="bg-[#161C2C] border border-slate-800/60 rounded-lg p-4 flex flex-col justify-between">
                      <span className="text-[10px] text-slate-500 font-bold block mb-1">总次数</span>
                      <div>
                        <span className="text-2xl font-black text-emerald-500">{evolabData.training_summary_4weeks[summaryType].count}</span>
                        <span className="text-xs text-slate-500 font-semibold ml-1">次</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-850 flex justify-between items-center text-xs text-slate-400 px-1">
                    <span>平均心率</span>
                    <span className="font-extrabold text-white">{evolabData.training_summary_4weeks[summaryType].avg_hr} <span className="text-[10px] text-slate-500 font-normal">bpm</span></span>
                  </div>
                </div>

                {/* 跑步能力与运动表现 */}
                <div className={styles.card}>
                  <div className={styles.cardTitle}>
                    <div className="flex items-center space-x-2">
                      <span className="font-extrabold text-sm text-slate-100">跑步能力与运动表现 <span className="text-slate-500 font-normal text-xs">(12周)</span></span>
                    </div>
                  </div>
                  <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={evolabData.training_load_history}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                        <YAxis domain={[65, 75]} axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#111625', border: '1px solid #1e293b' }} />
                        <Line type="monotone" name="能力值" dataKey="long_term" stroke="#20B2AA" strokeWidth={2} dot={{ r: 3, fill: '#20B2AA' }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== 3. 活动列表 Tab ==================== */}
          {activeTab === 'activities' && (
            <div className="px-6 mt-6 pb-12 space-y-6">
              <div className={styles.card}>
                <div className={styles.cardTitle}>
                  <span className="font-extrabold text-sm text-slate-100">所有活动列表</span>
                  <div className="flex items-center space-x-3">
                    <select
                      value={activityTypeFilter}
                      onChange={(e) => {
                        setActivityTypeFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="bg-[#1C2436] text-xs font-semibold text-slate-200 border border-slate-800 rounded px-2.5 py-1 focus:outline-none focus:border-[#20B2AA]"
                    >
                      <option value="all">类型: 全部</option>
                      <option value="Run">类型: 跑步</option>
                      <option value="Ride">类型: 骑行</option>
                      <option value="Swim">类型: 游泳</option>
                      <option value="Hike">类型: 徒步/步行</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="text-slate-500 border-b border-slate-850 pb-2">
                        <th className="pb-3 font-semibold pl-2">运动日期</th>
                        <th className="pb-3 font-semibold">名称/描述</th>
                        <th className="pb-3 font-semibold">类型</th>
                        <th className="pb-3 font-semibold text-right">距离</th>
                        <th className="pb-3 font-semibold text-right">总用时</th>
                        <th className="pb-3 font-semibold text-right">平均配速</th>
                        <th className="pb-3 font-semibold text-right">平均心率</th>
                        <th className="pb-3 font-semibold text-right pr-2">爬升</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850/60">
                      {paginatedActivities.map((act: any, idx: number) => {
                        const typeColorMap: { [key: string]: string } = {
                          'Run': 'text-[#20B2AA]',
                          'Trail Run': 'text-emerald-400',
                          'Ride': 'text-amber-400',
                          'Swim': 'text-sky-400',
                          'Hike': 'text-purple-400',
                          'Walk': 'text-purple-400'
                        };
                        return (
                          <tr
                            key={idx}
                            onClick={() => handleSelectActivity(act)}
                            className="hover:bg-[#1E2538]/70 cursor-pointer text-slate-350 transition-colors"
                          >
                            <td className="py-3 pl-2 font-medium text-slate-400">{act.start_date_local || '--'}</td>
                            <td className="py-3 font-extrabold text-white max-w-xs truncate">{act.name || '跑步'}</td>
                            <td className={`py-3 font-semibold ${typeColorMap[act.type] || 'text-slate-300'}`}>{act.type}</td>
                            <td className="py-3 text-right font-black text-[#20B2AA]">{(act.distance / 1000).toFixed(2)} km</td>
                            <td className="py-3 text-right font-semibold">{act.moving_time}</td>
                            <td className="py-3 text-right text-slate-400">{act.pace || '--'}</td>
                            <td className="py-3 text-right font-semibold text-rose-500">{act.average_heartrate ? `${Math.round(act.average_heartrate)} bpm` : '--'}</td>
                            <td className="py-3 text-right font-semibold text-slate-400 pr-2">{act.total_elevation_gain ? `${Math.round(act.total_elevation_gain)} m` : '--'}</td>
                          </tr>
                        );
                      })}
                      {paginatedActivities.length === 0 && (
                        <tr>
                          <td colSpan={8} className="py-12 text-center text-slate-500 font-semibold">
                            当前类型下暂无相关活动记录
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-5 border-t border-slate-850 mt-4 text-xs">
                    <span className="text-slate-500 font-semibold">显示第 {(currentPage - 1) * itemsPerPage + 1} 到 {Math.min(currentPage * itemsPerPage, filteredActivities.length)} 条记录，共 {filteredActivities.length} 条</span>
                    <div className="flex space-x-1">
                      <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(c => Math.max(1, c - 1))}
                        className="px-3 py-1.5 bg-[#1C2436] rounded border border-slate-800 hover:bg-slate-800/80 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        上一页
                      </button>
                      <span className="px-3 py-1.5 bg-[#161C2C] text-[#20B2AA] border border-slate-800 font-bold rounded">{currentPage} / {totalPages}</span>
                      <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(c => Math.min(totalPages, c + 1))}
                        className="px-3 py-1.5 bg-[#1C2436] rounded border border-slate-800 hover:bg-slate-800/80 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      >
                        下一页
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ==================== 4. 日程 Tab ==================== */}
          {activeTab === 'schedule' && (
            <div className="px-6 mt-6 pb-12 space-y-6">
              <div className={styles.card}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <span className="font-extrabold text-base text-slate-100">运动日程</span>
                    <div className="h-4 w-px bg-slate-800"></div>
                    <span className="text-sm font-bold text-[#20B2AA]">
                      {year} 年 {month + 1} 月
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => changeMonth(-1)}
                      className="p-1.5 bg-[#1C2436] hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setCurrentDate(new Date())}
                      className="px-3 py-1 bg-[#1C2436] hover:bg-slate-800 text-xs font-semibold text-slate-350 rounded border border-slate-800 transition-colors"
                    >
                      今天
                    </button>
                    <button
                      onClick={() => changeMonth(1)}
                      className="p-1.5 bg-[#1C2436] hover:bg-slate-800 text-slate-300 rounded border border-slate-800 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-500 uppercase tracking-wider mb-2 border-b border-slate-850 pb-2">
                  <div>周一</div>
                  <div>周二</div>
                  <div>周三</div>
                  <div>周四</div>
                  <div>周五</div>
                  <div>周六</div>
                  <div>周日</div>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {calendarCells.map((cell, idx) => {
                    const dayWorkouts = dailyWorkoutsMap[cell.dateStr] || [];
                    const totalDist = dayWorkouts.reduce((sum, item) => sum + item.distance, 0) / 1000;
                    
                    return (
                      <div
                        key={idx}
                        className={`min-h-[90px] border border-slate-850/80 rounded-lg p-2 flex flex-col justify-between transition-colors relative group ${cell.isCurrentMonth ? 'bg-[#141A29]' : 'bg-[#0E1320] opacity-30'} ${dayWorkouts.length > 0 ? 'hover:border-[#20B2AA]/50 cursor-pointer' : ''}`}
                      >
                        <span className={`text-xs font-bold ${cell.isCurrentMonth ? 'text-slate-400' : 'text-slate-600'}`}>
                          {cell.dayNum}
                        </span>

                        {dayWorkouts.length > 0 && (
                          <div className="flex flex-col space-y-1 mt-2">
                            <div 
                              onClick={() => handleSelectActivity(dayWorkouts[0])}
                              className="bg-[#20B2AA]/15 border border-[#20B2AA]/30 text-[#20B2AA] text-[9px] font-black px-1.5 py-0.5 rounded text-center hover:bg-[#20B2AA]/35 transition-colors"
                            >
                              {totalDist.toFixed(1)} km
                            </div>
                            <div className="absolute z-10 hidden group-hover:block bottom-12 left-1/2 -translate-x-1/2 w-48 bg-[#1B2234] border border-slate-700 p-2.5 rounded-lg shadow-2xl text-left text-[10px] text-slate-350">
                              <div className="font-extrabold text-white border-b border-slate-800 pb-1 mb-1">{cell.dateStr}</div>
                              {dayWorkouts.map((w, wIdx) => (
                                <div key={wIdx} className="mb-1 last:mb-0">
                                  <span className="font-black text-[#20B2AA]">{(w.distance / 1000).toFixed(2)}km</span> | {w.name}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 高驰凭证配置弹窗 */}
      {showConfigModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
          <div className="bg-[#001D3D] border border-cyan-950 rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-scale-up text-left">
            <button 
              onClick={() => setShowConfigModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
            >
              ×
            </button>
            <h3 className="text-lg font-black text-white mb-2 flex items-center space-x-2">
              <span>⚙️ 配置高驰账号</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              输入您登录高驰 App 的账号与密码。我们将仅将其在您的自托管 SQLite 中安全保存，以帮您自动同步运动与 EvoLab 数据。
            </p>
            <form onSubmit={handleSaveCorosConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">高驰账号 (手机号或邮箱)</label>
                <input 
                  type="text"
                  required
                  placeholder="请输入手机号或邮箱"
                  value={corosAccount}
                  onChange={e => setCorosAccount(e.target.value)}
                  className="w-full bg-[#000814] border border-cyan-950/80 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#00F5D4]/60 text-left"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">登录密码</label>
                <input 
                  type="password"
                  required
                  placeholder="请输入密码"
                  value={corosPassword}
                  onChange={e => setCorosPassword(e.target.value)}
                  className="w-full bg-[#000814] border border-cyan-950/80 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[#00F5D4]/60 text-left"
                />
              </div>
              <div className="flex space-x-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 py-2 bg-slate-800 text-slate-300 font-bold rounded-lg text-xs hover:bg-slate-700 transition-colors"
                >
                  取消
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-2 bg-[#00F5D4] text-[#000814] font-black rounded-lg text-xs hover:opacity-90 transition-opacity"
                >
                  保存配置
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorosDashboardPage;
