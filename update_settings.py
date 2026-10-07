with open('src/components/SettingsScreen.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("const [teamName, setTeamName] = useState('');", "const [teamName, setTeamName] = useState('');\n  const [homeStadium, setHomeStadium] = useState('');")
content = content.replace("setTeamName(activeTeam.name);", "setTeamName(activeTeam.name);\n      setHomeStadium(activeTeam.homeStadium || '');")
content = content.replace("updateTeam(activeTeam.id, { name: teamName, modality: activeTeam.modality });", "updateTeam(activeTeam.id, { name: teamName, modality: activeTeam.modality, homeStadium });")

stadium_html = """
          <div className="mt-6">
            <label className="text-sm font-medium text-[#6E6E75] block mb-2">Estadio / Campo Local</label>
            <input 
              type="text" 
              value={homeStadium}
              onChange={e => setHomeStadium(e.target.value)}
              placeholder="Ej: Estadio Municipal"
              className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-white focus:border-[#FF4B4B]/50 focus:outline-none"
            />
          </div>"""

content = content.replace("          </div>\n        </div>", "          </div>\n" + stadium_html + "\n        </div>", 1)

with open('src/components/SettingsScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
