import os

file_path = "app/(auth)/login/LoginClient.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# I will just use string replacement on parts
content = content.replace("? 'bg-forest text-ink'", "? 'bg-forest-wash text-forest'")
content = content.replace("? 'bg-white/12 text-ink'", "? 'bg-surface-sunk text-ink'")
content = content.replace(": 'bg-forest text-ink',", ": 'bg-gold-50 text-gold-700',")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
