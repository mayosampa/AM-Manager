import os

with open('src/components/TeamManagement.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Inject state & functions
state_injection = """  const players = (activeTeam?.players || []).filter(Boolean);

  const { teamSettings } = useTeam();
  const pdfRef = useRef<HTMLDivElement>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const crestUrl = activeTeam?.crestUrl || teamSettings?.crestUrl;

  const formatDateEsp = (dateStr?: string) => {
    if (!dateStr) return '-';
    if (dateStr.includes('-')) {
      const parts = dateStr.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const generatePDF = async () => {
    if (!pdfRef.current || !activeTeam) return;
    setIsGeneratingPdf(true);
    
    try {
      const clone = pdfRef.current.cloneNode(true) as HTMLDivElement;
      clone.style.display = 'block';
      clone.style.position = 'absolute';
      clone.style.top = '-9999px';
      clone.style.left = '0';
      clone.style.visibility = 'visible';
      clone.style.width = '1000px'; 
      clone.style.zIndex = '-1';
      
      const imgElement = clone.querySelector('img');
      if (imgElement && crestUrl) {
        try {
          if (typeof crestUrl === 'string' && crestUrl.startsWith('data:image')) {
            imgElement.src = crestUrl;
            await new Promise((resolve) => {
              imgElement.onload = resolve;
              setTimeout(resolve, 500);
            });
          } else {
            let res;
            const urlsToTry = [
              crestUrl,
              `https://wsrv.nl/?url=${encodeURIComponent(crestUrl)}`,
              `https://api.allorigins.win/raw?url=${encodeURIComponent(crestUrl)}`,
              `https://corsproxy.io/?${encodeURIComponent(crestUrl)}`
            ];
            
            let success = false;
            for (const url of urlsToTry) {
              try {
                res = await fetch(url);
                if (res.ok) {
                  success = true;
                  break;
                }
              } catch (e) {}
            }
            if (!success || !res) throw new Error('Fetch failed');
            const blob = await res.blob();
            const base64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            imgElement.src = base64;
            await new Promise((resolve) => {
              imgElement.onload = resolve;
              setTimeout(resolve, 500);
            });
          }
        } catch (err) {
          console.error('Error fetching image for PDF:', err);
          const divFallback = document.createElement('div');
          divFallback.style.cssText = "width: 100px; height: 100px; border-radius: 50%; background-color: #f3f4f6; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #000;";
          divFallback.textContent = activeTeam.name?.[0] || 'C';
          imgElement.parentNode?.replaceChild(divFallback, imgElement);
        }
      }
      
      document.body.appendChild(clone);
      
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
      pdf.save(`Plantilla_${activeTeam.name.replace(/\s+/g, '_')}.pdf`);
      
    } catch(err) {
      console.error('Error generating PDF:', err);
    } finally {
      const clone = document.body.lastElementChild;
      if (clone && clone.tagName === 'DIV' && (clone as HTMLDivElement).style.top === '-9999px') {
        document.body.removeChild(clone);
      }
      setIsGeneratingPdf(false);
    }
  };
"""
content = content.replace('  const players = (activeTeam?.players || []).filter(Boolean);', state_injection)

# 2. Add Export Button
button_injection = """              <button 
                onClick={generatePDF}
                disabled={isGeneratingPdf}
                className="bg-[#1C1C1F] border border-[#2A2A2E] text-white p-2.5 rounded-xl hover:bg-[#2A2A2E] hover:text-white transition-colors flex items-center justify-center disabled:opacity-50"
                title="Exportar Plantilla"
              >
                {isGeneratingPdf ? <Loader2 className="w-5 h-5 animate-spin" /> : <Printer className="w-5 h-5" />}
              </button>
              <button """
content = content.replace('              <button \n                onClick={() => { setPlayerForm({}); setIsEditingPlayer(false); setShowPlayerModal(true); }}', button_injection + '\n                onClick={() => { setPlayerForm({}); setIsEditingPlayer(false); setShowPlayerModal(true); }}')

# 3. Add hidden PDF render div right before the main return JSX tree's closing bracket
# Need to find the end of the return statement.
# We'll just insert it right before the last closing `</div>` of the main component.
hidden_div = """
      {/* Oculto: Render para PDF */}
      <div style={{ display: 'none' }}>
        <div ref={pdfRef} style={{ width: '1000px', backgroundColor: '#ffffff', padding: '40px', color: '#000000', fontFamily: 'sans-serif' }}>
          {/* Cabecera */}
          <div style={{ textAlign: 'center', borderBottom: '2px solid #e5e7eb', paddingBottom: '20px', marginBottom: '30px' }}>
            {crestUrl ? (
              <img src={crestUrl} alt="Escudo" style={{ width: '100px', height: '100px', objectFit: 'contain', margin: '0 auto 10px' }} crossOrigin="anonymous" />
            ) : (
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#f3f4f6', margin: '0 auto 10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 'bold' }}>
                {activeTeam?.name?.[0] || 'C'}
              </div>
            )}
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: '0 0 10px 0', textTransform: 'uppercase' }}>{activeTeam?.name}</h1>
            <h2 style={{ fontSize: '20px', color: '#4b5563', margin: '0' }}>PLANTILLA OFICIAL</h2>
            <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '10px' }}>
              Generado el {new Date().toLocaleDateString('es-ES')}
            </div>
          </div>

          {/* Listado agrupado por Posición */}
          {['Porteros', 'Defensas', 'Medios', 'Delanteros'].map(group => {
            const groupPlayers = activeTeam.players.filter(p => (getLogicalPositionGroup(p.position) || p.positionGroup) === group).sort((a,b) => (a.number||99) - (b.number||99));
            if (groupPlayers.length === 0) return null;
            return (
              <div key={group} style={{ marginBottom: '30px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#111827', borderBottom: '1px solid #e5e7eb', paddingBottom: '5px', marginBottom: '15px' }}>{group}</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f9fafb' }}>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: '10%' }}>Dorsal</th>
                      <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', width: '35%' }}>Nombre</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: '15%' }}>Posición</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: '20%' }}>Edad / Fecha Nac.</th>
                      <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e5e7eb', width: '20%' }}>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupPlayers.map((p) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold' }}>{p.number || '-'}</td>
                        <td style={{ padding: '10px', textAlign: 'left', fontWeight: 'bold' }}>{p.name}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>{p.position || '-'}</td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          {calculateAge(p.birthDate)} años<br/>
                          <span style={{ fontSize: '11px', color: '#6b7280' }}>{formatDateEsp(p.birthDate)}</span>
                        </td>
                        <td style={{ padding: '10px', textAlign: 'center' }}>
                          <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', backgroundColor: p.isActive !== false ? '#d1fae5' : '#fee2e2', color: p.isActive !== false ? '#065f46' : '#991b1b' }}>
                            {p.isActive !== false ? 'Disponible' : 'Baja'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      </div>
"""
# We'll inject it just before the final `    </div>\n  );\n}`
content = content.replace('      </div>\n    </div>\n  );\n}', hidden_div + '      </div>\n    </div>\n  );\n}')

with open('src/components/TeamManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
