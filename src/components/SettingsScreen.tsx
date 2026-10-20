import React, { useState, useEffect } from 'react';
import { useTeam } from '../context/TeamContext';
import { db } from '../services/db';
import { Save, Shield, Download, LayoutTemplate, Plus, X, Upload } from 'lucide-react';

interface TeamSettings {
  crestUrl: string;
  defaultFormation: string;
  homeStadium?: string;
}

export function SettingsScreen() {
  const { activeTeam, activeTeamId, updateTeam, customCategories, updateCustomCategories, teamSettings, updateTeamSettings } = useTeam();
  const [teamName, setTeamName] = useState('');
  const [homeStadium, setHomeStadium] = useState('');
  const [settings, setSettings] = useState<TeamSettings>({ crestUrl: '', defaultFormation: '4-3-3' });
  const [newCategory, setNewCategory] = useState('');
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (activeTeam) {
      setTeamName(activeTeam.name);
    }
  }, [activeTeam]);

  useEffect(() => {
    if (teamSettings) {
      setSettings(teamSettings);
      setHomeStadium(teamSettings.homeStadium || '');
    }
  }, [teamSettings]);

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

  const saveSettings = async () => {
    if (activeTeam) {
      updateTeam(activeTeam.id, {
        name: teamName,
        modality: activeTeam.modality,
      });
      updateTeamSettings({ ...settings, homeStadium });
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2400);
    }
  };

  const addCategory = () => {
    if (newCategory.trim() && !customCategories.includes(newCategory.trim())) {
      updateCustomCategories([...customCategories, newCategory.trim()]);
      setNewCategory('');
    }
  };

  const removeCategory = (cat: string) => {
    updateCustomCategories(customCategories.filter(c => c !== cat));
  };

  const exportStatsToCSV = async () => {
    if (!activeTeamId) return;
    try {
      const history = await db.getMatches(activeTeamId);
      const { aggregatePlayerStats } = await import('../services/playerStatsAggregator');
      const stats = aggregatePlayerStats(activeTeam?.players || [], history, activeTeamId);

      const headers = ['Jugador', 'Dorsal', 'Partidos', 'Titular', 'Minutos', 'Goles', 'Asistencias', 'Amarillas', 'Rojas', 'Nota Media'];
      const csvContent = [
        headers.join(','),
        ...stats.map(s =>
          [s.name, s.number, s.matches, s.starts, s.minutesPlayed, s.goals, s.assists, s.yellows, s.reds, s.averageRating].join(',')
        ),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'estadisticas_plantilla.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error(e);
      alert('Error exportando estadísticas.');
    }
  };

  if (!activeTeam) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-12 text-center">
        <Shield className="w-8 h-8 text-[#666666] mb-3" />
        <h2 className="text-[16px] font-semibold text-[#EDEDED]">Ningún equipo seleccionado</h2>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#1F1F1F]">
        <div>
          <h1 className="text-[20px] font-semibold text-[#EDEDED] tracking-[-0.025em] mb-1">Configuración del Proyecto</h1>
          <p className="text-[13px] text-[#737373]">Parámetros generales del club, identidad visual, modelo táctico y exportación de datos.</p>
        </div>
        <button
          onClick={saveSettings}
          className="h-8 px-4 rounded-md bg-[#EDEDED] text-[#0A0A0A] hover:bg-white text-[12px] font-medium flex items-center justify-center gap-1.5 transition-colors shrink-0"
        >
          <Save className="w-3.5 h-3.5" />
          {savedNotice ? 'Guardado' : 'Guardar Cambios'}
        </button>
      </div>

      {/* Section 1: Club Identity */}
      <section className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#1F1F1F] bg-[#0D0D0D] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#888888]" />
            <h2 className="text-[13px] font-medium text-[#EDEDED]">Identidad del Club e Instalación</h2>
          </div>
          <span className="font-mono text-[11px] text-[#666666]">{activeTeam.modality}</span>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-[12px] font-medium text-[#888888] block mb-1.5">Nombre Oficial del Equipo</label>
            <input
              type="text"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-3 text-[13px] text-[#EDEDED] focus:border-[#525252] focus:outline-none transition-colors"
            />
          </div>

          <div>
            <label className="text-[12px] font-medium text-[#888888] block mb-1.5">Estadio / Campo Local</label>
            <input
              type="text"
              value={homeStadium}
              onChange={e => setHomeStadium(e.target.value)}
              placeholder="Ej. Estadio Municipal"
              className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-3 text-[13px] text-[#EDEDED] placeholder:text-[#525252] focus:border-[#525252] focus:outline-none transition-colors"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-[12px] font-medium text-[#888888] block mb-1.5">Escudo del Club (URL o Archivo PNG/SVG)</label>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              {settings.crestUrl ? (
                <div className="w-10 h-10 rounded-md bg-[#111111] border border-[#262626] p-1 flex items-center justify-center shrink-0">
                  <img src={settings.crestUrl} alt="Escudo" className="w-full h-full object-contain" />
                </div>
              ) : (
                <div className="w-10 h-10 bg-[#111111] border border-[#262626] rounded-md flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-[#666666]" />
                </div>
              )}
              <div className="flex gap-2 flex-1 w-full">
                <input
                  type="text"
                  value={settings.crestUrl}
                  onChange={e => setSettings({ ...settings, crestUrl: e.target.value })}
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

      {/* Section 2: Tactical Methodology */}
      <section className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#1F1F1F] bg-[#0D0D0D] flex items-center gap-2">
          <LayoutTemplate className="w-4 h-4 text-[#888888]" />
          <h2 className="text-[13px] font-medium text-[#EDEDED]">Metodología y Categorías de Tareas</h2>
        </div>

        <div className="p-5 space-y-6">
          <div className="max-w-xs">
            <label className="text-[12px] font-medium text-[#888888] block mb-1.5">Sistema Táctico Base (Pizarra)</label>
            <select
              value={settings.defaultFormation}
              onChange={e => setSettings({ ...settings, defaultFormation: e.target.value })}
              className="w-full h-9 bg-[#050505] border border-[#262626] rounded-md px-3 text-[13px] font-mono text-[#EDEDED] focus:border-[#525252] focus:outline-none"
            >
              <option value="4-3-3">1-4-3-3</option>
              <option value="4-4-2">1-4-4-2</option>
              <option value="4-2-3-1">1-4-2-3-1</option>
              <option value="3-5-2">1-3-5-2</option>
              <option value="5-3-2">1-5-3-2</option>
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

      {/* Section 3: Data Export */}
      <section className="bg-[#0A0A0A] border border-[#1F1F1F] rounded-lg p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[13px] font-medium text-[#EDEDED] mb-0.5">Exportación de Datos Brutos (CSV)</h2>
          <p className="text-[12px] text-[#737373]">Descarga una instantánea en texto plano con las métricas acumuladas de la plantilla.</p>
        </div>
        <button
          onClick={exportStatsToCSV}
          className="h-8 px-3.5 bg-[#111111] border border-[#262626] text-[#EDEDED] rounded-md text-[12px] font-medium hover:bg-[#1A1A1A] hover:border-[#3A3A3A] transition-colors flex items-center justify-center gap-1.5 shrink-0"
        >
          <Download className="w-3.5 h-3.5 text-[#888888]" />
          Descargar CSV
        </button>
      </section>
    </div>
  );
}
