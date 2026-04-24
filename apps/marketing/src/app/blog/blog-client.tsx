"use client";

import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  dateFormatted: string;
  category: string;
  categoryColor: string;
  excerpt: string;
  readTime: string;
  featured: boolean;
}

export default function BlogClient({ posts }: { posts: BlogPost[] }) {
  const [featured, ...rest] = posts;

  if (!featured) {
    return (
      <>
        <Nav />
        <main className="max-w-6xl mx-auto px-6 py-16">
          <div className="mb-12">
            <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
              Blogg
            </div>
            <h1 className="text-4xl font-bold text-zinc-950 tracking-tight mb-2">
              Nyheter &amp; insikter
            </h1>
            <p className="text-zinc-500">
              Guider, nyheter och insikter från ShopMan-teamet.
            </p>
          </div>
          <p className="text-zinc-400">Inga inlägg ännu. Återkom snart!</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-2">
            Blogg
          </div>
          <h1 className="text-4xl font-bold text-zinc-950 tracking-tight mb-2">
            Nyheter &amp; insikter
          </h1>
          <p className="text-zinc-500">
            Guider, nyheter och insikter från ShopMan-teamet.
          </p>
        </div>

        {/* Featured post */}
        <Link href={`/blog/${featured.slug}`} className="group block mb-8">
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden">
            <div className="md:flex">
              {/* Image placeholder */}
              <div className="md:w-2/5 bg-gradient-to-br from-blue-50 to-blue-100 min-h-[240px] flex items-center justify-center">
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#93c5fd"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </div>
              {/* Content */}
              <div className="md:w-3/5 p-8 flex flex-col justify-center">
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${featured.categoryColor}`}
                  >
                    {featured.category}
                  </span>
                  <span className="text-xs text-zinc-400">
                    {featured.readTime} läsning
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-zinc-950 tracking-tight mb-3 group-hover:text-blue-600 transition-colors">
                  {featured.title}
                </h2>
                <p className="text-zinc-500 leading-relaxed mb-4">
                  {featured.excerpt}
                </p>
                <div className="flex items-center justify-between">
                  <time className="text-xs text-zinc-400">
                    {featured.dateFormatted}
                  </time>
                  <span className="text-sm font-medium text-blue-600 group-hover:underline">
                    Läs mer →
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Link>

        {/* Rest of posts */}
        {rest.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rest.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group block"
              >
                <article className="bg-white rounded-2xl border border-zinc-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden h-full flex flex-col">
                  {/* Image placeholder */}
                  <div className="bg-gradient-to-br from-zinc-50 to-zinc-100 h-40 flex items-center justify-center">
                    <svg
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#d4d4d8"
                      strokeWidth="1"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  {/* Content */}
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${post.categoryColor}`}
                      >
                        {post.category}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {post.readTime} läsning
                      </span>
                    </div>
                    <h2 className="font-bold text-zinc-950 tracking-tight mb-2 group-hover:text-blue-600 transition-colors">
                      {post.title}
                    </h2>
                    <p className="text-sm text-zinc-500 leading-relaxed flex-1 mb-4">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-zinc-50">
                      <time className="text-xs text-zinc-400">
                        {post.dateFormatted}
                      </time>
                      <span className="text-xs font-medium text-blue-600 group-hover:underline">
                        Läs mer →
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
        )}

        {/* Newsletter signup */}
        <div className="mt-16 bg-zinc-950 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-2">
            Håll dig uppdaterad
          </h3>
          <p className="text-zinc-400 text-sm mb-6">
            Få nya artiklar och produktnyheter direkt i inkorgen.
          </p>
          <form
            className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto"
            onSubmit={(e) => e.preventDefault()}
          >
            <input
              type="email"
              placeholder="din@epost.se"
              className="flex-1 bg-zinc-900 border border-zinc-700 text-white placeholder-zinc-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2.5 rounded-xl text-sm transition-colors whitespace-nowrap"
            >
              Prenumerera
            </button>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
