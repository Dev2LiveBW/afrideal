import sys

with open("app/(store)/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Update packages section wrapper
content = content.replace(
    "<section id=\"packages\" className=\"border-y border-hairline bg-surface-raised\">",
    "<section id=\"packages\" className=\"py-4\">"
)

# How it works wrapper
content = content.replace(
    "<section id=\"how-it-works\" className=\"mt-24 border-y border-hairline bg-surface-raised\">",
    "<section id=\"how-it-works\" className=\"mt-24 py-4\">"
)

# Trade Enquiries banner
content = content.replace(
    "bg-ink",
    "bg-[#111111]"
)
content = content.replace(
    "variant=\"gold\"",
    "variant=\"primary\""
)

with open("app/(store)/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)