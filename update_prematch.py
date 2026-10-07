with open('src/components/PreMatch.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Date formatting
old_get_match_details = """  const getMatchDetails = () => {
    const rival = upcomingMatch?.opponent || upcomingMatch?.matchDetails?.opponent || 'Rival';
    const fecha = upcomingMatch?.dateString || upcomingMatch?.date || 'Por determinar';
    const hora = upcomingMatch?.time || upcomingMatch?.matchDetails?.time || 'Por determinar';
    const campo = upcomingMatch?.location || upcomingMatch?.matchDetails?.location || 'Por determinar';
    return { rival, fecha, hora, campo };
  };"""

new_get_match_details = """  const getMatchDetails = () => {
    const rival = upcomingMatch?.opponent || upcomingMatch?.matchDetails?.opponent || 'Rival';
    const rawDate = upcomingMatch?.dateString || upcomingMatch?.date || 'Por determinar';
    const fecha = rawDate !== 'Por determinar' && rawDate.includes('-') 
      ? rawDate.split('-').reverse().join('/') 
      : rawDate;
    const hora = upcomingMatch?.time || upcomingMatch?.matchDetails?.time || 'Por determinar';
    const campo = upcomingMatch?.location || upcomingMatch?.matchDetails?.location || 'Por determinar';
    return { rival, fecha, hora, campo };
  };"""

content = content.replace(old_get_match_details, new_get_match_details)


# PDF Base64 conversion
old_handle_pdf_start = """    const clone = pdfRef.current.cloneNode(true) as HTMLDivElement;
    clone.style.display = 'block';
    clone.style.position = 'absolute';
    clone.style.top = '-9999px';
    clone.style.left = '0';
    clone.style.visibility = 'visible';
    clone.style.width = '800px';
    clone.style.zIndex = '-1';
    document.body.appendChild(clone);"""

new_handle_pdf_start = """    const clone = pdfRef.current.cloneNode(true) as HTMLDivElement;
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
        const res = await fetch(activeTeam.crestUrl);
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
    
    document.body.appendChild(clone);"""

content = content.replace(old_handle_pdf_start, new_handle_pdf_start)

with open('src/components/PreMatch.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
