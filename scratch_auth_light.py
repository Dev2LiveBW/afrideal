import re
import os

def migrate_to_light(file_path):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Logo
    content = content.replace("variant=\"dark\"", "variant=\"light\"")
    
    # Text colors
    content = content.replace("text-white/35", "text-muted")
    content = content.replace("text-white/45", "text-muted")
    content = content.replace("text-white/55", "text-body")
    content = content.replace("text-white/60", "text-body")
    content = content.replace("text-white/75", "text-ink/80")
    content = content.replace("text-white/80", "text-ink")
    content = content.replace("text-white", "text-ink")
    
    # Gold
    content = content.replace("text-gold-light", "text-gold-dark")
    
    # Borders
    content = content.replace("border-white/10", "border-hairline")
    content = content.replace("border-white/15", "border-hairline")
    content = content.replace("border-white/20", "border-hairline-strong")
    content = content.replace("border-white/5", "border-hairline")
    
    # Backgrounds & Cards
    # "rounded-lg border border-white/10 bg-white/[0.035] p-6 backdrop-blur-sm sm:p-7"
    content = content.replace("bg-white/[0.035]", "bg-white shadow-card")
    content = content.replace("bg-white/[0.025]", "bg-surface")
    content = content.replace("hover:bg-white/[0.04]", "hover:bg-surface-dim")
    content = content.replace("bg-white/[0.04]", "bg-white")
    content = content.replace("bg-white/[0.06]", "bg-surface-sunk")
    content = content.replace("bg-white/[0.08]", "bg-surface-sunk")
    content = content.replace("ring-white/15", "ring-hairline")
    content = content.replace("backdrop-blur-sm", "")
    content = content.replace("placeholder:text-ink/30", "placeholder:text-muted") # was text-white/30 -> text-ink/30 -> muted

    # Forest / Success
    content = content.replace("text-[#8FD69F]", "text-forest")
    content = content.replace("bg-forest/15", "bg-forest-wash")
    content = content.replace("border-forest/40", "border-forest/20")
    
    # Specific ROLE_TONE dictionary mapping in LoginClient
    if "ROLE_TONE" in content:
        content = content.replace("bg-gold/15 text-gold-light ring-gold/25", "bg-gold-50 text-gold-700 ring-gold/20")
        content = content.replace("bg-forest/25 text-forest ring-forest/30", "bg-forest-wash text-forest ring-forest/20") # text-forest was replaced above
        content = content.replace("bg-ink/10 text-ink/75 ring-ink/15", "bg-surface text-ink ring-hairline") # wait, these were bg-white/10 text-white/75 ring-white/15

    # Any remaining weird combos:
    content = content.replace("bg-ink/10", "bg-surface-dim")
    content = content.replace("ring-ink/15", "ring-hairline")

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)

migrate_to_light("app/(auth)/login/LoginClient.tsx")
migrate_to_light("app/(auth)/signup/SignupClient.tsx")

with open("app/(auth)/layout.tsx", "r", encoding="utf-8") as f:
    layout = f.read()
layout = layout.replace("bg-ink", "bg-surface").replace("grain ", "")
with open("app/(auth)/layout.tsx", "w", encoding="utf-8") as f:
    f.write(layout)

print("Migration done")

