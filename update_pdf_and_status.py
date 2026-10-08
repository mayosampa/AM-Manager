import os

path = 'src/components/TeamManagement.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old_status_render = """                  {player.isSuspended ? (
                    <span className="px-2 py-1 bg-[#FF4B4B]/10 text-[#FF4B4B] rounded text-[10px] font-bold shrink-0 uppercase">Sanc.</span>
                  ) : player.status === 'available' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <PlusSquare className="w-5 h-5 text-yellow-400 shrink-0" />
                  )}"""

new_status_render = """                  {player.isSuspended ? (
                    <span className="px-2 py-1 bg-[#FF4B4B]/10 text-[#FF4B4B] rounded text-[10px] font-bold shrink-0 uppercase">Sanc.</span>
                  ) : player.status === 'unavailable' ? (
                    <span className="px-2 py-1 bg-gray-500/10 text-gray-400 rounded text-[10px] font-bold shrink-0 uppercase">No disp.</span>
                  ) : player.status === 'available' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <PlusSquare className="w-5 h-5 text-yellow-400 shrink-0" />
                  )}"""

content = content.replace(old_status_render, new_status_render)

# Now PDF Multi-page logic
old_pdf_logic = """      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Plantilla_${activeTeam.name.replace(/\s+/g, '_')}.pdf`);"""

new_pdf_logic = """      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`Plantilla_${activeTeam.name.replace(/\\s+/g, '_')}.pdf`);"""

content = content.replace(old_pdf_logic, new_pdf_logic)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
