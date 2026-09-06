import sys
import re

with open("components/brand/ActionButton.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("  primary:\n    'bg-[#E67E22] text-white ring-[#E67E22]/20 hover:bg-[#D35400] focus-visible:ring-[#D35400]',", "")
content = content.replace("  primary:\n      'bg-[#E67E22] text-white ring-[#E67E22]/20 hover:bg-[#D35400] focus-visible:ring-[#D35400]',", "")

# Let's just remove any primary at the top
content = re.sub(r"\s*primary:\s*'bg-\[#E67E22\][^']*',\n", "\n", content)

with open("components/brand/ActionButton.tsx", "w", encoding="utf-8") as f:
    f.write(content)