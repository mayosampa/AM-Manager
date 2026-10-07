with open('src/components/PreMatch.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

import re

# We need to add an await to the image load
old_block = """        imgElement.src = base64;
      } catch (err) {"""

new_block = """        imgElement.src = base64;
        await new Promise((resolve) => {
          imgElement.onload = resolve;
          setTimeout(resolve, 500); // safety fallback
        });
      } catch (err) {"""

if old_block in content:
    content = content.replace(old_block, new_block)
else:
    print("Could not find the block to replace!")

with open('src/components/PreMatch.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
