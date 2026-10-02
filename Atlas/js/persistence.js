/* Persistência via API Python; mapas e resumos são confirmados juntos no SQLite. */
function abrirBanco() {
  return AtlasAPI.open();
}

function store(
  modo = "readonly"
) {
  return db
    .transaction(
      STORE_MAPAS,
      modo
    )
    .objectStore(
      STORE_MAPAS
    );
}

function aguardarRequisicao(requisicao) {
  return new Promise((resolve, reject) => {
    requisicao.onsuccess = () => resolve(requisicao.result);
    requisicao.onerror = () => reject(requisicao.error);
  });
}

function aguardarTransacao(transacao, mensagemErro) {
  return new Promise((resolve, reject) => {
    transacao.oncomplete = () => resolve();
    transacao.onerror = transacao.onabort = () => reject(
      transacao.error || new Error(mensagemErro)
    );
  });
}

function dbTodos() {
  if (!projetoAtual) return Promise.resolve([]);
  return aguardarRequisicao(
    store().index("projectId").getAll(projetoAtual.id)
  );
}

function transacaoMapas(extras = []) {
  return db.transaction([STORE_MAPAS, STORE_RESUMOS, ...extras], "readwrite");
}

function gravarMapaNaTransacao(tx, mapaAlvo) {
  tx.objectStore(STORE_MAPAS).put(mapaAlvo);
}

function excluirMapaNaTransacao(tx, id) {
  tx.objectStore(STORE_MAPAS).delete(id);
}

function dbListarResumosMapas(global = false) {
  if (!global && !projetoAtual) return Promise.resolve([]);
  const resumoStore = db.transaction(STORE_RESUMOS).objectStore(STORE_RESUMOS);
  return aguardarRequisicao(
    global
      ? resumoStore.getAll()
      : resumoStore.index("projectId").getAll(projetoAtual.id)
  );
}

// API legada usada também pela suíte de regressão; novas listagens devem usar resumos.
function dbTodosGlobais() {
  return aguardarRequisicao(store().getAll());
}

async function dbPegar(id) {
  const resultado = await dbPegarMapaGlobal(id);
  return !resultado ||
    !projetoAtual ||
    resultado.projectId === projetoAtual.id
      ? resultado
      : undefined;
}

function dbPegarMapaGlobal(id) {
  return aguardarRequisicao(store().get(id));
}

async function dbSalvar(
  objeto,
  opcoes = {}
) {
  if (
    projetoAtual?.id &&
    !opcoes.preservarProjeto
  ) {
    objeto.projectId =
      projetoAtual.id;
  }

  objeto.atualizadoEm =
    new Date().toISOString();
  delete objeto.versaoEditor;
  delete objeto.schemaVersion;

  const registrarHistorico =
    opcoes.historico !== false &&
    historicoGlobal.ativo &&
    !historicoGlobal.aplicando;
  const antes =
    registrarHistorico
      ? await dbPegarMapaGlobal(
          objeto.id
        )
      : null;

  mostrarEstadoSalvamento("salvando");
  try {
    const tx = transacaoMapas();
    gravarMapaNaTransacao(tx, objeto);
    await aguardarTransacao(tx, "Falha ao salvar o mapa.");
    mostrarEstadoSalvamento(sessaoRascunho ? "pendente" : "salvo");
  } catch (erro) {
    mostrarEstadoSalvamento("erro", "A edição continua aberta. Tente novamente; verifique se o servidor Python está em execução.");
    throw erro;
  }

  if (registrarHistorico) {
    registrarAlteracaoHistoricoGlobal(
      objeto.id,
      antes,
      objeto
    );
  }
}

function storeProjetos(
  modo = "readonly"
) {
  return db
    .transaction(
      STORE_PROJETOS,
      modo
    )
    .objectStore(
      STORE_PROJETOS
    );
}

function dbTodosProjetos() {
  return aguardarRequisicao(storeProjetos().getAll());
}

function dbPegarProjeto(id) {
  return aguardarRequisicao(storeProjetos().get(id));
}

function dbSalvarProjeto(projeto) {
  delete projeto.schemaVersion;
  delete projeto.versaoEditor;
  projeto.atualizadoEm =
    new Date().toISOString();

  const tx = db.transaction(STORE_PROJETOS, "readwrite");
  tx.objectStore(STORE_PROJETOS).put(projeto);
  return aguardarTransacao(tx, "Falha ao salvar o projeto.")
    .catch(erro => {
      mostrarEstadoSalvamento("erro", "Não foi possível salvar os dados do projeto.");
      throw erro;
    });
}

async function dbExcluir(
  id,
  opcoes = {}
) {
  const registrarHistorico =
    opcoes.historico !== false &&
    historicoGlobal.ativo &&
    !historicoGlobal.aplicando;
  const antes =
    registrarHistorico
      ? await dbPegarMapaGlobal(id)
      : null;

  const tx = transacaoMapas();
  excluirMapaNaTransacao(tx, id);
  await aguardarTransacao(tx, "Não foi possível excluir o mapa.");

  if (registrarHistorico) {
    registrarAlteracaoHistoricoGlobal(
      id,
      antes,
      null
    );
  }
}
