/* Cliente da API local. A ponte de transações mantém os lotes usados pelo editor.
   Nenhum dado é gravado no IndexedDB; a confirmação vem após o commit no SQLite. */
const AtlasAPI = (() => {
  let fila = Promise.resolve();

  const { request, post } = globalThis.AtlasHTTP;

  function transaction(stores, mode = "readonly") {
    const permitidos = new Set(Array.isArray(stores) ? stores : [stores]);
    const operations = [];
    const requests = [];
    let started = false;
    let finished = false;
    const tx = {
      error: null,
      objectStore(store) {
        if (!permitidos.has(store)) throw new Error("Coleção fora da transação.");
        const add = operation => {
          if (started || finished) throw new Error("Transação encerrada.");
          if (mode !== "readwrite" && ["put", "delete"].includes(operation.action)) throw new Error("Transação somente para leitura.");
          const req = {};
          operations.push(JSON.parse(JSON.stringify({ store, ...operation })));
          requests.push(req);
          return req;
        };
        return {
          put: value => add({ action: "put", value }),
          delete: id => add({ action: "delete", id }),
          get: id => add({ action: "get", id }),
          getAll: () => add({ action: "list" }),
          index(name) {
            if (name !== "projectId") throw new Error("Índice desconhecido.");
            return { getAll: projectId => add({ action: "list", projectId }) };
          }
        };
      },
      abort() {
        if (started) throw new Error("O lote já foi enviado à API.");
        if (finished) return;
        finished = true;
        tx.error = new Error("Transação cancelada.");
        queueMicrotask(() => tx.onabort?.());
      }
    };
    setTimeout(() => {
      if (finished) return;
      const execute = async () => {
        if (finished) return;
        started = true;
        try {
          let results;
          if (mode === "readwrite") {
            results = (await post("/api/transactions", operations)).results;
          } else {
            results = await Promise.all(operations.map(op => {
              const path = "/api/" + op.store;
              return request(op.action === "get" ? path + "/" + encodeURIComponent(op.id)
                : path + (op.projectId === undefined ? "" : "?projectId=" + encodeURIComponent(op.projectId)));
            }));
          }
          finished = true;
          requests.forEach((req, index) => { req.result = results[index] ?? undefined; req.onsuccess?.(); });
          tx.oncomplete?.();
        } catch (error) {
          finished = true;
          tx.error = error;
          requests.forEach(req => { req.error = error; req.onerror?.(); });
          tx.onerror?.();
        }
      };
      fila = fila.catch(() => {}).then(execute);
    }, 0);
    return tx;
  }

  async function open() {
    const health = await request("/api/health");
    if (health.storage !== "sqlite") throw new Error("Servidor incompatível com o Atlas Studio.");
    return { transaction, close() {} };
  }
  return { request, post, open };
})();
