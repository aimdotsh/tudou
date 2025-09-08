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
      url: 'https://liups.com/about/',
    },
  ],
};

export default data;
