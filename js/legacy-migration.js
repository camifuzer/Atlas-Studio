/* Leitura de compatibilidade: conserva o IndexedDB original e copia para a API. */
async function lerBancoLegado(nome, stores) {
  const banco = await new Promise((resolve, reject) => {
    const req = indexedDB.open(nome);
    let inexistente = false;
    req.onupgradeneeded = () => { inexistente = true; req.transaction.abort(); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => inexistente ? resolve(null) : reject(req.error);
    req.onblocked = () => reject(new Error("Feche as outras abas do Atlas e tente novamente."));
  });
  if (!banco) return [];
  try {
    const grupos = await Promise.all(stores.filter(store => banco.objectStoreNames.contains(store)).map(store =>
      new Promise((resolve, reject) => {
        const req = banco.transaction(store).objectStore(store).getAll();
        req.onsuccess = () => resolve(req.result.map(value => ({ store, action: "put", value })));
        req.onerror = () => reject(req.error);
      })
    ));
    return grupos.flat();
  } finally { banco.close(); }
}

async function migrarDadosNavegador() {
  const operations = [
    ...await lerBancoLegado(DB_NOME, ["projetos", "mapas", "rascunhos"]),
    ...await lerBancoLegado("atlas-studio-administracao", ["configuracoes"])
  ];
  if (!operations.length) return 0;
  await AtlasAPI.post("/api/migrate", operations);
  return operations.length;
}

async function executarMigracaoNavegador() {
  const total = await migrarDadosNavegador();
  await garantirEstruturaProjetos();
  await renderizarProjetos();
  avisar(total ? "Dados copiados para o banco. A cópia antiga permanece no navegador."
    : "Nenhum dado antigo neste endereço. Use o navegador e endereço da instalação anterior, ou importe um backup .atlasproject.");
}
