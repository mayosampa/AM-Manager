import os

with open('src/components/TeamManagement.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

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

content = content.replace('      )}\n    </div>\n  );\n}', hidden_div + '      )}\n    </div>\n  );\n}')

with open('src/components/TeamManagement.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
