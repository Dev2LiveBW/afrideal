import sys

with open("components/brand/ActionButton.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "  royal: 'bg-royal text-white hover:bg-royal-light active:bg-royal-dark',",
    "  royal: 'bg-royal text-white hover:bg-royal-light active:bg-royal-dark',\n  primary: 'bg-[#E67E22] text-white shadow-[#E67E22] hover:bg-[#D35400] active:bg-[#D35400] active:shadow-none',"
)

with open("components/brand/ActionButton.tsx", "w", encoding="utf-8") as f:
    f.write(content)