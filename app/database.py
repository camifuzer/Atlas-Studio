"""Repositório SQLite. Cada lote é confirmado integralmente ou revertido."""

import json
import sqlite3
from contextlib import closing
from pathlib import Path


STORES = {"projetos", "mapas", "rascunhos", "configuracoes"}
OBSOLETE_METADATA = {"schemaVersion", "versaoEditor"}


class ConflictError(ValueError):
    pass


class Database:
    def __init__(self, path):
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with closing(self.connect()) as db, db:
            for table in sorted(STORES):
                db.execute(f"""CREATE TABLE IF NOT EXISTS {table} (
                    id TEXT PRIMARY KEY NOT NULL,
                    project_id TEXT,
                    document TEXT NOT NULL CHECK(json_valid(document))
                )""")
                db.execute(f"CREATE INDEX IF NOT EXISTS {table}_project ON {table}(project_id)")
            db.execute("""CREATE TABLE IF NOT EXISTS resumosMapas (
                id TEXT PRIMARY KEY NOT NULL,
                project_id TEXT,
                document TEXT NOT NULL CHECK(json_valid(document))
            )""")
            db.execute("CREATE INDEX IF NOT EXISTS resumos_project ON resumosMapas(project_id)")
            self.remove_obsolete_metadata(db)

    def connect(self):
        return sqlite3.connect(self.path, timeout=15)

    @staticmethod
    def clean_document(value, store=None):
        cleaned = dict(value)
        for field in OBSOLETE_METADATA:
            cleaned.pop(field, None)
        if store == "mapas" and isinstance(cleaned.get("objetos"), list):
            objects = []
            for raw_object in cleaned["objetos"]:
                if not isinstance(raw_object, dict):
                    objects.append(raw_object)
                    continue
                object_value = dict(raw_object)
                if object_value.get("relacaoVersao") == 2:
                    object_value["passagemLocal"] = True
                object_value.pop("relacaoVersao", None)
                objects.append(object_value)
            cleaned["objetos"] = objects
        return cleaned

    @classmethod
    def remove_obsolete_metadata(cls, db):
        for store in sorted(STORES):
            for record_id, raw in db.execute(f"SELECT id, document FROM {store}").fetchall():
                value = json.loads(raw)
                cleaned = cls.clean_document(value, store)
                if cleaned != value:
                    db.execute(
                        f"UPDATE {store} SET document=? WHERE id=?",
                        (json.dumps(cleaned, ensure_ascii=False, allow_nan=False), record_id),
                    )

    @staticmethod
    def check_store(store, write=False):
        if store not in STORES | (set() if write else {"resumosMapas"}):
            raise ValueError("Coleção desconhecida ou somente para leitura.")

    def read(self, store, record_id=None, project_id=None):
        self.check_store(store)
        query = f"SELECT document FROM {store}"
        params = []
        if record_id is not None:
            query += " WHERE id = ?"
            params.append(record_id)
        elif project_id is not None:
            query += " WHERE project_id = ?"
            params.append(project_id)
        query += " ORDER BY id"
        with closing(self.connect()) as db:
            rows = [self.clean_document(json.loads(row[0]), store) for row in db.execute(query, params)]
        return (rows[0] if rows else None) if record_id is not None else rows

    @staticmethod
    def validate_record(store, value):
        if not isinstance(value, dict):
            raise ValueError("O registro deve ser um objeto.")
        record_id = value.get("id")
        if not isinstance(record_id, str) or not record_id.strip() or len(record_id) > 500:
            raise ValueError("O registro precisa de um ID de texto válido.")
        if value.get("projectId") is not None and not isinstance(value["projectId"], str):
            raise ValueError("projectId deve ser texto.")
        if store in {"mapas", "projetos"} and not isinstance(value.get("nome"), str):
            raise ValueError("Projetos e mapas precisam de um nome.")
        if store == "mapas":
            for field in ("objetos", "categorias", "fontesDados"):
                if field in value and not isinstance(value[field], list):
                    raise ValueError(f"{field} deve ser uma lista.")
        return record_id

    @staticmethod
    def put(db, store, value):
        db.execute(
            f"INSERT INTO {store}(id, project_id, document) VALUES (?, ?, ?) "
            "ON CONFLICT(id) DO UPDATE SET project_id=excluded.project_id, document=excluded.document",
            (value["id"], value.get("projectId"), json.dumps(value, ensure_ascii=False, allow_nan=False)),
        )

    def batch(self, operations, migration=False):
        if not isinstance(operations, list) or len(operations) > 10000:
            raise ValueError("Envie uma lista de até 10000 operações.")
        results = []
        with closing(self.connect()) as db, db:
            db.execute("BEGIN IMMEDIATE")
            for operation in operations:
                if not isinstance(operation, dict):
                    raise ValueError("Operação inválida.")
                store = operation.get("store")
                if not isinstance(store, str):
                    raise ValueError("Coleção inválida.")
                self.check_store(store, write=True)
                action = operation.get("action")
                if action == "put":
                    raw_value = operation.get("value")
                    value = self.clean_document(raw_value, store) if isinstance(raw_value, dict) else raw_value
                    record_id = self.validate_record(store, value)
                    if migration:
                        existing = db.execute(f"SELECT document FROM {store} WHERE id=?", (record_id,)).fetchone()
                        if existing:
                            if json.loads(existing[0]) != value:
                                raise ConflictError("Já existe um registro diferente com o mesmo ID. Use Importar projeto para criar uma cópia.")
                            results.append(record_id)
                            continue
                    self.put(db, store, value)
                    if store == "mapas":
                        summary = {key: value.get(key) for key in ("id", "projectId", "nome", "atualizadoEm")}
                        summary["totalObjetos"] = len(value.get("objetos", []))
                        self.put(db, "resumosMapas", summary)
                    results.append(record_id)
                elif action == "delete" and not migration:
                    record_id = operation.get("id")
                    if not isinstance(record_id, str) or not record_id:
                        raise ValueError("ID inválido.")
                    db.execute(f"DELETE FROM {store} WHERE id=?", (record_id,))
                    if store == "mapas":
                        db.execute("DELETE FROM resumosMapas WHERE id=?", (record_id,))
                        db.execute("DELETE FROM rascunhos WHERE json_extract(document, '$.mapaId')=?", (record_id,))
                    if store == "projetos":
                        for child in ("mapas", "resumosMapas", "rascunhos"):
                            db.execute(f"DELETE FROM {child} WHERE project_id=?", (record_id,))
                    results.append(None)
                else:
                    raise ValueError("Operação não permitida.")
        return results
