"""Carrega somente os assets públicos declarados no build das interfaces React."""

import html
import json
from pathlib import Path


class BuildMissingError(RuntimeError):
    pass


def render_frontend(root, page, entry_name, marker):
    root = Path(root)
    try:
        manifest = json.loads((root / "dist/.vite/manifest.json").read_text())
        entry = manifest[entry_name]
        tags = []
        seen = set()

        def asset(name):
            target = (root / "dist" / name).resolve()
            if not name.startswith("assets/") or not target.is_relative_to((root / "dist/assets").resolve()) or not target.is_file():
                raise ValueError("Asset inválido")
            return html.escape("/dist/" + name, quote=True)

        def styles(chunk):
            for dependency in chunk.get("imports", []):
                if dependency not in seen:
                    seen.add(dependency)
                    styles(manifest[dependency])
            for css in chunk.get("css", []):
                if css not in seen:
                    seen.add(css)
                    tags.append(f'<link rel="stylesheet" href="{asset(css)}">')

        styles(entry)
        tags.append(f'<script type="module" src="{asset(entry["file"])}"></script>')
        return (root / page).read_text().replace(marker, "\n  ".join(tags)).encode()
    except (OSError, ValueError, KeyError, TypeError) as error:
        raise BuildMissingError("A interface precisa do build. Execute npm ci e npm run build na pasta do projeto.") from error


def admin_html(root):
    return render_frontend(root, "admin.html", "frontend/admin/main.jsx", "<!-- admin-assets -->")


def index_html(root):
    return render_frontend(root, "index.html", "frontend/shell/main.jsx", "<!-- library-assets -->")
