"""Integração HTTP/SQLite com banco temporário, sem tocar em dados pessoais."""

import json
import tempfile
import threading
import unittest
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from app.database import Database
from app.server import create_server


class APITest(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.path = Path(self.directory.name) / "test.sqlite3"
        self.server = create_server(0, self.path)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = f"http://127.0.0.1:{self.server.server_port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.directory.cleanup()

    def request(self, path, data=None, headers=None):
        request = Request(self.base + path, data=json.dumps(data).encode() if data is not None else None,
                          headers=headers or ({"Content-Type": "application/json"} if data is not None else {}))
        try:
            response = urlopen(request, timeout=5)
        except HTTPError as error:
            response = error
        with response:
            raw = response.read()
            return response.status, json.loads(raw) if response.headers.get_content_type() == "application/json" else raw

    def put(self, store, value):
        return {"store": store, "action": "put", "value": value}

    def test_save_reload_filter_and_atomic_project_delete(self):
        operations = [self.put("projetos", {"id": "p", "nome": "Projeto", "schemaVersion": 8}),
                      self.put("mapas", {"id": "m", "projectId": "p", "nome": "Mapa", "imagem": "large", "objetos": [{"id": "o", "relacaoVersao": 2}], "versaoEditor": 12.5}),
                      self.put("rascunhos", {"id": "r", "mapaId": "m", "projectId": "p"}),
                      self.put("configuracoes", {"id": "estado-principal", "usuarios": []})]
        self.assertEqual(self.request("/api/transactions", {"operations": operations})[0], 200)
        # Nova conexão/repositório vê dados já confirmados em disco.
        self.assertEqual(Database(self.path).read("mapas", "m")["imagem"], "large")
        self.assertNotIn("schemaVersion", Database(self.path).read("projetos", "p"))
        saved_map = Database(self.path).read("mapas", "m")
        self.assertNotIn("versaoEditor", saved_map)
        self.assertNotIn("relacaoVersao", saved_map["objetos"][0])
        self.assertTrue(saved_map["objetos"][0]["passagemLocal"])
        status, summaries = self.request("/api/resumosMapas?projectId=p")
        self.assertEqual(status, 200)
        self.assertEqual(summaries[0]["totalObjetos"], 1)
        self.assertNotIn("imagem", summaries[0])
        self.assertEqual(self.request("/api/mapas?projectId=outro")[1], [])
        self.assertEqual(self.request("/api/transactions", {"operations": [{"store": "projetos", "action": "delete", "id": "p"}]})[0], 200)
        for store in ("mapas", "resumosMapas", "rascunhos", "projetos"):
            self.assertEqual(self.request("/api/" + store)[1], [])
        self.assertIsNotNone(self.request("/api/configuracoes/estado-principal")[1])

    def test_failure_rolls_back_all_maps_and_summaries(self):
        good = self.put("mapas", {"id": "m", "nome": "Original"})
        self.request("/api/transactions", {"operations": [good]})
        bad_batch = [self.put("mapas", {"id": "m", "nome": "Alterado"}),
                     self.put("mapas", {"id": "other", "nome": "Outro"}),
                     self.put("mapas", {"id": "bad", "nome": "Inválido", "objetos": {}})]
        self.assertEqual(self.request("/api/transactions", {"operations": bad_batch})[0], 400)
        self.assertEqual(self.request("/api/mapas/m")[1]["nome"], "Original")
        self.assertEqual(self.request("/api/resumosMapas/m")[1]["nome"], "Original")
        self.assertIsNone(self.request("/api/mapas/other")[1])

    def test_opening_database_cleans_old_version_markers(self):
        database = Database(self.path)
        with database.connect() as connection:
            Database.put(connection, "mapas", {
                "id": "old-map", "nome": "Mapa antigo", "versaoEditor": 7,
                "objetos": [{"id": "old-object", "relacaoVersao": 2}],
            })

        saved_map = Database(self.path).read("mapas", "old-map")
        self.assertNotIn("versaoEditor", saved_map)
        self.assertNotIn("relacaoVersao", saved_map["objetos"][0])
        self.assertTrue(saved_map["objetos"][0]["passagemLocal"])

    def test_migration_is_repeatable_and_never_overwrites_conflicts(self):
        operations = [self.put("mapas", {"id": "m", "nome": "Antigo", "extra": {"keep": True}})]
        for _ in range(2):
            self.assertEqual(self.request("/api/migrate", {"operations": operations})[0], 200)
        operations.insert(0, self.put("projetos", {"id": "p", "nome": "Novo"}))
        operations[1]["value"]["nome"] = "Conflito"
        self.assertEqual(self.request("/api/migrate", {"operations": operations})[0], 409)
        self.assertIsNone(self.request("/api/projetos/p")[1])
        self.assertEqual(self.request("/api/mapas/m")[1]["nome"], "Antigo")

    def test_private_files_and_foreign_origins_are_blocked(self):
        for path in ("/.git/config", "/storage/atlas.sqlite3", "/app/server.py", "/js/../app/server.py", "/.env", "/"):
            status, _ = self.request(path)
            self.assertEqual(status, 200 if path == "/" else 404)
        self.assertEqual(self.request("/api/mapas", headers={"Host": "evil.example"})[0], 403)
        self.assertEqual(self.request("/api/transactions", {"operations": []},
                                      {"Content-Type": "application/json", "Origin": "https://evil.example"})[0], 403)
        self.assertEqual(self.request("/api/transactions", {}, {"Content-Type": "text/plain"})[0], 415)

    def test_invalid_requests_do_not_break_server(self):
        for payload in ([], {}, {"operations": [None]}, {"operations": [{"store": [], "action": "put"}]},
                        {"operations": [self.put("resumosMapas", {"id": "m"})]}):
            self.assertEqual(self.request("/api/transactions", payload)[0], 400)
        status, health = self.request("/api/health")
        self.assertEqual(status, 200)
        self.assertNotIn("schemaVersion", health)


if __name__ == "__main__":
    unittest.main()
