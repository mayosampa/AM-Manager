import os

path = 'src/components/TeamManagement.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update form select options
old_select = """<option value="available">Disponible</option>
                      <option value="injured">Lesionado</option>"""
new_select = """<option value="available">Disponible</option>
                      <option value="injured">Lesionado</option>
                      <option value="unavailable">No disponible</option>"""
content = content.replace(old_select, new_select)

# 2. Update dashboard stats panel
old_stats = """          <div className="grid grid-cols-4 gap-2">
            <div className="bg-[#1C1C1F] p-3 rounded-xl border border-[#2A2A2E] flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-white">{players.length}</span>
              <span className="text-[10px] text-[#6E6E75] uppercase tracking-wider text-center">Total</span>
            </div>
            <div className="bg-[#1C1C1F] p-3 rounded-xl border border-emerald-500/20 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-emerald-400">{players.filter(p => p.status === 'available' && !p.isSuspended).length}</span>
              <span className="text-[10px] text-emerald-500/70 uppercase tracking-wider text-center">Disp.</span>
            </div>
            <div className="bg-[#1C1C1F] p-3 rounded-xl border border-yellow-500/20 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-yellow-400">{players.filter(p => p.status === 'injured').length}</span>
              <span className="text-[10px] text-yellow-500/70 uppercase tracking-wider text-center">Lesión</span>
            </div>
            <div className="bg-[#1C1C1F] p-3 rounded-xl border border-[#FF4B4B]/20 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-[#FF4B4B]">{players.filter(p => p.isSuspended).length}</span>
              <span className="text-[10px] text-[#FF4B4B]/70 uppercase tracking-wider text-center">Sanción</span>
            </div>
          </div>"""

# Fallback string matching because of possible encoding mismatches (like "Lesión" / "Sanción")
import re
match_stats = re.search(r'<div className="grid grid-cols-4 gap-2">.*?</div>\s*</div>', content, re.DOTALL)
if match_stats:
    new_stats = """          <div className="grid grid-cols-5 gap-2">
            <div className="bg-[#1C1C1F] p-3 rounded-xl border border-[#2A2A2E] flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-white">{players.length}</span>
              <span className="text-[10px] text-[#6E6E75] uppercase tracking-wider text-center">Total</span>
            </div>
            <div className="bg-[#1C1C1F] p-3 rounded-xl border border-emerald-500/20 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-emerald-400">{players.filter(p => p.status === 'available' && !p.isSuspended).length}</span>
              <span className="text-[10px] text-emerald-500/70 uppercase tracking-wider text-center">Disp.</span>
            </div>
            <div className="bg-[#1C1C1F] p-3 rounded-xl border border-yellow-500/20 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-yellow-400">{players.filter(p => p.status === 'injured').length}</span>
              <span className="text-[10px] text-yellow-500/70 uppercase tracking-wider text-center">Lesión</span>
            </div>
            <div className="bg-[#1C1C1F] p-3 rounded-xl border border-[#FF4B4B]/20 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-[#FF4B4B]">{players.filter(p => p.isSuspended).length}</span>
              <span className="text-[10px] text-[#FF4B4B]/70 uppercase tracking-wider text-center">Sanción</span>
            </div>
            <div className="bg-[#1C1C1F] p-3 rounded-xl border border-gray-500/20 flex flex-col items-center justify-center">
              <span className="text-xl font-bold text-gray-400">{players.filter(p => p.status === 'unavailable').length}</span>
              <span className="text-[10px] text-gray-400 uppercase tracking-wider text-center">No Disp.</span>
            </div>
          </div>"""
    content = content[:match_stats.start()] + new_stats + content[match_stats.end()-6:]

# 3. Update tabs container for responsive
old_tabs = """<div className="flex gap-2 bg-[#121215] p-1.5 rounded-xl border border-[#2A2A2E] overflow-x-auto w-full sm:w-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">"""
new_tabs = """<div className="flex flex-wrap gap-2 bg-[#121215] p-1.5 rounded-xl border border-[#2A2A2E] w-full sm:w-auto">"""
content = content.replace(old_tabs, new_tabs)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
