export type SectionType = 
  | 'hero'
  | 'promotional_ribbon'
  | 'stats'
  | 'category_grid'
  | 'product_carousel'
  | 'product_grid'
  | 'brand_philosophy'
  | 'lifestyle_bento'
  | 'testimonials'
  | 'faq'
  | 'newsletter'
  | 'rich_text'
  | 'image_banner'
  | 'video_block'
  | 'cta_banner'
  | 'features_list'
  | 'contact_form'
  | 'team_members'
  | 'timeline_milestones'
  | 'partner_inquiry'
  | 'custom_html';

export interface HeroBannerItem {
  id: string;
  title: string;
  titleLine1?: string;
  titleLine2?: string;
  titleLine3?: string;
  subtitle?: string;
  badgeText?: string;
  imageUrl: string;
  mobileImageUrl?: string;
  primaryButtonText?: string;
  primaryButtonUrl?: string;
  secondaryButtonText?: string;
  secondaryButtonUrl?: string;
  scrollIndicatorText?: string;
  active: boolean;
  order: number;
  startDate?: string;
  endDate?: string;
}

export interface PromoAdItem {
  id: string;
  text: string;
  campaignLabel?: string;
  ctaText?: string;
  ctaLink?: string;
  icon?: string;
  active: boolean;
  order: number;
  startDate?: string;
  endDate?: string;
  bgColor?: string;
  textColor?: string;
}

export interface PageSection {
  id: string;
  type: SectionType;
  title?: string;
  enabled: boolean;
  order: number;
  data: Record<string, any>;
  settings?: {
    paddingTop?: 'none' | 'small' | 'medium' | 'large';
    paddingBottom?: 'none' | 'small' | 'medium' | 'large';
    backgroundColor?: string;
    textColor?: string;
    alignment?: 'left' | 'center' | 'right';
  };
}

export type PageStatus = 'published' | 'draft';

export interface SEOMetadata {
  title?: string;
  description?: string;
  keywords?: string[];
  ogImage?: string;
}

export interface CMSPage {
  id: string;
  slug: string;
  title: string;
  description?: string;
  category?: 'Navigation' | 'Shop' | 'Support' | 'Legal' | 'Custom';
  status: PageStatus;
  template: 'standard' | 'homepage' | 'category' | 'legal' | 'custom';
  sections: PageSection[];
  draftSections?: PageSection[];
  hasDraft?: boolean;
  seo?: SEOMetadata;
  publishedAt?: string;
  updatedAt: string;
  createdAt: string;
  version?: number;
}

export interface MediaItem {
  id: string;
  url: string;
  name: string;
  altText?: string;
  size?: number;
  mimeType?: string;
  folder?: string;
  uploadedAt: string;
  dimensions?: { width: number; height: number };
}

export interface GlobalAppearance {
  header: {
    announcementRibbonEnabled: boolean;
    announcementText: string;
    announcementLink: string;
    sticky: boolean;
    showSearch: boolean;
    showWishlist: boolean;
  };
  footer: {
    brandDescription: string;
    phone: string;
    email: string;
    address: string;
    socialLinks: {
      instagram?: string;
      facebook?: string;
      youtube?: string;
      twitter?: string;
      linkedin?: string;
    };
    copyrightText: string;
  };
  typography: {
    fontFamily: string;
    headingFont: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
}
