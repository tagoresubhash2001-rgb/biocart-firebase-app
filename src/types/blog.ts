export type BlogBlockType =
  | 'heading'
  | 'paragraph'
  | 'list'
  | 'image'
  | 'gallery'
  | 'video'
  | 'quote'
  | 'callout'
  | 'table'
  | 'faq'
  | 'internal_link'
  | 'product_card'
  | 'product_recommendations'
  | 'related_blogs'
  | 'cta'
  | 'comparison_table'
  | 'affiliate_link'
  | 'table_of_contents'
  | 'author_box';

export interface BlogBlock {
  id: string;
  type: BlogBlockType;
  order: number;
  data: Record<string, any>;
}

export type BlogStatus = 'draft' | 'published' | 'scheduled' | 'archived';

export interface BlogSEOMetadata {
  title?: string;
  metaDescription?: string;
  targetKeyword?: string;
  secondaryKeywords?: string[];
  canonicalUrl?: string;
  noIndex?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
}

export interface BlogAuthor {
  id: string;
  name: string;
  role?: string;
  bio?: string;
  avatar?: string;
  socialLinks?: {
    twitter?: string;
    linkedin?: string;
    instagram?: string;
  };
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  coverImageAlt?: string;
  coverImageCaption?: string;
  category: string;
  tags: string[];
  status: BlogStatus;
  author: BlogAuthor;
  blocks: BlogBlock[];
  seo: BlogSEOMetadata;
  readTimeMinutes?: number;
  featured?: boolean;
  publishedAt?: string;
  scheduledAt?: string;
  createdAt: string;
  updatedAt: string;
}
