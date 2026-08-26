import re
import os

def fix_bg_white_10(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    content = content.replace("bg-white/10", "bg-hairline")
    content = content.replace("text-ink/70", "text-ink") # Make it readable
    content = content.replace("text-ink/30", "text-muted") # Make it readable

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

fix_bg_white_10("app/(auth)/login/LoginClient.tsx")
if os.path.exists("app/(auth)/signup/SignupClient.tsx"):
    fix_bg_white_10("app/(auth)/signup/SignupClient.tsx")

