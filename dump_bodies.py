import os
import re

design_dir = "diseño.md"
folders = sorted([f for f in os.listdir(design_dir) if os.path.isdir(os.path.join(design_dir, f))])

os.makedirs("extracted_designs", exist_ok=True)

for folder in folders:
    html_path = os.path.join(design_dir, folder, "code.html")
    if os.path.exists(html_path):
        with open(html_path, "r", encoding="utf-8") as f:
            content = f.read()
            
            # Buscar el contenido entre <main> y </main> o el contenedor principal
            main_match = re.search(r'<main[^>]*>(.*?)</main>', content, re.DOTALL)
            if not main_match:
                # Buscar div contenedor alternativo (como el que tiene ml-[280px])
                main_match = re.search(r'<div[^>]*class="[^"]*ml-\[280px\][^"]*"[^>]*>(.*?)</div>\s*</body>', content, re.DOTALL)
                
            if main_match:
                body_content = main_match.group(1)
                # Limpiar saltos de línea repetidos
                body_content = re.sub(r'\n\s*\n', '\n', body_content)
                
                # Escribir el fragmento de código extraído
                out_path = f"extracted_designs/{folder}_body.html"
                with open(out_path, "w", encoding="utf-8") as out:
                    out.write(body_content)
                print(f"Extraído: {folder} -> {out_path} ({len(body_content)} bytes)")
            else:
                print(f"No se pudo extraer contenido principal de: {folder}")
