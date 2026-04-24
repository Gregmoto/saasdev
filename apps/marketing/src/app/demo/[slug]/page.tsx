import { Nav } from "@/components/nav";
import Link from "next/link";
import { notFound } from "next/navigation";
import WebshopDemo from "./webshop-demo";
import MultishopDemo from "./multishop-demo";
import MarketplaceDemo from "./marketplace-demo";

export function generateStaticParams() {
  return [{ slug: "webshop" }, { slug: "multishop" }, { slug: "marketplace" }];
}

const DEMOS: Record<string, { title: string; icon: string; description: string }> = {
  webshop: {
    title: "Demo A — Enkel webbutik",
    icon: "🛒",
    description: "En fullt fungerande butik med produkter, varukorg, ordrar och kundöversikt.",
  },
  multishop: {
    title: "Demo B — Multishop",
    icon: "🏪",
    description: "Ett butikskonto, flera varumärkesbutiker med delat lager och butiksväxlare.",
  },
  marketplace: {
    title: "Demo C — Handelslösning för flera butiker",
    icon: "🌐",
    description: "Fristående butikskonton, var och en med egna produkter, ordrar och fakturering.",
  },
};

export default async function DemoDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const demo = DEMOS[slug];
  if (!demo) notFound();

  return (
    <>
      <Nav />
      {/* Demo banner — always visible, sticky so it persists on scroll */}
      <div className="sticky top-0 z-50 bg-amber-400 border-b border-amber-500 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <span className="text-amber-900 text-sm font-semibold flex items-center gap-2">
            <span className="text-base">👁️</span>
            <span>
              Detta är en <strong>skrivskyddad demo</strong> — all data är fiktiv och återställs automatiskt varje natt.
              Inga riktiga köp eller ändringar kan göras.
            </span>
          </span>
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link
              href="/demo"
              className="text-xs font-medium text-amber-900 hover:text-amber-950 underline underline-offset-2"
            >
              ← Alla demos
            </Link>
            <Link
              href="/"
              className="text-xs font-semibold bg-amber-900 hover:bg-amber-950 text-amber-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              Tillbaka till ShopMan.se
            </Link>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/demo" className="text-sm text-stone-400 hover:text-stone-600 transition-colors">
            ← Alla demos
          </Link>
          <span className="text-stone-200">/</span>
          <span className="text-sm text-stone-700 font-medium">{demo.title}</span>
        </div>

        <div className="mb-8 flex items-start gap-4">
          <div className="text-4xl">{demo.icon}</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{demo.title}</h1>
            <p className="text-gray-500 text-sm mt-0.5">{demo.description}</p>
          </div>
          <div className="ml-auto flex gap-3">
            <Link href="/book-demo" className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
              Boka personlig demo
            </Link>
            <Link href="/trial" className="text-sm font-medium bg-white text-gray-700 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
              Starta gratis test
            </Link>
          </div>
        </div>

        {slug === "webshop" && <WebshopDemo />}
        {slug === "multishop" && <MultishopDemo />}
        {slug === "marketplace" && <MarketplaceDemo />}
      </main>
    </>
  );
}
