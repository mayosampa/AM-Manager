const fs = require('fs');
let code = fs.readFileSync('src/components/LibraryScreen.tsx', 'utf8');

const oldFilter = `    // 2. Comprobación flexible de modalidad (soporta datos antiguos)
    const exerciseMod = (ex as any).exerciseModality || ex.modality || "Universal";
    const matchModality = selectedModality === "Todas" || exerciseMod === selectedModality || exerciseMod === "Universal";`;

const newFilter = `    // 2. Comprobación estricta de modalidad
    // Los ejercicios antiguos sin modalidad se asumen como 'Universal'.
    // Si se selecciona 'F7' o 'F11', SOLO se muestran los que coincidan exactamente, ocultando los 'Universal'.
    const exerciseMod = (ex as any).exerciseModality || ex.modality || "Universal";
    const matchModality = selectedModality === "Todas" || exerciseMod === selectedModality;`;

code = code.replace(oldFilter, newFilter);
fs.writeFileSync('src/components/LibraryScreen.tsx', code);
