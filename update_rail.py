import sys

with open("components/storefront/ProductRail.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Update article wrapper
content = content.replace(
    "style={{ backgroundColor: palette.wash, borderColor: palette.edge }}",
    "/* Using clean white theme instead of category colors */"
)

content = content.replace(
    "'group relative shrink-0 snap-start overflow-hidden rounded-md border',",
    "'group relative shrink-0 snap-start overflow-hidden rounded-2xl border border-gray-100 bg-white',"
)

content = content.replace(
    "'shadow-card transition-shadow duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-lift',",
    "'shadow-sm transition-shadow duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-md',"
)

# Update button
content = content.replace(
    "className=\"flex h-8 shrink-0 items-center gap-1 rounded-full border border-hairline-strong px-2.5 text-[12px] font-medium text-ink transition-colors hover:border-gold hover:bg-gold-50\"",
    "className=\"flex h-8 shrink-0 items-center gap-1 rounded-full border border-gray-200 px-3 text-[12px] font-bold text-gray-700 transition-colors hover:border-[#E67E22] hover:bg-[#E67E22] hover:text-white\""
)

# Remove background from scroller container to match clean theme (it's currently not colored, but let's check)

with open("components/storefront/ProductRail.tsx", "w", encoding="utf-8") as f:
    f.write(content)