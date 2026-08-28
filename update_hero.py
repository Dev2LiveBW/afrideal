import sys

with open("components/storefront/MockupHero.tsx", "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace(
    'src="/images/home/phone-mockup.jpg"',
    'src="https://images.unsplash.com/photo-1511140973288-19bf21d7e771?auto=format&fit=crop&q=80"'
)

content = content.replace(
    'src="/images/home/procure-runner.jpg"',
    'src="https://images.unsplash.com/photo-1594379251350-44f9905492df?auto=format&fit=crop&q=80"'
)

with open("components/storefront/MockupHero.tsx", "w", encoding="utf-8") as f:
    f.write(content)