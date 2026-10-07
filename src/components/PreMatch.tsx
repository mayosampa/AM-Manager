import React, { useState, useEffect, useRef } from 'react';
import { Player } from '../types';
import { Play, FileText, MessageCircle, ChevronLeft, Save, Edit3, Check, Printer } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useTeam } from '../context/TeamContext';

interface PreMatchProps {
  basePlayers: Player[];
  upcomingMatch: any;
  isAdHoc: boolean;
  onCancel: () => void;
  onStartLive: (squad: Player[]) => void;
  onSaveCallUp: (squadIds: string[]) => void;
}

const DEFAULT_TEMPLATE = `🏆 CONVOCATORIA OFICIAL

🆚 {{rival}}
📅 {{fecha}}
⏰ {{hora}}
🏟️ {{campo}}

📋 CONVOCADOS:
{{convocados}}

¡Vamos equipo! 💪`;

export function PreMatch({ basePlayers, upcomingMatch, isAdHoc, onCancel, onStartLive, onSaveCallUp }: PreMatchProps) {
  const { activeTeam, updateTeam } = useTeam();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [waTemplate, setWaTemplate] = useState(activeTeam?.whatsappTemplate || DEFAULT_TEMPLATE);
  const [isEditingWa, setIsEditingWa] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    let callupIds: string[] = [];
    if (!isAdHoc && upcomingMatch?.calledUpPlayers) {
      callupIds = upcomingMatch.calledUpPlayers;
    } else if (activeTeam?.activeCallUp) {
      callupIds = activeTeam.activeCallUp;
    }
    // If no callup saved, pre-select everyone by default
    if (callupIds.length === 0) {
      callupIds = basePlayers.map(p => p.id);
    }
    setSelectedIds(new Set(callupIds));
  }, [isAdHoc, upcomingMatch, activeTeam, basePlayers]);

  const togglePlayer = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const saveAndStart = () => {
    const arr = [...selectedIds];
    onSaveCallUp(arr);
    const squad = basePlayers.filter(p => selectedIds.has(p.id));
    onStartLive(squad);
  };

  const saveJustCallUp = () => {
    const arr = [...selectedIds];
    onSaveCallUp(arr);
  };

  const handleSaveTemplate = async () => {
    setIsEditingWa(false);
    if (activeTeam) {
      await updateTeam(activeTeam.id, { whatsappTemplate: waTemplate });
    }
  };

  const getMatchDetails = () => {
    const rival = upcomingMatch?.opponent || upcomingMatch?.matchDetails?.opponent || 'Rival';
    const rawDate = upcomingMatch?.dateString || upcomingMatch?.date || 'Por determinar';
    const fecha = rawDate !== 'Por determinar' && rawDate.includes('-') 
      ? rawDate.split('-').reverse().join('/') 
      : rawDate;
    const hora = upcomingMatch?.time || upcomingMatch?.matchDetails?.time || 'Por determinar';
    const campo = upcomingMatch?.location || upcomingMatch?.matchDetails?.location || 'Por determinar';
    return { rival, fecha, hora, campo };
  };

  const { rival, fecha, hora, campo } = getMatchDetails();

  const getFinalWaText = () => {
    const calledUp = basePlayers
      .filter(p => selectedIds.has(p.id))
      .map((p, i) => `${i + 1}. ${p.name} (${p.number || '-'})`)
      .join('\n');

    return waTemplate
      .replace('{{rival}}', rival)
      .replace('{{fecha}}', fecha)
      .replace('{{hora}}', hora)
      .replace('{{campo}}', campo)
      .replace('{{convocados}}', calledUp || 'Ninguno seleccionado');
  };

  const handleWhatsApp = () => {
    const text = getFinalWaText();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const pdfRef = useRef<HTMLDivElement>(null);
  
  const handlePdf = async () => {
    if (!pdfRef.current) return;
    setIsGeneratingPdf(true);
    
    const clone = pdfRef.current.cloneNode(true) as HTMLDivElement;
    clone.style.display = 'block';
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '0';
    clone.style.visibility = 'visible';
    clone.style.width = '800px';
    clone.style.zIndex = '-1';
    
    // 1. Técnica Bulletproof (Base64) para el PDF
    const imgElement = clone.querySelector('img');
    if (imgElement && activeTeam?.crestUrl) {
      try {
        let res;
        try {
          res = await fetch(activeTeam.crestUrl);
          if (!res.ok) throw new Error('Network response was not ok');
        } catch (e) {
          try {
            // First proxy attempt
            res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(activeTeam.crestUrl)}`);
            if (!res.ok) throw new Error('First proxy failed');
          } catch (err2) {
            // Second proxy attempt
            res = await fetch(`https://corsproxy.io/?${encodeURIComponent(activeTeam.crestUrl)}`);
            if (!res.ok) throw new Error('Second proxy failed');
          }
        }
        const blob = await res.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        imgElement.src = base64;
      } catch (err) {
        console.error('Error fetching image for PDF:', err);
        // Fallback: Reemplazar el <img> con el div de la inicial
        const divFallback = document.createElement('div');
        divFallback.style.cssText = "width: 100px; height: 100px; border-radius: 50%; background-color: #f3f4f6; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #000;";
        divFallback.textContent = activeTeam.name?.[0] || 'C';
        imgElement.parentNode?.replaceChild(divFallback, imgElement);
      }
    }
    
    document.body.appendChild(clone);
    
    try {
      const canvas = await html2canvas(clone, { 
        scale: 2, 
        useCORS: true, 
        allowTaint: true,
        logging: false 
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Convocatoria_${activeTeam?.name || 'Equipo'}.pdf`);
    } catch(err) {
      console.error('Error generating PDF:', err);
    } finally {
      if (document.body.contains(clone)) {
        document.body.removeChild(clone);
      }
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full pb-20">
      <div className="flex justify-between items-center bg-[#121215] p-6 rounded-2xl border border-[#2A2A2E]">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">
            {isAdHoc ? 'Convocatoria Rápida' : `Previa: vs ${rival}`}
          </h1>
          <p className="text-[#6E6E75]">Configura la convocatoria y compártela antes del partido.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="bg-[#1C1C1F] text-white border border-[#2A2A2E] font-bold py-3 px-6 rounded-xl hover:bg-[#2A2A2E] transition-colors flex items-center gap-2"
          >
            <ChevronLeft className="w-5 h-5" />
            Volver
          </button>
          {!isAdHoc && (
            <button
              onClick={saveJustCallUp}
              className="bg-[#1C1C1F] text-white border border-[#2A2A2E] font-bold py-3 px-6 rounded-xl hover:bg-[#2A2A2E] transition-colors"
            >
              Solo Guardar
            </button>
          )}
          <button
            onClick={saveAndStart}
            className="bg-[#FF4B4B] text-black font-bold py-3 px-6 rounded-xl hover:bg-[#FF4B4B]/90 transition-colors flex items-center gap-2 shadow-lg shadow-[#FF4B4B]/20"
          >
            <Play className="w-5 h-5 fill-current" />
            Ir al Directo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Jugadores List */}
        <div className="lg:col-span-7 bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6">
          <h2 className="font-bold text-white mb-4 flex items-center justify-between">
            Selección de Jugadores
            <span className="bg-[#FF4B4B]/10 text-[#FF4B4B] px-3 py-1 rounded-full text-sm">
              {selectedIds.size} / {basePlayers.length}
            </span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {basePlayers.map(p => {
              const isSelected = selectedIds.has(p.id);
              return (
                <div 
                  key={p.id} 
                  onClick={() => togglePlayer(p.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-[#1C1C1F] border-[#FF4B4B]/50 shadow-[0_0_10px_rgba(255,75,75,0.1)]' 
                      : 'bg-[#121215] border-[#2A2A2E] opacity-50 hover:opacity-100'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-md flex items-center justify-center border transition-colors ${
                    isSelected ? 'bg-[#FF4B4B] border-[#FF4B4B]' : 'bg-transparent border-[#6E6E75]'
                  }`}>
                    {isSelected && <Check className="w-4 h-4 text-black" />}
                  </div>
                  <span className="w-8 h-8 rounded-full bg-[#2A2A2E] flex items-center justify-center font-bold text-sm text-[#6E6E75]">
                    {p.number}
                  </span>
                  <div className="flex flex-col">
                    <span className={`font-semibold leading-tight ${isSelected ? 'text-white' : 'text-[#6E6E75]'}`}>{p.name}</span>
                    <span className="text-xs text-[#6E6E75]">{p.positionGroup}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compartir / Exportar */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-white flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-emerald-500" />
                Plantilla WhatsApp
              </h2>
              {isEditingWa ? (
                <button onClick={handleSaveTemplate} className="text-emerald-500 hover:text-emerald-400 p-2 text-sm flex items-center gap-1">
                  <Save className="w-4 h-4" /> Guardar
                </button>
              ) : (
                <button onClick={() => setIsEditingWa(true)} className="text-[#6E6E75] hover:text-white p-2 text-sm flex items-center gap-1">
                  <Edit3 className="w-4 h-4" /> Editar Plantilla Base
                </button>
              )}
            </div>

            {isEditingWa ? (
              <div className="flex flex-col gap-2">
                <textarea
                  value={waTemplate}
                  onChange={e => setWaTemplate(e.target.value)}
                  className="w-full h-48 bg-[#1C1C1F] text-white p-4 rounded-xl border border-[#2A2A2E] focus:outline-none focus:border-emerald-500 text-sm resize-none font-mono"
                />
                <p className="text-xs text-[#6E6E75]">
                  Variables: {'{{rival}}'}, {'{{fecha}}'}, {'{{hora}}'}, {'{{campo}}'}, {'{{convocados}}'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-[#6E6E75]">Vista previa (Mensaje final):</p>
                <div className="w-full h-48 bg-[#1C1C1F] text-white p-4 rounded-xl border border-[#2A2A2E] overflow-y-auto whitespace-pre-wrap text-sm">
                  {getFinalWaText()}
                </div>
              </div>
            )}
            
            <button 
              onClick={handleWhatsApp}
              className="w-full mt-4 bg-emerald-500 text-black font-bold py-3 rounded-xl hover:bg-emerald-400 transition-colors flex items-center justify-center gap-2"
            >
              <MessageCircle className="w-5 h-5" />
              Compartir por WhatsApp
            </button>
          </div>

          <div className="bg-[#121215] border border-[#2A2A2E] rounded-2xl p-6">
            <h2 className="font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-500" />
              Documento Oficial
            </h2>
            <p className="text-[#6E6E75] text-sm mb-4">Genera un PDF con formato oficial (escudo y datos) listo para imprimir o enviar.</p>
            <button 
              onClick={handlePdf}
              disabled={isGeneratingPdf}
              className="w-full bg-blue-500 text-white font-bold py-3 rounded-xl hover:bg-blue-400 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Printer className="w-5 h-5" />
              {isGeneratingPdf ? 'Generando...' : 'Descargar PDF'}
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'none' }}>
        <div ref={pdfRef} style={{ width: '800px', backgroundColor: '#ffffff', padding: '40px', color: '#000000', fontFamily: 'sans-serif' }}>
          <div style={{ textAlign: 'center', borderBottom: '2px solid #e5e7eb', paddingBottom: '20px', marginBottom: '30px' }}>
            {activeTeam?.crestUrl ? (
              <img src={activeTeam.crestUrl} alt="Escudo" style={{ width: '100px', height: '100px', objectFit: 'contain', margin: '0 auto 10px' }} crossOrigin="anonymous" />
            ) : (
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#f3f4f6', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' }}>
                {activeTeam?.name?.[0] || 'C'}
              </div>
            )}
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 5px 0' }}>{activeTeam?.name || 'CLUB DEPORTIVO'}</h1>
            <h2 style={{ fontSize: '20px', color: '#4b5563', margin: 0, textTransform: 'uppercase', letterSpacing: '2px' }}>Convocatoria Oficial</h2>
          </div>
          
          <div style={{ backgroundColor: '#f9fafb', padding: '20px', borderRadius: '8px', marginBottom: '30px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Rival</p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{rival}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Campo</p>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 'bold' }}>{campo}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Fecha</p>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{fecha}</p>
            </div>
            <div>
              <p style={{ margin: '0 0 5px 0', fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>Hora</p>
              <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>{hora}</p>
            </div>
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: 'bold', borderBottom: '1px solid #e5e7eb', paddingBottom: '10px', marginBottom: '20px' }}>JUGADORES CONVOCADOS ({selectedIds.size})</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {basePlayers.filter(p => selectedIds.has(p.id)).map((p, i) => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', padding: '8px', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ width: '30px', fontWeight: 'bold', color: '#6b7280' }}>{i + 1}.</span>
                <span style={{ width: '35px', fontWeight: 'bold', color: '#dc2626' }}>{p.number || '-'}</span>
                <span style={{ fontWeight: '600' }}>{p.name}</span>
              </div>
            ))}
          </div>
          
          <div style={{ marginTop: '50px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
            <p>Documento generado automáticamente por AM-Coach</p>
          </div>
        </div>
      </div>
    </div>
  );
}
