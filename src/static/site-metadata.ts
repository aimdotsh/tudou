interface ISiteMetadataResult {
  siteTitle: string;
  theme_preset?: string;
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

// 获取动态的地图偏移值
const getDynamicMapOffset = () => {
  const distance = 0;
  const bearing = 0;

  return {
    distance,
    bearing
  };
};

const data: ISiteMetadataResult = {
  siteTitle: '蓝皮书的 Workouts Page',
  theme_preset: 'dashboard', // dashboard | classic | map_focused | gym_pro
  siteUrl: 'https://workouts.liups.com',
  logo: 'https://workouts.liups.com/images/favicon.png',
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
      name: 'Daily',
      url: `${getBasePath()}/daily`,
    },
    {
      name: 'Blog',
      url: `${getBasePath()}/blog`,
    },
    {
      name: 'About',
      url: `${getBasePath()}/about`,
    },
    {
      name: 'GPX tool',
      url: `${getBasePath()}/gpx-to-polyline`,
    },
  ],
  mapOffset: getDynamicMapOffset(),
};

export default data;
