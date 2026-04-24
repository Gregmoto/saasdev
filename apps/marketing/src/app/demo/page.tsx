import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import Link from "next/link";

const DEMOS = [
  {
    slug: "webshop",
    title: "Enkel webbutik",
    desc: "En vanlig setup med en butik. Produkter, varukorg, kassa och orderhantering på ett ställe.",
    tags: ["Produkter", "Varukorg", "Ordrar", "Kunder"],
    icon: "🛒",
  },
  {
    slug: "multishop",
    title: "Multishop",
    desc: "Ett butikskonto med flera varumärkesbutiker som delar lager och kunder.",
    tags: ["Flera varumärken", "Delat lager", "Butiksväxlare"],
    icon: "🏪",
  },
  {
    slug: "marketplace",
    title: "Marknadsplats",
    desc: "Flera oberoende butikskonton med egna produkter, ordrar och fakturering.",
    tags: ["Multi-tenant", "Isolerad fakturering", "Leverantörsflöden"],
    icon: "🌐",
  },
];

export default function DemoPage() {
  return (
    <>
      <Nav />
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <div className="inline-block bg-blue-50 text-blue-600 text-sm font-medium px-3 py-1 rounded-full mb-4">Skrivskyddade demos</div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Se ShopMan i aktion</h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">Utforska tre interaktiva demos som visar olika handelskonfigurationer. Ingen registrering krävs.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {DEMOS.map(d => (
            <div key={d.slug} className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              <div className="bg-gray-50 px-8 py-10 text-center border-b border-gray-100">
                <div className="text-5xl mb-2">{d.icon}</div>
                <h2 className="text-xl font-bold text-gray-900">{d.title}</h2>
              </div>
              <div className="p-6">
                <p className="text-gray-500 text-sm leading-relaxed mb-4">{d.desc}</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {d.tags.map(tag => (
                    <span key={tag} className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded">{tag}</span>
                  ))}
                </div>
                <Link href={`/demo/${d.slug}`} className="block text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                  Starta demo →
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* QA Checklist */}
        <div className="bg-gray-50 rounded-2xl border border-gray-200 p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Demo QA-checklista</h2>
          <p className="text-gray-500 text-sm mb-6">Verifiera routing, scoping och skrivskydd i alla demos.</p>
          <div className="space-y-3">
            {[
              ["Webshop demo", "Produkter laddas med korrekt butiksscope", "pending"],
              ["Webshop demo", "Varukorgen lägger till varor (ingen riktig order skapas)", "pending"],
              ["Webshop demo", "Kassaflödet slutförs till bekräftelse", "pending"],
              ["MultiShop demo", "Butiksväxlaren byter produktlista", "pending"],
              ["MultiShop demo", "Lagret visar per-butiksallokering", "pending"],
              ["MultiShop demo", "Ordrar scopade till vald butik", "pending"],
              ["Marketplace demo", "Butikskonton är helt isolerade", "pending"],
              ["Marketplace demo", "Ingen dataläcka mellan butiker", "pending"],
              ["Alla demos", "Skrivskyddat: inga skrivoperationer tillåtna", "pending"],
              ["Alla demos", "Demobanner synlig på alla sidor", "pending"],
            ].map(([scope, check], i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0" />
                <span className="text-xs font-medium text-blue-600 min-w-[120px]">{scope}</span>
                <span className="text-sm text-gray-700">{check}</span>
              </div>
            ))}
          </div>
          <p className="mt-6 text-xs text-gray-400">Denna checklista är för intern QA. Kontrollera manuellt inför varje release.</p>
        </div>
      </main>
      <Footer />
    </>
  );
}
