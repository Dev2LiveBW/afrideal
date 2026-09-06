import re
import os

def fix_demo_cards(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    content = content.replace("bg-white/[0.03]", "bg-white shadow-sm")
    content = content.replace("border-forest-inverse/50 bg-forest-inverse/[0.12]", "border-forest/40 bg-forest-wash")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

fix_demo_cards("app/(auth)/login/LoginClient.tsx")

