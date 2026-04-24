"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export interface NewsItem {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  date: string;
  author: string;
  readTime: number;
  featured?: boolean;
}

const FALLBACK_NEWS: NewsItem[] = [
  {
    slug: "produkt-lansering-2026",
    title: "ShopMan 2.0 lanseras — multishop, B2B och Fortnox i ett",
    category: "Produkt",
    excerpt: "Idag lanserar vi ShopMan 2.0 — den mest ambitiösa uppdateringen sedan plattformens start. Med inbyggt multishop-stöd, B2B-prissättning och native Fortnox-integration tar vi steget mot att bli Sveriges ledande e-handelsplattform för tillväxthandlare.",
    date: "2026-04-15",
    author: "Andreas Svensson",
    readTime: 5,
    featured: true,
  },
  {
    slug: "fortnox-partnerskap",
    title: "ShopMan ingår officiellt partnerskap med Fortnox",
    category: "Partner",
    excerpt: "Vi är stolta att meddela att ShopMan nu är ett officiellt Fortnox-partnerföretag. Integrationen ger SwedishMerchants sömlös bokföring med automatisk fakturahantering och momsredovisning.",
    date: "2026-03-28",
    author: "Maria Lindqvist",
    readTime: 3,
  },
  {
    slug: "postnord-frakt-integration",
    title: "Ny frakt-integration: PostNord och DHL aktiveras med ett klick",
    category: "Produkt",
    excerpt: "Slut med manuella fraktsedlar. ShopMans nya fraktmodul integrerar direkt med PostNord, DHL Express och Bring — och genererar automatiskt fraktsedlar och spårningslänkar vid orderbekräftelse.",
    date: "2026-03-10",
    author: "Erik Bergström",
    readTime: 4,
  },
  {
    slug: "e-handel-trender-2026",
    title: "5 e-handelstrender som formar 2026 — och hur du hänger med",
    category: "Bransch",
    excerpt: "Från AI-driven produktbeskrivning till headless commerce och social selling — vi har sammanställt de fem viktigaste trenderna för svenska e-handlare under 2026 och vad de innebär för din butik.",
    date: "2026-02-20",
    author: "Sofia Johansson",
    readTime: 7,
  },
];

const CATEGORIES = ["Alla", "Produkt", "Företag", "Partner", "Bransch"];

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    Produkt: "bg-blue-100 text-blue-700",
    Företag: "bg-zinc-100 text-zinc-700",
    Partner: "bg-green-100 text-green-700",
    Bransch: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${colors[category] ?? "bg-zinc-100 text-zinc-700"}`}>
      {category}
    </span>
  );
}

function FeaturedNewsCard({ item }: { item: NewsItem }) {
  return (
    <Link href={`/news/${item.slug}`} className="group block bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden hover:shadow-md transition-all">
      <div className="h-48 bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
        <span className="text-6xl opacity-30">📰</span>
      </div>
      <div className="p-8">
        <div className="flex items-center gap-3 mb-3">
          <CategoryBadge category={item.category} />
          <span className="text-sm text-zinc-400">{formatDate(item.date)}</span>
          <span className="text-sm text-zinc-400">·</span>
          <span className="text-sm text-zinc-400">{item.readTime} min läsning</span>
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-zinc-900 group-hover:text-blue-600 transition-colors mb-3 leading-tight">
          {item.title}
        </h2>
        <p className="text-zinc-600 leading-relaxed mb-4">{item.excerpt}</p>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            {item.author.split(" ").map(n => n[0]).join("")}
          </div>
          <span className="text-sm text-zinc-500">{item.author}</span>
        </div>
      </div>
    </Link>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <Link href={`/news/${item.slug}`} className="group block bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 hover:shadow-md transition-all">
      <div className="flex items-center gap-2 mb-3">
        <CategoryBadge category={item.category} />
        <span className="text-xs text-zinc-400">{item.readTime} min</span>
      </div>
      <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors mb-2 leading-snug">
        {item.title}
      </h3>
      <p className="text-sm text-zinc-500 leading-relaxed line-clamp-2 mb-4">{item.excerpt}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold">
            {item.author.split(" ").map(n => n[0]).join("")}
          </div>
          <span className="text-xs text-zinc-500">{item.author}</span>
        </div>
        <time className="text-xs text-zinc-400">{formatDate(item.date)}</time>
      </div>
    </Link>
  );
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>(FALLBACK_NEWS);
  const [activeCategory, setActiveCategory] = useState("Alla");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
    fetch(`${API}/api/cms/posts?type=news&lang=sv&limit=50`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        const items = Array.isArray(data) ? data : (data?.data ?? []);
        if (items.length > 0) setNews(items);
      })
      .catch(() => {});
  }, []);

  const filtered = news.filter(item => {
    const matchesCategory = activeCategory === "Alla" || item.category === activeCategory;
    const matchesSearch = search === "" || item.title.toLowerCase().includes(search.toLowerCase()) || item.excerpt.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featured = filtered.find(i => i.featured) ?? filtered[0];
  const rest = filtered.filter(i => i !== featured);

  return (
    <>
      <Nav />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-br from-zinc-50 to-blue-50 py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4">
            <div className="max-w-2xl">
              <h1 className="text-3xl md:text-5xl font-bold text-zinc-900 mb-4">
                Nyheter & Pressrum
              </h1>
              <p className="text-lg text-zinc-600">
                Senaste nytt från ShopMan — produktuppdateringar, partnerskap och insikter om e-handelsbranschen.
              </p>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    activeCategory === cat
                      ? "bg-blue-600 text-white"
                      : "bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Sök nyheter..."
              className="border border-zinc-200 rounded-xl px-4 py-2 text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>
        </section>

        {/* Featured */}
        {featured && (
          <section className="max-w-6xl mx-auto px-4 pb-8">
            <FeaturedNewsCard item={featured} />
          </section>
        )}

        {/* Grid */}
        {rest.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 pb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {rest.map(item => (
                <NewsCard key={item.slug} item={item} />
              ))}
            </div>
          </section>
        )}

        {filtered.length === 0 && (
          <section className="max-w-6xl mx-auto px-4 pb-16 text-center py-16">
            <p className="text-zinc-500">Inga nyheter hittades för dessa filter.</p>
          </section>
        )}

        {/* RSS link */}
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-zinc-900 mb-1">Prenumerera via RSS</h3>
              <p className="text-sm text-zinc-500">Följ ShopMan-nyheter direkt i din RSS-läsare.</p>
            </div>
            <Link href="/news/rss" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-2">
              <span>📡</span>
              <span>RSS-feed</span>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
