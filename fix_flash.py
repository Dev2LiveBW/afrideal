import sys
import re

with open("components/storefront/FlashDealsRail.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# Replace all funky characters around {product.promotion?.discount_pct}%
content = re.sub(r"[^\x00-\x7F]*\{\s*product\.promotion\?\.discount_pct\s*\}\%", "-{product.promotion?.discount_pct}%", content)

with open("components/storefront/FlashDealsRail.tsx", "w", encoding="utf-8") as f:
    f.write(content)