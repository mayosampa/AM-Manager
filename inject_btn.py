import os
import re

with open('src/components/TeamManagement.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

button_injection = """              <button 
                onClick={generatePDF}
                disabled={isGeneratingPdf}
                className="bg-[#1C1C1F] border border-[#2A2A2E] text-white p-2.5 rounded-xl hover:bg-[#2A2A2E] hover:text-[#FF4B4B] transition-colors flex items-center justify-center disabled:opacity-50"
                title="Exportar Plantilla"
              >
                {isGeneratingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
              </button>"""

match = re.search(r'(\s+)<button[^>]+onClick=\{\(\) => \{ setPlayerForm\(\{\}\); setIsEditingPlayer\(false\); setShowPlayerModal\(true\); \}\}', content)
if match:
    indent = match.group(1)
    new_content = content[:match.start()] + "\n" + button_injection + content[match.start():]
    
    with open('src/components/TeamManagement.tsx', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print('Button injected successfully!')
else:
    print('Could not find the button to replace.')
