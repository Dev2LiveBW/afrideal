import sys

with open("components/storefront/PackagesBoard.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Update rounded-lg to rounded-2xl
content = content.replace("rounded-lg", "rounded-2xl")

# Make active tier badge orange instead of forest
content = content.replace(
    "bg-forest text-white ring-forest/30",
    "bg-[#E67E22] text-white ring-[#E67E22]/30"
)

# Update accents to match cleaner theme
content = content.replace(
    "card: 'bg-forest-wash/50 ring-forest/20 hover:ring-forest/35',",
    "card: 'bg-white ring-gray-200 hover:ring-[#E67E22]/50 shadow-sm hover:shadow-md',"
)
content = content.replace(
    "card: 'bg-ocean-wash/50 ring-ocean/20 hover:ring-ocean/35',",
    "card: 'bg-white ring-gray-200 hover:ring-[#E67E22]/50 shadow-sm hover:shadow-md',"
)
content = content.replace(
    "card: 'bg-gold-50/60 ring-gold/25 hover:ring-gold/45',",
    "card: 'bg-white ring-[#E67E22]/30 hover:ring-[#E67E22] shadow-sm hover:shadow-md',"
)
content = content.replace(
    "card: 'bg-royal-wash/60 ring-royal/20 hover:ring-royal/35',",
    "card: 'bg-white ring-gray-200 hover:ring-[#E67E22]/50 shadow-sm hover:shadow-md',"
)
content = content.replace(
    "card: 'bg-surface-raised ring-hairline hover:ring-hairline-strong',",
    "card: 'bg-white ring-gray-200 hover:ring-[#E67E22]/50 shadow-sm hover:shadow-md',"
)

with open("components/storefront/PackagesBoard.tsx", "w", encoding="utf-8") as f:
    f.write(content)