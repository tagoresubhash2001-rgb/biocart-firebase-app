import React, { useEffect } from 'react';
import { useApp } from '../../context/AppContext';

export const SEOManager: React.FC = () => {
  const { currentTab, subView, activeProductDetails, selectedCategory } = useApp();

  useEffect(() => {
    // Determine the title, description, image and relative URL based on application state
    let title = 'BioCart | The Way of Healthy, Organic Life';
    let description = 'Discover BioCart\'s premium range of organic soil enhancers, compost accelerators, vermicompost, and non-toxic pest control formulas designed for ecological horticulture.';
    let ogImage = '/assets/biocart_logo_official.png';
    let relativeUrl = '';

    if (activeProductDetails) {
      title = `${activeProductDetails.name} | BioCart Organic Gardening`;
      description = activeProductDetails.description || `Buy ${activeProductDetails.name} at BioCart. Premium, certified organic ${activeProductDetails.category.toLowerCase()} for your garden.`;
      ogImage = activeProductDetails.image;
      relativeUrl = `?product=${activeProductDetails.id}`;
    } else if (currentTab === 'shop') {
      const catText = selectedCategory !== 'All' ? ` ${selectedCategory}` : '';
      title = `Eco Shop${catText} | BioCart Organic Supplies`;
      description = `Browse our professional, organic-certified ${selectedCategory.toLowerCase() !== 'all' ? selectedCategory.toLowerCase() + ' ' : ''}gardening collection. Non-toxic pest control, nutrient-dense fertilizers, and soil care.`;
      ogImage = 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?q=80&w=1200&auto=format&fit=crop';
      relativeUrl = '?tab=shop';
    } else if (currentTab === 'about') {
      title = 'Our Sustainable Mission | BioCart Soil Care';
      description = 'Learn about BioCart\'s commitment to circular agriculture, chemical-free bio-fertilizers, and regenerative gardening solutions for sustainable home crops.';
      ogImage = 'https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?q=80&w=1200&auto=format&fit=crop';
      relativeUrl = '?tab=about';
    } else if (currentTab === 'contact') {
      title = 'Expert Consultation & Contact | BioCart';
      description = 'Get in touch with BioCart soil doctors and agricultural experts. Request customized organic crop guides, dealer partnerships, and customer support.';
      ogImage = 'https://images.unsplash.com/photo-1595273670150-db0a3e368167?q=80&w=1200&auto=format&fit=crop';
      relativeUrl = '?tab=contact';
    } else if (subView === 'dashboard') {
      title = 'My Green Dashboard | BioCart Members';
      description = 'Manage your BioCart member details, track active organic gardening orders, and view your favorited eco-supplies.';
      relativeUrl = '?view=dashboard';
    } else if (subView === 'dealer-portal') {
      title = 'Authorized Dealer Portal | BioCart Solutions';
      description = 'Access wholesale trade resources, bulk ordering catalogs, and compliance verification certificates for BioCart retailers.';
      relativeUrl = '?view=dealer-portal';
    } else if (subView === 'distributor-portal') {
      title = 'Industrial Distributor Console | BioCart';
      description = 'Manage large-scale bulk freight dispatches, agricultural supply chain tracking, and wholesale invoices for BioCart distributors.';
      relativeUrl = '?view=distributor-portal';
    }

    // Apply the title
    document.title = title;

    // Dynamically inject/prepare high-resolution official Favicon and Apple Touch Icon
    const setFavicon = () => {
      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      
      // Use the official BioCart logo image
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
    setMetaTag('name', 'robots', 'index, follow');

    // Open Graph Tags
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:image', ogImage);
    setMetaTag('property', 'og:url', window.location.origin + window.location.pathname + relativeUrl);
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('property', 'og:site_name', 'BioCart Organic Gardening');

    // Twitter Cards
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);
    setMetaTag('name', 'twitter:image', ogImage);

    // Canonical URL
    const canonicalUrl = window.location.origin + window.location.pathname + relativeUrl;
    let canonicalLink: HTMLLinkElement | null = document.querySelector("link[rel='canonical']");
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = canonicalUrl;

  }, [currentTab, subView, activeProductDetails, selectedCategory]);

  return null; // Side-effect helper component only
};
