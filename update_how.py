import sys

with open("components/storefront/HowItWorks.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "forest: 'bg-forest-wash text-forest ring-forest/20',",
    "forest: 'bg-orange-50 text-[#E67E22] ring-[#E67E22]/20',"
)
content = content.replace(
    "gold: 'bg-gold-50 text-gold-700 ring-gold/25',",
    "gold: 'bg-orange-50 text-[#E67E22] ring-[#E67E22]/20',"
)
content = content.replace(
    "royal: 'bg-royal-wash text-royal ring-royal/20',",
    "royal: 'bg-purple-50 text-purple-600 ring-purple-600/20',"
)

with open("components/storefront/HowItWorks.tsx", "w", encoding="utf-8") as f:
    f.write(content)