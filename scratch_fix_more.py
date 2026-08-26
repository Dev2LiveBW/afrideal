import re
import os

def fix_more(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    content = content.replace("border-white/12", "border-hairline")
    content = content.replace("text-[#F2A9A2]", "text-danger")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

fix_more("app/(auth)/login/LoginClient.tsx")
fix_more("app/(auth)/signup/SignupClient.tsx")

