const fs = require('fs');

let code = fs.readFileSync('src/components/LiveMatch.tsx', 'utf8');

// Use regex for loadState block
code = code.replace(
  /const loadState = \(key: string, defaultVal: any\) => \{[\s\S]*?return defaultVal;\r?\n\};/m,
  ``
);

// Add db import if missing
if (!code.includes("import { db } from '../services/db';")) {
  code = code.replace(
    /import { Play, Pause/g,
    `import { db } from '../services/db';\nimport { Play, Pause`
  );
}

// Rename component to LiveMatchInner
code = code.replace(
  /export function LiveMatch\(\{ squad, bench, onNavigate, scheduledMatch \}: LiveMatchProps\) \{/,
  `function LiveMatchInner({ squad, bench, onNavigate, scheduledMatch, initialSession }: LiveMatchProps & { initialSession: any }) {
  const loadState = (key: string, defaultVal: any) => {
    if (initialSession && initialSession.matchConfig && initialSession[key] !== undefined) {
      return initialSession[key];
    }
    return defaultVal;
  };`
);

// Replace saveSession
code = code.replace(
  /const saveSession = \(\) => \{[\s\S]*?localStorage\.setItem\('activeMatchSession'[\s\S]*?\};/m,
  `const saveSession = () => {
    if (stateRef.current.matchConfig) {
      db.saveAppState('activeMatchSession', stateRef.current).catch(console.error);
    }
  };`
);

// Replace season plan saving logic
code = code.replace(
  /localStorage\.setItem\('am_manager_season_plan', JSON\.stringify\(seasonPlan\)\);\s*await db\.saveSeasonPlan\(seasonPlan\);/g,
  `await db.saveSeasonPlan(seasonPlan);`
);

code = code.replace(
  /localStorage\.removeItem\('activeMatchSession'\);/g,
  `db.deleteAppState('activeMatchSession').catch(console.error);`
);

// Append wrapper
code += `
export function LiveMatch(props: LiveMatchProps) {
  const [session, setSession] = useState<any>(undefined);
  useEffect(() => {
    db.getAppState('activeMatchSession').then(data => {
      setSession(data || null);
    }).catch(e => {
      console.error(e);
      setSession(null);
    });
  }, []);
  
  if (session === undefined) return <div className="p-10 text-center text-white">Cargando sesi&oacute;n de partido...</div>;
  return <LiveMatchInner {...props} initialSession={session} />;
}
`;

fs.writeFileSync('src/components/LiveMatch.tsx', code);
