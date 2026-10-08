import os

path = 'src/types/index.ts'
if not os.path.exists(path):
    path = 'src/types.ts'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("status: 'available' | 'injured';", "status: 'available' | 'injured' | 'unavailable';")

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
