with open('src/components/PreMatch.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_logic = """    try {
      const clone = pdfRef.current.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.top = '-9999px';
      clone.style.visibility = 'visible';
      
      // 1. Técnica Bulletproof (Base64) para el PDF
      const imgElement = clone.querySelector('img');
      const crestUrl = activeTeam?.crestUrl || teamSettings?.crestUrl;
      if (imgElement && crestUrl) {
        try {
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
            } catch (e) {
              // ignore and try next
            }
          }
          
          if (!success || !res) throw new Error('All fetch attempts failed');
          
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
            setTimeout(resolve, 500); // safety fallback
          });
        } catch (err) {
          console.error('Error fetching image for PDF:', err);
          // Fallback: Reemplazar el <img> con el div de la inicial
          const divFallback = document.createElement('div');
          divFallback.style.cssText = "width: 100px; height: 100px; border-radius: 50%; background-color: #f3f4f6; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #000;";
          divFallback.textContent = activeTeam.name?.[0] || 'C';
          imgElement.parentNode?.replaceChild(divFallback, imgElement);
        }
      }"""

new_logic = """    try {
      const clone = pdfRef.current.cloneNode(true) as HTMLElement;
      clone.style.position = 'absolute';
      clone.style.top = '-9999px';
      clone.style.visibility = 'visible';
      
      // 1. Técnica Bulletproof (Base64) para el PDF
      const imgElement = clone.querySelector('img');
      const crestUrl = activeTeam?.crestUrl || teamSettings?.crestUrl;
      
      if (imgElement && crestUrl) {
        try {
          if (crestUrl.startsWith('data:image')) {
            // Ya es base64 (subido por el usuario), no necesita fetch ni proxy
            imgElement.src = crestUrl;
            await new Promise((resolve) => {
              imgElement.onload = resolve;
              setTimeout(resolve, 500); // safety fallback
            });
          } else {
            // Es una URL externa, intentar proxy
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
              } catch (e) {
                // ignore and try next
              }
            }
            
            if (!success || !res) throw new Error('All fetch attempts failed');
            
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
              setTimeout(resolve, 500); // safety fallback
            });
          }
        } catch (err) {
          console.error('Error fetching image for PDF:', err);
          // Fallback: Reemplazar el <img> con el div de la inicial
          const divFallback = document.createElement('div');
          divFallback.style.cssText = "width: 100px; height: 100px; border-radius: 50%; background-color: #f3f4f6; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; color: #000;";
          divFallback.textContent = activeTeam.name?.[0] || 'C';
          imgElement.parentNode?.replaceChild(divFallback, imgElement);
        }
      }"""
content = content.replace(old_logic, new_logic)

with open('src/components/PreMatch.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
