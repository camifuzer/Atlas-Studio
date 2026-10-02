"""Servidor de desenvolvimento local, API JSON e arquivos públicos permitidos."""

import argparse
import json
import mimetypes
import sqlite3
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

from .database import ConflictError, Database
from .frontend import BuildMissingError, admin_html, index_html


ROOT = Path(__file__).resolve().parent.parent
MAX_BODY = 128 * 1024 * 1024


class Handler(BaseHTTPRequestHandler):
    def allowed_request(self):
        port = self.server.server_port
        hosts = {f"127.0.0.1:{port}", f"localhost:{port}"}
        host = self.headers.get("Host", "")
        origin = self.headers.get("Origin")
        return (host in hosts and (origin is None or origin == f"http://{host}")
                and self.headers.get("Sec-Fetch-Site") not in {"cross-site"})

    def respond(self, status, data):
        content = json.dumps(data, ensure_ascii=False, allow_nan=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self):
        if not self.allowed_request():
            return self.respond(403, {"error": "Acesso permitido somente pela aplicação local."})
        url = urlsplit(self.path)
        if url.path == "/api/health":
            return self.respond(200, {"status": "ok", "storage": "sqlite"})
        if url.path.startswith("/api/"):
            parts = url.path.removeprefix("/api/").split("/")
            if len(parts) > 2 or not parts[0]:
                return self.respond(404, {"error": "Rota desconhecida."})
            try:
                record_id = unquote(parts[1]) if len(parts) == 2 else None
                project_id = parse_qs(url.query).get("projectId", [None])[0]
                value = self.server.database.read(parts[0], record_id, project_id)
                return self.respond(200, value)
            except ValueError as error:
                return self.respond(400, {"error": str(error)})
            except sqlite3.Error:
                return self.respond(503, {"error": "Não foi possível ler o banco. Tente novamente."})
        relative = unquote(url.path).lstrip("/") or "index.html"
        target = (ROOT / relative).resolve()
        public = relative in {"index.html", "admin.html", "favicon.ico", "favicon.svg", "favicon-32.png", "cursor-atlas.svg"}
        public = public or (relative.startswith(("js/", "css/")) and target.suffix in {".js", ".css"})
        if relative.startswith("dist/assets/"):
            public = target.is_relative_to((ROOT / "dist/assets").resolve()) and target.suffix in {".js", ".css", ".svg", ".png", ".woff2"}
        if not public or not target.is_relative_to(ROOT) or not target.is_file() or any(part.startswith(".") for part in Path(relative).parts):
            return self.respond(404, {"error": "Arquivo não encontrado."})
        # A resolução deve continuar dentro de js/css, inclusive para caminhos com ../ e symlinks.
        if relative.startswith(("js/", "css/")) and not target.is_relative_to(ROOT / relative.split("/")[0]):
            return self.respond(404, {"error": "Arquivo não encontrado."})
        try:
            content = admin_html(ROOT) if relative == "admin.html" else index_html(ROOT) if relative == "index.html" else target.read_bytes()
        except BuildMissingError as error:
            return self.respond(503, {"error": str(error)})
        self.send_response(200)
        self.send_header("Content-Type", mimetypes.guess_type(target.name)[0] or "application/octet-stream")
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(content)

    def do_POST(self):
        if not self.allowed_request():
            return self.respond(403, {"error": "Origem não permitida."})
        if self.path not in {"/api/transactions", "/api/migrate"}:
            return self.respond(404, {"error": "Rota desconhecida."})
        if self.headers.get("Content-Type", "").split(";")[0] != "application/json":
            return self.respond(415, {"error": "Envie application/json."})
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_BODY:
                return self.respond(413, {"error": "O pacote deve ter entre 1 byte e 128 MiB. Divida projetos maiores."})
            def reject_constant(value):
                raise ValueError("Número JSON inválido.")
            payload = json.loads(self.rfile.read(length), parse_constant=reject_constant)
            if not isinstance(payload, dict):
                raise ValueError("Envie um objeto JSON.")
            results = self.server.database.batch(payload.get("operations"), self.path == "/api/migrate")
            return self.respond(200, {"results": results})
        except ConflictError as error:
            return self.respond(409, {"error": str(error)})
        except (ValueError, UnicodeError) as error:
            return self.respond(400, {"error": str(error)})
        except sqlite3.Error:
            return self.respond(503, {"error": "Falha ao gravar no banco. Nenhuma parte do lote foi salva."})


def create_server(port=4173, database_path=None):
    database = Database(database_path or ROOT / "storage" / "atlas.sqlite3")
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    server.database = database
    return server


def main():
    parser = argparse.ArgumentParser(description="Atlas Studio com API Python e SQLite local")
    parser.add_argument("--port", type=int, default=4173)
    parser.add_argument("--database", type=Path, default=ROOT / "storage" / "atlas.sqlite3")
    args = parser.parse_args()
    server = create_server(args.port, args.database)
    print(f"Atlas Studio: http://127.0.0.1:{server.server_port}\nBanco: {args.database.resolve()}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
