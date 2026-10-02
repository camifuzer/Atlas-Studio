/* Ponte com o editor clássico: recuperação de dados, navegação e comandos externos.
   A interface, busca e formulários da Biblioteca pertencem a frontend/projects/. */
const gerenciadorProjetos = $("gerenciadorProjetos");
let bibliotecaProjetos = null;
let conectarBiblioteca;
const bibliotecaPronta = new Promise(resolve => { conectarBiblioteca = resolve; });

async function obterBibliotecaProjetos() {
  if (bibliotecaProjetos) return bibliotecaProjetos;
  let timer;
  try {
    return await Promise.race([bibliotecaPronta, new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("A Biblioteca não carregou. Reinicie o servidor Python e recarregue a página.")), 15000);
    })]);
  } finally { clearTimeout(timer); }
}
async function renderizarProjetos(limparBusca = false) {
  return (await obterBibliotecaProjetos()).refresh(limparBusca);
}
function focarBuscaProjetos() { bibliotecaProjetos?.focusSearch(); }

function gerarIdProjeto() {
  if (globalThis.crypto?.randomUUID) {
    return "project-" +
      crypto.randomUUID();
  }

  return "project-" +
    Date.now() +
    "-" +
    Math.random()
      .toString(36)
      .slice(2);
}

async function garantirEstruturaProjetos() {
  let projetos =
    await dbTodosProjetos();
  const mapas =
    await dbListarResumosMapas(true);

  if (!mapas.length) {
    return;
  }

  /* Um mapa nunca deve ficar invisível apenas porque o registro do projeto
     se perdeu. Recriamos o contêiner com o mesmo ID para preservar vínculos,
     mapas e câmeras exatamente como estavam. */
  const idsProjetosAusentes = [
    ...new Set(
      mapas
        .map(mapa => mapa.projectId)
        .filter(id => id && !projetos.some(projeto => projeto.id === id))
    )
  ];

  for (const [indice, id] of idsProjetosAusentes.entries()) {
    const recuperado = {
      id,
      nome: idsProjetosAusentes.length > 1
        ? `Projeto recuperado ${indice + 1}`
        : "Projeto recuperado",
      descricao: "Mapas recuperados do armazenamento do Atlas Studio.",
      criadoEm: new Date().toISOString(),
      recuperadoEm: new Date().toISOString()
    };
    await dbSalvarProjeto(recuperado);
    projetos.push(recuperado);
  }

  if (!projetos.length) {
    const legado = {
      id: gerarIdProjeto(),
      nome: "Meu projeto",
      descricao:
        "Mapas existentes antes da organização por projetos.",
      criadoEm:
        new Date().toISOString()
    };

    await dbSalvarProjeto(legado);
    projetos = [legado];
  }

  const projetoPadrao =
    projetos.find(
      projeto =>
        projeto.id ===
        localStorage.getItem(
          CHAVE_PROJETO_ATUAL
        )
    ) || projetos[0];
  const idsProjetos =
    new Set(
      projetos.map(
        projeto => projeto.id
      )
    );

  for (const mapaLegado of mapas) {
    if (
      mapaLegado.projectId &&
      idsProjetos.has(
        mapaLegado.projectId
      )
    ) {
      continue;
    }

    const mapaCompleto = await dbPegarMapaGlobal(mapaLegado.id);
    mapaCompleto.projectId = projetoPadrao.id;

    /* A migração preserva integralmente o registro do mapa. */
    const tx = transacaoMapas();
    gravarMapaNaTransacao(tx, mapaCompleto);
    await aguardarTransacao(tx, "Falha ao migrar mapa para o projeto.");
  }
}

async function mostrarGerenciadorProjetos() {
  await preservarRascunhoAtual();
  suspenderRascunhoCategoria();
  desativarHistoricoGlobal();

  if (editor.ativo) {
    cancelarEdicaoObjeto({ preservarRascunho: true });
  }

  fecharMenuRadial();
  definirMenuPrincipalAberto(false);
  mostrarTelaSemMapa();
  projetoAtual = null;

  document.body.classList.add(
    "projects-visible"
  );
  if (window.location.hash !== "#projetos") {
    history.replaceState(null, "", "#projetos");
  }
  gerenciadorProjetos.hidden = false;
  sincronizarShell();

  /* A busca da visita anterior não pode esconder um projeto salvo quando o
     usuário retorna à Biblioteca. */
  await renderizarProjetos(true);
  mapa.invalidateSize();
}

async function abrirProjeto(id) {
  await preservarRascunhoAtual();
  suspenderRascunhoCategoria();
  cancelarEdicaoObjeto({ preservarRascunho: true });
  const projeto =
    await dbPegarProjeto(id);

  if (!projeto) {
    avisar("Projeto não encontrado.");
    await renderizarProjetos();
    return;
  }

  projetoAtual = projeto;
  localStorage.setItem(
    CHAVE_PROJETO_ATUAL,
    projeto.id
  );

  document.body.classList.remove(
    "projects-visible"
  );
  if (window.location.hash === "#projetos") {
    history.replaceState(
      null,
      "",
      window.location.pathname +
        window.location.search
    );
  }
  gerenciadorProjetos.hidden = true;
  sincronizarShell();

  const mapas = await dbListarResumosMapas();
  const idPreferido =
    localStorage.getItem(CHAVE_ATUAL);
  const mapaPreferido =
    mapas.find(
      item => item.id === idPreferido
    ) || mapas[0];

  if (mapaPreferido) {
    await abrirMapa(
      mapaPreferido.id
    );
  } else {
    mostrarTelaSemMapa();
    await atualizarSeletorMapas();
  }

  setModo("visualizacao");
  await atualizarSeletorMapas();
  iniciarHistoricoGlobal();

  requestAnimationFrame(
    () => mapa.invalidateSize()
  );
}

async function restaurarTelaInicial() {
  const projetoPreferidoId =
    localStorage.getItem(
      CHAVE_PROJETO_ATUAL
    );
  const projetoExiste =
    window.location.hash !== "#projetos" &&
    projetoPreferidoId
      ? await dbPegarProjeto(projetoPreferidoId)
      : false;

  return projetoExiste
    ? abrirProjeto(projetoPreferidoId)
    : mostrarGerenciadorProjetos();
}


window.AtlasProjectEditor = Object.freeze({
  connect(controller) { bibliotecaProjetos = controller; conectarBiblioteca(controller); },
  libraryLoaded(projects) {
    const preferred = localStorage.getItem(CHAVE_PROJETO_ATUAL);
    window.AtlasShell.update({ adminHref: projects.some(project => project.id === preferred)
      ? "admin.html?project=" + encodeURIComponent(preferred) : "admin.html" });
  },
  createId: gerarIdProjeto,
  open: abrirProjeto,
  showLibrary: mostrarGerenciadorProjetos,
  notice: avisar,
  projectUpdated(project) {
    if (projetoAtual?.id === project.id) {
      projetoAtual = project;
      sincronizarShell();
    }
  },
  projectDeleted(id, maps) {
    for (const map of maps) localStorage.removeItem(chaveCameraMapa(map.id));
    if (localStorage.getItem(CHAVE_PROJETO_ATUAL) === id) localStorage.removeItem(CHAVE_PROJETO_ATUAL);
  },
  manage(id) {
    localStorage.setItem(CHAVE_PROJETO_ATUAL, id);
    window.location.href = "admin.html?project=" + encodeURIComponent(id);
  }
});
