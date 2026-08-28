import sys

with open("components/brand/ActionButton.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    "type Variant = 'forest' | 'ocean' | 'gold' | 'royal' | 'ink' | 'surface' | 'ghost';",
    "type Variant = 'forest' | 'ocean' | 'gold' | 'royal' | 'ink' | 'surface' | 'ghost' | 'primary';"
)

content = content.replace(
    "const VARIANTS: Record<Variant, string> = {",
    "const VARIANTS: Record<Variant, string> = {\n  primary:\n    'bg-[#E67E22] text-white ring-[#E67E22]/20 hover:bg-[#D35400] focus-visible:ring-[#D35400]',"
)

with open("components/brand/ActionButton.tsx", "w", encoding="utf-8") as f:
    f.write(content)