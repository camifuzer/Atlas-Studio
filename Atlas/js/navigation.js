/* Câmera por mapa, seleção e carregamento de mapas do projeto. */
function chaveCameraMapa(id) {
  return "atlas-studio-map-editor" + String(id || "");
}

function salvarCameraAtual() {
  if (!mapaAtual || !mapa?._loaded) {
    return;
  }

  const centro = mapa.getCenter();

  localStorage.setItem(
    chaveCameraMapa(mapaAtual.id),
    JSON.stringify({
      lat: centro.lat,
      lng: centro.lng,
      zoom: mapa.getZoom()
    })
  );
}

function cameraSalvaMapa(id) {
  try {
    const valor =
      JSON.parse(
        localStorage.getItem(
          chaveCameraMapa(id)
        ) ||
        "null"
      );

    if (
      valor &&
      Number.isFinite(valor.lat) &&
      Number.isFinite(valor.lng) &&
      Number.isFinite(valor.zoom)
    ) {
      return valor;
    }
  } catch (erro) {}

  return null;
}

/* =========================================================
   MAPAS
   ========================================================= */

let geracaoSeletorMapas = 0;
async function atualizarSeletorMapas() {
  const geracao = ++geracaoSeletorMapas;
  const projectId = projetoAtual?.id;
  const mapas = await dbListarResumosMapas();
  if (geracao !== geracaoSeletorMapas || projetoAtual?.id !== projectId) return;
  mapas.sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
  window.AtlasShell.update({ maps: mapas });
  sincronizarShell();
}

function mostrarTelaSemMapa() {
  fecharConsultaNoPainel(false);
  limparCapturaCalibracao();
  limparMapaRenderizado();
  limparEditorVisual();

  mapaAtual =
    null;

  localStorage.removeItem(
    CHAVE_ATUAL
  );

  ui.objetoSelecionadoId =
    null;

  ui.categoriaSelecionadaId =
    null;

  ui.ferramenta =
    "selecionar";

  editor.ativo =
    false;

  editor.editandoId =
    null;

  editor.categoriaId =
    null;

  editor.pontos =
    [];

  editor.label =
    null;

  editor.ramificacoes =
    [];

  editor.ramoAtivo =
    null;

  editor.linhaExtremidadeAtiva =
    null;

  editor.verticeSelecionado =
    null;

  formObjeto.hidden =
    true;

  editorObjetoWrap.hidden =
    true;

  modalCategoria.hidden =
    true;

  selecaoObjeto.hidden =
    true;

  controleVertice.hidden =
    true;

  grupoRelacoesArea.hidden =
    true;

  mapa.setMaxBounds(
    null
  );

  mapa.setView(
    [0, 0],
    0,
    {
      animate: false
    }
  );

  mapa.invalidateSize();

  document.body.classList.add(
    "sem-mapa"
  );

  if (estadoMapaVazioProjeto) {
    estadoMapaVazioProjeto.textContent =
      projetoAtual?.nome ||
      "Novo projeto";
  }

  if (estadoMapaVazio) {
    const nomeProjeto =
      projetoAtual?.nome ||
      "este projeto";

    estadoMapaVazio.setAttribute(
      "aria-label",
      `Criar o primeiro mapa de ${nomeProjeto}`
    );
  }

  window.AtlasShell.update({ maps: [] });
  sincronizarShell();

  legendaAutomatica.innerHTML =
    "";

  if (inspectorLayersList) {
    inspectorLayersList.innerHTML =
      "";
  }

  if (typeCreationList) {
    typeCreationList.innerHTML =
      "";
  }

  atualizarSelecaoVerticeUI();
  atualizarBarraStatus();
  atualizarAcoesRail();
}

async function abrirMapa(id) {
  await preservarRascunhoAtual();
  suspenderRascunhoCategoria();
  const bruto =
    await dbPegar(id);

  if (!bruto) {
    return;
  }

  limparCapturaCalibracao();

  const migrado =
    normalizarEstruturaMapa(bruto);

  await garantirFontesCompartilhadasNoMapa(
    migrado
  );

  await garantirCategoriasCompartilhadasNoMapa(
    migrado
  );

  mapaAtual =
    migrado;

  document.body.classList.remove(
    "sem-mapa"
  );

  sincronizarShell();

  /*
    Persiste migração automaticamente.
  */
  await dbSalvar(
    mapaAtual,
    {
      historico: false
    }
  );

  localStorage.setItem(
    CHAVE_ATUAL,
    mapaAtual.id
  );

  ui.objetoSelecionadoId =
    null;

  cancelarEdicaoObjeto({ preservarRascunho: true });

  renderMapaCompleto({
    preservarCamera: false
  });

  await atualizarSeletorMapas();

  atualizarCategoriasUI();
  atualizarFontesDadosUI();
  atualizarLegenda();
  atualizarBarraStatus();
  renderizarPainelCoordenadas();
  await oferecerRascunhoAtual();
}
