import React, { useState } from 'react';
import { LayoutTemplate, Plus, Shield, Upload, X } from 'lucide-react';

interface ClubIdentityAndMethodologySectionProps {
  modality: string;
  teamName: string;
  onChangeTeamName: (v: string) => void;
  homeStadium: string;
  onChangeHomeStadium: (v: string) => void;
  crestUrl: string;
  onChangeCrestUrl: (v: string) => void;
  defaultFormation: string;
  onChangeDefaultFormation: (v: string) => void;
  customCategories: string[];
  onUpdateCategories: (cats: string[]) => void;
}

export const ClubIdentityAndMethodologySection: React.FC<ClubIdentityAndMethodologySectionProps> = ({
  modality,
  teamName,
  onChangeTeamName,
  homeStadium,
  onChangeHomeStadium,
  crestUrl,
  onChangeCrestUrl,
  defaultFormation,
  onChangeDefaultFormation,
  customCategories,
  onUpdateCategories,
}) => {
  const [newCategory, setNewCategory] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        onChangeCrestUrl(canvas.toDataURL('image/png'));
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const addCategory = () => {
    if (newCategory.trim() && !customCategories.includes(newCategory.trim())) {
      onUpdateCategories([...customCategories, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const removeCategory = (cat: string) => {
    onUpdateCategories(customCategories.filter(c => c !== cat));
  };

  return (
    <>
      <section className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#1F1F1F] bg-[#0D0D0D] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#888888]" />
            <h2 className="text-[13px] font-medium text-[#EDEDED]">Identidad del Club e Instalación</h2>
          </div>
          <span className="font-mono text-[11px] text-[#666666]">{modality}</span>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-[12px] font-medium text-[#888888] block mb-1.5">Nombre Oficial del Equipo</label>
            <input
              type="text"
              value={teamName}
              onChange={e => onChangeTeamName(e.target.value)}
              className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-3 text-[13px] text-[#EDEDED] focus:border-[#525252] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-[12px] font-medium text-[#888888] block mb-1.5">Estadio / Campo Local</label>
            <input
              type="text"
              value={homeStadium}
              onChange={e => onChangeHomeStadium(e.target.value)}
              placeholder="Ej. Estadio Municipal"
              className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-3 text-[13px] text-[#EDEDED] placeholder:text-[#525252] focus:border-[#525252] focus:outline-none transition-colors"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-[12px] font-medium text-[#888888] block mb-1.5">Escudo del Club (URL o Archivo PNG/SVG)</label>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {crestUrl ? (
                <div className="w-10 h-10 rounded-md bg-[#111111] border border-[#262626] p-1 flex items-center justify-center shrink-0">
                  <img src={crestUrl} alt="Escudo" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-[#111111] border border-[#262626] rounded-md flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-[#666666]" />
                </div>
              )}
              <div className="flex gap-2 flex-1 w-full">
                <input
                  type="text"
                  value={crestUrl}
                  onChange={e => onChangeCrestUrl(e.target.value)}
                  placeholder="https://... o sube una imagen local"
                  className="flex-1 h-9 bg-[#050505] border border-[#262626] rounded-md px-3 text-[12px] font-mono text-[#EDEDED] placeholder:text-[#525252] focus:border-[#525252] focus:outline-none"
                />
                <label className="h-9 bg-[#111111] border border-[#262626] text-[#EDEDED] px-3 rounded-md cursor-pointer hover:bg-[#1A1A1A] hover:border-[#3A3A3A] transition-colors flex items-center justify-center gap-1.5 text-[12px] font-medium shrink-0">
                  <Upload className="w-3.5 h-3.5 text-[#888888]" />
                  Subir
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#1F1F1F] bg-[#0D0D0D] flex items-center gap-2">
          <LayoutTemplate className="w-4 h-4 text-[#888888]" />
          <h2 className="text-[13px] font-medium text-[#EDEDED]">Metodología y Categorías de Tareas</h2>
        </div>

        <div className="p-5 space-y-6">
          <div className="max-w-xs">
            <label className="text-[12px] font-medium text-[#888888] block mb-1.5">Sistema Táctico Base (Pizarra)</label>
            <select
              value={defaultFormation}
              onChange={e => onChangeDefaultFormation(e.target.value)}
              className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-3 text-[13px] font-mono text-[#EDEDED] focus:border-[#525252] focus:outline-none"
            >
              <optgroup label="Fútbol 11 (11v11)">
                <option value="4-3-3">1-4-3-3</option>
                <option value="4-4-2">1-4-4-2</option>
                <option value="4-2-3-1">1-4-2-3-1</option>
                <option value="3-5-2">1-3-5-2</option>
                <option value="5-3-2">1-5-3-2</option>
              </optgroup>
              <optgroup label="Fútbol 7 (7v7)">
                <option value="1-2-3-1">1-2-3-1</option>
                <option value="1-3-2-1">1-3-2-1</option>
                <option value="1-3-1-2">1-3-1-2</option>
                <option value="1-2-1-2-1">1-2-1-2-1</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label className="text-[12px] font-medium text-[#888888] block mb-2.5">Etiquetas de Categorías de Entrenamiento</label>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {customCategories.map(cat => (
                <div key={cat} className="flex items-center gap-1.5 bg-[#111111] border border-[#262626] px-2.5 py-1 rounded-md">
                  <span className="text-[12px] text-[#EDEDED]">{cat}</span>
                  <button onClick={() => removeCategory(cat)} className="text-[#666666] hover:text-red-400 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 max-w-sm">
              <input
                type="text"
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCategory()}
                placeholder="Nueva categoría..."
                className="flex-1 h-8 bg-[#050505] border border-[#262626] rounded-md px-3 text-[12px] text-[#EDEDED] placeholder:text-[#525252] focus:border-[#525252] focus:outline-none"
              />
              <button
                onClick={addCategory}
                className="h-8 px-3 bg-[#111111] border border-[#262626] rounded-md hover:bg-[#1A1A1A] text-[#EDEDED] text-[12px] font-medium flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Añadir
              </button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};
