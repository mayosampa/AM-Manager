with open('src/components/PreMatch.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# We need to replace the entire try-catch block for fetching the image.
# Let's find it.
old_block = """      try {
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

new_block = """      try {
        let res;
        const urlsToTry = [
          activeTeam.crestUrl,
          `https://wsrv.nl/?url=${encodeURIComponent(activeTeam.crestUrl)}`,
          `https://api.allorigins.win/raw?url=${encodeURIComponent(activeTeam.crestUrl)}`,
          `https://corsproxy.io/?${encodeURIComponent(activeTeam.crestUrl)}`
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
      } catch (err) {"""

if old_block in content:
    content = content.replace(old_block, new_block)
else:
    print("Could not find the block to replace!")

with open('src/components/PreMatch.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
