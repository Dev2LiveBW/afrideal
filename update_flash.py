import sys

with open("components/storefront/FlashDealsRail.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "style={{ backgroundColor: palette.wash, borderColor: palette.edge }}",
    "/* Clean white theme */"
)

content = content.replace(
    "className=\"group w-[220px] shrink-0 overflow-hidden rounded-md border shadow-card transition-shadow duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-lift\"",
    "className=\"group w-[220px] shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:shadow-md\""
)

with open("components/storefront/FlashDealsRail.tsx", "w", encoding="utf-8") as f:
    f.write(content)