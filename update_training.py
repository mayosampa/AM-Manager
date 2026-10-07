with open('src/components/TrainingPlanner.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_useTeam = "  const { activeTeam, updateTeamPlayers, teams, customCategories } = useTeam();"
new_useTeam = "  const { activeTeam, updateTeamPlayers, teams, customCategories, teamSettings } = useTeam();"
content = content.replace(old_useTeam, new_useTeam)

old_effect = """    useEffect(() => {
    if (showMatchModal) {
      if (matchForm.isHome) {
        setMatchForm(prev => ({ ...prev, location: activeTeam?.homeStadium || '' }));
      } else {
        setMatchForm(prev => ({ ...prev, location: '' }));
      }
    }
  }, [matchForm.isHome, showMatchModal, activeTeam?.homeStadium]);"""

new_effect = """    useEffect(() => {
    if (showMatchModal) {
      if (matchForm.isHome) {
        setMatchForm(prev => ({ ...prev, location: teamSettings?.homeStadium || '' }));
      } else {
        setMatchForm(prev => ({ ...prev, location: '' }));
      }
    }
  }, [matchForm.isHome, showMatchModal, teamSettings?.homeStadium]);"""
content = content.replace(old_effect, new_effect)

with open('src/components/TrainingPlanner.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
