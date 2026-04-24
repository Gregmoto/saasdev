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
    tags: ["Fristående butiker", "Isolerad fakturering", "Leverantörsflöden"],
    icon: "🌐",
  },
];

export default function DemoPage() {
  return (
    <>
      <Nav />
      <main className="bg-white">
        <div className="max-w-7xl mx-auto px-6 py-20">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="inline-block bg-stone-100 text-stone-600 text-sm font-medium px-3 py-1 rounded-full mb-4">
              Skrivskyddade demos
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-stone-900 tracking-tight mb-4">
              Se ShopMan i aktion
            </h1>
            <p className="text-stone-500 text-lg max-w-xl mx-auto leading-relaxed">
              Utforska tre interaktiva demos som visar olika handelskonfigurationer. Ingen registrering krävs.
            </p>
          </div>

          {/* Demo cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {DEMOS.map(d => (
              <div key={d.slug} className="bg-white border border-stone-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                <div className="bg-stone-50 px-8 py-10 text-center border-b border-stone-100">
                  <div className="text-5xl mb-3">{d.icon}</div>
                  <h2 className="text-xl font-bold text-stone-900">{d.title}</h2>
                </div>
                <div className="p-6">
                  <p className="text-stone-500 text-sm leading-relaxed mb-4">{d.desc}</p>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {d.tags.map(tag => (
                      <span key={tag} className="bg-stone-100 text-stone-600 text-xs font-medium px-2.5 py-1 rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <Link
                    href={`/demo/${d.slug}`}
                    className="block text-center bg-stone-900 hover:bg-stone-800 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                  >
                    Starta demo →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* QA Checklist */}
          <div className="bg-stone-50 rounded-2xl border border-stone-200 p-8">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-bold text-stone-900 mb-1">Demo QA-checklista</h2>
                <p className="text-stone-500 text-sm">Verifiera routing, scoping och skrivskydd i alla demos.</p>
              </div>
              <Link
                href="/demo-qa"
                className="flex-shrink-0 text-xs font-medium text-stone-500 hover:text-stone-900 border border-stone-200 hover:border-stone-300 px-3 py-1.5 rounded-lg transition-colors"
              >
                Intern QA-checklista (kräver inloggning) →
              </Link>
            </div>
            <div className="space-y-3">
              {[
                ["Webshop demo", "Produkter laddas med korrekt butiksscope"],
                ["Webshop demo", "Varukorgen lägger till varor (ingen riktig order skapas)"],
                ["Webshop demo", "Kassaflödet slutförs till bekräftelse"],
                ["MultiShop demo", "Butiksväxlaren byter produktlista"],
                ["MultiShop demo", "Lagret visar per-butiksallokering"],
                ["MultiShop demo", "Ordrar scopade till vald butik"],
                ["Marketplace demo", "Butikskonton är helt isolerade"],
                ["Marketplace demo", "Ingen dataläcka mellan butiker"],
                ["Alla demos", "Skrivskyddat: inga skrivoperationer tillåtna"],
                ["Alla demos", "Demobanner synlig på alla sidor"],
              ].map(([scope, check], i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded border-2 border-stone-300 flex-shrink-0" />
                  <span className="text-xs font-semibold text-blue-700 min-w-[120px]">{scope}</span>
                  <span className="text-sm text-stone-700">{check}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-stone-400">
              Denna checklista är för intern QA. Kontrollera manuellt inför varje release.
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
