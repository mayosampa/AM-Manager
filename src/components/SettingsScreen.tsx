import React, { useState, useEffect } from 'react';
import { useTeam } from '../context/TeamContext';
import { db } from '../services/db';
import { Save, Shield, Download, LayoutTemplate, Plus, Trash2, X } from 'lucide-react';
import { PlayerStatsAggregated } from '../services/playerStatsAggregator';

interface TeamSettings {
  crestUrl: string;
  defaultFormation: string;
}

export function SettingsScreen() {
  const { activeTeam, activeTeamId, updateTeam, customCategories, updateCustomCategories } = useTeam();
  const [teamName, setTeamName] = useState('');
  const [settings, setSettings] = useState<TeamSettings>({ crestUrl: '', defaultFormation: '4-3-3' });
  const [newCategory, setNewCategory] = useState('');

  useEffect(() => {
    if (activeTeam) {
      setTeamName(activeTeam.name);
    }
  }, [activeTeam]);

  useEffect(() => {
    if (activeTeamId) {
      db.getAppState('settings_' + activeTeamId).then(data => {
        if (data) setSettings(data);
        else setSettings({ crestUrl: '', defaultFormation: '4-3-3' });
      });
    }
  }, [activeTeamId]);

  const saveSettings = async () => {
    if (activeTeam) {
      updateTeam(activeTeam.id, teamName, activeTeam.modality);
      await db.saveAppState('settings_' + activeTeamId, settings);
      alert('Ajustes guardados correctamente.');
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
        ...stats.map(s => [
          s.name, s.number, s.matches, s.starts, s.minutesPlayed, s.goals, s.assists, s.yellows, s.reds, s.averageRating
        ].join(','))
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
      <div className="flex flex-col items-center justify-center h-full w-full bg-[#121215] border border-[#2A2A2E] rounded-3xl p-12 text-center">
        <Shield className="w-16 h-16 text-[#6E6E75] mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Ningún equipo seleccionado</h2>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full flex flex-col gap-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Ajustes Globales</h1>
          <p className="text-[#6E6E75]">Configuración del club, táctica y gestión de datos.</p>
        </div>
        <button 
          onClick={saveSettings}
          className="flex items-center gap-2 bg-[#FF4B4B] text-black px-6 py-3 rounded-xl font-bold hover:bg-[#ff5c5c] transition-colors"
        >
          <Save className="w-5 h-5" />
          Guardar Cambios
        </button>
      </div>

      <div className="bg-[#121215] border border-[#2A2A2E] rounded-3xl p-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#FF4B4B]" />
          Perfil del Club
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-[#6E6E75] block mb-2">Nombre del Equipo</label>
            <input 
              type="text" 
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-white focus:border-[#FF4B4B]/50 focus:outline-none"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-[#6E6E75] block mb-2">URL del Escudo</label>
            <input 
              type="text" 
              value={settings.crestUrl}
              onChange={e => setSettings({...settings, crestUrl: e.target.value})}
              placeholder="https://ejemplo.com/escudo.png"
              className="w-full bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-white focus:border-[#FF4B4B]/50 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#121215] border border-[#2A2A2E] rounded-3xl p-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <LayoutTemplate className="w-5 h-5 text-[#FF4B4B]" />
          Metodología y Táctica
        </h2>
        <div className="space-y-8">
          <div>
            <label className="text-sm font-medium text-[#6E6E75] block mb-2">Formación Base (Pizarra)</label>
            <select 
              value={settings.defaultFormation}
              onChange={e => setSettings({...settings, defaultFormation: e.target.value})}
              className="w-full md:w-1/2 bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-white focus:border-[#FF4B4B]/50 focus:outline-none"
            >
              <option value="4-3-3">4-3-3</option>
              <option value="4-4-2">4-4-2</option>
              <option value="4-2-3-1">4-2-3-1</option>
              <option value="3-5-2">3-5-2</option>
              <option value="5-3-2">5-3-2</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-[#6E6E75] block mb-4">Categorías de Ejercicios</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {customCategories.map(cat => (
                <div key={cat} className="flex items-center gap-2 bg-[#1C1C1F] border border-[#2A2A2E] px-3 py-1.5 rounded-lg">
                  <span className="text-sm text-[#E0E0E0]">{cat}</span>
                  <button onClick={() => removeCategory(cat)} className="text-[#6E6E75] hover:text-[#FF4B4B]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 w-full md:w-1/2">
              <input 
                type="text" 
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCategory()}
                placeholder="Nueva categoría..."
                className="flex-1 bg-[#1C1C1F] border border-[#2A2A2E] rounded-xl px-4 py-3 text-white focus:border-[#FF4B4B]/50 focus:outline-none"
              />
              <button onClick={addCategory} className="bg-[#2A2A2E] p-3 rounded-xl hover:bg-[#3A3A3E] text-white">
                <Plus className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#121215] border border-[#2A2A2E] rounded-3xl p-8">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Download className="w-5 h-5 text-[#FF4B4B]" />
          Gestión de Datos
        </h2>
        <button 
          onClick={exportStatsToCSV}
          className="flex items-center gap-2 bg-[#1C1C1F] border border-[#2A2A2E] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#2A2A2E] hover:text-[#FF4B4B] transition-colors"
        >
          <Download className="w-5 h-5" />
          Exportar Estadísticas a CSV
        </button>
      </div>
    </div>
  );
}
