"""Executa a suíte em servidor/banco temporários; nunca utiliza storage/atlas.sqlite3."""

import subprocess
import sys
import tempfile
import threading
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.server import create_server  # noqa: E402


with tempfile.TemporaryDirectory(prefix="atlas-browser-") as directory:
    server = create_server(0, Path(directory) / "test.sqlite3")
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        result = subprocess.run([
            "node", str(Path(__file__).with_name("browser-smoke.mjs")),
            f"http://127.0.0.1:{server.server_port}/index.html", *sys.argv[1:]
        ], check=False)
    finally:
        server.shutdown()
        server.server_close()
        thread.join()
    sys.exit(result.returncode)
