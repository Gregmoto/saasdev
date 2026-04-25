import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { buildMetadata } from "@/lib/metadata";
import Link from "next/link";

export const metadata = buildMetadata({
  title: "Dokumentation",
  description:
    "Guider, API-referens och allt du behöver för att komma igång med ShopMan.",
  path: "/docs",
});

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface DocLink {
  label: string;
  slug: string;
}

interface DocSection {
  title: string;
  icon: string;
  links: DocLink[];
}

// ---------------------------------------------------------------------------
// CMS fetch
// ---------------------------------------------------------------------------
async function fetchDocs(): Promise<DocSection[] | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl}/api/cms/docs?lang=sv&limit=100`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { sections?: DocSection[] };
    if (!data.sections?.length) return null;
    return data.sections;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Static fallback
// ---------------------------------------------------------------------------
const STATIC_SECTIONS: DocSection[] = [
  {
    title: "Kom igång",
    icon: "🚀",
    links: [
      { label: "Skapa konto", slug: "skapa-konto" },
      { label: "Konfigurera din butik", slug: "konfigurera-butik" },
      { label: "Lägg till produkter", slug: "lagg-till-produkter" },
      { label: "Ta emot betalningar", slug: "ta-emot-betalningar" },
    ],
  },
  {
    title: "Produkter & Lager",
    icon: "📦",
    links: [
      { label: "Produkttyper", slug: "produkttyper" },
      { label: "Varianter", slug: "varianter" },
      { label: "Kategorier", slug: "kategorier" },
      { label: "Lagerhantering", slug: "lagerhantering" },
    ],
  },
  {
    title: "Ordrar & Leverans",
    icon: "🚚",
    links: [
      { label: "Orderflöde", slug: "orderflode" },
      { label: "Fraktintegration", slug: "fraktintegration" },
      { label: "Returhantering", slug: "returhantering" },
    ],
  },
  {
    title: "Betalningar",
    icon: "💳",
    links: [
      { label: "Klarna", slug: "klarna" },
      { label: "Swish", slug: "swish" },
      { label: "Stripe", slug: "stripe" },
      { label: "Fakturering", slug: "fakturering" },
    ],
  },
  {
    title: "API & Integrationer",
    icon: "⚙️",
    links: [
      { label: "API-referens", slug: "api-referens" },
      { label: "Webhooks", slug: "webhooks" },
      { label: "Fortnox", slug: "fortnox" },
    ],
  },
  {
    title: "Inställningar",
    icon: "🔧",
    links: [
      { label: "Butiksinfo", slug: "butiksinfo" },
      { label: "Domäner", slug: "domaner" },
      { label: "Användare & roller", slug: "anvandare-roller" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function DocsIndexPage() {
  const sections = (await fetchDocs()) ?? STATIC_SECTIONS;

  return (
    <>
      <Nav />
      <main className="max-w-5xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-stone-900 mb-3">Dokumentation</h1>
          <p className="text-stone-500 leading-relaxed max-w-2xl">
            Allt du behöver för att komma igång med ShopMan — guider, API-dokumentation och integrationsinstruktioner.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {sections.map((section) => (
            <div
              key={section.title}
              className="border border-stone-100 rounded-2xl p-6 bg-white hover:border-stone-200 transition-colors"
            >
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl" aria-hidden="true">{section.icon}</span>
                <h2 className="font-semibold text-stone-900 text-sm">{section.title}</h2>
              </div>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.slug}>
                    <Link
                      href={`/docs/${link.slug}`}
                      className="text-sm text-stone-600 hover:text-blue-700 transition-colors hover:underline"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-stone-50 border border-stone-100 rounded-2xl text-center">
          <p className="text-stone-600 text-sm mb-3">Hittar du inte det du söker?</p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-700 hover:underline"
          >
            Kontakta supporten &rarr;
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
