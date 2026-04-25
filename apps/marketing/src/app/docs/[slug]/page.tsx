export const dynamic = "force-dynamic";

import { buildMetadata } from "@/lib/metadata";
import { breadcrumbSchema } from "@/lib/schema-org";
import { SITE_URL } from "@/lib/metadata";
import Link from "next/link";
import type { Metadata } from "next";
import { ARTICLES } from "../articles-content";
import { FeedbackWidget } from "./feedback-widget";
import { notFound } from "next/navigation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface CmsArticle {
  slug: string;
  title: string;
  section: string;
  body: string;
  publishedAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// CMS fetch (tries API first, falls back to ARTICLES map)
// ---------------------------------------------------------------------------
async function fetchDoc(slug: string): Promise<CmsArticle | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (apiUrl) {
    try {
      const res = await fetch(`${apiUrl}/api/cms/docs/${slug}?lang=sv`, {
        next: { revalidate: 300 },
      });
      if (res.ok) {
        return (await res.json()) as CmsArticle;
      }
    } catch {
      // CMS unavailable — fall through to static content
    }
  }

  // Static fallback
  const article = ARTICLES[slug];
  if (!article) return null;
  return {
    slug,
    title: article.title,
    section: article.section,
    body: article.content,
  };
}

// ---------------------------------------------------------------------------
// Metadata
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
    description: `${article.section} — ${article.title} | ShopMan Dokumentation`,
    path: `/docs/${slug}`,
  });
}

// ---------------------------------------------------------------------------
// Markdown renderer
// ---------------------------------------------------------------------------
interface Heading {
  level: number;
  text: string;
  id: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[åä]/g, "a")
    .replace(/[ö]/g, "o")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function extractHeadings(md: string): Heading[] {
  const headings: Heading[] = [];
  const lines = md.split("\n");
  for (const line of lines) {
    const h2 = line.match(/^## (.+)$/);
    const h3 = line.match(/^### (.+)$/);
    if (h2) {
      headings.push({ level: 2, text: h2[1], id: slugify(h2[1]) });
    } else if (h3) {
      headings.push({ level: 3, text: h3[1], id: slugify(h3[1]) });
    }
  }
  return headings;
}

function renderCodeBlock(lang: string, code: string): string {
  const escaped = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div class="relative my-5">
  <div class="bg-stone-800 rounded-lg overflow-x-auto">
    <div class="flex items-center px-4 py-2 border-b border-stone-700">
      <span class="text-stone-400 text-xs font-mono">${lang || "code"}</span>
    </div>
    <pre class="p-4 text-sm text-stone-100 font-mono overflow-x-auto"><code>${escaped}</code></pre>
  </div>
</div>`;
}

function renderTable(tableText: string): string {
  const rows = tableText.trim().split("\n").filter((r) => !r.match(/^[\s|:-]+$/));
  if (rows.length === 0) return "";

  const parseRow = (row: string) =>
    row
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());

  const [header, ...body] = rows;
  const headerCells = parseRow(header);

  const thCells = headerCells
    .map(
      (c) =>
        `<th class="px-4 py-2 text-left text-xs font-semibold text-stone-700 uppercase tracking-wide bg-stone-50">${c}</th>`
    )
    .join("");

  const bodyRows = body
    .map((row) => {
      const cells = parseRow(row);
      const tds = cells
        .map((c) => `<td class="px-4 py-2.5 text-sm text-stone-700 border-t border-stone-100">${c}</td>`)
        .join("");
      return `<tr class="hover:bg-stone-50/50">${tds}</tr>`;
    })
    .join("");

  return `<div class="my-5 overflow-x-auto rounded-lg border border-stone-200"><table class="w-full"><thead><tr>${thCells}</tr></thead><tbody>${bodyRows}</tbody></table></div>`;
}

function markdownToHtml(md: string): string {
  // Handle code blocks first (before other transforms)
  let html = md.replace(/```(\w*)\n?([\s\S]*?)```/g, (_match, lang, code) => {
    return renderCodeBlock(lang, code.trim());
  });

  // Tables — find | ... | blocks
  html = html.replace(/((?:^\|.+\|\n?)+)/gm, (tableBlock) => {
    return renderTable(tableBlock);
  });

  // Headings with IDs
  html = html.replace(/^### (.+)$/gm, (_m, t) => {
    const id = slugify(t);
    return `<h3 id="${id}" class="text-base font-semibold text-stone-900 mt-7 mb-2 scroll-mt-20">${t}</h3>`;
  });
  html = html.replace(/^## (.+)$/gm, (_m, t) => {
    const id = slugify(t);
    return `<h2 id="${id}" class="text-xl font-semibold text-stone-900 mt-10 mb-3 scroll-mt-20">${t}</h2>`;
  });
  html = html.replace(/^# (.+)$/gm, (_m, t) => {
    return `<h1 class="text-2xl font-bold text-stone-900 mb-6">${t}</h1>`;
  });

  // Bold + inline code
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/`([^`]+)`/g, `<code class="bg-stone-100 text-stone-800 px-1.5 py-0.5 rounded text-[0.85em] font-mono">$1</code>`);

  // Links
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    `<a href="$2" class="text-blue-700 hover:underline">$1</a>`
  );

  // Unordered lists
  html = html.replace(
    /((?:^[ \t]*[-*] .+\n?)+)/gm,
    (block) => {
      const items = block
        .trim()
        .split("\n")
        .map((line) => line.replace(/^[ \t]*[-*] /, "").trim())
        .filter(Boolean)
        .map(
          (item) =>
            `<li class="flex items-start gap-2"><span class="mt-2 w-1.5 h-1.5 rounded-full bg-stone-400 shrink-0"></span><span>${item}</span></li>`
        )
        .join("");
      return `<ul class="space-y-1.5 my-3 text-stone-700">${items}</ul>`;
    }
  );

  // Ordered lists
  html = html.replace(
    /((?:^[ \t]*\d+\. .+\n?)+)/gm,
    (block) => {
      let counter = 0;
      const items = block
        .trim()
        .split("\n")
        .map((line) => line.replace(/^[ \t]*\d+\. /, "").trim())
        .filter(Boolean)
        .map((item) => {
          counter++;
          return `<li class="flex items-start gap-3"><span class="shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-semibold mt-0.5">${counter}</span><span>${item}</span></li>`;
        })
        .join("");
      return `<ol class="space-y-2 my-3 text-stone-700">${items}</ol>`;
    }
  );

  // Paragraphs — wrap remaining non-tag lines
  html = html
    .split("\n\n")
    .map((block) => {
      block = block.trim();
      if (!block) return "";
      if (block.startsWith("<")) return block;
      return `<p class="text-stone-700 leading-relaxed mb-4">${block.replace(/\n/g, " ")}</p>`;
    })
    .join("\n");

  return html;
}

// ---------------------------------------------------------------------------
// Related articles helper
// ---------------------------------------------------------------------------
function getRelated(currentSlug: string, section: string) {
  return Object.entries(ARTICLES)
    .filter(([slug, art]) => slug !== currentSlug && art.section === section)
    .slice(0, 3)
    .map(([slug, art]) => ({ slug, title: art.title }));
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

  if (!article) {
    notFound();
  }

  const headings = extractHeadings(article.body);
  const htmlContent = markdownToHtml(article.body);
  const related = getRelated(slug, article.section);

  const breadcrumb = breadcrumbSchema([
    { label: "Dokumentation", url: `${SITE_URL}/docs` },
    { label: article.section, url: `${SITE_URL}/docs` },
    { label: article.title, url: `${SITE_URL}/docs/${slug}` },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <div className="flex gap-10 xl:gap-16">
        {/* Article */}
        <article className="flex-1 min-w-0">
          {/* Breadcrumb */}
          <nav
            className="flex items-center gap-1.5 text-xs text-stone-500 mb-6"
            aria-label="Brödsmulor"
          >
            <Link
              href="/docs"
              className="hover:text-stone-900 transition-colors"
            >
              Dokumentation
            </Link>
            <span className="text-stone-300">/</span>
            <span className="text-stone-400">{article.section}</span>
            <span className="text-stone-300">/</span>
            <span className="text-stone-700 font-medium">{article.title}</span>
          </nav>

          {/* Title */}
          <h1 className="text-2xl lg:text-3xl font-bold text-stone-900 mb-2">
            {article.title}
          </h1>

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

          {/* Content */}
          <div
            className="mt-6"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

          {/* Feedback */}
          <div className="mt-12 pt-8 border-t border-stone-100">
            <FeedbackWidget slug={slug} />
          </div>

          {/* Related */}
          {related.length > 0 && (
            <div className="mt-10">
              <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider mb-4">
                Relaterade artiklar
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((r) => (
                  <Link
                    key={r.slug}
                    href={`/docs/${r.slug}`}
                    className="group flex items-start gap-2 p-3 rounded-lg border border-stone-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all"
                  >
                    <svg
                      className="mt-0.5 shrink-0 text-stone-400 group-hover:text-blue-500 transition-colors"
                      width="14"
                      height="14"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 4h12v12H4z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M7 8h6M7 12h4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="text-sm text-stone-700 group-hover:text-blue-700 transition-colors">
                      {r.title}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </article>

        {/* Table of contents */}
        {headings.length > 0 && (
          <aside className="hidden xl:block w-52 shrink-0">
            <div className="sticky top-[60px] pt-8">
              <p className="text-xs font-semibold text-stone-500 uppercase tracking-wider mb-3">
                På den här sidan
              </p>
              <nav>
                <ul className="space-y-1">
                  {headings.map((h) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className={`block text-xs text-stone-500 hover:text-stone-900 py-0.5 transition-colors ${
                          h.level === 3 ? "pl-4" : ""
                        }`}
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            </div>
          </aside>
        )}
      </div>
    </>
  );
}
