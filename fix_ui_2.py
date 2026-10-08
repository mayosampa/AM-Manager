import os
import re

path = 'src/components/TeamManagement.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix 1: Add unavailable option
# We'll just search for `<option value="injured">Lesionado</option>` and append the new option right after.
new_option = """<option value="injured">Lesionado</option>
                      <option value="unavailable">No disponible</option>"""
content = re.sub(r'<option value="injured">Lesionado</option>', new_option, content)

# Fix 2: Revert flex-wrap and use overflow-x-auto whitespace-nowrap
# The current is: <div className="flex flex-wrap gap-2 bg-[#121215] p-1.5 rounded-xl border border-[#2A2A2E] w-full sm:w-auto">
# We want: <div className="flex overflow-x-auto whitespace-nowrap gap-2 bg-[#121215] p-1.5 rounded-xl border border-[#2A2A2E] w-full sm:w-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
old_tabs_regex = r'<div className="flex flex-wrap gap-2 bg-\[\#121215\] p-1\.5 rounded-xl border border-\[\#2A2A2E\] w-full sm:w-auto">'
new_tabs = '<div className="flex overflow-x-auto whitespace-nowrap gap-2 bg-[#121215] p-1.5 rounded-xl border border-[#2A2A2E] w-full sm:w-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">'

content = re.sub(old_tabs_regex, new_tabs, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Modifications applied successfully.")
