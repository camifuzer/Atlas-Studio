"""Gera distribuição local com interface compilada, sem banco nem dependências de desenvolvimento."""

import sys
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
from app.frontend import admin_html, index_html  # noqa: E402


def package_local():
    admin_html(ROOT)  # Verifica se manifesto e assets estão completos.
    index_html(ROOT)
    files = [ROOT / name for name in (
        'README.md', 'index.html', 'admin.html', '.nvmrc', '.prettierignore', '.prettierrc.json',
        'eslint.config.js', 'favicon.ico', 'favicon.svg',
        'favicon-32.png', 'cursor-atlas.svg', 'package.json', 'package-lock.json', 'vite.config.js',
    )]
    for folder, extensions in {
        'app': {'.py'}, 'js': {'.js'}, 'css': {'.css'}, 'docs': {'.md'},
        'frontend': {'.js', '.jsx', '.css'}, 'scripts': {'.py', '.mjs'}, 'tests': {'.py'},
        'dist/assets': {'.js', '.css', '.svg', '.png', '.woff2'},
    }.items():
        files.extend(path for path in (ROOT / folder).rglob('*')
                     if path.is_file() and not path.is_symlink() and path.suffix in extensions
                     and not any(part.startswith('.') or part == '__pycache__' for part in path.relative_to(ROOT).parts))
    files.append(ROOT / 'dist/.vite/manifest.json')
    output = ROOT / 'releases/atlas-studio.zip'
    output.parent.mkdir(exist_ok=True)
    temporary = output.with_suffix('.tmp')
    with ZipFile(temporary, 'w', ZIP_DEFLATED) as archive:
        for path in sorted(set(files)):
            archive.write(path, Path('atlas-studio') / path.relative_to(ROOT))
    temporary.replace(output)
    print(f'Pacote pronto: {output}')


if __name__ == '__main__':
    package_local()
