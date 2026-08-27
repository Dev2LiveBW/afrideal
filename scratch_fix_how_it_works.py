import re

file_path = "app/(store)/how-it-works/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("<PathChooser productCount={products.length} className=\"mt-8\" />", "<PathChooser className=\"mt-8\" />")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

