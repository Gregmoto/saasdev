import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildMetadata, SITE_URL } from "@/lib/metadata";
import { articleSchema, breadcrumbSchema } from "@/lib/schema-org";

export const revalidate = 3600;

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

// ---------------------------------------------------------------------------
// Fallback static posts (used when CMS is unavailable)
// ---------------------------------------------------------------------------

interface StaticPost {
  title: string;
  date: string;
  isoDate: string;
  category: string;
  categoryColor: string;
  readTime: string;
  author: string;
  role: string;
  description: string;
  content: { type: "p" | "h2" | "ul"; text?: string; items?: string[] }[];
}

const STATIC_POSTS: Record<string, StaticPost> = {
  launch: {
    title: "ShopMan 1.0 lanseras",
    date: "1 april 2024",
    isoDate: "2024-04-01",
    category: "Nyheter",
    categoryColor: "bg-blue-50 text-blue-700",
    readTime: "3 min",
    author: "ShopMan-teamet",
    role: "Produktnyheter",
    description:
      "Vi presenterar ShopMan 1.0 — den samlade handelsplattformen för moderna handlare.",
    content: [
      {
        type: "p",
        text: "Vi är glada att kunna presentera ShopMan — den samlade handelsplattformen för moderna handlare. Efter månader av utveckling är vi redo att öppna upp plattformen för alla.",
      },
      { type: "h2", text: "Vad ingår i version 1.0?" },
      {
        type: "ul",
        items: [
          "Fullständigt produkthanteringssystem med varianter och lager",
          "Orderhantering med fullt spårningsstöd",
          "Kundregister med unified profiler",
          "Importcenter med stöd för Shopify, WooCommerce och CSV",
          "Betalningsintegrationer via Stripe",
        ],
      },
      {
        type: "p",
        text: "Vi bygger ShopMan med Skandinavien i fokus — enkelt, transparent och byggt för att växa med dig.",
      },
      { type: "h2", text: "Vad kommer härnäst?" },
      {
        type: "p",
        text: "Under de kommande månaderna kommer vi lansera Swish och Klarna-integrationer, en fullständig storefront-byggare samt förbättrade AI-verktyg för produktbeskrivningar och prisoptimering.",
      },
    ],
  },
  "import-guide": {
    title: "Importera från Shopify på 5 minuter",
    date: "20 mars 2024",
    isoDate: "2024-03-20",
    category: "Guide",
    categoryColor: "bg-violet-50 text-violet-700",
    readTime: "5 min",
    author: "ShopMan-teamet",
    role: "Guide",
    description:
      "Steg-för-steg-guide för att migrera din Shopify-butik till ShopMan med vårt Importcenter.",
    content: [
      {
        type: "p",
        text: "Att migrera från Shopify till ShopMan är enklare än du tror. Med vårt Importcenter kan du ha alla dina produkter, kunder och ordrar på plats på under fem minuter.",
      },
      { type: "h2", text: "Steg 1: Exportera från Shopify" },
      {
        type: "p",
        text: "Gå till Shopify Admin → Inställningar → Exportera. Välj CSV-format och ladda ner filerna för produkter, kunder och ordrar.",
      },
      { type: "h2", text: "Steg 2: Importera i ShopMan" },
      {
        type: "p",
        text: "Gå till Importcenter i ShopMan Admin. Välj \"Shopify\" som källa och ladda upp dina CSV-filer. Systemet mappar automatiskt alla fält.",
      },
      { type: "h2", text: "Steg 3: Kontrollera resultatet" },
      {
        type: "p",
        text: "När importen är klar kan du granska eventuella konflikter i konfliktlistan och bestämma hur de ska lösas. ShopMan hjälper dig med AI-baserade förslag.",
      },
    ],
  },
  "inventory-tips": {
    title: "Bästa praxis för lagerhantering i realtid",
    date: "10 mars 2024",
    isoDate: "2024-03-10",
    category: "Tips",
    categoryColor: "bg-emerald-50 text-emerald-700",
    readTime: "7 min",
    author: "ShopMan-teamet",
    role: "Tips & tricks",
    description:
      "Hur du ställer in lagerroutning, reservationer och automatiserade beställningspunkter i ShopMan.",
    content: [
      {
        type: "p",
        text: "Effektiv lagerhantering är en av de viktigaste faktorerna för en lönsam e-handel. Här är våra bästa tips för att få ut maximalt av ShopMans lagersystem.",
      },
      { type: "h2", text: "Sätt upp lagerreservationer" },
      {
        type: "p",
        text: "Aktivera automatiska reservationer vid kassan för att undvika överbokningar. ShopMan reserverar lager direkt när kunden påbörjar kassan och frigör det om betalningen misslyckas.",
      },
      { type: "h2", text: "Konfigurera lagerroutning" },
      {
        type: "p",
        text: "Om du har flera lager kan du ange prioritetsordning och automatisk routning baserat på lagersaldo och leveranstid.",
      },
      { type: "h2", text: "Beställningspunkter" },
      {
        type: "ul",
        items: [
          "Sätt upp lågt lagersaldo-varningar per SKU",
          "Konfigurera automatiska inköpsförslag",
          "Synka med leverantörsflöden för automatisk påfyllning",
        ],
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// CMS fetch helpers
// ---------------------------------------------------------------------------

interface CmsPost {
  slug: string;
  title: string;
  description?: string;
  excerpt?: string;
  body?: string;
  publishedAt: string;
  updatedAt: string;
  authorName?: string;
  category?: string;
  categoryColor?: string;
  coverImageUrl?: string;
  readTime?: string;
}

async function fetchCmsPost(slug: string): Promise<CmsPost | null> {
  try {
    const res = await fetch(`${API}/api/cms/posts/${slug}?lang=sv`, {
      next: { revalidate: 3600 },
    });
    const _ct = res.headers.get("content-type") ?? "";
    if (!res.ok || !_ct.includes("application/json")) return null;
    const data = await res.json();
    return data?.data ?? data ?? null;
  } catch {
    return null;
  }
}

async function fetchAllSlugs(): Promise<string[]> {
  try {
    const res = await fetch(
      `${API}/api/cms/posts?type=blog&lang=sv&limit=100`,
      { cache: "no-store" }
    );
    if (!res.ok) return [];
    const data = await res.json();
    const posts: Array<{ slug: string }> = Array.isArray(data)
      ? data
      : (data?.data ?? []);
    return posts.map((p) => p.slug);
  } catch {
    return [];
  }
}

export async function generateStaticParams() {
  const cmsslugs = await fetchAllSlugs();
  const staticSlugs = Object.keys(STATIC_POSTS);
  const all = Array.from(new Set([...staticSlugs, ...cmsslugs]));
  return all.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const cmsPost = await fetchCmsPost(slug);

  if (cmsPost) {
    const base = buildMetadata({
      title: cmsPost.title,
      description: cmsPost.description ?? cmsPost.excerpt ?? cmsPost.title,
      path: `/blog/${slug}`,
      ogImage: cmsPost.coverImageUrl,
    });
    return {
      ...base,
      openGraph: {
        ...base.openGraph,
        type: "article",
        publishedTime: cmsPost.publishedAt,
        modifiedTime: cmsPost.updatedAt,
        authors: [cmsPost.authorName ?? "ShopMan-teamet"],
      },
    };
  }

  const staticPost = STATIC_POSTS[slug];
  if (staticPost) {
    return buildMetadata({
      title: staticPost.title,
      description: staticPost.description,
      path: `/blog/${slug}`,
    });
  }

  return buildMetadata({
    title: "Inlägg hittades inte",
    description: "Det här blogginlägget finns inte längre.",
    path: `/blog/${slug}`,
    noIndex: true,
  });
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  // Try CMS first, fall back to static data
  const cmsPost = await fetchCmsPost(slug);
  const staticPost = STATIC_POSTS[slug];

  if (!cmsPost && !staticPost) {
    notFound();
  }

  // Build unified view data
  const title = cmsPost?.title ?? staticPost!.title;
  const authorName = cmsPost?.authorName ?? staticPost!.author;
  const isoDate = cmsPost?.publishedAt ?? staticPost!.isoDate;
  const updatedAt = cmsPost?.updatedAt ?? isoDate;
  const description =
    cmsPost?.description ?? cmsPost?.excerpt ?? staticPost?.description ?? "";
  const category = cmsPost?.category ?? staticPost?.category;
  const categoryColor = staticPost?.categoryColor ?? "bg-zinc-50 text-zinc-700";
  const readTime = cmsPost?.readTime ?? staticPost?.readTime;
  const coverImageUrl = cmsPost?.coverImageUrl;

  const postUrl = `${SITE_URL}/blog/${slug}`;
  const ldArticle = articleSchema({
    title,
    url: postUrl,
    description,
    publishedAt: isoDate,
    updatedAt,
    authorName,
    coverImageUrl,
  });
  const ldBreadcrumb = breadcrumbSchema([
    { label: "Hem", url: SITE_URL },
    { label: "Blogg", url: `${SITE_URL}/blog` },
    { label: title, url: postUrl },
  ]);

  const formattedDate = new Date(isoDate).toLocaleDateString("sv-SE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([ldArticle, ldBreadcrumb]),
        }}
      />
      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Back */}
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-700 transition-colors mb-10"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
          >
            <path
              d="M11 7H3M7 3L3 7l4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Tillbaka till bloggen
        </Link>

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-center gap-3 mb-4">
            {category && (
              <span
                className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${categoryColor}`}
              >
                {category}
              </span>
            )}
            {readTime && (
              <span className="text-xs text-zinc-400">{readTime} läsning</span>
            )}
          </div>
          <h1 className="text-4xl font-bold text-zinc-950 tracking-tight leading-tight mb-6">
            {title}
          </h1>
          <div className="flex items-center gap-3 py-4 border-y border-zinc-100">
            <div className="w-8 h-8 rounded-full bg-zinc-200 flex items-center justify-center">
              <span className="text-xs font-semibold text-zinc-500">
                {authorName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="text-sm font-medium text-zinc-900">
                {authorName}
              </div>
              <time
                dateTime={isoDate}
                className="text-xs text-zinc-400"
              >
                {formattedDate}
              </time>
            </div>
          </div>
        </header>

        {/* Cover image */}
        {coverImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverImageUrl}
            alt={title}
            className="w-full rounded-2xl mb-10 object-cover max-h-[400px]"
          />
        )}

        {/* Content — CMS body (plain text paragraphs) or static structured content */}
        <div className="prose-zinc">
          {cmsPost?.body ? (
            cmsPost.body
              .split(/\n\n+/)
              .filter(Boolean)
              .map((para, i) => (
                <p
                  key={i}
                  className="text-zinc-600 leading-relaxed mb-6"
                >
                  {para}
                </p>
              ))
          ) : (
            staticPost!.content.map((block, i) => {
              if (block.type === "h2")
                return (
                  <h2
                    key={i}
                    className="text-xl font-bold text-zinc-950 tracking-tight mt-10 mb-4"
                  >
                    {block.text}
                  </h2>
                );
              if (block.type === "p")
                return (
                  <p key={i} className="text-zinc-600 leading-relaxed mb-6">
                    {block.text}
                  </p>
                );
              if (block.type === "ul")
                return (
                  <ul key={i} className="space-y-2 mb-6 ml-4">
                    {block.items?.map((item) => (
                      <li
                        key={item}
                        className="flex items-start gap-2 text-zinc-600"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
                        {item}
                      </li>
                    ))}
                  </ul>
                );
              return null;
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-zinc-100 flex items-center justify-between">
          <Link
            href="/blog"
            className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            ← Alla artiklar
          </Link>
          <div className="text-xs text-zinc-400">Dela den här artikeln</div>
        </div>
      </main>
      <Footer />
    </>
  );
}
