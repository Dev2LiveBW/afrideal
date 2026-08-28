import sys

with open("components/storefront/LadderProof.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("bg-forest", "bg-[#27AE60]")
content = content.replace("text-forest", "text-[#27AE60]")

with open("components/storefront/LadderProof.tsx", "w", encoding="utf-8") as f:
    f.write(content)