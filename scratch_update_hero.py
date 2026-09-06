import re
import sys

file_path = "app/(store)/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = re.sub(
    r"import \{ ArrowRight, BadgeCheck, PackageSearch, Truck \} from .lucide-react.;",
    "import { ArrowRight, BadgeCheck, User, Truck } from \"lucide-react\";",
    content
)

start_marker = r"<section className=\"relative isolate overflow-hidden bg-gradient-to-b from-\[#FBF7EF\] via-surface to-surface\">"
end_marker = r"\{/\*\s*.*\s*What you pay at each quantity"
end_marker2 = r"<section id=\"packages\""

match_start = re.search(start_marker, content)
match_end = re.search(end_marker, content) or re.search(end_marker2, content)

if not match_start or not match_end:
    print(f"Could not find markers: start={bool(match_start)} end={bool(match_end)}")
    sys.exit(1)

# Find the end of the previous line for start, and start of next line for end
start_pos = content.rfind("\n", 0, match_start.start())
if start_pos == -1: start_pos = match_start.start()

prefix = content[:start_pos + 1]

end_pos = content.rfind("\n", 0, match_end.start())
if end_pos == -1: end_pos = match_end.start()
suffix = content[end_pos + 1:]

hero_jsx = """      <section className="relative isolate overflow-hidden bg-white">
        <div className="mx-auto grid max-w-market gap-12 px-6 pb-14 pt-24 sm:pt-28 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-16 lg:pb-16 lg:pt-36">
          <div className="min-w-0">
            <h1 className="font-display text-[38px] font-bold leading-[1.08] tracking-[-0.035em] text-ink sm:text-[54px] lg:text-[64px]">
              Find it.<br />
              Compare it.<br />
              <span className="text-gold-dark">Procure it.</span><br />
              Get it delivered.
            </h1>

            <p className="measure mt-6 text-[16px] leading-8 text-body">
              Shop from <span className="font-bold text-ink">verified</span> suppliers or let us
              procure it for you through our <span className="font-bold text-ink">trusted</span> runner and delivery network.
            </p>

            <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-8">
              {[
                { icon: BadgeCheck, label: "Verified\\nSuppliers", tone: "text-forest", circle: "bg-forest-wash" },
                { icon: User, label: "Verified\\nRunners", tone: "text-gold-dark", circle: "bg-gold-50" },
                { icon: Truck, label: "Verified\\nDelivery Partners", tone: "text-royal", circle: "bg-royal-wash" },
              ].map((chip) => (
                <li key={chip.label} className="flex flex-col items-center gap-3">
                  <div className={`flex h-14 w-14 items-center justify-center rounded-full ${chip.circle}`}>
                    <chip.icon size={24} strokeWidth={1.5} aria-hidden="true" className={chip.tone} />
                  </div>
                  <span className="text-[13px] font-semibold text-ink text-center max-w-[90px] leading-snug whitespace-pre-line">
                    {chip.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative min-w-0 flex justify-center lg:justify-end">
            <div className="relative w-full max-w-[480px] aspect-[4/5] overflow-hidden rounded-[32px] shadow-2xl ring-1 ring-inset ring-black/5">
              <Image
                src="/images/home/hero-woman.jpg"
                alt="AfriDeal trusted sourcing"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover object-top"
              />
            </div>
            
            {/* Phone Mockup floating over */}
            <div className="absolute -left-4 sm:-left-8 lg:-left-12 bottom-12 w-[180px] sm:w-[220px] lg:w-[260px] drop-shadow-[0_35px_35px_rgba(0,0,0,0.25)] rounded-[32px] sm:rounded-[40px] border-[8px] sm:border-[10px] border-white bg-white overflow-hidden">
              <div className="relative aspect-[9/19.5] w-full">
                <Image
                  src="/images/home/phone-mockup.jpg"
                  alt="AfriDeal App"
                  fill
                  className="object-cover rounded-[24px] sm:rounded-[30px]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-market px-6 pb-20 lg:pb-28 pt-8">
          <PathChooser productCount={products.length} />
        </div>
      </section>
"""

new_content = prefix + hero_jsx + suffix

with open(file_path, "w", encoding="utf-8") as f:
    f.write(new_content)

print("Successfully replaced hero section.")

