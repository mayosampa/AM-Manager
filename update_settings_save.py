with open('src/components/SettingsScreen.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_saveSettings = """  const saveSettings = async () => {
    if (activeTeam) {
      updateTeam(activeTeam.id, { name: teamName, modality: activeTeam.modality, homeStadium });
      updateTeamSettings(settings);
      alert('Ajustes guardados correctamente.');
    }
  };"""

new_saveSettings = """  const saveSettings = async () => {
    if (activeTeam) {
      updateTeam(activeTeam.id, { 
        name: teamName, 
        modality: activeTeam.modality, 
        homeStadium,
        crestUrl: settings.crestUrl // GUARDA EL ESCUDO EN EL TEAM TAMBIÉN
      });
      updateTeamSettings(settings);
      alert('Ajustes guardados correctamente.');
    }
  };"""

content = content.replace(old_saveSettings, new_saveSettings)

with open('src/components/SettingsScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
