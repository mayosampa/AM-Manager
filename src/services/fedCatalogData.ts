import { FedCompetitionOption, FedGroupTeamItem } from '../types';

export const DEFAULT_TEMPORADA = '22'; // 2026-2027

/**
 * Catálogo base instantáneo de competiciones oficiales (Temporada 22 · 2026/2027).
 * Permite mostrar y filtrar competiciones en 0 ms mientras se sincroniza o amplía
 * dinámicamente desde el servidor oficial.
 */
export const PRELOADED_COMPETITIONS: FedCompetitionOption[] = [
  // ── Málaga (Sénior y Base) ───────────────────────────────────────────
  {
    codCompeticion: '48465922',
    nombre: '2ª Andaluza Sénior (Málaga)',
    provincia: 'Málaga',
    categoria: 'Sénior',
    grupos: [
      { codGrupo: '48901198', nombre: 'Grupo 1' },
      { codGrupo: '48901352', nombre: 'Grupo 2' },
    ],
  },
  {
    codCompeticion: '48465920',
    nombre: '1ª Andaluza Sénior (Málaga)',
    provincia: 'Málaga',
    categoria: 'Sénior',
    grupos: [
      { codGrupo: '48465921', nombre: 'Grupo Único' },
    ],
  },
  {
    codCompeticion: '48465924',
    nombre: '3ª Andaluza Sénior (Málaga)',
    provincia: 'Málaga',
    categoria: 'Sénior',
    grupos: [
      { codGrupo: '48465925', nombre: 'Grupo 1' },
      { codGrupo: '48465926', nombre: 'Grupo 2' },
      { codGrupo: '48465927', nombre: 'Grupo 3' },
    ],
  },
  {
    codCompeticion: '48466530',
    nombre: 'División de Honor Sénior',
    provincia: 'Autonómica',
    categoria: 'Sénior',
    grupos: [
      { codGrupo: '49641343', nombre: 'Grupo 1' },
      { codGrupo: '48933162', nombre: 'Grupo 2' },
    ],
  },
  {
    codCompeticion: '48465929',
    nombre: '2ª Andaluza Juvenil (Málaga)',
    provincia: 'Málaga',
    categoria: 'Juvenil',
    grupos: [
      { codGrupo: '48465930', nombre: 'Grupo Único' },
    ],
  },
  {
    codCompeticion: '48465931',
    nombre: '3ª Andaluza Juvenil (Málaga)',
    provincia: 'Málaga',
    categoria: 'Juvenil',
  },
  {
    codCompeticion: '48465934',
    nombre: '4ª Andaluza Juvenil (Málaga)',
    provincia: 'Málaga',
    categoria: 'Juvenil',
  },
  {
    codCompeticion: '48465942',
    nombre: '2ª Andaluza Cadete (Málaga)',
    provincia: 'Málaga',
    categoria: 'Cadete',
  },
  {
    codCompeticion: '48465944',
    nombre: '3ª Andaluza Cadete (Málaga)',
    provincia: 'Málaga',
    categoria: 'Cadete',
  },
  // ── Autonómicas y Nacionales ─────────────────────────────────────────
  {
    codCompeticion: '48465911',
    nombre: 'Liga Nacional Juvenil',
    provincia: 'Autonómica',
    categoria: 'Juvenil',
  },
  {
    codCompeticion: '48466083',
    nombre: 'División de Honor Cadete',
    provincia: 'Autonómica',
    categoria: 'Cadete',
  },
  {
    codCompeticion: '48466085',
    nombre: '1ª Andaluza Cadete',
    provincia: 'Autonómica',
    categoria: 'Cadete',
  },
  // ── Otras Provincias (Sénior y Juvenil) ──────────────────────────────
  { codCompeticion: '48466124', nombre: '1ª Andaluza Sénior (Sevilla)', provincia: 'Sevilla', categoria: 'Sénior' },
  { codCompeticion: '48466126', nombre: '2ª Andaluza Sénior (Sevilla)', provincia: 'Sevilla', categoria: 'Sénior' },
  { codCompeticion: '48466186', nombre: '3ª Andaluza Sénior (Sevilla)', provincia: 'Sevilla', categoria: 'Sénior' },
  { codCompeticion: '48680130', nombre: '1ª Andaluza Sénior (Cádiz)', provincia: 'Cádiz', categoria: 'Sénior' },
  { codCompeticion: '48680489', nombre: '2ª Andaluza Sénior (Cádiz)', provincia: 'Cádiz', categoria: 'Sénior' },
  { codCompeticion: '48780558', nombre: '3ª Andaluza Sénior (Cádiz)', provincia: 'Cádiz', categoria: 'Sénior' },
  { codCompeticion: '48466157', nombre: '1ª Andaluza Sénior (Granada)', provincia: 'Granada', categoria: 'Sénior' },
  { codCompeticion: '48466167', nombre: '2ª Andaluza Sénior (Granada)', provincia: 'Granada', categoria: 'Sénior' },
  { codCompeticion: '48466195', nombre: '3ª Andaluza Sénior (Granada)', provincia: 'Granada', categoria: 'Sénior' },
  { codCompeticion: '48466090', nombre: '1ª Andaluza Sénior (Córdoba)', provincia: 'Córdoba', categoria: 'Sénior' },
  { codCompeticion: '48466092', nombre: '2ª Andaluza Sénior (Córdoba)', provincia: 'Córdoba', categoria: 'Sénior' },
  { codCompeticion: '49097854', nombre: '3ª Andaluza Sénior (Córdoba)', provincia: 'Córdoba', categoria: 'Sénior' },
  { codCompeticion: '48466094', nombre: '1ª Andaluza Sénior (Jaén)', provincia: 'Jaén', categoria: 'Sénior' },
  { codCompeticion: '48466104', nombre: '2ª Andaluza Sénior (Jaén)', provincia: 'Jaén', categoria: 'Sénior' },
  { codCompeticion: '48786377', nombre: '1ª Andaluza Sénior (Almería)', provincia: 'Almería', categoria: 'Sénior' },
  { codCompeticion: '49951770', nombre: '2ª Andaluza Sénior (Almería)', provincia: 'Almería', categoria: 'Sénior' },
  { codCompeticion: '48466521', nombre: '1ª Andaluza Sénior (Huelva)', provincia: 'Huelva', categoria: 'Sénior' },
  { codCompeticion: '48466523', nombre: '2ª Andaluza Sénior (Huelva)', provincia: 'Huelva', categoria: 'Sénior' },
  { codCompeticion: '48466131', nombre: '2ª Andaluza Juvenil (Sevilla)', provincia: 'Sevilla', categoria: 'Juvenil' },
  { codCompeticion: '48795719', nombre: '2ª Andaluza Juvenil (Cádiz)', provincia: 'Cádiz', categoria: 'Juvenil' },
  { codCompeticion: '48466178', nombre: '2ª Andaluza Juvenil (Granada)', provincia: 'Granada', categoria: 'Juvenil' },
  { codCompeticion: '48466096', nombre: '2ª Andaluza Juvenil (Córdoba)', provincia: 'Córdoba', categoria: 'Juvenil' },
  { codCompeticion: '48466116', nombre: '2ª Andaluza Juvenil (Jaén)', provincia: 'Jaén', categoria: 'Juvenil' },
  { codCompeticion: '48792884', nombre: '2ª Andaluza Juvenil (Almería)', provincia: 'Almería', categoria: 'Juvenil' },
  { codCompeticion: '48466526', nombre: '2ª Andaluza Juvenil (Huelva)', provincia: 'Huelva', categoria: 'Juvenil' },
];

/**
 * Equipos pre-cacheados por `codGrupo` para carga instantánea (0 ms) incluso sin red.
 */
export const PRELOADED_GROUP_TEAMS: Record<string, FedGroupTeamItem[]> = {
  // 2ª Andaluza Sénior (Málaga) · Grupo 2
  '48901352': [
    { codigoEquipo: '803915', teamName: 'C.D. ALORA "A"' },
    { codigoEquipo: '4068670', teamName: 'ALHAURIN DE LA TORRE C.F.' },
    { codigoEquipo: '837115', teamName: 'ALMOGIA ATLETIC' },
    { codigoEquipo: '16589937', teamName: 'ARDALES ATLETICO C.D.' },
    { codigoEquipo: '804715', teamName: 'C.D. CAMPILLOS' },
    { codigoEquipo: '24074842', teamName: 'C.D. CARTAMA' },
    { codigoEquipo: '33430736', teamName: 'C.D. FÚTBOL CLUB MARBELLI' },
    { codigoEquipo: '38886181', teamName: 'C.D. JUVENTUD DE TOLOX CORAZÓN DE LA SIERRA DE LAS NIEVES' },
    { codigoEquipo: '2720269', teamName: 'C.D. SIERRA DE YEGUAS' },
    { codigoEquipo: '8005015', teamName: 'C.D. VALLE DE ABDALAJIS U.D.' },
    { codigoEquipo: '34494538', teamName: 'C.F. EL BURGO' },
    { codigoEquipo: '2065485', teamName: 'CANDOR C.F.' },
    { codigoEquipo: '45447917', teamName: 'CD INCONDICIONALES' },
    { codigoEquipo: '24165097', teamName: 'COSTA UNIDA C.F.' },
    { codigoEquipo: '44850475', teamName: 'PEÑA COMPADRES' },
    { codigoEquipo: '847215', teamName: 'U.D. HUMILLADERO' },
  ],
  // 2ª Andaluza Sénior (Málaga) · Grupo 1
  '48901198': [
    { codigoEquipo: '13034484', teamName: 'A.D. ALMAYATE' },
    { codigoEquipo: '811315', teamName: 'ARCHIDONA ATCO.' },
    { codigoEquipo: '33389357', teamName: 'ATLETICO JUVAL' },
    { codigoEquipo: '826115', teamName: 'C. D. UNIÓN DEPORTIVA ROSARIO' },
    { codigoEquipo: '805216', teamName: 'C.D. CASABERMEJA' },
    { codigoEquipo: '802815', teamName: 'C.D. CHURRIANA' },
    { codigoEquipo: '41544899', teamName: 'C.D. FOOTFAY UNITED' },
    { codigoEquipo: '802515', teamName: 'C.D. NERJA' },
    { codigoEquipo: '804115', teamName: 'C.D. TORROX' },
    { codigoEquipo: '44811212', teamName: 'C.D. VELEZ C.F. 1922' },
    { codigoEquipo: '20213930', teamName: 'EF DE VELEZ FRANCISCO CASTEJON' },
    { codigoEquipo: '2674304', teamName: 'GUADALMAR C.D. "A"' },
    { codigoEquipo: '45983708', teamName: 'ORTEGA MALAGA FUTBOL CLUB DEPORTIVO' },
    { codigoEquipo: '2794071', teamName: 'RIOGORDO CF' },
    { codigoEquipo: '876215', teamName: 'TOTALAN ATLETICO' },
    { codigoEquipo: '828615', teamName: 'U.D. ALGARROBO' },
  ],
  // 1ª Andaluza Sénior (Málaga) · Grupo Único
  '48465921': [
    { codigoEquipo: '28706303', teamName: 'ANTEQUERA C.F. S.A.D.' },
    { codigoEquipo: '817915', teamName: 'ATLETICO ESTACION' },
    { codigoEquipo: '864415', teamName: 'C.D. ATHLETIC DE COIN' },
    { codigoEquipo: '801515', teamName: 'C.D. ATLETICO BENAMIEL C.F.' },
    { codigoEquipo: '20287807', teamName: 'C.D. CAMPANILLAS' },
    { codigoEquipo: '2653065', teamName: 'C.D. ESTEPONA FÚTBOL SENIOR' },
    { codigoEquipo: '802415', teamName: 'C.D. MIJAS' },
    { codigoEquipo: '24014990', teamName: 'C.D. PIZARRA ATLÉTICO C.F.' },
    { codigoEquipo: '800815', teamName: 'C.D. RONDA' },
    { codigoEquipo: '817415', teamName: 'C.D. TRABUCO' },
    { codigoEquipo: '8003615', teamName: 'C.D. UNION MANILVA C.F.' },
    { codigoEquipo: '801315', teamName: 'CARTAMA C.D.' },
    { codigoEquipo: '28567525', teamName: 'CLUB POLIDEPORTIVO MIJAS LAS LAGUNAS' },
    { codigoEquipo: '2064590', teamName: 'JUVENTUD DE TORREMOLINOS CF CD' },
    { codigoEquipo: '808615', teamName: 'LA CALA C.D.' },
    { codigoEquipo: '20213511', teamName: 'MALAGA C.F. SAD' },
    { codigoEquipo: '840115', teamName: 'PEÑA COMPADRES' },
    { codigoEquipo: '801015', teamName: 'U.D. FUENGIROLA LOS BOLICHES' },
  ],
};
