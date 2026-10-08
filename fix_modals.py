import os

def add_scroll_to_modals(directory):
    files_updated = []
    for root, dirs, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx'):
                path = os.path.join(root, file)
                with open(path, 'r', encoding='utf-8') as f:
                    lines = f.readlines()
                
                changed = False
                for i, line in enumerate(lines):
                    if 'fixed inset-0' in line:
                        # Found a modal wrapper. Look for the next div which is the modal card
                        for j in range(i+1, min(i+5, len(lines))):
                            if '<div className="' in lines[j] or '<div className={`' in lines[j]:
                                # Inject classes if not already there
                                if 'max-h-[90vh]' not in lines[j]:
                                    lines[j] = lines[j].replace('className="', 'className="max-h-[90vh] overflow-y-auto custom-scrollbar ')
                                    lines[j] = lines[j].replace('className={`', 'className={`max-h-[90vh] overflow-y-auto custom-scrollbar ')
                                    changed = True
                                break

                if changed:
                    with open(path, 'w', encoding='utf-8') as f:
                        f.writelines(lines)
                    files_updated.append(path)
    
    for f in files_updated:
        print("Updated:", f)

add_scroll_to_modals('src')
