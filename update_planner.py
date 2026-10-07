with open('src/components/TrainingPlanner.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix \ufffd in TrainingPlanner
content = content.replace("Condici\ufffdn", "Condición")
content = content.replace("A\ufffdadir", "Añadir")
content = content.replace("Visi\ufffdn", "Visión")
content = content.replace("Mi\ufffdrcoles", "Miércoles")
content = content.replace("S\ufffdbado", "Sábado")
content = content.replace("Posesi\ufffdn", "Posición")
content = content.replace("Bal\ufffdn", "Balón")
content = content.replace("L\ufffdneas", "Líneas")
content = content.replace("F\ufffdsica", "Física")
content = content.replace("Cat\ufffdlogo", "Catálogo")

# Update matchForm initialization
content = content.replace("isHome: true, competition: 'Liga', time: '' }", "isHome: true, competition: 'Liga', time: '', location: '' }")

# Add location input in MatchModal
# First, find the Condición block to insert AFTER it.
condition_block = """                  <div className="flex gap-2">
                    <button
                      onClick={() => setMatchForm({...matchForm, isHome: true})}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${matchForm.isHome ? 'bg-[#FF4B4B] text-black border-[#FF4B4B]' : 'bg-[#1C1C1F] text-[#6E6E75] border-[#2A2A2E]'}`}
                    >
                      Local
                    </button>
                    <button
                      onClick={() => setMatchForm({...matchForm, isHome: false})}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors ${!matchForm.isHome ? 'bg-[#2A2A2E] text-white border-white/20' : 'bg-[#1C1C1F] text-[#6E6E75] border-[#2A2A2E]'}`}
                    >
                      Visitante
                    </button>
                  </div>
                </div>
              </div>"""

location_html = """
              <div className="mt-4">
                <label className="block text-[#6E6E75] text-sm font-medium mb-1">Lugar / Estadio</label>
                <input 
                  type="text" 
                  value={matchForm.location || ''}
                  onChange={(e) => setMatchForm({...matchForm, location: e.target.value})}
                  placeholder="Ej. Estadio Municipal"
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-[#FF4B4B]"
                />
              </div>
"""

content = content.replace(condition_block, condition_block + location_html)

# Now inject the useEffect!
# Let's insert it after `const [matchForm, setMatchForm] = useState...`
use_effect_code = """
  useEffect(() => {
    if (showMatchModal) {
      if (matchForm.isHome) {
        setMatchForm(prev => ({ ...prev, location: activeTeam?.homeStadium || '' }));
      } else {
        setMatchForm(prev => ({ ...prev, location: '' }));
      }
    }
  }, [matchForm.isHome, showMatchModal, activeTeam?.homeStadium]);
"""

state_line = "const [matchForm, setMatchForm] = useState<MatchDetails>({ opponent: '', isHome: true, competition: 'Liga', time: '', location: '' });"
content = content.replace(state_line, state_line + use_effect_code)


with open('src/components/TrainingPlanner.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
