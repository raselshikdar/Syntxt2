import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/?view=messages', '/?view=notifications', '/?view=settings'],
    },
    sitemap: 'https://syntxt.app/sitemap.xml',
  }
}
