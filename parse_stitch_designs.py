import os
import re
from html.parser import HTMLParser

class StitchHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.title = ""
        self.in_title = False
        self.headers = []
        self.in_header = False
        self.current_header_tag = ""
        self.tables_count = 0
        self.forms_count = 0
        self.cards_count = 0
        
    def handle_starttag(self, tag, attrs):
        attrs_dict = dict(attrs)
        class_val = attrs_dict.get("class", "")
        
        if tag == "title":
            self.in_title = True
        elif tag in ["h2", "h3", "h4", "h5"]:
            self.in_header = True
            self.current_header_tag = tag
        elif tag == "table":
            self.tables_count += 1
        elif tag == "form":
            self.forms_count += 1
        elif "bg-surface-container" in class_val or "bg-white" in class_val or "bg-surface-container-lowest" in class_val:
            self.cards_count += 1

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        elif tag in ["h2", "h3", "h4", "h5"]:
            self.in_header = False

    def handle_data(self, data):
        if self.in_title:
            self.title = data.strip()
        elif self.in_header:
            val = data.strip()
            if val:
                self.headers.append(f"{self.current_header_tag}: {val}")

def analyze():
    design_dir = "diseño.md"
    folders = sorted([f for f in os.listdir(design_dir) if os.path.isdir(os.path.join(design_dir, f))])
    
    print(f"Analizando {len(folders)} carpetas de diseño:")
    for folder in folders:
        html_path = os.path.join(design_dir, folder, "code.html")
        if os.path.exists(html_path):
            with open(html_path, "r", encoding="utf-8") as f:
                parser = StitchHTMLParser()
                parser.feed(f.read())
                print(f"\n📂 Carpeta: {folder}")
                print(f"   Título: {parser.title}")
                print(f"   Encabezados principales:")
                for h in parser.headers[:8]:
                    print(f"     - {h}")
                print(f"   Tablas: {parser.tables_count} | Formularios: {parser.forms_count} | Tarjetas: {parser.cards_count}")

if __name__ == "__main__":
    analyze()
