const siteMetadata = {
  title: 'Lucas Makes Games',
  author: 'Lucas Gray',
  headerTitle: 'Lucas Makes Games',
  description:
    'A journal about my forays into game development. Occasionally punctuated by work projects.',
  language: 'en-us',
  theme: 'light', // system, dark or light
  siteUrl: 'https://lucasegray.com',
  siteRepo: 'https://github.com/lucasgray/lucasblog',
  siteLogo: '/static/images/lucasgray.png',
  image: '/static/images/lucagray.png',
  socialBanner: '/static/images/lucagray.png',
  github: 'https://github.com/lucasgray',
  linkedin: 'https://www.linkedin.com/in/lucas-gray-6169403/',
  mastodon: 'https://mastodon.gamedev.place/@lucasgray',
  email: 'lucas.e.gray@gmail.com',
  locale: 'en-US',
  analytics: {
    // If you want to use an analytics provider you have to add it to the
    // content security policy in the `next.config.js` file.
    // supports plausible, simpleAnalytics, umami or googleAnalytics
    plausibleDataDomain: '', // e.g. tailwind-nextjs-starter-blog.vercel.app
    simpleAnalytics: false, // true or false
    umamiWebsiteId: '', // e.g. 123e4567-e89b-12d3-a456-426614174000
    googleAnalyticsId: 'G-96SYSZ6TC6', // e.g. UA-000000-2 or G-XXXXXXX
  },
}

module.exports = siteMetadata
