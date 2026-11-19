import React, { useEffect, useState } from 'react';
import { Check, Loader2, Save, UserCheck } from 'lucide-react';
import {
  COACH_ROLE_OPTIONS,
  CoachProfilePayload,
  CoachRole,
  loadCurrentCoachProfile,
  MAIN_CATEGORY_OPTIONS,
  MainCategory,
  saveCurrentCoachProfile,
} from '../../../services/userProfileService';

interface CoachProfileSectionProps {
  onClubNameLoaded?: (clubName: string) => void;
}

const INPUT_CLS =
  'w-full h-9 bg-[#090B0E] border border-[#2A313D] rounded-md px-3 text-[13px] text-[#EDEDED] placeholder-zinc-500 focus:border-[#10B981] focus:outline-none transition-colors';

export const CoachProfileSection: React.FC<CoachProfileSectionProps> = ({ onClubNameLoaded }) => {
  const [profile, setProfile] = useState<CoachProfilePayload | null>(null);
  const [birthYearInput, setBirthYearInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentCoachProfile().then(loaded => {
      if (!loaded) return;
      setProfile(loaded);
      setBirthYearInput(loaded.birthYear ? String(loaded.birthYear) : '');
      if (loaded.clubName && onClubNameLoaded) {
        onClubNameLoaded(loaded.clubName);
      }
    });
  }, [onClubNameLoaded]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      const parsedYear = birthYearInput.trim() ? Number(birthYearInput.trim()) : null;
      const saved = await saveCurrentCoachProfile({
        fullName: profile.fullName,
        birthYear: parsedYear,
        clubName: profile.clubName,
        coachRole: profile.coachRole,
        mainCategory: profile.mainCategory,
        province: profile.province,
      });
      if (saved && onClubNameLoaded) {
        onClubNameLoaded(saved.clubName);
      }
      setStatusMsg('Perfil del entrenador actualizado');
      setTimeout(() => setStatusMsg(null), 2600);
    } catch {
      setStatusMsg('No se pudo guardar el perfil');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <section className="bg-[#11141A] border border-[#1E242E] rounded-lg overflow-hidden">
      <div className="px-5 py-3.5 border-b border-[#1E242E] bg-[#11141A] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#10B981]" />
          <h2 className="text-[13px] font-medium text-[#EDEDED]">Perfil Profesional del Entrenador</h2>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="h-8 px-3 rounded-md bg-[#171B23] hover:bg-[#1E242E] border border-[#2A313D] text-[#EDEDED] text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : statusMsg ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Save className="w-3.5 h-3.5 text-zinc-400" />}
          <span>{statusMsg || 'Guardar Perfil'}</span>
        </button>
      </div>

      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div>
          <label className="block text-[11.5px] font-medium text-zinc-400 mb-1">Nombre y Apellidos</label>
          <input
            type="text"
            value={profile.fullName}
            onChange={e => setProfile({ ...profile, fullName: e.target.value })}
            placeholder="Ej: Carlos Mendoza"
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className="block text-[11.5px] font-medium text-zinc-400 mb-1">Club actual</label>
          <input
            type="text"
            value={profile.clubName}
            onChange={e => setProfile({ ...profile, clubName: e.target.value })}
            placeholder="Ej: C.D. Álora"
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className="block text-[11.5px] font-medium text-zinc-400 mb-1">Rol en el cuerpo técnico</label>
          <select
            value={profile.coachRole}
            onChange={e => setProfile({ ...profile, coachRole: e.target.value as CoachRole })}
            className={INPUT_CLS}
          >
            {COACH_ROLE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11.5px] font-medium text-zinc-400 mb-1">Categoría principal</label>
          <select
            value={profile.mainCategory}
            onChange={e => setProfile({ ...profile, mainCategory: e.target.value as MainCategory })}
            className={INPUT_CLS}
          >
            {MAIN_CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11.5px] font-medium text-zinc-400 mb-1">Año de nacimiento</label>
          <input
            type="number"
            min={1940}
            max={2010}
            value={birthYearInput}
            onChange={e => setBirthYearInput(e.target.value)}
            placeholder="Ej: 1992"
            className={INPUT_CLS}
          />
        </div>
        <div>
          <label className="block text-[11.5px] font-medium text-zinc-400 mb-1">Provincia</label>
          <input
            type="text"
            value={profile.province}
            onChange={e => setProfile({ ...profile, province: e.target.value })}
            placeholder="Ej: Málaga"
            className={INPUT_CLS}
          />
        </div>
      </div>
    </section>
  );
};
