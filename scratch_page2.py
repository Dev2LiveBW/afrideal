import re

with open("app/(store)/page.tsx", "r", encoding="utf-8") as f:
    content = f.read()

new_import = "import { MockupHero } from '@/components/storefront/MockupHero';\n"
content = content.replace("import { PathChooser }", new_import + "import { PathChooser }")

pattern = r'<section className="relative isolate overflow-hidden bg-white">.*?</section>'
content = re.sub(pattern, "<MockupHero />", content, flags=re.DOTALL)

with open("app/(store)/page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
