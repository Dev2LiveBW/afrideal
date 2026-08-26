import os

file_path = "app/(auth)/signup/SignupClient.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("bg-white/[0.02]", "bg-surface-sunk")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
