"""Fix all API_URL fallbacks to use the Vite proxy instead of direct 8080."""
import os, glob

root = r"C:\PROJECTS\Self-Hosted Generative AI Chatbot\admin-frontend\src"
patterns = [
    'VITE_API_URL || "http://localhost:8080"',
    "VITE_API_URL || 'http://localhost:8080'",
]
count = 0
for pattern in ["**/*.tsx", "**/*.ts"]:
    for f in glob.glob(os.path.join(root, pattern), recursive=True):
        with open(f, "r", encoding="utf-8") as fh:
            content = fh.read()
        changed = False
        for old in patterns:
            if old in content:
                content = content.replace(old, 'VITE_API_URL || ""')
                changed = True
        if changed:
            with open(f, "w", encoding="utf-8") as fh:
                fh.write(content)
            print(f"  Fixed: {os.path.relpath(f, root)}")
            count += 1
print(f"\nFixed {count} files")
