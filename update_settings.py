with open('src/components/SettingsScreen.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_saveSettings = "  const saveSettings = async () => {"

new_handleImageUpload = """  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 200;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/png');
        setSettings({ ...settings, crestUrl: dataUrl });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const saveSettings = async () => {"""

content = content.replace(old_saveSettings, new_handleImageUpload)

old_crestUrlInput = """                <input 
                  type="text" 
                  value={settings.crestUrl}
                  onChange={e => setSettings({...settings, crestUrl: e.target.value})}
                  placeholder="https://ejemplo.com/escudo.png"
                  className="flex-1 bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-white focus:border-[#FF4B4B]/50 focus:outline-none"
                />"""

new_crestUrlInput = """                <div className="flex gap-2 flex-1">
                  <input 
                    type="text" 
                    value={settings.crestUrl}
                    onChange={e => setSettings({...settings, crestUrl: e.target.value})}
                    placeholder="URL o sube un archivo ➔"
                    className="flex-1 bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-white focus:border-[#FF4B4B]/50 focus:outline-none"
                  />
                  <label className="bg-[#2A2A2E] text-white px-4 py-3 rounded-xl cursor-pointer hover:bg-[#3A3A3F] transition-colors flex items-center justify-center font-medium">
                    Subir Archivo
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageUpload} 
                    />
                  </label>
                </div>"""

content = content.replace(old_crestUrlInput, new_crestUrlInput)

with open('src/components/SettingsScreen.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
