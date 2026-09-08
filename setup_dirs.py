import os

base_dir = r"c:\Users\050yi\Desktop\salon\backend"
dirs = [
    "app",
    "app/db",
    "app/models",
    "app/schemas",
    "app/services",
    "app/api",
    "app/tests"
]

for d in dirs:
    os.makedirs(os.path.join(base_dir, d), exist_ok=True)

for root, _, _ in os.walk(os.path.join(base_dir, "app")):
    open(os.path.join(root, "__init__.py"), "w").close()
