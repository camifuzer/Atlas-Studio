"""Contrato entre manifesto Vite, HTML e servidor local."""

import json
import tempfile
import unittest
from pathlib import Path

from app.frontend import BuildMissingError, admin_html, index_html


class FrontendTest(unittest.TestCase):
    def test_index_loads_library_without_replacing_editor_scripts(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'dist/.vite').mkdir(parents=True)
            (root / 'dist/assets').mkdir()
            (root / 'dist/assets/library.js').write_text('')
            (root / 'index.html').write_text('<script src="js/projects.js"></script><!-- library-assets -->')
            (root / 'dist/.vite/manifest.json').write_text(json.dumps({
                'frontend/shell/main.jsx': {'file': 'assets/library.js'},
            }))
            rendered = index_html(root).decode()
            self.assertIn('<script src="js/projects.js"></script>', rendered)
            self.assertIn('type="module" src="/dist/assets/library.js"', rendered)
            self.assertNotIn('<!-- library-assets -->', rendered)

    def test_manifest_injects_entry_and_dependency_styles(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / 'dist/.vite').mkdir(parents=True)
            (root / 'dist/assets').mkdir()
            (root / 'admin.html').write_text('<main id="admin-root"></main><!-- admin-assets -->')
            for name in ('app.js', 'shared.css', 'app.css'):
                (root / 'dist/assets' / name).write_text('')
            manifest = {'frontend/admin/main.jsx': {'file': 'assets/app.js', 'css': ['assets/app.css'], 'imports': ['shared']},
                        'shared': {'file': 'assets/shared.js', 'css': ['assets/shared.css']}}
            (root / 'dist/.vite/manifest.json').write_text(json.dumps(manifest))
            rendered = admin_html(root).decode()
            self.assertIn('type="module" src="/dist/assets/app.js"', rendered)
            self.assertLess(rendered.index('shared.css'), rendered.index('app.css'))
            self.assertNotIn('<!-- admin-assets -->', rendered)
            manifest['frontend/admin/main.jsx']['file'] = '../../app/server.py'
            (root / 'dist/.vite/manifest.json').write_text(json.dumps(manifest))
            with self.assertRaises(BuildMissingError):
                admin_html(root)

    def test_missing_build_has_actionable_error(self):
        with tempfile.TemporaryDirectory() as directory:
            with self.assertRaisesRegex(BuildMissingError, 'npm run build'):
                admin_html(directory)
