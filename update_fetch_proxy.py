with open('src/components/PreMatch.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_fetch_code = """      try {
        let res;
        try {
          res = await fetch(activeTeam.crestUrl);
          if (!res.ok) throw new Error('Network response was not ok');
        } catch (e) {
          // Fallback to CORS proxy
          res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(activeTeam.crestUrl)}`);
          if (!res.ok) throw new Error('Proxy fetch failed');
        }
        const blob = await res.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        imgElement.src = base64;
      } catch (err) {"""

new_fetch_code = """      try {
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
      } catch (err) {"""

content = content.replace(old_fetch_code, new_fetch_code)

with open('src/components/PreMatch.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
