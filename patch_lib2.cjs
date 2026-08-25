const fs = require('fs');
let code = fs.readFileSync('src/components/LibraryScreen.tsx', 'utf8');

code = code.replace(
  "const [editForm, setEditForm] = useState({ title: '', category: 'Posesión', duration: 15 });",
  "const [editForm, setEditForm] = useState({ title: '', category: 'Posesión', duration: 15, modality: 'Universal' });"
);

code = code.replace(
  `    setEditForm({
      title: exercise.title || '',
      category: exercise.category || 'Posesión',
      duration: exercise.duration || 15
    });`,
  `    setEditForm({
      title: exercise.title || '',
      category: exercise.category || 'Posesión',
      duration: exercise.duration || 15,
      modality: exercise.modality || exercise.exerciseModality || 'Universal'
    });`
);

code = code.replace(
  `    saveExercise({
      ...editingExercise,
      title: editForm.title,
      category: editForm.category,
      duration: editForm.duration
    });`,
  `    saveExercise({
      ...editingExercise,
      title: editForm.title,
      category: editForm.category,
      duration: editForm.duration,
      modality: editForm.modality
    });`
);

const oldDurationUI = `              <div>
                <label className="block text-[#6E6E75] text-sm font-medium mb-1">Duración (minutos)</label>
                <input 
                  type="number" 
                  placeholder="Ej: 15" 
                  min="1"
                  value={editForm.duration}
                  onChange={(e) => setEditForm({...editForm, duration: Number(e.target.value)})}
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50"
                />
              </div>
            </div>`;

const newDurationUI = `              <div>
                <label className="block text-[#6E6E75] text-sm font-medium mb-1">Duración (minutos)</label>
                <input 
                  type="number" 
                  placeholder="Ej: 15" 
                  min="1"
                  value={editForm.duration}
                  onChange={(e) => setEditForm({...editForm, duration: Number(e.target.value)})}
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50"
                />
              </div>
              
              <div>
                <label className="block text-[#6E6E75] text-sm font-medium mb-1">Modalidad</label>
                <select 
                  value={editForm.modality}
                  onChange={(e) => setEditForm({...editForm, modality: e.target.value})}
                  className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-[#FF4B4B]/50"
                >
                  <option value="Universal">Universal</option>
                  <option value="F7">Fútbol 7</option>
                  <option value="F11">Fútbol 11</option>
                </select>
              </div>
            </div>`;

code = code.replace(oldDurationUI, newDurationUI);

fs.writeFileSync('src/components/LibraryScreen.tsx', code);
