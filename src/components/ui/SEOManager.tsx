import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { INITIAL_CMS_PAGES } from '../../data/initialCMSPages';
import { INITIAL_BLOG_POSTS } from '../../data/initialBlogs';
import { AdminService } from '../../services/AdminService';
import { BlogPost } from '../../types/blog';

const CANONICAL_DOMAIN = 'https://biocart.in';

export const SEOManager: React.FC = () => {
  const { currentTab, subView, activeProductDetails, selectedCategory, activeBlogSlug } = useApp();
  const [currentBlog, setCurrentBlog] = useState<BlogPost | null>(null);

  // Subscribe/Fetch blog metadata if on a blog post page
  useEffect(() => {
    if (currentTab === 'blogs' && activeBlogSlug) {
      // 1. Check local seed blogs first
      const seedMatch = INITIAL_BLOG_POSTS.find(b => b.slug === activeBlogSlug || b.id === activeBlogSlug);
      if (seedMatch) {
        setCurrentBlog(seedMatch);
      }
      // 2. Fetch/subscribe from Firestore to ensure real-time edits reflect
      AdminService.getBlogByIdOrSlug(activeBlogSlug).then(remote => {
        if (remote) {
          setCurrentBlog(remote as BlogPost);
        }
      }).catch(err => {
        console.warn('SEOManager blog lookup error:', err);
      });
    } else {
      setCurrentBlog(null);
    }
  }, [currentTab, activeBlogSlug]);

  useEffect(() => {
    // Default BioCart Global Brand SEO
    let title = 'BioCart | Buy Organic Fertilizer, Vermicompost & Gardening Products Online India';
    let description = 'Shop 100% natural organic fertilizers, double-screened vermicompost, nutrient potting mixes, and neem oil pest control. Pan-India doorstep delivery directly from BioCart.';
    let ogImage = `${CANONICAL_DOMAIN}/assets/biocart_logo_official.png`;
    let ogType = 'website';
    let cleanPath = currentTab === 'home' ? '/' : `/${currentTab}`;
    let noIndex = false;

    const cmsPage = INITIAL_CMS_PAGES.find(p => p.id === currentTab || p.slug === currentTab);

    if (activeProductDetails) {
      // 1. Product Detail Page SEO
      title = activeProductDetails.seoTitle || `${activeProductDetails.name} | BioCart India`;
      description = activeProductDetails.seoDescription || activeProductDetails.shortDescription || activeProductDetails.description || `Buy ${activeProductDetails.name} at BioCart. Premium, certified organic ${activeProductDetails.category.toLowerCase()} delivered across India.`;
      ogImage = activeProductDetails.image.startsWith('http') ? activeProductDetails.image : `${CANONICAL_DOMAIN}${activeProductDetails.image}`;
      cleanPath = `/product-details?product=${activeProductDetails.id}`;
      ogType = 'product';
      noIndex = activeProductDetails.noIndex || false;
    } else if (currentTab === 'blogs' && activeBlogSlug && currentBlog) {
      // 2. Individual Published Blog Post SEO
      title = currentBlog.seo?.title || `${currentBlog.title} | BioCart Agriculture Knowledge`;
      description = currentBlog.seo?.metaDescription || currentBlog.excerpt || `Read ${currentBlog.title} on BioCart. Expert guides on Indian organic farming and soil health.`;
      ogImage = currentBlog.coverImage ? (currentBlog.coverImage.startsWith('http') ? currentBlog.coverImage : `${CANONICAL_DOMAIN}${currentBlog.coverImage}`) : ogImage;
      cleanPath = `/blogs/${currentBlog.slug}`;
      ogType = 'article';
      noIndex = currentBlog.seo?.noIndex || currentBlog.status !== 'published';
    } else if (currentTab === 'blogs') {
      // 3. Blog Listing Archive SEO
      title = 'BioCart Green Journal | Organic Farming & Terrace Gardening Guides India';
      description = 'Explore agronomy guides, soil conditioning tips, vermicompost application charts, and natural pest solutions written by agricultural specialists.';
      cleanPath = '/blogs';
      ogImage = 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=1200&q=80';
    } else if (subView === 'dashboard') {
      title = 'My Green Dashboard | BioCart Members';
      description = 'Manage your BioCart member details, track active organic gardening orders, and view your favorited eco-supplies.';
      cleanPath = '/dashboard';
      noIndex = true; // Private user route
    } else if (subView === 'dealer-portal' || currentTab === 'dealer-portal') {
      title = 'Authorized Dealer Portal | BioCart Solutions';
      description = 'Access wholesale trade resources, bulk ordering catalogs, and compliance verification certificates for BioCart retailers.';
      cleanPath = '/dealer-portal';
    } else if (subView === 'distributor-portal' || currentTab === 'distributor-portal') {
      title = 'Industrial Distributor Console | BioCart';
      description = 'Manage large-scale bulk freight dispatches, agricultural supply chain tracking, and wholesale invoices for BioCart distributors.';
      cleanPath = '/distributor-portal';
    } else if (currentTab === 'shop') {
      const catText = selectedCategory !== 'All' ? ` ${selectedCategory}` : '';
      title = `Buy Organic${catText} Online India | BioCart Garden Supplies`;
      description = `Browse our certified ${selectedCategory.toLowerCase() !== 'all' ? selectedCategory.toLowerCase() + ' ' : ''}gardening collection. Soil conditioners, biofertilizers, low-EC cocopeat, and non-toxic pest protection.`;
      ogImage = 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?q=80&w=1200&auto=format&fit=crop';
      cleanPath = selectedCategory !== 'All' ? `/shop?category=${encodeURIComponent(selectedCategory)}` : '/shop';
    } else if (cmsPage) {
      title = cmsPage.seo?.title || `${cmsPage.title} | BioCart Organic Horticulture`;
      description = cmsPage.seo?.description || cmsPage.description || description;
      cleanPath = `/${cmsPage.slug || cmsPage.id}`;
    }

    // Apply document title
    document.title = title;

    // Dynamically inject/prepare high-resolution official Favicon and Apple Touch Icon
    const setFavicon = () => {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      const officialFavicon = '/assets/biocart_logo_official.png';
      link.href = officialFavicon;

      let appleLink: HTMLLinkElement | null = document.querySelector("link[rel='apple-touch-icon']");
      if (!appleLink) {
        appleLink = document.createElement('link');
        appleLink.rel = 'apple-touch-icon';
        document.head.appendChild(appleLink);
      }
      appleLink.href = officialFavicon;
    };
    setFavicon();

    // Helper to set or create meta tags
    const setMetaTag = (nameAttr: string, valueAttr: string, content: string) => {
      let element = document.querySelector(`meta[${nameAttr}="${valueAttr}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(nameAttr, valueAttr);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Standard SEO Tags
    setMetaTag('name', 'description', description);
    
    // Don't index private admin or vendor portal views, or private user routes
    const isPrivate = noIndex || ['admin', 'vendor'].includes(subView || '') || ['admin', 'vendor'].includes(currentTab);
    setMetaTag('name', 'robots', isPrivate ? 'noindex, nofollow' : 'index, follow');

    // Canonical URL strictly anchored to production domain
    let canonicalUrl = `${CANONICAL_DOMAIN}${cleanPath}`;
    if (activeProductDetails?.canonicalUrl) {
      canonicalUrl = activeProductDetails.canonicalUrl;
    } else if (currentBlog?.seo?.canonicalUrl) {
      canonicalUrl = currentBlog.seo.canonicalUrl;
    }

    let canonicalLink: HTMLLinkElement | null = document.querySelector("link[rel='canonical']");
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalUrl;

    // Open Graph Tags
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:image', ogImage);
    setMetaTag('property', 'og:url', canonicalUrl);
    setMetaTag('property', 'og:type', ogType);
    setMetaTag('property', 'og:site_name', 'BioCart Organic Gardening');

    // Twitter Cards
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', ogImage);

    // ==========================================
    // JSON-LD Structured Data Schema Injection
    // ==========================================
    const injectJsonLd = (id: string, schema: object) => {
      let script = document.getElementById(id) as HTMLScriptElement | null;
      if (!script) {
        script = document.createElement('script');
        script.id = id;
        script.type = 'application/ld+json';
        document.head.appendChild(script);
      }
      script.text = JSON.stringify(schema);
    };

    const removeJsonLd = (id: string) => {
      const script = document.getElementById(id);
      if (script) {
        script.remove();
      }
    };

    // 1. Organization & WebSite Schemas
    injectJsonLd('schema-organization', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'BioCart',
      legalName: 'Sindulis Agro Products Pvt. Ltd.',
      url: CANONICAL_DOMAIN,
      logo: `${CANONICAL_DOMAIN}/assets/biocart_logo_official.png`,
      description: 'BioCart is India\'s premier certified organic gardening, biofertilizer, and sustainable horticulture input brand.',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'IN',
        addressRegion: 'Andhra Pradesh'
      },
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        availableLanguage: ['en', 'hi', 'te'],
        email: 'support@biocart.in'
      }
    });

    injectJsonLd('schema-website', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      url: CANONICAL_DOMAIN,
      name: 'BioCart Organic Horticulture',
      potentialAction: {
        '@type': 'SearchAction',
        target: `${CANONICAL_DOMAIN}/shop?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    });

    // 2. BreadcrumbList Schema
    const breadcrumbs: { name: string; item: string }[] = [{ name: 'Home', item: `${CANONICAL_DOMAIN}/` }];

    if (activeProductDetails) {
      breadcrumbs.push({ name: 'Shop', item: `${CANONICAL_DOMAIN}/shop` });
      breadcrumbs.push({
        name: activeProductDetails.category,
        item: `${CANONICAL_DOMAIN}/shop?category=${encodeURIComponent(activeProductDetails.category)}`
      });
      breadcrumbs.push({
        name: activeProductDetails.name,
        item: canonicalUrl
      });
    } else if (currentTab === 'blogs' && activeBlogSlug && currentBlog) {
      breadcrumbs.push({ name: 'Blogs', item: `${CANONICAL_DOMAIN}/blogs` });
      breadcrumbs.push({ name: currentBlog.category, item: `${CANONICAL_DOMAIN}/blogs` });
      breadcrumbs.push({ name: currentBlog.title, item: canonicalUrl });
    } else if (currentTab === 'blogs') {
      breadcrumbs.push({ name: 'Blogs', item: `${CANONICAL_DOMAIN}/blogs` });
    } else if (currentTab === 'shop') {
      breadcrumbs.push({ name: 'Shop', item: `${CANONICAL_DOMAIN}/shop` });
      if (selectedCategory && selectedCategory !== 'All') {
        breadcrumbs.push({
          name: selectedCategory,
          item: `${CANONICAL_DOMAIN}/shop?category=${encodeURIComponent(selectedCategory)}`
        });
      }
    } else if (cmsPage) {
      breadcrumbs.push({ name: cmsPage.title, item: canonicalUrl });
    }

    if (breadcrumbs.length > 1) {
      injectJsonLd('schema-breadcrumbs', {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: breadcrumbs.map((crumb, idx) => ({
          '@type': 'ListItem',
          position: idx + 1,
          name: crumb.name,
          item: crumb.item
        }))
      });
    } else {
      removeJsonLd('schema-breadcrumbs');
    }

    // 3. Product Schema (Only on product details page)
    if (activeProductDetails) {
      const prodImg = activeProductDetails.image.startsWith('http') 
        ? activeProductDetails.image 
        : `${CANONICAL_DOMAIN}${activeProductDetails.image}`;

      const productSchema: Record<string, any> = {
        '@context': 'https://schema.org',
        '@type': 'Product',
        name: activeProductDetails.name,
        image: activeProductDetails.images && activeProductDetails.images.length > 0
          ? activeProductDetails.images.map(img => img.startsWith('http') ? img : `${CANONICAL_DOMAIN}${img}`)
          : [prodImg],
        description: activeProductDetails.description || activeProductDetails.shortDescription,
        sku: activeProductDetails.sku || activeProductDetails.id,
        brand: {
          '@type': 'Brand',
          name: 'BioCart'
        },
        offers: {
          '@type': 'Offer',
          url: canonicalUrl,
          priceCurrency: 'INR',
          price: activeProductDetails.price,
          priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          itemCondition: 'https://schema.org/NewCondition',
          availability: activeProductDetails.inStock !== false && activeProductDetails.stockStatus !== 'Out of Stock'
            ? 'https://schema.org/InStock'
            : 'https://schema.org/OutOfStock',
          seller: {
            '@type': 'Organization',
            name: 'BioCart'
          }
        }
      };

      if (activeProductDetails.rating && activeProductDetails.reviewsCount) {
        productSchema.aggregateRating = {
          '@type': 'AggregateRating',
          ratingValue: activeProductDetails.rating,
          reviewCount: activeProductDetails.reviewsCount
        };
      }

      injectJsonLd('schema-product', productSchema);
    } else {
      removeJsonLd('schema-product');
    }

    // 4. BlogPosting / Article Schema (Only on published blog posts)
    if (currentTab === 'blogs' && activeBlogSlug && currentBlog && currentBlog.status === 'published') {
      const blogCover = currentBlog.coverImage.startsWith('http')
        ? currentBlog.coverImage
        : `${CANONICAL_DOMAIN}${currentBlog.coverImage}`;

      const articleSchema: Record<string, any> = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonicalUrl
        },
        headline: currentBlog.title,
        description: currentBlog.excerpt,
        image: [blogCover],
        datePublished: currentBlog.publishedAt || currentBlog.createdAt,
        dateModified: currentBlog.updatedAt || currentBlog.createdAt,
        author: {
          '@type': 'Person',
          name: currentBlog.author?.name || 'BioCart Agronomy Team'
        },
        publisher: {
          '@type': 'Organization',
          name: 'BioCart',
          logo: {
            '@type': 'ImageObject',
            url: `${CANONICAL_DOMAIN}/assets/biocart_logo_official.png`
          }
        }
      };

      injectJsonLd('schema-article', articleSchema);

      // 5. FAQPage Schema if blog post contains an FAQ block
      const faqBlock = currentBlog.blocks.find(b => b.type === 'faq' && Array.isArray(b.data?.items) && b.data.items.length > 0);
      if (faqBlock) {
        injectJsonLd('schema-faq', {
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqBlock.data.items.map((item: any) => ({
            '@type': 'Question',
            name: item.question,
            acceptedAnswer: {
              '@type': 'Answer',
              text: item.answer
            }
          }))
        });
      } else {
        removeJsonLd('schema-faq');
      }

    } else {
      removeJsonLd('schema-article');
      removeJsonLd('schema-faq');
    }

  }, [currentTab, subView, activeProductDetails, selectedCategory, activeBlogSlug, currentBlog]);

  return null;
};
