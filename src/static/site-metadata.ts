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

const data: ISiteMetadataResult = {
  siteTitle: '蓝皮书的跑路之旅',
  siteUrl: 'https://tudou.run',
  logo: 'https://avatars.githubusercontent.com/u/27554033?v=4',
  description: 'Personal site and blog',
  keywords: 'workouts, running, cycling, riding, roadtrip, hiking, swimming',
  navLinks: [
    {
      name: 'Blog',
      url: 'https://tudou.run',
    },
    {
      name: 'About',
      url: 'https://tudou.run',
    },
  ],
};

export default data;
