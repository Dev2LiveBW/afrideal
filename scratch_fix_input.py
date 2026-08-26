import re
import os

def fix_input_bg(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    content = content.replace("bg-white px-3.5", "bg-surface px-3.5")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

fix_input_bg("app/(auth)/login/LoginClient.tsx")
fix_input_bg("app/(auth)/signup/SignupClient.tsx")

