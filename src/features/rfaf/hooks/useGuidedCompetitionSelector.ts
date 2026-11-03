import { useEffect, useMemo, useState } from 'react';
import {
  FedCompetitionOption,
  FedGroupOption,
  FedGroupTeamItem,
  OfficialCompetitionLink,
} from '../../../types';
import {
  clubsMatch,
  fetchAvailableCompetitions,
  fetchGroupsForCompetition,
  fetchTeamsInGroup,
  getPreloadedCompetitions,
  getPreloadedGroups,
  getPreloadedTeamsInGroup,
} from '../../../services/rfafConnectorService';
import { DEFAULT_TEMPORADA } from '../../../services/fedCatalogData';
import { normalizeRfafText } from '../../../services/quintaAmarillaSync';

interface UseGuidedCompetitionSelectorArgs {
  activeTeamName: string;
  initialLink?: OfficialCompetitionLink;
  fallbackCompName?: string;
  fallbackGroupName?: string;
  fallbackClubName?: string;
  onSelectionChange: (selection: OfficialCompetitionLink) => void;
}

export function useGuidedCompetitionSelector({
  activeTeamName,
  initialLink,
  fallbackCompName,
  fallbackGroupName,
  fallbackClubName,
  onSelectionChange,
}: UseGuidedCompetitionSelectorArgs) {
  const [competitions, setCompetitions] = useState<FedCompetitionOption[]>(() => getPreloadedCompetitions());
  const [searchQuery, setSearchQuery] = useState('');
  const [codTemporada] = useState(initialLink?.codTemporada || DEFAULT_TEMPORADA);

  const [codCompeticion, setCodCompeticion] = useState<string>(() => {
    if (initialLink?.codCompeticion) return initialLink.codCompeticion;
    const pre = getPreloadedCompetitions();
    const matched = pre.find(
      c => fallbackCompName && normalizeRfafText(c.nombre).includes(normalizeRfafText(fallbackCompName))
    );
    return matched?.codCompeticion || '48465922';
  });

  const [groups, setGroups] = useState<FedGroupOption[]>(() => getPreloadedGroups(codCompeticion));
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [codGrupo, setCodGrupo] = useState<string>(() => {
    if (initialLink?.codGrupo) return initialLink.codGrupo;
    const preG = getPreloadedGroups(codCompeticion);
    const matchedG = preG.find(
      g => fallbackGroupName && normalizeRfafText(g.nombre) === normalizeRfafText(fallbackGroupName)
    );
    return matchedG?.codGrupo || preG[1]?.codGrupo || preG[0]?.codGrupo || '48901352';
  });

  const [teams, setTeams] = useState<FedGroupTeamItem[]>(() => getPreloadedTeamsInGroup(codGrupo));
  const [loadingTeams, setLoadingTeams] = useState(false);
  const [selectedTeamName, setSelectedTeamName] = useState<string>(
    initialLink?.officialTeamName || fallbackClubName || activeTeamName
  );
  const [selectedTeamCode, setSelectedTeamCode] = useState<string | undefined>(initialLink?.codigoEquipo);

  useEffect(() => {
    let cancelled = false;
    fetchAvailableCompetitions(codTemporada).then(list => {
      if (!cancelled && list.length > 0) setCompetitions(list);
    });
    return () => {
      cancelled = true;
    };
  }, [codTemporada]);

  useEffect(() => {
    if (!codCompeticion) return;
    let cancelled = false;
    const instant = getPreloadedGroups(codCompeticion);
    if (instant.length > 0) setGroups(instant);
    setLoadingGroups(true);
    fetchGroupsForCompetition(codTemporada, codCompeticion)
      .then(list => {
        if (cancelled) return;
        setGroups(list);
        if (list.length > 0 && !list.some(g => g.codGrupo === codGrupo)) {
          setCodGrupo(list[0].codGrupo);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingGroups(false);
      });
    return () => {
      cancelled = true;
    };
  }, [codTemporada, codCompeticion]);

  useEffect(() => {
    if (!codCompeticion || !codGrupo) return;
    let cancelled = false;
    const instantTeams = getPreloadedTeamsInGroup(codGrupo);
    if (instantTeams.length > 0) setTeams(instantTeams);
    setLoadingTeams(true);
    fetchTeamsInGroup(codTemporada, codCompeticion, codGrupo)
      .then(list => {
        if (cancelled) return;
        setTeams(list);
        if (list.length > 0) {
          const currentMatch =
            list.find(t => t.teamName === selectedTeamName) ||
            list.find(t => clubsMatch(t.teamName, activeTeamName)) ||
            list.find(t => clubsMatch(t.teamName, selectedTeamName)) ||
            list[0];
          if (currentMatch) {
            setSelectedTeamName(currentMatch.teamName);
            setSelectedTeamCode(currentMatch.codigoEquipo);
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingTeams(false);
      });
    return () => {
      cancelled = true;
    };
  }, [codTemporada, codCompeticion, codGrupo]);

  const filteredCompetitions = useMemo(() => {
    const q = normalizeRfafText(searchQuery);
    if (!q) return competitions;
    const matches = competitions.filter(c => normalizeRfafText(c.nombre).includes(q));
    const current = competitions.find(c => c.codCompeticion === codCompeticion);
    if (current && !matches.some(m => m.codCompeticion === current.codCompeticion)) {
      return [current, ...matches];
    }
    return matches;
  }, [competitions, searchQuery, codCompeticion]);

  const currentSelection = useMemo<OfficialCompetitionLink>(() => {
    const compObj = competitions.find(c => c.codCompeticion === codCompeticion);
    const grpObj = groups.find(g => g.codGrupo === codGrupo);
    return {
      codTemporada,
      codCompeticion,
      codGrupo,
      codigoEquipo: selectedTeamCode,
      officialTeamName: selectedTeamName || activeTeamName,
      competitionName: compObj?.nombre || fallbackCompName || 'Competición Oficial',
      groupName: grpObj?.nombre || fallbackGroupName || 'Grupo',
    };
  }, [codTemporada, codCompeticion, codGrupo, selectedTeamCode, selectedTeamName, activeTeamName, competitions, groups]);

  useEffect(() => {
    onSelectionChange(currentSelection);
  }, [currentSelection]);

  const handleSelectTeam = (teamName: string) => {
    setSelectedTeamName(teamName);
    const found = teams.find(t => t.teamName === teamName);
    setSelectedTeamCode(found?.codigoEquipo);
  };

  return {
    searchQuery,
    setSearchQuery,
    codCompeticion,
    setCodCompeticion,
    filteredCompetitions,
    codGrupo,
    setCodGrupo,
    groups,
    loadingGroups,
    teams,
    loadingTeams,
    selectedTeamName,
    handleSelectTeam,
    currentSelection,
  };
}
