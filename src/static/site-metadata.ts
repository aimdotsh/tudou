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
  mapOffset: {
    distance: 234.56,   // 偏移距离（公里）
    bearing: 225,      // 偏移方位角（度，0°=正北，90°=正东，180°=正南，270°=正西）
  },
};

export default data;
