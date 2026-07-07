import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://pv.1health.io'
  return [
    { url: `${base}`, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/essay`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/llms.txt`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/agent-brief`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/openapi.json`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.6 },
    { url: 'https://dev.1health.io/case-studies/muse-bio', changeFrequency: 'monthly', priority: 0.4 },
    { url: 'https://dev.1health.io/case-studies', changeFrequency: 'weekly', priority: 0.4 },
  ]
}
