import re

with open("app/(store)/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

new_import = "import { MockupCategories } from '@/components/storefront/MockupCategories';\n"
content = content.replace("import { MockupHero }", new_import + "import { MockupHero }")

insertion = """
      <MockupHero />

      <section className="bg-surface-raised pb-20 lg:pb-28">
        <div className="mx-auto max-w-market px-6">
          <div className="grid lg:grid-cols-[1fr_1fr] gap-12 lg:gap-16">
            <div>
              <h2 className="text-[22px] font-bold text-ink mb-6">Choose how you want to buy</h2>
              <PathChooser />
            </div>
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-[22px] font-bold text-ink">Popular categories</h2>
                <Link href="/browse" className="text-[14px] font-bold text-[#E67E22] flex items-center gap-1 hover:underline">
                  View all <ArrowRight size={16} strokeWidth={2.5} />
                </Link>
              </div>
              <MockupCategories />
            </div>
          </div>
        </div>
      </section>
"""

content = content.replace("<MockupHero />", insertion)

with open("app/(store)/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
