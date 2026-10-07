with open('src/components/PreMatch.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

old_useTeam = "  const { activeTeam, updateTeam } = useTeam();"
new_useTeam = "  const { activeTeam, updateTeam, teamSettings } = useTeam();"
content = content.replace(old_useTeam, new_useTeam)

# Fix where it uses crestUrl
old_if_crestUrl = "if (imgElement && activeTeam?.crestUrl) {"
new_if_crestUrl = """const crestUrl = activeTeam?.crestUrl || teamSettings?.crestUrl;
      if (imgElement && crestUrl) {"""
content = content.replace(old_if_crestUrl, new_if_crestUrl)

old_urlsToTry = """          const urlsToTry = [
            activeTeam.crestUrl,
            `https://wsrv.nl/?url=${encodeURIComponent(activeTeam.crestUrl)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(activeTeam.crestUrl)}`,
            `https://corsproxy.io/?${encodeURIComponent(activeTeam.crestUrl)}`
          ];"""
new_urlsToTry = """          const urlsToTry = [
            crestUrl,
            `https://wsrv.nl/?url=${encodeURIComponent(crestUrl)}`,
            `https://api.allorigins.win/raw?url=${encodeURIComponent(crestUrl)}`,
            `https://corsproxy.io/?${encodeURIComponent(crestUrl)}`
          ];"""
content = content.replace(old_urlsToTry, new_urlsToTry)

old_img_src = """              {activeTeam?.crestUrl ? (
                <img src={activeTeam.crestUrl} alt="Escudo" style={{ width: '100px', height: '100px', objectFit: 'contain', margin: '0 auto 10px' }} crossOrigin="anonymous" />
              ) : ("""
new_img_src = """              {(activeTeam?.crestUrl || teamSettings?.crestUrl) ? (
                <img src={activeTeam?.crestUrl || teamSettings?.crestUrl} alt="Escudo" style={{ width: '100px', height: '100px', objectFit: 'contain', margin: '0 auto 10px' }} crossOrigin="anonymous" />
              ) : ("""
content = content.replace(old_img_src, new_img_src)

with open('src/components/PreMatch.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
