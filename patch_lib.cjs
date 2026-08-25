const fs = require('fs');
let code = fs.readFileSync('src/components/LibraryScreen.tsx', 'utf8');

// Rename states
code = code.replace(
  "const [activeTab, setActiveTab] = useState('Todas');",
  "const [selectedCategory, setSelectedCategory] = useState('Todas');"
);
code = code.replace(
  "const [activeModalityFilter, setActiveModalityFilter] = useState<'Todas' | 'F7' | 'F11'>('Todas');",
  "const [selectedModality, setSelectedModality] = useState<'Todas' | 'F7' | 'F11'>('Todas');"
);

// Update filter logic
const oldFilter = `  const filteredExercises = savedExercises.filter(ex => {
    const mappedCat = mapLegacyCategory(ex.category);
    const matchesTab = activeTab === 'Todas' || mappedCat === activeTab;
    const matchesSearch = ex.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Check modality. 'Universal' exercises are always shown unless we specifically exclude them, but the prompt says:
    // "Un ejercicio "Universal" debe aparecer siempre, independientemente de si el usuario filtra por F7 o F11"
    const exModality = ex.modality || 'Universal';
    let matchesModality = true;
    if (activeModalityFilter === 'F7') {
      matchesModality = (exModality === 'F7' || exModality === 'Universal');
    } else if (activeModalityFilter === 'F11') {
      matchesModality = (exModality === 'F11' || exModality === 'Universal');
    }

    return matchesTab && matchesSearch && matchesModality;
  });`;

const newFilter = `  const filteredExercises = savedExercises.filter(ex => {
    const mappedCat = mapLegacyCategory(ex.category);
    const matchCategory = selectedCategory === "Todas" || mappedCat === selectedCategory;
    const matchModality = selectedModality === "Todas" || ex.modality === selectedModality || ex.modality === "Universal" || !ex.modality;
    const matchesSearch = ex.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchModality && matchesSearch;
  });`;

code = code.replace(oldFilter, newFilter);

// Replace UI 
const oldUI = `      {/* Categories Tabs */}
      <div className="flex flex-wrap items-center gap-6 border-b border-gray-800 pb-2 mb-6">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveTab(cat)}
            className={\`font-bold text-sm transition-colors \${
              activeTab === cat 
                ? 'text-red-500 border-b-2 border-red-500 pb-2 -mb-[10px]' 
                : 'text-gray-400 hover:text-gray-200 cursor-pointer pb-2'
            }\`}
          >
            {cat}
          </button>
        ))}
      </div>`;

const newUI = `      {/* Filter Container */}
      <div className="flex flex-col gap-4 mb-8">
        {/* Categories Tabs */}
        <div className="flex flex-wrap items-center gap-6 border-b border-gray-800 pb-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={\`font-bold text-sm transition-colors \${
                selectedCategory === cat 
                  ? 'text-red-500 border-b-2 border-red-500 pb-2 -mb-[10px]' 
                  : 'text-gray-400 hover:text-gray-200 cursor-pointer pb-2'
              }\`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        {/* Modality Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {['Todas', 'F7', 'F11'].map(mod => (
            <button
              key={mod}
              onClick={() => setSelectedModality(mod as 'Todas' | 'F7' | 'F11')}
              className={\`px-4 py-1.5 rounded-full text-xs font-bold transition-colors \${
                selectedModality === mod
                  ? 'bg-red-500 text-white'
                  : 'bg-[#1C1C1F] text-[#6E6E75] hover:text-white border border-[#2A2A2E]'
              }\`}
            >
              {mod}
            </button>
          ))}
        </div>
      </div>`;

code = code.replace(oldUI, newUI);

fs.writeFileSync('src/components/LibraryScreen.tsx', code);
