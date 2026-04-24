import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { buildMetadata, SITE_URL } from "@/lib/metadata";
import { articleSchema, breadcrumbSchema } from "@/lib/schema-org";

export const revalidate = 3600;

interface NewsArticle {
  slug: string;
  title: string;
  category: string;
  excerpt: string;
  date: string;
  updatedAt: string;
  author: string;
  authorRole: string;
  readTime: number;
  body: string;
  related: string[];
}

const ARTICLES: Record<string, NewsArticle> = {
  "produkt-lansering-2026": {
    slug: "produkt-lansering-2026",
    title: "ShopMan 2.0 lanseras — multishop, B2B och Fortnox i ett",
    category: "Produkt",
    excerpt: "Idag lanserar vi ShopMan 2.0 — den mest ambitiösa uppdateringen sedan plattformens start.",
    date: "2026-04-15",
    updatedAt: "2026-04-15",
    author: "Andreas Svensson",
    authorRole: "VD & Medgrundare",
    readTime: 5,
    body: `
<p>Idag är en milstolpe för oss på ShopMan. Efter månader av intensivt utvecklingsarbete och tätt samarbete med hundratals handlare är vi stolta att presentera <strong>ShopMan 2.0</strong> — den mest genomgripande uppdateringen vi någonsin gjort.</p>

<h2>Multishop — hantera alla marknader från ett ställe</h2>
<p>Den mest efterfrågade funktionen är äntligen här. Med ShopMan 2.0 kan du driva obegränsat antal butiker under ett och samma konto. Dela produktkatalog, kunder och lager mellan marknader — eller håll dem helt separata. Det är ditt val.</p>
<p>Prissättning per marknad, separata domäner och anpassade betalningslösningar per land — allt hanteras från en enda adminpanel.</p>

<h2>B2B-prissättning utan kompromisser</h2>
<p>Grossister och återförsäljare har länge önskat ett ordentligt B2B-läge. Nu finns det. Skapa kundgrupper med individuella prislistor, minsta orderkvantiteter och kreditgränser. Separera B2B- och B2C-kassan helt eller kombinera dem.</p>

<h2>Native Fortnox-integration</h2>
<p>Vi har byggt en djupgående, certifierad integration mot Fortnox. Varje order skapar automatiskt en faktura i Fortnox med rätt konto, momskod och kostnadsbärare. Inga CSV-exporter, inga manuella rutiner.</p>

<h2>Vad händer nu?</h2>
<p>ShopMan 2.0 rullas ut till alla kunder under de kommande veckorna. Befintliga kunder uppgraderas automatiskt utan avbrott. Alla nya funktioner ingår i Growth- och Enterprise-planerna.</p>
<p>Läs vår fullständiga changelog för en komplett lista över alla förändringar, eller boka en demo för att se allt live.</p>
    `,
    related: ["fortnox-partnerskap", "postnord-frakt-integration"],
  },
  "fortnox-partnerskap": {
    slug: "fortnox-partnerskap",
    title: "ShopMan ingår officiellt partnerskap med Fortnox",
    category: "Partner",
    excerpt: "Vi är stolta att meddela att ShopMan nu är ett officiellt Fortnox-partnerföretag.",
    date: "2026-03-28",
    updatedAt: "2026-03-28",
    author: "Maria Lindqvist",
    authorRole: "Affärsutveckling",
    readTime: 3,
    body: `
<p>ShopMan och Fortnox ingår idag ett officiellt partnerskap som gör ShopMan till en certifierad Fortnox-apppartner. Det innebär att ShopMans Fortnox-integration är granskad, testad och godkänd av Fortnox egna tekniker.</p>

<h2>Vad innebär partnerskapet?</h2>
<p>Som certifierad Fortnox-partner har ShopMan tillgång till Fortnox djupaste API-nivåer och kan erbjuda funktioner som inte är tillgängliga för icke-certifierade integrationer. Det innebär bland annat:</p>
<ul>
  <li>Realtidssynkronisering av ordrar, kunder och fakturor</li>
  <li>Automatisk hantering av EU-moms och OSS</li>
  <li>Stöd för Fortnox Lager med lagerplatshantering</li>
  <li>Prioriterad teknisk support från Fortnox</li>
</ul>

<h2>För ShopMans kunder</h2>
<p>Alla ShopMan-kunder på Growth- och Enterprise-planerna får tillgång till den certifierade Fortnox-integrationen utan extra kostnad. Aktivering tar under fem minuter via ShopMans integrationsportal.</p>

<h2>Om Fortnox</h2>
<p>Fortnox är Sveriges ledande leverantör av molnbaserade affärssystem med över 450 000 företagskunder. Deras bokföringssystem används av majoriteten av svenska small business-ägare och redovisningskonsulter.</p>
    `,
    related: ["produkt-lansering-2026", "postnord-frakt-integration"],
  },
};

const FALLBACK_ARTICLES_BASIC = [
  { slug: "produkt-lansering-2026", title: "ShopMan 2.0 lanseras", category: "Produkt", date: "2026-04-15", author: "Andreas Svensson", readTime: 5 },
  { slug: "fortnox-partnerskap", title: "ShopMan ingår officiellt partnerskap med Fortnox", category: "Partner", date: "2026-03-28", author: "Maria Lindqvist", readTime: 3 },
  { slug: "postnord-frakt-integration", title: "Ny frakt-integration: PostNord och DHL", category: "Produkt", date: "2026-03-10", author: "Erik Bergström", readTime: 4 },
  { slug: "e-handel-trender-2026", title: "5 e-handelstrender som formar 2026", category: "Bransch", date: "2026-02-20", author: "Sofia Johansson", readTime: 7 },
];

export async function generateStaticParams() {
  return FALLBACK_ARTICLES_BASIC.map(a => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = ARTICLES[slug];
  if (!article) return {};

  return buildMetadata({
    title: article.title,
    description: article.excerpt,
    path: `/news/${slug}`,
  });
}

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

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = ARTICLES[slug];

  if (!article) notFound();

  const schema = articleSchema({
    title: article.title,
    url: `${SITE_URL}/news/${slug}`,
    description: article.excerpt,
    publishedAt: article.date,
    updatedAt: article.updatedAt,
    authorName: article.author,
  });

  const breadcrumb = breadcrumbSchema([
    { label: "Hem", url: SITE_URL },
    { label: "Nyheter", url: `${SITE_URL}/news` },
    { label: article.title, url: `${SITE_URL}/news/${slug}` },
  ]);

  const relatedArticles = FALLBACK_ARTICLES_BASIC.filter(
    a => article.related.includes(a.slug)
  );

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <Nav />
      <main>
        {/* Hero */}
        <section className="bg-gradient-to-br from-zinc-50 to-blue-50 py-12 md:py-20">
          <div className="max-w-3xl mx-auto px-4">
            <div className="mb-6">
              <Link href="/news" className="text-sm text-blue-600 hover:text-blue-700">← Alla nyheter</Link>
            </div>
            <div className="flex items-center gap-3 mb-4">
              <CategoryBadge category={article.category} />
              <time className="text-sm text-zinc-400">{formatDate(article.date)}</time>
              <span className="text-sm text-zinc-400">·</span>
              <span className="text-sm text-zinc-400">{article.readTime} min läsning</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-zinc-900 mb-4 leading-tight">
              {article.title}
            </h1>
            <p className="text-lg text-zinc-600 mb-6">{article.excerpt}</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center text-white font-bold">
                {article.author.split(" ").map(n => n[0]).join("")}
              </div>
              <div>
                <div className="font-medium text-zinc-900 text-sm">{article.author}</div>
                <div className="text-xs text-zinc-500">{article.authorRole}</div>
              </div>
            </div>
          </div>
        </section>

        {/* Featured image */}
        <section className="max-w-3xl mx-auto px-4 py-8">
          <div className="h-64 md:h-80 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center overflow-hidden relative">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "24px 24px" }} />
            <span className="text-7xl opacity-40">📰</span>
          </div>
        </section>

        {/* Article body */}
        <section className="max-w-3xl mx-auto px-4 pb-12">
          <div
            className="prose prose-zinc max-w-none prose-headings:font-bold prose-headings:text-zinc-900 prose-p:text-zinc-600 prose-p:leading-relaxed prose-li:text-zinc-600 prose-a:text-blue-600"
            dangerouslySetInnerHTML={{ __html: article.body }}
          />
        </section>

        {/* Social sharing */}
        <section className="max-w-3xl mx-auto px-4 pb-12">
          <div className="bg-zinc-50 rounded-2xl border border-zinc-200 p-6">
            <h3 className="font-semibold text-zinc-900 mb-4">Dela den här artikeln</h3>
            <div className="flex flex-wrap gap-3">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(`${SITE_URL}/news/${slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white border border-zinc-200 hover:border-zinc-400 text-zinc-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                𝕏 Twitter
              </a>
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${SITE_URL}/news/${slug}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white border border-zinc-200 hover:border-zinc-400 text-zinc-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                LinkedIn
              </a>
              <Link
                href="/news/rss"
                className="flex items-center gap-2 bg-white border border-zinc-200 hover:border-zinc-400 text-zinc-700 px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                📡 RSS-feed
              </Link>
            </div>
          </div>
        </section>

        {/* Related articles */}
        {relatedArticles.length > 0 && (
          <section className="max-w-3xl mx-auto px-4 pb-16">
            <h2 className="text-xl font-bold text-zinc-900 mb-6">Relaterade artiklar</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedArticles.map(rel => (
                <Link
                  key={rel.slug}
                  href={`/news/${rel.slug}`}
                  className="group bg-white rounded-2xl border border-zinc-200 p-5 hover:shadow-md transition-all"
                >
                  <CategoryBadge category={rel.category} />
                  <h3 className="font-semibold text-zinc-900 group-hover:text-blue-600 transition-colors mt-2 mb-1 leading-snug">
                    {rel.title}
                  </h3>
                  <p className="text-xs text-zinc-500">{formatDate(rel.date)} · {rel.readTime} min</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
