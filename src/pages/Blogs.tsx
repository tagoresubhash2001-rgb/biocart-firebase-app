import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { AdminService } from '../services/AdminService';
import { INITIAL_BLOG_POSTS } from '../data/initialBlogs';
import { BlogPost, BlogBlock } from '../types/blog';
import { 
  BookOpen, Calendar, Clock, User, ArrowRight, Search, 
  Tag, Sparkles, ChevronRight, Share2, Check, ExternalLink,
  HelpCircle, ShoppingBag, Quote, Info, AlertTriangle, Lightbulb
} from 'lucide-react';
import { BioCartLoader } from '../components/ui/BioCartLoader';

// Block renderer for single blog article
const RenderBlogBlock: React.FC<{ block: BlogBlock }> = ({ block }) => {
  const { setTab, setActiveProductDetails } = useApp();

  switch (block.type) {
    case 'heading': {
      const level = block.data.level || 2;
      const text = block.data.text || '';
      if (level === 2) {
        return (
          <h2 className="text-2xl md:text-3xl font-bold font-serif text-slate-900 mt-8 mb-4 border-b border-emerald-100 pb-2">
            {text}
          </h2>
        );
      }
      return (
        <h3 className="text-xl md:text-2xl font-bold font-sans text-slate-800 mt-6 mb-3">
          {text}
        </h3>
      );
    }

    case 'paragraph':
      return (
        <p className="text-slate-700 leading-relaxed font-sans text-base md:text-lg mb-5">
          {block.data.text}
        </p>
      );

    case 'list': {
      const items: string[] = block.data.items || [];
      const isOrdered = block.data.style === 'ordered';
      if (isOrdered) {
        return (
          <ol className="list-decimal pl-6 space-y-2 mb-6 text-slate-700 font-sans text-base">
            {items.map((it, idx) => (
              <li key={idx}>{it}</li>
            ))}
          </ol>
        );
      }
      return (
        <ul className="list-disc pl-6 space-y-2 mb-6 text-slate-700 font-sans text-base">
          {items.map((it, idx) => (
            <li key={idx}>{it}</li>
          ))}
        </ul>
      );
    }

    case 'callout': {
      const variant = block.data.variant || 'info';
      const variantStyles = {
        tip: 'bg-emerald-50 border-emerald-300 text-emerald-900',
        warning: 'bg-amber-50 border-amber-300 text-amber-900',
        info: 'bg-blue-50 border-blue-300 text-blue-900'
      };
      const Icon = variant === 'tip' ? Lightbulb : (variant === 'warning' ? AlertTriangle : Info);
      return (
        <div className={`p-5 rounded-2xl border ${variantStyles[variant as keyof typeof variantStyles] || variantStyles.info} my-6 flex items-start gap-3`}>
          <Icon className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            {block.data.title && <h4 className="font-bold text-sm mb-1">{block.data.title}</h4>}
            <p className="text-sm leading-relaxed">{block.data.text}</p>
          </div>
        </div>
      );
    }

    case 'quote':
      return (
        <blockquote className="my-6 p-6 bg-slate-50 border-l-4 border-emerald-600 rounded-r-2xl italic text-slate-800 text-lg">
          <Quote className="w-6 h-6 text-emerald-600 mb-2 opacity-50" />
          "{block.data.text}"
          {block.data.author && <span className="block text-xs font-bold text-emerald-800 mt-2 font-sans not-italic">— {block.data.author}</span>}
        </blockquote>
      );

    case 'table': {
      const headers: string[] = block.data.headers || [];
      const rows: string[][] = block.data.rows || [];
      return (
        <div className="overflow-x-auto my-6 rounded-2xl border border-slate-200 shadow-sm">
          <table className="w-full text-left text-xs md:text-sm">
            <thead className="bg-emerald-50 text-emerald-900 uppercase font-mono text-[11px]">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="p-3 border-b border-emerald-100">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/50">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="p-3 text-slate-700">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    case 'product_card':
      return (
        <div className="my-8 p-6 bg-gradient-to-br from-emerald-50/60 to-white border border-emerald-200 rounded-3xl shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-700 px-2.5 py-1 bg-emerald-100/60 rounded-full">
              Recommended Organic Supply
            </span>
            <h4 className="text-xl font-bold font-serif text-slate-900">{block.data.productName}</h4>
            <p className="text-sm text-slate-600 max-w-lg leading-relaxed">{block.data.description}</p>
            {block.data.price && <div className="text-lg font-bold text-emerald-800">{block.data.price}</div>}
          </div>
          <button
            onClick={() => {
              if (block.data.productId) {
                AdminService.getProductById(block.data.productId).then(prod => {
                  if (prod) {
                    setActiveProductDetails(prod);
                    setTab('product-details');
                  } else {
                    setTab('shop');
                  }
                }).catch(() => setTab('shop'));
              } else {
                setTab('shop');
              }
            }}
            className="px-6 py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-2xl shadow-md hover:scale-[1.02] transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>{block.data.buttonText || 'Buy Now on BioCart'}</span>
          </button>
        </div>
      );

    case 'faq': {
      const items: { question: string; answer: string }[] = block.data.items || [];
      return (
        <div className="my-8 space-y-3">
          <h3 className="text-xl font-bold font-serif text-slate-900 mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-emerald-600" />
            <span>Frequently Asked Questions</span>
          </h3>
          {items.map((item, idx) => (
            <details key={idx} className="group bg-slate-50 border border-slate-200 rounded-2xl p-4 transition-all">
              <summary className="font-bold text-slate-800 text-base cursor-pointer list-none flex justify-between items-center">
                <span>{item.question}</span>
                <span className="text-emerald-600 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <p className="text-slate-600 text-sm mt-3 leading-relaxed border-t border-slate-200/60 pt-3">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      );
    }

    case 'cta':
      return (
        <div className="my-10 p-8 md:p-12 bg-emerald-950 text-white rounded-3xl text-center space-y-4 shadow-xl">
          <h3 className="text-2xl md:text-3xl font-bold font-serif">{block.data.heading}</h3>
          <p className="text-emerald-200 text-sm md:text-base max-w-xl mx-auto">{block.data.subheading}</p>
          <button
            onClick={() => {
              if (block.data.buttonLink?.startsWith('http')) {
                window.open(block.data.buttonLink, '_blank', 'noopener,noreferrer');
              } else {
                setTab((block.data.buttonLink || 'shop').replace(/^\//, ''));
              }
            }}
            className="px-8 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold rounded-2xl shadow-lg hover:scale-105 transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <span>{block.data.buttonText || 'Explore BioCart'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      );

    case 'image':
      return (
        <figure className="my-8">
          <img
            src={block.data.url}
            alt={block.data.altText || ''}
            className="w-full rounded-2xl object-cover max-h-[500px] border border-slate-200"
            loading="lazy"
          />
          {block.data.caption && (
            <figcaption className="text-center text-xs text-slate-500 mt-2 font-medium">
              {block.data.caption}
            </figcaption>
          )}
        </figure>
      );

    case 'affiliate_link':
      return (
        <div className="my-4 p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
          <div>
            <span className="font-bold text-slate-800">{block.data.title || 'Partner Resource'}</span>
            <span className="ml-2 text-slate-500">({block.data.disclosure || 'Sponsored partner link'})</span>
          </div>
          <a
            href={block.data.url}
            target="_blank"
            rel="sponsored noopener noreferrer"
            className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
          >
            <span>{block.data.linkText || 'Visit Resource'}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      );

    default:
      return null;
  }
};

export const BlogsPage: React.FC = () => {
  const { activeBlogSlug, setTab, addToast } = useApp();
  const [blogs, setBlogs] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    const unsub = AdminService.subscribeToBlogs((remoteList) => {
      // Remote Firestore records are the single source of truth.
      // We do not silently merge seed drafts into public published results.
      if (Array.isArray(remoteList)) {
        setBlogs(remoteList);
      } else {
        setBlogs([]);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const publishedBlogs = useMemo(() => {
    return blogs.filter(b => b.status === 'published');
  }, [blogs]);

  // Categories list
  const categories = useMemo(() => {
    const set = new Set<string>();
    publishedBlogs.forEach(b => {
      if (b.category) set.add(b.category);
    });
    return ['All', ...Array.from(set)];
  }, [publishedBlogs]);

  // Filtered blogs
  const filteredBlogs = useMemo(() => {
    return publishedBlogs.filter(b => {
      const matchCat = selectedCategory === 'All' || b.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = !q || b.title.toLowerCase().includes(q) || b.excerpt.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [publishedBlogs, selectedCategory, searchQuery]);

  // Active single blog
  const activePost = useMemo(() => {
    if (!activeBlogSlug) return null;
    return publishedBlogs.find(b => b.slug === activeBlogSlug || b.id === activeBlogSlug) || null;
  }, [activeBlogSlug, publishedBlogs]);

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      addToast('Article URL copied to clipboard!', 'info');
      setTimeout(() => setCopiedLink(false), 3000);
    }
  };

  // 1. DETAIL VIEW (Single Article)
  if (activeBlogSlug) {
    if (loading) {
      return (
        <div className="flex-grow flex items-center justify-center min-h-[60vh]">
          <BioCartLoader message="Loading article..." size="md" />
        </div>
      );
    }

    if (!activePost) {
      return (
        <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
          <BookOpen className="w-16 h-16 text-slate-300 mx-auto mb-2" />
          <h2 className="text-2xl font-bold text-slate-900 font-serif">Article Not Found</h2>
          <p className="text-slate-600">The article you are looking for may have been moved or unpublished.</p>
          <button
            onClick={() => setTab('blogs')}
            className="px-6 py-2.5 bg-emerald-700 text-white rounded-xl font-bold cursor-pointer hover:bg-emerald-800 transition-all"
          >
            Return to All Blogs
          </button>
        </div>
      );
    }

    return (
      <article className="min-h-screen bg-[#FAFCFA] py-10 md:py-16">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6 font-medium">
            <button onClick={() => setTab('home')} className="hover:text-emerald-700 cursor-pointer">Home</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <button onClick={() => setTab('blogs')} className="hover:text-emerald-700 cursor-pointer">Blogs</button>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-slate-800 truncate max-w-[200px]">{activePost.category}</span>
          </nav>

          {/* Title Header */}
          <header className="space-y-4 mb-8">
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider rounded-full">
              {activePost.category}
            </span>
            <h1 className="text-3xl md:text-5xl font-serif font-extrabold text-slate-950 leading-tight">
              {activePost.title}
            </h1>
            <p className="text-slate-600 font-sans text-lg md:text-xl leading-relaxed">
              {activePost.excerpt}
            </p>

            {/* Author & Timestamp Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-3">
                {activePost.author?.avatar ? (
                  <img
                    src={activePost.author.avatar}
                    alt={activePost.author.name}
                    className="w-11 h-11 rounded-full object-cover border border-emerald-200"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    {activePost.author?.name ? activePost.author.name.charAt(0) : 'B'}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-sm text-slate-900">{activePost.author?.name || 'BioCart Editorial'}</h4>
                  <p className="text-xs text-slate-500">{activePost.author?.role || 'Agronomy Contributor'}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  {new Date(activePost.publishedAt || activePost.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  {activePost.readTimeMinutes || 5} min read
                </span>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer shadow-sm"
                  title="Share Article"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied' : 'Share'}</span>
                </button>
              </div>
            </div>
          </header>

          {/* Featured Cover Image */}
          {activePost.coverImage && (
            <figure className="mb-10">
              <img
                src={activePost.coverImage}
                alt={activePost.coverImageAlt || activePost.title}
                className="w-full rounded-3xl object-cover max-h-[520px] shadow-sm border border-slate-200/80"
              />
              {activePost.coverImageCaption && (
                <figcaption className="text-center text-xs text-slate-500 mt-2 font-medium">
                  {activePost.coverImageCaption}
                </figcaption>
              )}
            </figure>
          )}

          {/* Article Blocks Body */}
          <div className="bg-white rounded-3xl p-6 md:p-12 border border-slate-200/80 shadow-sm mb-12">
            {activePost.blocks && activePost.blocks.length > 0 ? (
              activePost.blocks.map((block) => (
                <RenderBlogBlock key={block.id} block={block} />
              ))
            ) : (
              <p className="text-slate-600 leading-relaxed">{activePost.excerpt}</p>
            )}

            {/* Tags footer */}
            {activePost.tags && activePost.tags.length > 0 && (
              <div className="mt-10 pt-6 border-t border-slate-100 flex flex-wrap items-center gap-2">
                <Tag className="w-4 h-4 text-emerald-600" />
                {activePost.tags.map((tag, tIdx) => (
                  <span
                    key={tIdx}
                    className="px-3 py-1 bg-slate-100 text-slate-700 text-xs rounded-full font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Author Box */}
          {activePost.author && (
            <div className="p-6 md:p-8 bg-emerald-50/50 border border-emerald-100 rounded-3xl flex flex-col sm:flex-row items-center sm:items-start gap-5 mb-12">
              {activePost.author.avatar && (
                <img
                  src={activePost.author.avatar}
                  alt={activePost.author.name}
                  className="w-16 h-16 rounded-full object-cover border-2 border-emerald-300"
                />
              )}
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-800">About the Author</span>
                <h4 className="text-lg font-bold text-slate-900">{activePost.author.name}</h4>
                <p className="text-xs text-emerald-700 font-semibold">{activePost.author.role}</p>
                <p className="text-sm text-slate-600 pt-1 leading-relaxed">{activePost.author.bio}</p>
              </div>
            </div>
          )}

          {/* Back to blogs button */}
          <div className="text-center pt-4">
            <button
              onClick={() => setTab('blogs')}
              className="px-8 py-3 bg-white border border-slate-300 hover:border-emerald-600 text-slate-800 hover:text-emerald-700 font-bold rounded-2xl transition-all cursor-pointer shadow-sm"
            >
              ← Back to All Articles & Agronomy Guides
            </button>
          </div>
        </div>
      </article>
    );
  }

  // 2. LISTING ARCHIVE VIEW
  return (
    <div className="min-h-screen bg-[#FAFCFA] py-12 md:py-16">
      <div className="max-w-7xl mx-auto px-4 md:px-8 space-y-10">
        {/* Banner Header */}
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <span className="px-3.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider rounded-full inline-flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            BioCart Knowledge Journal
          </span>
          <h1 className="text-3xl md:text-5xl font-serif font-extrabold text-slate-950 tracking-tight">
            Indian Organic Agriculture & Plant Care Guides
          </h1>
          <p className="text-slate-600 text-base md:text-lg leading-relaxed font-sans">
            Practical advice on vermicomposting, soil regeneration, pest defense, and container horticulture from certified agronomists.
          </p>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
          {/* Search */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search articles by keyword..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Category Pills */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {categories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Blog Cards Grid */}
        {loading ? (
          <div className="flex justify-center py-20">
            <BioCartLoader message="Loading latest journals..." size="md" />
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h3 className="text-lg font-bold text-slate-800">No articles found</h3>
            <p className="text-xs text-slate-500 mt-1">Try resetting your search query or category filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredBlogs.map((post) => (
              <article
                key={post.id}
                onClick={() => setTab('blogs', { blogSlug: post.slug })}
                className="bg-white rounded-3xl border border-slate-200/80 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col group"
              >
                {/* Thumbnail */}
                <div className="relative h-52 overflow-hidden bg-slate-100">
                  <img
                    src={post.coverImage}
                    alt={post.coverImageAlt || post.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                  <span className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-md text-emerald-800 text-[10px] font-bold uppercase tracking-wider rounded-full shadow-sm">
                    {post.category}
                  </span>
                </div>

                {/* Card Content */}
                <div className="p-6 flex-grow flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                      <span>
                        {new Date(post.publishedAt || post.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </span>
                      <span>•</span>
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{post.readTimeMinutes || 5} min read</span>
                    </div>

                    <h2 className="text-xl font-bold font-serif text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-2">
                      {post.title}
                    </h2>
                    <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                      {post.excerpt}
                    </p>
                  </div>

                  {/* Card Footer: Author + Read Link */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 truncate max-w-[150px]">
                      By {post.author?.name || 'BioCart Agronomist'}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                      Read Article →
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
