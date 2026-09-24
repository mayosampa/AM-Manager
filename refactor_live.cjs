const fs = require('fs');

let code = fs.readFileSync('src/components/LiveMatch.tsx', 'utf8');

// 1. Add db import
code = code.replace(
  `import { Play, Pause, Goal, Handshake, ArrowRightLeft, Square, Trash2, Edit3 } from 'lucide-react';`,
  `import { Play, Pause, Goal, Handshake, ArrowRightLeft, Square, Trash2, Edit3 } from 'lucide-react';\nimport { db } from '../services/db';`
);

// 2. Change loadState to use a global or passed object, or we can just redefine loadState inside LiveMatchInner
code = code.replace(
  `const loadState = (key: string, defaultVal: any) => {
  try {
    const saved = localStorage.getItem('activeMatchSession');
    if (saved) {
      const data = JSON.parse(saved);
      if (data.matchConfig && data[key] !== undefined) {
        return data[key];
      }
    }
  } catch (e) {}
  return defaultVal;
};`,
  ``
);

code = code.replace(
  `export function LiveMatch({ squad, bench, onNavigate, scheduledMatch }: LiveMatchProps) {`,
  `function LiveMatchInner({ squad, bench, onNavigate, scheduledMatch, initialSession }: LiveMatchProps & { initialSession: any }) {
  const loadState = (key: string, defaultVal: any) => {
    if (initialSession && initialSession.matchConfig && initialSession[key] !== undefined) {
      return initialSession[key];
    }
    return defaultVal;
  };`
);

// 3. Replace saveSession
code = code.replace(
  `  const saveSession = () => {
    if (stateRef.current.matchConfig) {
      localStorage.setItem('activeMatchSession', JSON.stringify(stateRef.current));
    }
  };`,
  `  const saveSession = () => {
    if (stateRef.current.matchConfig) {
      db.saveAppState('activeMatchSession', stateRef.current).catch(console.error);
    }
  };`
);

// 4. Replace end match session clearing
code = code.replace(
  `    let seasonPlan = await db.getSeasonPlan(); if (!seasonPlan || Object.keys(seasonPlan).length === 0) { const local = localStorage.getItem('am_manager_season_plan'); if (local) seasonPlan = JSON.parse(local); }`,
  `    let seasonPlan = await db.getSeasonPlan();`
);

code = code.replace(
  `    localStorage.setItem('am_manager_season_plan', JSON.stringify(seasonPlan)); await db.saveSeasonPlan(seasonPlan);
    localStorage.removeItem('activeMatchSession');`,
  `    await db.saveSeasonPlan(seasonPlan);
    db.deleteAppState('activeMatchSession').catch(console.error);`
);


// 5. Add LiveMatch wrapper at the end of the file
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
  
  if (session === undefined) return <div className="p-10 text-center text-white">Cargando sesin de partido...</div>;
  return <LiveMatchInner {...props} initialSession={session} />;
}
`;

fs.writeFileSync('src/components/LiveMatch.tsx', code);
