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
      {/* Demo banner */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-2.5 text-center">
        <span className="text-amber-800 text-sm font-medium">
          👁️ Skrivskyddad demo — all data är fiktiv och återställs automatiskt varje natt
        </span>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/demo" className="text-sm text-gray-400 hover:text-gray-600">
            ← Alla demos
          </Link>
          <span className="text-gray-200">/</span>
          <span className="text-sm text-gray-700 font-medium">{demo.title}</span>
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
