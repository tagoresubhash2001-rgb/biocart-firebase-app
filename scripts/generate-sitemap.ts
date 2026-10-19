import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SEED_PRODUCTS } from '../src/data/seedData';
import { MASTER_CATEGORIES } from '../src/data/categoryCatalog';
import { INITIAL_CMS_PAGES } from '../src/data/initialCMSPages';
import { INITIAL_BLOG_POSTS } from '../src/data/initialBlogs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface SitemapUrl {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

const DOMAIN = 'https://biocart.in';
const today = new Date().toISOString().split('T')[0];

function generateSitemap() {
  const urls: SitemapUrl[] = [];

  // 1. Core Priority Landing Pages
  urls.push({
    loc: `${DOMAIN}/`,
    lastmod: today,
    changefreq: 'daily',
    priority: 1.0
  });

  urls.push({
    loc: `${DOMAIN}/shop`,
    lastmod: today,
    changefreq: 'daily',
    priority: 0.9
  });

  // 2. Active Master Categories
  MASTER_CATEGORIES.forEach(category => {
    if (category.active !== false) {
      urls.push({
        loc: `${DOMAIN}/shop?category=${encodeURIComponent(category.name)}`,
        lastmod: today,
        changefreq: 'weekly',
        priority: 0.8
      });
    }
  });

  // 3. Published Canonical Products
  SEED_PRODUCTS.forEach(product => {
    if (product.active !== false && product.inStock !== false) {
      urls.push({
        loc: `${DOMAIN}/product-details?product=${encodeURIComponent(product.id)}`,
        lastmod: today,
        changefreq: 'weekly',
        priority: 0.8
      });
    }
  });

  // 4. Published Informational, Portals & CMS Pages
  INITIAL_CMS_PAGES.forEach(page => {
    if (page.status === 'published' && page.id !== 'home' && page.slug !== 'home') {
      const slug = page.slug || page.id;
      // Skip duplicate shop route if already added
      if (slug === 'shop') return;

      let priority = 0.6;
      let changefreq: SitemapUrl['changefreq'] = 'monthly';

      if (['about-us', 'contact-us', 'shipping-customs', 'returns-refunds'].includes(slug)) {
        priority = 0.7;
        changefreq = 'weekly';
      } else if (['dealer-portal', 'distributor-portal', 'soil-consultation'].includes(slug)) {
        priority = 0.7;
        changefreq = 'weekly';
      }

      urls.push({
        loc: `${DOMAIN}/${slug}`,
        lastmod: today,
        changefreq,
        priority
      });
    }
  });

  // 5. Published Blogs Hub and Individual Articles
  urls.push({
    loc: `${DOMAIN}/blogs`,
    lastmod: today,
    changefreq: 'daily',
    priority: 0.8
  });

  INITIAL_BLOG_POSTS.forEach(blog => {
    if (blog.status === 'published' && !blog.seo?.noIndex) {
      urls.push({
        loc: `${DOMAIN}/blogs/${encodeURIComponent(blog.slug)}`,
        lastmod: blog.updatedAt ? blog.updatedAt.split('T')[0] : today,
        changefreq: 'weekly',
        priority: 0.8
      });
    }
  });


  // Generate XML string with standard sitemap namespace
  const xmlEntries = urls.map(u => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod || today}</lastmod>
    <changefreq>${u.changefreq || 'weekly'}</changefreq>
    <priority>${u.priority?.toFixed(1) || '0.5'}</priority>
  </url>`).join('\n');

  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlEntries}
</urlset>
`;

  const outputPath = path.resolve(__dirname, '../public/sitemap.xml');
  fs.writeFileSync(outputPath, sitemapXml, 'utf-8');
  console.log(`[BioCart Sitemap Generator] Successfully generated ${urls.length} verified URLs at ${outputPath}`);
}

generateSitemap();
