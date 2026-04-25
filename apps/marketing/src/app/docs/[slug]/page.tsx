import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { buildMetadata } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/schema-org";
import { SITE_URL } from "@/lib/metadata";
import Link from "next/link";
import type { Metadata } from "next";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DocArticle {
  slug: string;
  title: string;
  section: string;
  body: string; // HTML or markdown
  publishedAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// CMS fetch
// ---------------------------------------------------------------------------
async function fetchDoc(slug: string): Promise<DocArticle | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl}/api/cms/docs/${slug}?lang=sv`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return (await res.json()) as DocArticle;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Metadata (dynamic)
// ---------------------------------------------------------------------------
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await fetchDoc(slug);

  if (!article) {
    return buildMetadata({
      title: "Artikel hittades inte",
      description: "Sidan du letar efter finns inte.",
      path: `/docs/${slug}`,
      noIndex: true,
    });
  }

  return buildMetadata({
    title: article.title,
    description: `Dokumentation: ${article.title} — ShopMan`,
    path: `/docs/${slug}`,
  });
}

// ---------------------------------------------------------------------------
// Simple markdown-to-HTML converter (headings, bold, code, paragraphs)
// ---------------------------------------------------------------------------
function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/^(?!<[h1-6]|<\/p>|<p>)(.+)$/gm, "<p>$1</p>")
    .replace(/<p><\/p>/g, "");
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function DocArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = await fetchDoc(slug);

  const breadcrumb = breadcrumbSchema([
    { label: "Dokumentation", url: `${SITE_URL}/docs` },
    ...(article
      ? [
          { label: article.section, url: `${SITE_URL}/docs` },
          { label: article.title, url: `${SITE_URL}/docs/${slug}` },
        ]
      : [{ label: "Artikel hittades inte", url: `${SITE_URL}/docs/${slug}` }]),
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <Nav />
      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-stone-500 mb-8" aria-label="Brödsmulor">
          <Link href="/docs" className="hover:text-stone-900 transition-colors">
            Dokumentation
          </Link>
          {article && (
            <>
              <span className="text-stone-300">/</span>
              <span className="text-stone-400">{article.section}</span>
              <span className="text-stone-300">/</span>
              <span className="text-stone-700">{article.title}</span>
            </>
          )}
          {!article && (
            <>
              <span className="text-stone-300">/</span>
              <span className="text-stone-700">{slug}</span>
            </>
          )}
        </nav>

        {article ? (
          <>
            <h1 className="text-3xl font-bold text-stone-900 mb-6">{article.title}</h1>
            {article.updatedAt && (
              <p className="text-xs text-stone-400 mb-8">
                Uppdaterad:{" "}
                {new Date(article.updatedAt).toLocaleDateString("sv-SE", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}
            <div
              className="prose prose-stone max-w-none text-stone-700 leading-relaxed [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-stone-900 [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-semibold [&_h3]:text-stone-800 [&_h3]:mt-6 [&_h3]:mb-2 [&_code]:bg-stone-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_p]:mb-4"
              dangerouslySetInnerHTML={{
                __html: article.body.includes("<")
                  ? article.body
                  : markdownToHtml(article.body),
              }}
            />
          </>
        ) : (
          <div className="text-center py-20">
            <h1 className="text-2xl font-semibold text-stone-900 mb-3">
              Artikel hittades inte
            </h1>
            <p className="text-stone-500 mb-8 text-sm">
              Sidan{" "}
              <code className="bg-stone-100 px-1.5 py-0.5 rounded text-xs">/docs/{slug}</code>{" "}
              existerar inte eller har inte publicerats ännu.
            </p>
            <Link
              href="/docs"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
            >
              &larr; Tillbaka till dokumentationen
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
