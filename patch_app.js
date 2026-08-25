const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf-8');
content = content.replace("{['calendar', 'stats'].includes(activeView) && (", "{activeView === 'calendar' && (");
fs.writeFileSync('src/App.tsx', content);
