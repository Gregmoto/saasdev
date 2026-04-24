import { Nav } from "@/components/nav";
import Link from "next/link";
import { notFound } from "next/navigation";

const DEMOS: Record<string, { title: string; icon: string; description: string }> = {
  webshop: { title: "Demo: Enkel webbutik", icon: "🛒", description: "En fullt fungerande enbutiksdemo med produkter, varukorg och kassa." },
  multishop: { title: "Demo: Multishop", icon: "🏪", description: "Ett butikskonto, flera varumärkesbutiker med delat lager." },
  marketplace: { title: "Demo: Marknadsplats", icon: "🌐", description: "Multi-tenant-marknadsplats med isolerade butikskonton." },
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
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-3 text-center">
        <span className="text-amber-800 text-sm font-medium">👁️ Skrivskyddad demo — ingen data sparas</span>
      </div>
      <main className="max-w-7xl mx-auto px-6 py-12">
        <Link href="/demo" className="text-sm text-blue-600 hover:text-blue-700 mb-6 inline-block">← Tillbaka till demos</Link>
        <div className="text-center py-20">
          <div className="text-6xl mb-4">{demo.icon}</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{demo.title}</h1>
          <p className="text-gray-500 max-w-md mx-auto mb-8">{demo.description}</p>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-12 text-center max-w-lg mx-auto">
            <p className="text-gray-400 text-sm">Interaktiv demo kommer snart.</p>
            <p className="text-gray-400 text-sm mt-1">Butiksappen kommer att bäddas in här.</p>
          </div>
        </div>
      </main>
    </>
  );
}
