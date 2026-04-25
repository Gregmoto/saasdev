import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { buildMetadata } from "@/lib/metadata";
import { organizationSchema } from "@/lib/schema-org";
import Link from "next/link";

export const metadata = buildMetadata({
  title: "Om oss",
  description:
    "Vi bygger framtidens e-handelsinfrastruktur för ambitiösa handlare — från solobutiken till multi-shopnätverket.",
  path: "/about",
});

// ---------------------------------------------------------------------------
// CMS types
// ---------------------------------------------------------------------------
type CmsSection =
  | { type: "hero"; heading: string; subheading?: string }
  | { type: "text"; heading?: string; body: string }
  | { type: "mission"; heading?: string; body: string; description?: string }
  | { type: "values"; heading?: string; items: { title: string; body: string }[] }
  | { type: "team"; heading?: string; body?: string }
  | { type: "cta"; heading: string; href: string; label: string };

interface CmsPage {
  published: boolean;
  sections: CmsSection[];
}

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------
async function fetchAboutPage(): Promise<CmsPage | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;
  try {
    const res = await fetch(`${apiUrl}/api/cms/pages/about?lang=sv`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as CmsPage;
    if (!data.published) return null;
    return data;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Static fallback content
// ---------------------------------------------------------------------------
const STATIC_SECTIONS: CmsSection[] = [
  {
    type: "hero",
    heading: "Vi bygger framtidens e-handelsinfrastruktur",
    subheading:
      "ShopMan är en samlad plattform för moderna handlare som vill växa utan att byta system.",
  },
  {
    type: "mission",
    heading: "Vår mission",
    body: "Vår mission är att ge varje handlare — från solobutiken till multi-shopnätverket — samma professionella verktyg som storföretagen använder.",
    description:
      "Vi tror att e-handelsteknik inte ska vara ett hinder för tillväxt. Därför har vi byggt en plattform som hanterar hela flödet: produkter, ordrar, lager, betalningar och kundrelationer — allt i ett och samma gränssnitt.",
  },
  {
    type: "text",
    heading: "Vad vi bygger",
    body: "Produkthantering | Orderflöden | Lagersystem | Betalningar (Klarna/Swish) | Multishop | Marketplace | Återförsäljarportal | API-plattform",
  },
  {
    type: "values",
    heading: "Våra värderingar",
    items: [
      {
        title: "Enkelhet",
        body: "Teknik ska vara enkel att använda — inte ett heltidsjobb. Vi designar varje funktion så att den känns självklar.",
      },
      {
        title: "Öppenhet",
        body: "Transparent prissättning, tydliga avtal och inga dolda avgifter. Vad du ser är vad du betalar.",
      },
      {
        title: "Skalbarhet",
        body: "Väx utan att byta plattform. ShopMan är byggt för att följa med från en butik till ett helt nätverk.",
      },
      {
        title: "Pålitlighet",
        body: "99,9 % uptime SLA. Din butik är öppen dygnet runt — och det ska infrastrukturen bakom vara också.",
      },
    ],
  },
  {
    type: "team",
    heading: "Teamet",
    body: "Vi är ett litet team med stor ambition. Vill du veta mer, eller är du nyfiken på att jobba med oss?",
  },
  {
    type: "cta",
    heading: "Redo att testa?",
    href: "/trial",
    label: "Starta gratis idag",
  },
];

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------
function HeroSection({ section }: { section: Extract<CmsSection, { type: "hero" }> }) {
  return (
    <section className="py-20 text-center">
      <h1 className="text-4xl sm:text-5xl font-bold text-stone-900 tracking-tight max-w-3xl mx-auto leading-tight">
        {section.heading}
      </h1>
      {section.subheading && (
        <p className="mt-6 text-lg text-stone-500 max-w-2xl mx-auto leading-relaxed">
          {section.subheading}
        </p>
      )}
    </section>
  );
}

function MissionSection({ section }: { section: Extract<CmsSection, { type: "mission" }> }) {
  return (
    <section className="py-16 border-t border-stone-100">
      {section.heading && (
        <h2 className="text-2xl font-semibold text-stone-900 mb-6">{section.heading}</h2>
      )}
      <p className="text-lg text-stone-700 leading-relaxed mb-4">{section.body}</p>
      {section.description && (
        <p className="text-stone-500 leading-relaxed">{section.description}</p>
      )}
    </section>
  );
}

function TextSection({ section }: { section: Extract<CmsSection, { type: "text" }> }) {
  const items = section.body.split("|").map((s) => s.trim());
  const isList = items.length > 1;

  return (
    <section className="py-16 border-t border-stone-100">
      {section.heading && (
        <h2 className="text-2xl font-semibold text-stone-900 mb-6">{section.heading}</h2>
      )}
      {isList ? (
        <ul className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {items.map((item) => (
            <li
              key={item}
              className="bg-stone-50 border border-stone-100 rounded-xl px-4 py-3 text-sm text-stone-700 font-medium"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-stone-600 leading-relaxed">{section.body}</p>
      )}
    </section>
  );
}

function ValuesSection({ section }: { section: Extract<CmsSection, { type: "values" }> }) {
  return (
    <section className="py-16 border-t border-stone-100">
      {section.heading && (
        <h2 className="text-2xl font-semibold text-stone-900 mb-10">{section.heading}</h2>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
        {section.items.map((v) => (
          <div key={v.title} className="space-y-2">
            <h3 className="font-semibold text-stone-900">{v.title}</h3>
            <p className="text-sm text-stone-500 leading-relaxed">{v.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TeamSection({ section }: { section: Extract<CmsSection, { type: "team" }> }) {
  return (
    <section className="py-16 border-t border-stone-100">
      {section.heading && (
        <h2 className="text-2xl font-semibold text-stone-900 mb-4">{section.heading}</h2>
      )}
      {section.body && (
        <p className="text-stone-500 leading-relaxed mb-6">{section.body}</p>
      )}
      <Link href="/contact" className="text-sm font-medium text-blue-700 hover:underline">
        Kontakta oss &rarr;
      </Link>
    </section>
  );
}

function CtaSection({ section }: { section: Extract<CmsSection, { type: "cta" }> }) {
  return (
    <section className="py-16 border-t border-stone-100 text-center">
      <h2 className="text-2xl font-semibold text-stone-900 mb-6">{section.heading}</h2>
      <Link
        href={section.href}
        className="inline-flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-medium px-6 py-3 rounded-xl transition-colors text-sm"
      >
        {section.label}
      </Link>
    </section>
  );
}

function renderSection(section: CmsSection, idx: number) {
  switch (section.type) {
    case "hero":
      return <HeroSection key={idx} section={section} />;
    case "mission":
      return <MissionSection key={idx} section={section} />;
    case "text":
      return <TextSection key={idx} section={section} />;
    case "values":
      return <ValuesSection key={idx} section={section} />;
    case "team":
      return <TeamSection key={idx} section={section} />;
    case "cta":
      return <CtaSection key={idx} section={section} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default async function AboutPage() {
  const cmsPage = await fetchAboutPage();
  const sections = cmsPage?.sections ?? STATIC_SECTIONS;
  const jsonLd = organizationSchema();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Nav />
      <main className="max-w-4xl mx-auto px-6">
        {sections.map((section, idx) => renderSection(section, idx))}
      </main>
      <Footer />
    </>
  );
}
