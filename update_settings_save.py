with open('src/components/SettingsScreen.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace local TeamSettings interface to include homeStadium
old_interface = """interface TeamSettings {
  crestUrl: string;
  defaultFormation: string;
}"""

new_interface = """interface TeamSettings {
  crestUrl: string;
  defaultFormation: string;
  homeStadium?: string;
}"""
content = content.replace(old_interface, new_interface)

# Fix useEffects
old_effect1 = """  useEffect(() => {
    if (activeTeam) {
      setTeamName(activeTeam.name);
      setHomeStadium(activeTeam.homeStadium || '');
    }
  }, [activeTeam]);

  useEffect(() => {
    if (teamSettings) {
      setSettings(teamSettings);
    }
  }, [teamSettings]);"""

new_effect1 = """  useEffect(() => {
    if (activeTeam) {
      setTeamName(activeTeam.name);
    }
  }, [activeTeam]);

  useEffect(() => {
    if (teamSettings) {
      setSettings(teamSettings);
      setHomeStadium(teamSettings.homeStadium || '');
    }
  }, [teamSettings]);"""
content = content.replace(old_effect1, new_effect1)

# Fix saveSettings
old_save = """  const saveSettings = async () => {
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

new_save = """  const saveSettings = async () => {
    if (activeTeam) {
      updateTeam(activeTeam.id, { 
        name: teamName, 
        modality: activeTeam.modality
      });
      updateTeamSettings({ ...settings, homeStadium });
      alert('Ajustes guardados correctamente.');
    }
  };"""
content = content.replace(old_save, new_save)

with open('src/components/SettingsScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
