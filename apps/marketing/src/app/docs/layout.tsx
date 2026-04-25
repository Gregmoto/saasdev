import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { DocsSidebar, DocsMobileBar } from "./docs-sidebar";
import { DocsSearch } from "./search";
import type { ReactNode } from "react";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Nav />

      {/* Mobile navigation bar (sticky below Nav, hidden on desktop) */}
      <DocsMobileBar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:flex lg:gap-10">
          {/* Desktop sidebar (240px, sticky, hidden on mobile) */}
          <DocsSidebar />

          {/* Main content */}
          <main className="flex-1 min-w-0 py-8 lg:py-10">
            {/* Search */}
            <div className="mb-8">
              <DocsSearch />
            </div>
            {children}
          </main>
        </div>
      </div>

      <Footer />
    </>
  );
}
