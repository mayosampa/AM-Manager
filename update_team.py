import os

path = 'src/components/TeamManagement.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Update select dropdown
old_select = """<option value="available">Disponible</option>
                      <option value="injured">Lesionado</option>"""
new_select = """<option value="available">Disponible</option>
                      <option value="injured">Lesionado</option>
                      <option value="unavailable">No disponible</option>"""
content = content.replace(old_select, new_select)

# Update onChange type casting
old_onchange = "onChange={e => setPlayerForm({...playerForm, status: e.target.value as 'available' | 'injured'})}"
new_onchange = "onChange={e => setPlayerForm({...playerForm, status: e.target.value as 'available' | 'injured' | 'unavailable'})}"
content = content.replace(old_onchange, new_onchange)

# Now, we also need to add a count box for "No disponible" or just update the badges.
# The user said: "Asígnale un color distintivo (por ejemplo, gris oscuro o amarillo advertencia) en los 'badges' o etiquetas de las tablas, diferenciándolo del verde (Disponible) y el rojo (Sancionado/Lesionado)."

# Current badge in the PDF (and maybe in the component table? Let's check).
old_pdf_badge = """<span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', backgroundColor: p.isActive !== false ? '#d1fae5' : '#fee2e2', color: p.isActive !== false ? '#065f46' : '#991b1b' }}>
                            {p.isActive !== false ? 'Disponible' : 'Baja'}
                          </span>"""

new_pdf_badge = """<span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold', 
                            backgroundColor: p.status === 'unavailable' ? '#f3f4f6' : (p.isSuspended || p.status === 'injured') ? '#fee2e2' : '#d1fae5', 
                            color: p.status === 'unavailable' ? '#374151' : (p.isSuspended || p.status === 'injured') ? '#991b1b' : '#065f46' 
                          }}>
                            {p.status === 'unavailable' ? 'No disp.' : p.isSuspended ? 'Sanción' : p.status === 'injured' ? 'Lesión' : 'Disponible'}
                          </span>"""

content = content.replace(old_pdf_badge, new_pdf_badge)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
