interface ISiteMetadataResult {
  siteTitle: string;
  siteUrl: string;
  description: string;
  keywords: string;
  logo: string;
  navLinks: {
    name: string;
    url: string;
  }[];
  mapOffset: {
    distance: number; // 偏移距离（公里）
    bearing: number;  // 偏移方位角（度，0°=正北，90°=正东，180°=正南，270°=正西）
  };
}

const getBasePath = () => {
  const baseUrl = import.meta.env.BASE_URL;
  return baseUrl === '/' ? '' : baseUrl;
};

// 获取动态的地图偏移值，每天变化
const getDynamicMapOffset = () => {
  const baseDate = new Date('2025-01-01'); // 基准日期
  const currentDate = new Date();

  // 计算从基准日期到当前日期的天数差
  const timeDiff = currentDate.getTime() - baseDate.getTime();
  const daysDiff = Math.floor(timeDiff / (1000 * 3600 * 24));

  // 基础值
  const baseDistance = 0; // 基础距离（公里）
  const baseBearing = 0;     // 基础角度（度）

  // 每天增加10公里，角度每天增加1度
  // const distance = baseDistance + (daysDiff * 10);
  // const bearing = (baseBearing + daysDiff) % 360; // 使用模运算确保角度在0-359度范围内
  // pianyi 00
  const distance = 0;
  const bearing = 0;

  return {
    distance,
    bearing
  };
};

const data: ISiteMetadataResult = {
  siteTitle: '蓝皮书的 Workouts Page',
  siteUrl: 'https://run.liups.com',
  logo: 'https://aim.sh/images/run.png',
  description: '蓝皮书的 Workouts Page',
  keywords: 'workouts, running, cycling, riding, roadtrip, hiking, swimming',
  navLinks: [
    {
      name: 'Home',
      url: `${getBasePath()}/`,
    },
    {
      name: 'Summary',
      url: `${getBasePath()}/summary`,
    },
    {
      name: 'Total',
      url: `${getBasePath()}/total`,
    },
    {
      name: 'Luck',
      url: `${getBasePath()}/luck`,
    },
    {
      name: 'GPX tool',
      url: `${getBasePath()}/gpx-to-polyline`,
    },
    {
      name: 'Daily',
      url: `${getBasePath()}/daily`,
    },
    {
      name: 'Blog',
      url: 'https://liups.com',
    },
    {
      name: 'About',
      url: 'https://liups.com/posts/workouts_page/',
    },
  ],
  mapOffset: getDynamicMapOffset(),
};

export default data;
