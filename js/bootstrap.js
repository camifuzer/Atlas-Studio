/*
  Inicialização da aplicação.
  Preferências do Inspector, eventos da interface e fluxo de partida.
*/

/* =========================================================
   EVENTOS UI
   ========================================================= */

const paineisFlutuantes = new Map();

function faixaViewportAtual() {
  return innerWidth <= 700 ? "mobile" : innerWidth <= 1024 ? "tablet" : "desktop";
}

function limitesPaineisFlutuantes() {
  const viewport = window.visualViewport;
  const esquerda = (viewport?.offsetLeft || 0) + 8;
  const topoViewport = (viewport?.offsetTop || 0);
  const direita = esquerda + (viewport?.width || innerWidth) - 16;
  const topbar = document.querySelector("body.app-shell:not(.projects-visible) > .topbar");
  const topo = Math.max(topoViewport, topbar?.getBoundingClientRect().bottom || 0) + 8;
  const statusbar = document.querySelector(".statusbar");
  const limiteViewport = topoViewport + (viewport?.height || innerHeight);
  const topoStatus = statusbar && getComputedStyle(statusbar).display !== "none"
    ? statusbar.getBoundingClientRect().top
    : limiteViewport;
  const base = Math.min(limiteViewport, topoStatus) - 8;
  return { esquerda, topo, direita, base };
}

function limitarRetanguloPainel(retangulo) {
  const limites = limitesPaineisFlutuantes();
  const larguraDisponivel = Math.max(1, limites.direita - limites.esquerda);
  const alturaDisponivel = Math.max(1, limites.base - limites.topo);
  const larguraMinima = Math.min(innerWidth <= 700 ? 240 : 280, larguraDisponivel);
  const alturaMinima = Math.min(180, alturaDisponivel);
  const largura = clamp(Number(retangulo.width) || 304, larguraMinima, larguraDisponivel);
  const altura = clamp(Number(retangulo.height) || 420, alturaMinima, alturaDisponivel);
  return {
    x: clamp(Number(retangulo.x) || limites.esquerda, limites.esquerda, limites.direita - largura),
    y: clamp(Number(retangulo.y) || limites.topo, limites.topo, limites.base - altura),
    width: largura,
    height: altura
  };
}

function aplicarRetanguloPainel(elemento, retangulo, salvar = false) {
  const ajustado = limitarRetanguloPainel(retangulo);
  elemento.classList.add("floating-panel-free");
  elemento.style.setProperty("--floating-panel-left", `${Math.round(ajustado.x)}px`);
  elemento.style.setProperty("--floating-panel-top", `${Math.round(ajustado.y)}px`);
  elemento.style.setProperty("--floating-panel-width", `${Math.round(ajustado.width)}px`);
  elemento.style.setProperty("--floating-panel-height", `${Math.round(ajustado.height)}px`);

  if (salvar) {
    const controle = paineisFlutuantes.get(elemento);
    try {
      localStorage.setItem(controle.storageKey, JSON.stringify({ ...ajustado, faixa: faixaViewportAtual() }));
    } catch (erro) {}
  }

  atualizarAncoragemBarraCriacao();

  return ajustado;
}

function liberarPainelFlutuante(elemento) {
  elemento.classList.remove("floating-panel-free");
  for (const propriedade of ["--floating-panel-left", "--floating-panel-top", "--floating-panel-width", "--floating-panel-height"]) {
    elemento.style.removeProperty(propriedade);
  }
  const controle = paineisFlutuantes.get(elemento);
  if (controle) localStorage.removeItem(controle.storageKey);
}

function prepararPainelFlutuante(elemento, cabecalho, storageKey, nome) {
  if (!elemento || !cabecalho) return;
  const controle = { storageKey };
  paineisFlutuantes.set(elemento, controle);
  elemento.dataset.floatingPanel = nome;
  cabecalho.title = "Arraste para mover · dois cliques restauram a posição";

  const ativar = () => {
    const caixa = elemento.getBoundingClientRect();
    return aplicarRetanguloPainel(elemento, { x: caixa.left, y: caixa.top, width: caixa.width, height: caixa.height });
  };

  cabecalho.addEventListener("pointerdown", evento => {
    if (evento.button !== 0 || evento.target.closest("button, input, select, textarea, a")) return;
    const inicial = ativar();
    const origem = { x: evento.clientX, y: evento.clientY };
    cabecalho.setPointerCapture(evento.pointerId);
    document.body.classList.add("movendo-painel");
    const mover = atual => aplicarRetanguloPainel(elemento, {
      ...inicial,
      x: inicial.x + atual.clientX - origem.x,
      y: inicial.y + atual.clientY - origem.y
    });
    const finalizar = atual => {
      cabecalho.removeEventListener("pointermove", mover);
      cabecalho.removeEventListener("pointerup", finalizar);
      cabecalho.removeEventListener("pointercancel", finalizar);
      document.body.classList.remove("movendo-painel");
      aplicarRetanguloPainel(elemento, elemento.getBoundingClientRect(), true);
      if (cabecalho.hasPointerCapture(atual.pointerId)) cabecalho.releasePointerCapture(atual.pointerId);
    };
    cabecalho.addEventListener("pointermove", mover);
    cabecalho.addEventListener("pointerup", finalizar);
    cabecalho.addEventListener("pointercancel", finalizar);
    evento.preventDefault();
  });

  cabecalho.addEventListener("dblclick", evento => {
    if (evento.target.closest("button")) return;
    liberarPainelFlutuante(elemento);
  });

  const direcoes = [
    ["n", "floating-panel-handle-n"],
    ["ne", "floating-panel-handle-ne"],
    ["e", "floating-panel-handle-e"],
    ["se", "floating-panel-handle-se"],
    ["s", "floating-panel-handle-s"],
    ["sw", "floating-panel-handle-sw"],
    ["w", "floating-panel-handle-w"],
    ["nw", "floating-panel-handle-nw"]
  ];

  for (const [direcao, classeDirecao] of direcoes) {
    const handle = document.createElement("div");
    handle.className = "floating-panel-handle " + classeDirecao;
    handle.dataset.resizeDirection = direcao;
    handle.tabIndex = 0;
    handle.setAttribute("role", "separator");
    handle.setAttribute("aria-label", `Redimensionar ${nome} pela direção ${direcao.toUpperCase()}`);

    const redimensionar = (inicial, dx, dy) => {
      const limites = limitesPaineisFlutuantes();
      const direita = inicial.x + inicial.width;
      const base = inicial.y + inicial.height;
      const larguraMinima = Math.min(innerWidth <= 700 ? 240 : 280, limites.direita - limites.esquerda);
      const alturaMinima = Math.min(180, limites.base - limites.topo);
      let x = inicial.x;
      let y = inicial.y;
      let width = inicial.width;
      let height = inicial.height;
      if (direcao.includes("w")) { x = clamp(inicial.x + dx, limites.esquerda, direita - larguraMinima); width = direita - x; }
      if (direcao.includes("e")) width = clamp(inicial.width + dx, larguraMinima, limites.direita - inicial.x);
      if (direcao.includes("n")) { y = clamp(inicial.y + dy, limites.topo, base - alturaMinima); height = base - y; }
      if (direcao.includes("s")) height = clamp(inicial.height + dy, alturaMinima, limites.base - inicial.y);
      return aplicarRetanguloPainel(elemento, { x, y, width, height });
    };

    handle.addEventListener("pointerdown", evento => {
      if (evento.button !== 0) return;
      const inicial = ativar();
      const origem = { x: evento.clientX, y: evento.clientY };
      handle.setPointerCapture(evento.pointerId);
      document.body.classList.add("redimensionando-painel-flutuante");
      const mover = atual => redimensionar(inicial, atual.clientX - origem.x, atual.clientY - origem.y);
      const finalizar = atual => {
        handle.removeEventListener("pointermove", mover);
        handle.removeEventListener("pointerup", finalizar);
        handle.removeEventListener("pointercancel", finalizar);
        document.body.classList.remove("redimensionando-painel-flutuante");
        aplicarRetanguloPainel(elemento, elemento.getBoundingClientRect(), true);
        mapa.invalidateSize({ pan: false });
        if (handle.hasPointerCapture(atual.pointerId)) handle.releasePointerCapture(atual.pointerId);
      };
      handle.addEventListener("pointermove", mover);
      handle.addEventListener("pointerup", finalizar);
      handle.addEventListener("pointercancel", finalizar);
      evento.preventDefault();
      evento.stopPropagation();
    });

    handle.addEventListener("keydown", evento => {
      const movimentos = { ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12] };
      if (!movimentos[evento.key]) return;
      evento.preventDefault();
      const inicial = ativar();
      redimensionar(inicial, ...movimentos[evento.key]);
      aplicarRetanguloPainel(elemento, elemento.getBoundingClientRect(), true);
    });
    elemento.appendChild(handle);
  }

  try {
    const salvo = JSON.parse(localStorage.getItem(storageKey) || "null");
    if (salvo?.faixa === faixaViewportAtual()) aplicarRetanguloPainel(elemento, salvo);
  } catch (erro) {}
}

function atualizarViewportInterface() {
  const viewport = window.visualViewport;
  const altura = viewport?.height || innerHeight;
  const limiteInferior = (viewport?.offsetTop || 0) + altura;
  document.documentElement.style.setProperty("--visual-viewport-height", `${altura}px`);
  document.documentElement.style.setProperty("--visual-panel-height", `${Math.min(480, altura * .52)}px`);
  document.documentElement.style.setProperty("--visual-bottom-inset", `${Math.max(0, innerHeight - limiteInferior)}px`);
  for (const elemento of paineisFlutuantes.keys()) {
    if (elemento.classList.contains("floating-panel-free")) aplicarRetanguloPainel(elemento, elemento.getBoundingClientRect());
  }
  atualizarAncoragemBarraCriacao();
}

function atualizarAncoragemBarraCriacao() {
  if (!barraCriacaoRapida) return;
  const actionbar = painel.querySelector(".inspector-actionbar");
  const deveAcoplar = innerWidth <= 700 &&
    !document.body.classList.contains("painel-fechado") &&
    document.body.classList.contains("modo-edicao") &&
    actionbar;

  if (deveAcoplar) {
    if (barraCriacaoRapida.parentElement !== painelEdicao) painelEdicao.insertBefore(barraCriacaoRapida, actionbar);
    barraCriacaoRapida.classList.add("quick-create-docked");
    return;
  }

  const stage = document.querySelector(".map-stage");
  if (stage && barraCriacaoRapida.parentElement !== stage) stage.insertBefore(barraCriacaoRapida, centralizarMapa);
  barraCriacaoRapida.classList.remove("quick-create-docked");
  barraCriacaoRapida.style.removeProperty("--quick-create-left");
  barraCriacaoRapida.style.removeProperty("--quick-create-max-width");

  if (!stage || document.body.classList.contains("painel-fechado") || painel.hidden) return;
  const area = stage.getBoundingClientRect();
  const caixaPainel = painel.getBoundingClientRect();
  const segmentos = [
    { inicio: area.left + 8, fim: Math.min(area.right - 8, caixaPainel.left - 8) },
    { inicio: Math.max(area.left + 8, caixaPainel.right + 8), fim: area.right - 8 }
  ].filter(segmento => segmento.fim - segmento.inicio >= 120);
  const livre = segmentos.sort((a, b) => (b.fim - b.inicio) - (a.fim - a.inicio))[0];
  if (!livre) return;
  barraCriacaoRapida.style.setProperty("--quick-create-left", `${(livre.inicio + livre.fim) / 2 - area.left}px`);
  barraCriacaoRapida.style.setProperty("--quick-create-max-width", `${livre.fim - livre.inicio}px`);
}

prepararPainelFlutuante(painel, painel.querySelector(".inspector-titlebar"), "geometriaPainelInspector", "painel de ferramentas");
const painelConsulta = document.getElementById("painelConsulta");
prepararPainelFlutuante(painelConsulta, painelConsulta?.querySelector(".consulta-panel-heading"), "geometriaPainelConsulta", "painel de consulta");
atualizarViewportInterface();
window.addEventListener("resize", atualizarViewportInterface);
window.visualViewport?.addEventListener("resize", atualizarViewportInterface);

function centralizarMapaAtual() {
  if (!mapaAtual) {
    avisar("Abra um mapa antes de centralizar.");
    return;
  }

  mapa.stop();
  mapa.invalidateSize({ pan: false, animate: false });
  mapa.fitBounds(
    [[0, 0], [mapaAtual.altura, mapaAtual.largura]],
    { animate: false, padding: [16, 16] }
  );
  salvarCameraAtual();
  avisar("Mapa centralizado.");
}

centralizarMapa?.addEventListener("click", centralizarMapaAtual);

function atualizarTamanhoMapaAposPainel() {
  const atualizar = () => {
    mapa.invalidateSize({ pan: false, animate: false });
  };

  atualizar();
  requestAnimationFrame(() => requestAnimationFrame(atualizar));
}

function definirPainelAberto(aberto, redimensionar = true) {
  document.body.classList.toggle("painel-fechado", !aberto);
  painel.classList.toggle("aberto", aberto);
  painel.setAttribute("aria-hidden", String(!aberto));

  if (aberto) {
    definirPainelMinimizadoMobile(false);
  }

  atualizarAncoragemBarraCriacao();

  if (redimensionar) {
    atualizarTamanhoMapaAposPainel();
  }

}

const recolherPainelMobile = document.getElementById("recolherPainelMobile");

function definirPainelMinimizadoMobile(minimizado) {
  const ativo =
    Boolean(minimizado) &&
    window.matchMedia("(max-width: 700px)").matches;
  painel.classList.toggle("minimizado-mobile", ativo);
  if (ativo) {
    painel.style.setProperty("height", "52px", "important");
    painel.style.setProperty("max-height", "52px", "important");
  } else {
    painel.style.removeProperty("height");
    painel.style.removeProperty("max-height");
  }

  if (!recolherPainelMobile) return;

  recolherPainelMobile.setAttribute("aria-expanded", String(!ativo));
  recolherPainelMobile.setAttribute(
    "aria-label",
    ativo ? "Expandir painel" : "Recolher painel para usar o mapa"
  );
  recolherPainelMobile.title = ativo
    ? "Expandir painel"
    : "Recolher painel para usar o mapa";
}

recolherPainelMobile?.addEventListener("click", () => {
  definirPainelMinimizadoMobile(
    !painel.classList.contains("minimizado-mobile")
  );
  atualizarTamanhoMapaAposPainel();
});

fecharPainel.addEventListener("click", () => {
  if (editor.ativo) {
    cancelarEdicaoObjeto();
  }

  definirPainelAberto(false);
});

/* O Inspector nasce oculto e é aberto pelas ações contextuais. */
definirPainelAberto(false, false);

/* =========================================================
   MENU CONTEXTUAL DO MAPA
   ========================================================= */

const mapStageContextual = document.querySelector(".map-stage");
const mapaContainer = mapa.getContainer();
let timerFecharMenuRadial = null;

function fecharMenuRadial(restaurarFoco = false) {
  if (!menuRadialMapa || menuRadialMapa.hidden) return;

  clearTimeout(timerFecharMenuRadial);
  menuRadialMapa.classList.remove("aberto");

  timerFecharMenuRadial = setTimeout(() => {
    menuRadialMapa.hidden = true;
  }, 120);

  if (restaurarFoco) {
    mapaContainer.focus({ preventScroll: true });
  }
}

function abrirMenuRadial(clientX, clientY, focarPrimeiro = false) {
  if (!menuRadialMapa || !mapStageContextual || !mapaAtual) {
    if (!mapaAtual) {
      avisar("Crie ou importe um mapa para acessar as ferramentas.");
    }
    return;
  }

  definirMenuPrincipalAberto(false);
  atualizarComandosRadiais();

  /* Consultar o menu não altera o mapa. A transição para o Editor exige a ação explícita de entrar nesse modo. */

  const rect = mapStageContextual.getBoundingClientRect();
  const estiloRadial = getComputedStyle(menuRadialMapa);
  const larguraRadial = parseFloat(estiloRadial.width) || 280;
  const alturaRadial = parseFloat(estiloRadial.height) || 240;
  const margemX = larguraRadial / 2 + 8;
  const margemY = alturaRadial / 2 + 8;
  const minimoX = Math.min(margemX, rect.width / 2);
  const minimoY = Math.min(margemY, rect.height / 2);
  const maximoX = Math.max(minimoX, rect.width - margemX);
  const maximoY = Math.max(minimoY, rect.height - margemY);
  const x = clamp(clientX - rect.left, minimoX, maximoX);
  const y = clamp(clientY - rect.top, minimoY, maximoY);

  clearTimeout(timerFecharMenuRadial);
  menuRadialMapa.style.left = `${x}px`;
  menuRadialMapa.style.top = `${y}px`;
  menuRadialMapa.hidden = false;

  requestAnimationFrame(() => {
    menuRadialMapa.classList.add("aberto");

    if (focarPrimeiro) {
      menuRadialMapa.querySelector(".radial-action:not([hidden])")?.focus({ preventScroll: true });
    }
  });
}

function abrirAbaPeloMenuRadial(tab) {
  if (ui.modo !== "edicao") return;

  if (!editor.ativo) {
    ui.ferramenta = "selecionar";
    atualizarFerramentas();
  }

  definirAbaInspector(tab);
  definirPainelAberto(true);
}

mapaContainer.addEventListener("contextmenu", e => {
  e.preventDefault();
  e.stopPropagation();

  /*
    O menu de contexto nativo costuma aparecer antes dos 2 s em telas touch.
    Nesses casos, o gesto personalizado abaixo controla a abertura do radial.
  */
  if (
    e.pointerType === "touch" ||
    e.sourceCapabilities?.firesTouchEvents
  ) {
    return;
  }

  abrirMenuRadial(e.clientX, e.clientY);
});

const consultaPonteiroTouch =
  window.matchMedia("(pointer: coarse)");
let ultimoToqueMapa = null;
let pressaoTouchMapa = null;
let ultimaAberturaCriacao = 0;

function abrirCriacaoRapidaMapa() {
  if (ui.modo !== "edicao") return;
  const agora = performance.now();

  /* Um duplo toque pode gerar também o evento dblclick do Leaflet. */
  if (agora - ultimaAberturaCriacao < 450) {
    return;
  }

  ultimaAberturaCriacao = agora;
  fecharMenuRadial();
  definirBarraCriacaoRapidaAberta(false);
  limparCapturaCalibracao();

  if (
    editor.ativo &&
    editor.editandoId
  ) {
    definirPainelAberto(true);
    avisar("Salve ou cancele a edição do objeto antes de iniciar outro.");
    return;
  }

  setModo("edicao");

  /* Reabrir Criação retoma a sessão atual em vez de descartá-la. */
  if (
    editor.ativo &&
    !editor.editandoId
  ) {
    ui.ferramenta =
      categoriaPorId(editor.categoriaId)
        ?.comportamento === "portal"
        ? "portal"
        : "criar";

    atualizarFerramentas();
    mostrarEstadoPainel("objeto");
    definirBarraCriacaoRapidaAberta(true);
    definirPainelAberto(true);
    return;
  }

  cancelarEdicaoObjeto();
  ui.ferramenta = "criar";
  atualizarFerramentas();
  definirBarraCriacaoRapidaAberta(true);

  definirPainelAberto(false);
}

function alvoBloqueiaGestoMapa(alvo, incluirObjetos = false) {
  if (!(alvo instanceof Element)) {
    return false;
  }

  const seletorBase =
    ".leaflet-control, .leaflet-popup, .leaflet-tooltip, .map-radial-menu";
  const seletor = incluirObjetos
    ? `${seletorBase}, .leaflet-marker-icon, .leaflet-interactive`
    : seletorBase;

  return Boolean(alvo.closest(seletor));
}

function cancelarPressaoTouchMapa() {
  if (!pressaoTouchMapa) {
    return;
  }

  clearTimeout(pressaoTouchMapa.timer);
  mapaContainer.classList.remove("touch-hold-pending");
}

function limparPressaoTouchMapa() {
  cancelarPressaoTouchMapa();
  pressaoTouchMapa = null;
}

function atualizarInteracaoTouchMapa() {
  const touch =
    consultaPonteiroTouch.matches;

  /* O duplo clique no mapa abre as ferramentas de criação. */
  mapa.doubleClickZoom.disable();

  const dica =
    document.querySelector(
      ".radial-shortcut-hint"
    );
  if (dica) {
    dica.textContent = touch
      ? "Segure 2 s: ferramentas · 2 toques: criar"
      : "Botão direito: ferramentas · 2 cliques: criar";
  }
}

atualizarInteracaoTouchMapa();
consultaPonteiroTouch.addEventListener?.(
  "change",
  atualizarInteracaoTouchMapa
);

mapaContainer.addEventListener(
  "pointerdown",
  evento => {
    if (
      evento.pointerType !== "touch" ||
      !mapaAtual ||
      alvoBloqueiaGestoMapa(evento.target)
    ) {
      limparPressaoTouchMapa();
      return;
    }

    limparPressaoTouchMapa();

    const rect = mapaContainer.getBoundingClientRect();
    mapaContainer.style.setProperty(
      "--touch-hold-x",
      `${evento.clientX - rect.left}px`
    );
    mapaContainer.style.setProperty(
      "--touch-hold-y",
      `${evento.clientY - rect.top}px`
    );
    mapaContainer.classList.add("touch-hold-pending");

    const pressao = {
      pointerId: evento.pointerId,
      x: evento.clientX,
      y: evento.clientY,
      aberta: false,
      timer: null
    };

    pressao.timer = setTimeout(() => {
      if (pressaoTouchMapa !== pressao) {
        return;
      }

      pressao.aberta = true;
      ultimoToqueMapa = null;
      mapaContainer.classList.remove("touch-hold-pending");
      abrirMenuRadial(pressao.x, pressao.y);
    }, 2000);

    pressaoTouchMapa = pressao;
  },
  true
);

mapaContainer.addEventListener(
  "pointermove",
  evento => {
    if (
      !pressaoTouchMapa ||
      evento.pointerId !== pressaoTouchMapa.pointerId
    ) {
      return;
    }

    if (
      Math.hypot(
        evento.clientX - pressaoTouchMapa.x,
        evento.clientY - pressaoTouchMapa.y
      ) > 14
    ) {
      limparPressaoTouchMapa();
      ultimoToqueMapa = null;
    }
  },
  true
);

mapaContainer.addEventListener(
  "pointerup",
  evento => {
    const pressao =
      pressaoTouchMapa &&
      evento.pointerId === pressaoTouchMapa.pointerId
        ? pressaoTouchMapa
        : null;

    if (pressao?.aberta) {
      evento.preventDefault();
      evento.stopPropagation();
      limparPressaoTouchMapa();
      ultimoToqueMapa = null;
      return;
    }

    limparPressaoTouchMapa();

    if (
      evento.pointerType !== "touch" ||
      !mapaAtual ||
      alvoBloqueiaGestoMapa(evento.target, true)
    ) {
      ultimoToqueMapa = null;
      return;
    }

    const agora = performance.now();
    const toque = {
      instante: agora,
      x: evento.clientX,
      y: evento.clientY
    };
    const repetido =
      ultimoToqueMapa &&
      agora - ultimoToqueMapa.instante <= 380 &&
      Math.hypot(
        evento.clientX - ultimoToqueMapa.x,
        evento.clientY - ultimoToqueMapa.y
      ) <= 28;

    if (repetido) {
      evento.preventDefault();
      evento.stopPropagation();
      ultimoToqueMapa = null;
      abrirCriacaoRapidaMapa();
      return;
    }

    ultimoToqueMapa = toque;
  },
  true
);

mapaContainer.addEventListener(
  "pointercancel",
  () => {
    limparPressaoTouchMapa();
    ultimoToqueMapa = null;
  },
  true
);

mapa.on("dblclick", evento => {
  const original = evento.originalEvent;

  if (
    alvoBloqueiaGestoMapa(
      original?.target,
      true
    )
  ) {
    return;
  }

  original?.preventDefault();
  abrirCriacaoRapidaMapa();
});

menuRadialMapa?.addEventListener("contextmenu", e => e.preventDefault());

function atualizarComandosRadiais() {
  const visualizacao = ui.modo === "visualizacao";
  for (const botao of menuRadialMapa.querySelectorAll("[data-radial-action]")) {
    const acao = botao.dataset.radialAction;
    botao.hidden = ["legenda", "modoEdicao"].includes(acao) ? !visualizacao : visualizacao;
  }
}

async function executarAcaoMapa(acao) {
  fecharMenuRadial();
  definirMenuPrincipalAberto(false);
  if (acao === "modoEdicao") { if (ui.modo !== "edicao") setModo("edicao"); return; }
  if (acao === "modoVisualizacao") {
    if (ui.modo !== "visualizacao") {
      const tinhaRascunho = editor.ativo;
      if (tinhaRascunho) await preservarRascunhoAtual();
      setModo("visualizacao");
      if (tinhaRascunho) avisar("Trabalho preservado como rascunho. Retome pelo Editor.");
    }
    return;
  }
  if (acao === "legenda") {
    if (ui.modo === "visualizacao") definirPainelAberto(true);
    return;
  }
  if (ui.modo !== "edicao") return;
  definirBarraCriacaoRapidaAberta(false);
  if (acao !== "coordenadas") limparCapturaCalibracao();
  if (acao === "coordenadas") {
    setFerramenta("coordenada");
    definirAbaInspector("coordenadas");
    renderizarPainelCoordenadas();
    definirPainelAberto(true);
  } else if (acao === "criacao") abrirCriacaoRapidaMapa();
  else abrirAbaPeloMenuRadial(acao);
}

menuRadialMapa?.addEventListener("click", e => {
  const botao = e.target.closest("[data-radial-action]");
  if (botao && !botao.hidden) void window.AtlasShell.execute(botao.dataset.radialAction);
});

function iniciarCategoriaRapida(
  categoriaId
) {
  if (!categoriaId || !categoriaPorId(categoriaId)) {
    return;
  }

  fecharMenuGrupoCriacaoRapida();

  if (ui.modo !== "edicao") {
    setModo("edicao");
  }

  ui.categoriaSelecionadaId = categoriaId;
  ui.ferramenta = "criar";
  atualizarFerramentas();
  iniciarCriacaoObjeto(categoriaId);
  renderBarraCriacaoRapida();
  definirPainelAberto(true);
}

tiposCriacaoRapida?.addEventListener("click", e => {
  const grupo =
    e.target.closest(
      "[data-quick-group]"
    );

  if (grupo) {
    abrirMenuGrupoCriacaoRapida(
      grupo.dataset.quickGroup,
      grupo
    );

    return;
  }

  const botao =
    e.target.closest(
      "[data-quick-category]"
    );

  iniciarCategoriaRapida(
    botao?.dataset.quickCategory
  );
});

menuGrupoCriacaoRapida?.addEventListener("click", e => {
  const botao =
    e.target.closest(
      "[data-quick-category]"
    );

  iniciarCategoriaRapida(
    botao?.dataset.quickCategory
  );
});

selecaoRapida?.addEventListener("click", () => {
  setFerramenta("selecionar");
  definirBarraCriacaoRapidaAberta(false);

  definirPainelAberto(false);
});

novoTipoRapido?.addEventListener("click", () => {
  fecharMenuGrupoCriacaoRapida();

  if (editor.ativo) {
    cancelarEdicaoObjeto();
  }

  if (!modalCategoria.hidden) {
    fecharModalCategoria();
  }

  abrirModalCategoria(null, "atalho");
});

gerenciarTiposRapido?.addEventListener("click", () => {
  fecharMenuGrupoCriacaoRapida();

  if (editor.ativo) {
    cancelarEdicaoObjeto();
  }

  if (!modalCategoria.hidden) {
    fecharModalCategoria();
  }

  cadastroTipoPeloAtalho = false;
  modalCategoria.hidden = true;

  const creationHome =
    inspectorPanels
      ?.criacao
      ?.querySelector(".type-creation-home");

  if (creationHome) {
    creationHome.hidden = false;
  }

  definirAbaInspector("criacao");
  renderizarCriacaoTipos();
  definirPainelAberto(true);
});

fecharCriacaoRapida?.addEventListener("click", () => {
  definirBarraCriacaoRapidaAberta(false);
});

fecharMenuRadialBotao?.addEventListener(
  "click",
  () => {
    fecharMenuRadialBotao.classList.add(
      "selecionado"
    );

    setTimeout(
      () => {
        fecharMenuRadial(true);

        setTimeout(
          () =>
            fecharMenuRadialBotao.classList.remove(
              "selecionado"
            ),
          130
        );
      },
      90
    );
  }
);

document.addEventListener("pointerdown", e => {
  if (!menuRadialMapa?.hidden && !menuRadialMapa.contains(e.target)) {
    fecharMenuRadial();
  }

  if (
    !menuGrupoCriacaoRapida?.hidden &&
    !menuGrupoCriacaoRapida.contains(
      e.target
    ) &&
    !e.target.closest(
      "[data-quick-group]"
    )
  ) {
    fecharMenuGrupoCriacaoRapida();
  }
});

document.addEventListener("keydown", e => {
  if (
    e.key === "Escape" &&
    !menuGrupoCriacaoRapida?.hidden
  ) {
    e.preventDefault();
    e.stopImmediatePropagation();
    fecharMenuGrupoCriacaoRapida();
    return;
  }

  if (e.key === "Escape" && !menuRadialMapa?.hidden) {
    e.preventDefault();
    e.stopImmediatePropagation();
    fecharMenuRadial(true);
    return;
  }

  if (e.target instanceof HTMLElement && (e.target.matches("input, textarea, select") || e.target.isContentEditable || e.target.closest("dialog[open]"))) return;

  if ((e.key === "ContextMenu" || (e.shiftKey && e.key === "F10")) && mapaAtual) {
    e.preventDefault();
    const rect = mapStageContextual.getBoundingClientRect();
    abrirMenuRadial(rect.left + rect.width / 2, rect.top + rect.height / 2, true);
  }
}, true);

window.addEventListener("resize", () => {
  fecharMenuRadial();
  fecharMenuGrupoCriacaoRapida();

  if (!window.matchMedia("(max-width: 700px)").matches) {
    definirPainelMinimizadoMobile(false);
  }

});

painel.addEventListener(
  "click",
  e =>
    e.stopPropagation()
);

/* =========================================================
   AÇÕES CONTEXTUAIS DE EDIÇÃO
   ========================================================= */

salvarRail.addEventListener(
  "click",
  () => {
    if (
      !modalCategoria.hidden
    ) {
      formCategoria.requestSubmit();

      return;
    }

    if (
      editor.ativo
    ) {
      formObjeto.requestSubmit();

      return;
    }

    avisar(
      "Não há alterações para salvar."
    );
  }
);

apagarRail.addEventListener(
  "click",
  async () => {
    if (
      !modalCategoria.hidden &&
      ui.inspectorTab ===
        "criacao" &&
      ui.categoriaEditandoId
    ) {
      await excluirCategoriaAtual();

      return;
    }

    if (
      editor.ativo &&
      editor.verticeSelecionado !==
        null
    ) {
      removerVerticeSelecionadoAtual();
      atualizarAcoesRail();

      return;
    }
  }
);

cancelarRail.addEventListener(
  "click",
  () => {
    if (
      !modalCategoria.hidden
    ) {
      fecharModalCategoria();
      return;
    }

    if (editor.ativo) {
      cancelarEdicaoObjeto();
    }
  }
);

criarPrimeiraCategoria.addEventListener(
  "click",
  () => {
    abrirModalCategoria();
  }
);

criarMapaDestinoPortal.addEventListener(
  "click",
  () => {
    arquivoNovoMapaPortal.click();
  }
);

arquivoNovoMapaPortal.addEventListener(
  "change",
  async () => {
    const file =
      arquivoNovoMapaPortal.files[0];

    arquivoNovoMapaPortal.value =
      "";

    if (!file) {
      return;
    }

    const nome =
      await solicitarTextoSistema(
        "Novo mapa de destino",
        "Defina o nome do mapa que receberá o Portal.",
        file.name.replace(
          /\.[^.]+$/,
          ""
        ),
        {
          rotuloCampo: "Nome do mapa",
          rotuloConfirmar: "Criar mapa"
        }
      );

    if (!nome) {
      return;
    }

    try {
      await criarMapaDestinoSemTrocar(
        nome.trim(),
        file
      );
    } catch (erro) {
      avisar(
        erro.message
      );
    }
  }
);

portalMapaDestino.addEventListener(
  "change",
  () => {
    atualizarAreasDestinoPortal(
      portalMapaDestino.value
    );
  }
);

fecharCategoria.addEventListener(
  "click",
  fecharModalCategoria
);

modalCategoria.addEventListener(
  "click",
  e => {
    if (
      e.target ===
      modalCategoria
    ) {
      fecharModalCategoria();
    }
  }
);

criarRamificacao.addEventListener(
  "click",
  iniciarRamificacao
);

finalizarRamificacao.addEventListener(
  "click",
  concluirRamificacaoEditor
);

geometriaCategoria.addEventListener(
  "change",
  () => {
    atualizarCamposGeometria();
    aplicarPreviewTipo();
  }
);

document.getElementById("representacaoConexao").addEventListener("change", () => {
  atualizarCamposGeometria();
  aplicarPreviewTipo();
});

comportamentoCategoria.addEventListener(
  "change",
  atualizarCamposGeometria
);

comportamentoLinhaCategoria.addEventListener(
  "change",
  atualizarCamposGeometria
);

larguraLinha.addEventListener(
  "input",
  aplicarPreviewTipo
);

estiloLinha.addEventListener(
  "change",
  aplicarPreviewTipo
);

extremidadeLinha.addEventListener(
  "change",
  aplicarPreviewTipo
);

opacidadeLinha.addEventListener(
  "input",
  () => {
    valorOpacidade.textContent =
      opacidadeLinha.value +
      "%";

    aplicarPreviewTipo();
  }
);

areaOpacidade.addEventListener(
  "input",
  () => {
    valorOpacidadeArea.textContent =
      areaOpacidade.value +
      "%";

    aplicarPreviewTipo();
  }
);

tamanhoFonte.addEventListener(
  "input",
  aplicarPreviewTipo
);

corHex.addEventListener(
  "input",
  () => {
    const valor =
      corHex.value.trim();

    if (
      /^#[0-9a-fA-F]{6}$/.test(
        valor
      )
    ) {
      ui.corCategoria =
        valor.toUpperCase();

      atualizarSelecaoCor();
      atualizarSelecaoIcone();
      aplicarPreviewTipo();
    }
  }
);

formCategoria.addEventListener(
  "submit",
  async e => {
    e.preventDefault();

    try {
      await salvarCategoriaForm();
    } catch (erro) {
      avisar(
        erro.message
      );
    }
  }
);

editarObjeto.addEventListener(
  "click",
  editarObjetoSelecionado
);

editarCategoriaObjeto?.addEventListener(
  "click",
  () => {
    const obj =
      objetoPorId(
        ui.objetoSelecionadoId
      );

    const cat =
      categoriaPorId(
        obj?.categoriaId
      );

    if (!obj || !cat) {
      avisar("Não foi possível localizar o Tipo deste objeto.");
      return;
    }

    abrirModalCategoria(
      cat,
      "objeto"
    );
  }
);

removerObjeto.addEventListener(
  "click",
  removerObjetoSelecionado
);

removerVertice.addEventListener(
  "click",
  removerVerticeSelecionadoAtual
);

function estadoGeometriaParaRefazer() {
  return {
    pontos: clone(editor.pontos || []),
    label: clone(editor.label),
    aguardandoLabel: !!editor.aguardandoLabel
  };
}

function restaurarEstadoGeometria(estado) {
  if (!estado) return false;

  editor.pontos = clone(estado.pontos || []);
  editor.label = clone(estado.label);
  editor.aguardandoLabel = !!estado.aguardandoLabel;
  editor.verticeSelecionado = null;
  editor.ramoSelecionado = null;

  atualizarSelecaoVerticeUI();
  atualizarPreview();
  atualizarAcoesRail();
  atualizarCursorCriacao();

  return true;
}

function desfazerUltimoPontoGeometria() {
  const cat =
    categoriaPorId(
      editor.categoriaId
    );

  if (
    !editor.ativo ||
    !cat ||
    !editor.pontos?.length ||
    (
      geometriaEfetiva(cat) === "linha" &&
      cat.comportamentoLinha === "relacao"
    )
  ) {
    return false;
  }

  editor.historicoRefazer =
    Array.isArray(editor.historicoRefazer)
      ? editor.historicoRefazer
      : [];

  editor.historicoRefazer.push(
    estadoGeometriaParaRefazer()
  );

  if (
    geometriaEfetiva(cat) ===
      "area" &&
    editor.label
  ) {
    editor.label =
      null;

    if (
      editor.labelHandle &&
      mapa.hasLayer(
        editor.labelHandle
      )
    ) {
      mapa.removeLayer(
        editor.labelHandle
      );
    }

    editor.labelHandle =
      null;

    editor.aguardandoLabel =
      true;

    status.textContent =
      "Clique no mapa para reposicionar o nome.";

    atualizarAcoesRail();
    return true;
  }

  editor.pontos.pop();

  editor.verticeSelecionado =
    null;

  atualizarSelecaoVerticeUI();
  atualizarPreview();
  atualizarAcoesRail();
  atualizarCursorCriacao();

  return true;
}

function refazerUltimoPontoGeometria() {
  if (
    !editor.ativo ||
    !Array.isArray(editor.historicoRefazer) ||
    !editor.historicoRefazer.length
  ) {
    return false;
  }

  const estado = editor.historicoRefazer.pop();
  const restaurado = restaurarEstadoGeometria(estado);

  if (restaurado) {
    status.textContent = "Último ponto restaurado.";
  }

  return restaurado;
}

function geometriaLocalPodeUsarHistorico() {
  const categoria =
    categoriaPorId(
      editor.categoriaId
    );

  return !(
    geometriaEfetiva(categoria) === "linha" &&
    categoria?.comportamentoLinha ===
      "relacao"
  );
}

function desfazerGeometriaSeAplicavel() {
  return (
    geometriaLocalPodeUsarHistorico() &&
    desfazerUltimoPontoGeometria()
  );
}

function refazerGeometriaSeAplicavel() {
  return (
    geometriaLocalPodeUsarHistorico() &&
    refazerUltimoPontoGeometria()
  );
}

nomeObjeto.addEventListener(
  "input",
  () => {
    const cat =
      categoriaPorId(
        editor.categoriaId
      );

    if (
      geometriaEfetiva(cat) ===
        "area"
    ) {
      atualizarPreviewRotulo();
    }
  }
);

formObjeto.addEventListener(
  "submit",
  async e => {
    e.preventDefault();

    try {
      await salvarObjetoAtual();
    } catch (erro) {
      avisar(
        erro.message
      );
    }
  }
);

importarPlanilha.addEventListener(
  "click",
  () => {
    importador.modo =
      "novo";
    importador.fonteId =
      null;
    void carregarSheetJS().catch(() => {});
    arquivoPlanilha.click();
  }
);

arquivoPlanilha.addEventListener(
  "change",
  async () => {
    const file =
      arquivoPlanilha.files[0];

    arquivoPlanilha.value =
      "";

    if (!file) {
      return;
    }

    let bibliotecaPlanilhas;
    try {
      bibliotecaPlanilhas =
        await carregarSheetJS();
    } catch (erro) {
      avisar(
        "A biblioteca local de planilhas não pôde ser carregada: " +
        erro.message
      );
      return;
    }

    const reader =
      new FileReader();

    reader.onload =
      () => {
        try {
          importador.workbook =
            bibliotecaPlanilhas.read(
              reader.result,
              {
                type: "array"
              }
            );

          importador.arquivoNome =
            file.name;

          abrirModalFonteNovo();
        } catch (erro) {
          avisar(
            "Não foi possível ler a planilha: " +
            erro.message
          );
        }
      };

    reader.readAsArrayBuffer(
      file
    );
  }
);

abaFonteDados.addEventListener(
  "change",
  () => {
    const antiga =
      importador.modo ===
      "atualizar"
        ? fontePorId(
            importador.fonteId
          )
        : null;

    atualizarAbaImportacao(
      antiga
    );
  }
);

fecharFonteDados.addEventListener(
  "click",
  fecharModalFonteDados
);

cancelarFonteDados.addEventListener(
  "click",
  fecharModalFonteDados
);

modalFonteDados.addEventListener(
  "click",
  e => {
    if (
      e.target ===
      modalFonteDados
    ) {
      fecharModalFonteDados();
    }
  }
);

formFonteDados.addEventListener(
  "submit",
  async e => {
    e.preventDefault();

    try {
      await salvarFonteDadosForm();
    } catch (erro) {
      avisar(
        erro.message
      );
    }
  }
);

fonteObjeto.addEventListener(
  "change",
  () => {
    atualizarRegistrosObjeto();
    editor.entityFieldColumns =
      null;
    renderCamposReferenciaObjeto();
  }
);

registroObjeto.addEventListener(
  "change",
  () => {
    if (
      !editor.editandoId &&
      registroObjeto.value
    ) {
      const titulo =
        tituloRegistro({
          sourceId:
            fonteObjeto.value,
          recordId:
            registroObjeto.value
        });

      if (titulo) {
        nomeObjeto.value =
          titulo;
      }
    }
  }
);

fonteRelacao.addEventListener(
  "change",
  () => {
    atualizarRegistrosRelacao();
    renderCamposRelacaoObjeto();
  }
);

adicionarRelacao.addEventListener(
  "click",
  adicionarRelacaoAtual
);

/* =========================================================
   PESQUISA GLOBAL DE OBJETOS — CTRL + F
   ========================================================= */

let indiceBuscaObjetos = [];
let resultadosAtuaisBuscaObjetos = [];
let indiceAtivoBuscaObjetos = -1;
let focoAntesDaBuscaObjetos = null;
let geracaoCarregamentoBuscaObjetos = 0;

function textoDadosObjetoParaBusca(mapaOrigem, obj) {
  const referencias = [
    obj.entityRef,
    ...(Array.isArray(obj.relacoes) ? obj.relacoes : [])
      .map(relacao => relacao?.entityRef)
  ].filter(Boolean);

  const valores = [];

  for (const ref of referencias) {
    const fonte = (mapaOrigem.fontesDados || []).find(
      item => item.id === ref.sourceId
    );
    const registro = fonte?.records?.find(
      item => String(item.id) === String(ref.recordId)
    );

    if (fonte?.nome) valores.push(fonte.nome);
    if (registro?.values) valores.push(...Object.values(registro.values));
  }

  return valores.join(" ");
}

async function montarIndiceBuscaObjetos() {
  const mapasDoProjeto = await dbTodos();
  const itens = [];

  for (const mapaOrigem of mapasDoProjeto) {
    for (const obj of mapaOrigem.objetos || []) {
      const cat = (mapaOrigem.categorias || []).find(
        item => item.id === obj.categoriaId
      );
      const titulo = tituloObjetoEmMapa(mapaOrigem, obj) || "Sem nome";
      const tipo = cat?.nome || "Tipo não encontrado";
      const mapaNome = mapaOrigem.nome || "Mapa sem nome";
      const texto = [
        titulo,
        obj.nome,
        obj.descricao,
        tipo,
        mapaNome,
        textoDadosObjetoParaBusca(mapaOrigem, obj)
      ].join(" ");

      itens.push({
        mapaId: mapaOrigem.id,
        mapaNome,
        objetoId: obj.id,
        titulo,
        tipo,
        icone: cat?.icone || "pin",
        cor: /^#[0-9a-f]{6}$/i.test(cat?.cor || "")
          ? cat.cor
          : "#8CA2AD",
        tituloNormalizado: normalizarBusca(titulo).trim(),
        tipoNormalizado: normalizarBusca(tipo).trim(),
        mapaNormalizado: normalizarBusca(mapaNome).trim(),
        textoNormalizado: normalizarBusca(texto).trim()
      });
    }
  }

  return itens.sort((a, b) =>
    a.titulo.localeCompare(b.titulo, "pt-BR") ||
    a.mapaNome.localeCompare(b.mapaNome, "pt-BR")
  );
}

function pontuacaoResultadoBuscaObjetos(item, termo) {
  if (!termo) return 0;
  if (item.tituloNormalizado === termo) return 0;
  if (item.tituloNormalizado.startsWith(termo)) return 1;
  if (item.tituloNormalizado.includes(termo)) return 2;
  if (item.tipoNormalizado.startsWith(termo)) return 3;
  if (item.mapaNormalizado.startsWith(termo)) return 4;
  return 5;
}

function definirResultadoAtivoBuscaObjetos(indice, focar = false) {
  const botoes = [
    ...resultadosBuscaObjetos.querySelectorAll(".object-search-result")
  ];

  if (!botoes.length) {
    indiceAtivoBuscaObjetos = -1;
    buscaObjetosInput.removeAttribute("aria-activedescendant");
    return;
  }

  indiceAtivoBuscaObjetos =
    (indice + botoes.length) % botoes.length;

  botoes.forEach((botao, posicao) => {
    const ativo = posicao === indiceAtivoBuscaObjetos;
    botao.classList.toggle("ativo", ativo);
    botao.setAttribute("aria-selected", String(ativo));
  });

  const atual = botoes[indiceAtivoBuscaObjetos];
  buscaObjetosInput.setAttribute("aria-activedescendant", atual.id);
  atual.scrollIntoView({ block: "nearest" });
  if (focar) atual.focus();
}

function renderResultadosBuscaObjetos() {
  const termo = normalizarBusca(buscaObjetosInput.value).trim();
  const limite = 40;

  resultadosAtuaisBuscaObjetos = indiceBuscaObjetos
    .filter(item => !termo || item.textoNormalizado.includes(termo))
    .sort((a, b) =>
      pontuacaoResultadoBuscaObjetos(a, termo) -
        pontuacaoResultadoBuscaObjetos(b, termo) ||
      a.titulo.localeCompare(b.titulo, "pt-BR")
    )
    .slice(0, limite);

  resultadosBuscaObjetos.innerHTML = "";

  resultadosAtuaisBuscaObjetos.forEach((item, indice) => {
    const botao = document.createElement("button");
    botao.type = "button";
    botao.id = `resultado-busca-objeto-${indice}`;
    botao.className = "object-search-result";
    botao.dataset.indice = String(indice);
    botao.setAttribute("role", "option");
    botao.setAttribute("aria-selected", "false");
    botao.innerHTML =
      '<span class="object-search-result-icon" style="color:' +
        esc(item.cor) +
      '">' +
        iconeSvg(item.icone) +
      "</span>" +
      '<span class="object-search-result-main">' +
        '<strong class="object-search-result-title">' +
          esc(item.titulo) +
        "</strong>" +
        '<small class="object-search-result-meta">' +
          esc(item.tipo) +
        "</small>" +
      "</span>" +
      '<span class="object-search-result-map" title="' +
        esc(item.mapaNome) +
      '">' +
        esc(item.mapaNome) +
      "</span>";

    resultadosBuscaObjetos.appendChild(botao);
  });

  const encontrou = resultadosAtuaisBuscaObjetos.length > 0;
  estadoBuscaObjetos.hidden = encontrou;
  estadoBuscaObjetos.textContent = indiceBuscaObjetos.length
    ? "Nenhum objeto corresponde à pesquisa."
    : "Nenhum objeto foi criado no projeto ainda.";

  definirResultadoAtivoBuscaObjetos(encontrou ? 0 : -1);
}

function fecharPesquisaObjetos(restaurarFoco = true) {
  if (buscaObjetosOverlay.hidden) return;

  buscaObjetosOverlay.hidden = true;
  buscaObjetosInput.setAttribute("aria-expanded", "false");
  geracaoCarregamentoBuscaObjetos++;

  if (
    restaurarFoco &&
    focoAntesDaBuscaObjetos instanceof HTMLElement &&
    focoAntesDaBuscaObjetos.isConnected
  ) {
    focoAntesDaBuscaObjetos.focus();
  }
}

async function abrirPesquisaObjetos() {
  if (!buscaObjetosOverlay.hidden) {
    buscaObjetosInput.focus();
    buscaObjetosInput.select();
    return;
  }

  definirMenuPrincipalAberto(false);
  window.AtlasShell.closeMapSearch?.();
  focoAntesDaBuscaObjetos = document.activeElement;
  buscaObjetosOverlay.hidden = false;
  buscaObjetosInput.setAttribute("aria-expanded", "true");
  buscaObjetosInput.value = "";
  resultadosBuscaObjetos.innerHTML = "";
  estadoBuscaObjetos.hidden = false;
  estadoBuscaObjetos.textContent = "Carregando objetos...";

  requestAnimationFrame(() => buscaObjetosInput.focus());

  const geracao = ++geracaoCarregamentoBuscaObjetos;

  try {
    const novoIndice = await montarIndiceBuscaObjetos();
    if (geracao !== geracaoCarregamentoBuscaObjetos) return;

    indiceBuscaObjetos = novoIndice;
    renderResultadosBuscaObjetos();
  } catch (erro) {
    if (geracao !== geracaoCarregamentoBuscaObjetos) return;

    indiceBuscaObjetos = [];
    resultadosAtuaisBuscaObjetos = [];
    resultadosBuscaObjetos.innerHTML = "";
    estadoBuscaObjetos.hidden = false;
    estadoBuscaObjetos.textContent = "Não foi possível carregar os objetos.";
  }
}

async function abrirResultadoBuscaObjetos(indice) {
  const item = resultadosAtuaisBuscaObjetos[indice];
  if (!item) return;

  if (editor.ativo || !modalCategoria.hidden || !modalFonteDados.hidden) {
    fecharPesquisaObjetos(false);
    avisar("Salve ou cancele a edição atual antes de localizar outro objeto.");
    return;
  }

  fecharPesquisaObjetos(false);

  if (mapaAtual?.id !== item.mapaId) {
    await abrirMapa(item.mapaId);
  }

  if (!mapaAtual || mapaAtual.id !== item.mapaId || !objetoPorId(item.objetoId)) {
    avisar("O objeto pesquisado não está mais disponível.");
    return;
  }

  definirPainelAberto(false);
  focarObjetoNoMapa(item.objetoId);
  avisar(`${item.titulo} · ${item.mapaNome}`);
}

fecharBuscaObjetos?.addEventListener("click", () => fecharPesquisaObjetos());

buscaObjetosOverlay?.addEventListener("pointerdown", evento => {
  if (evento.target === buscaObjetosOverlay) fecharPesquisaObjetos();
});

buscaObjetosInput?.addEventListener("input", renderResultadosBuscaObjetos);

buscaObjetosInput?.addEventListener("keydown", evento => {
  if (evento.key === "ArrowDown" || evento.key === "ArrowUp") {
    evento.preventDefault();
    definirResultadoAtivoBuscaObjetos(
      indiceAtivoBuscaObjetos + (evento.key === "ArrowDown" ? 1 : -1)
    );
    return;
  }

  if (evento.key === "Enter") {
    evento.preventDefault();
    abrirResultadoBuscaObjetos(
      indiceAtivoBuscaObjetos >= 0 ? indiceAtivoBuscaObjetos : 0
    );
  }
});

resultadosBuscaObjetos?.addEventListener("pointermove", evento => {
  const opcao = evento.target.closest(".object-search-result");
  if (!opcao) return;
  definirResultadoAtivoBuscaObjetos(Number(opcao.dataset.indice));
});

resultadosBuscaObjetos?.addEventListener("click", evento => {
  const opcao = evento.target.closest(".object-search-result");
  if (!opcao) return;
  abrirResultadoBuscaObjetos(Number(opcao.dataset.indice));
});

function acionarFerramentaPorAtalho(acao) {
  if (!mapaAtual) {
    if (acao === "criacao" && projetoAtual) {
      abrirSeletorNovoMapa();
      return;
    }

    avisar("Crie ou importe um mapa para acessar as ferramentas.");
    return;
  }

  void window.AtlasShell.execute(acao === "edicao" ? "modoEdicao" : acao);

}

function abrirSeletorNovoMapa() {
  if (
    !projetoAtual ||
    document.body.classList.contains("projects-visible") ||
    document.querySelector(".system-dialog[open]")
  ) {
    return false;
  }

  arquivoNovoMapa.click();
  return true;
}

/* Um novo gesto encerra o agrupamento da ação anterior. Salvamentos
   encadeados sem outro gesto (como os dois lados de um Portal) continuam
   formando uma única entrada no histórico. */
document.addEventListener(
  "pointerdown",
  () => {
    finalizarHistoricoGlobalPendente();
  },
  true
);

document.addEventListener(
  "keydown",
  async evento => {
    if (evento.defaultPrevented || evento.repeat || document.querySelector("dialog[open]") || !modalCategoria.hidden || !modalFonteDados.hidden) return;
    const campoTexto = evento.target instanceof HTMLElement && (evento.target.matches("input, textarea, select") || evento.target.isContentEditable);
    const tecla = evento.key.toLocaleLowerCase("pt-BR");
    const modificadorComando =
      (evento.ctrlKey || evento.metaKey) &&
      !evento.altKey &&
      !evento.shiftKey;
    const comandoDesfazer =
      modificadorComando &&
      tecla === "z";
    const comandoRefazer =
      (evento.ctrlKey || evento.metaKey) &&
      !evento.altKey &&
      (
        tecla === "y" ||
        (
          tecla === "z" &&
          evento.shiftKey
        )
      );
    const atalhoPesquisa =
      modificadorComando &&
      tecla === "f";
    const atalhoPrimeiroMapa =
      modificadorComando &&
      tecla === "a" &&
      !mapaAtual &&
      Boolean(projetoAtual) &&
      !document.body.classList.contains("projects-visible") &&
      !document.querySelector(".system-dialog[open]");

    /* No projeto vazio, Ctrl + A precisa funcionar mesmo quando a busca
       de mapas ainda está focada. Em formulários e diálogos, o atalho
       continua reservado para selecionar o texto. */
    if (atalhoPrimeiroMapa && !campoTexto) {
      evento.preventDefault();
      evento.stopImmediatePropagation();
      abrirSeletorNovoMapa();
      return;
    }

    if (atalhoPesquisa && !campoTexto) {
      evento.preventDefault();
      evento.stopImmediatePropagation();

      if (
        document.body.classList.contains(
          "projects-visible"
        )
      ) {
        focarBuscaProjetos();
        return;
      }

      abrirPesquisaObjetos();
      return;
    }

    const alvo = evento.target;
    const digitando =
      alvo instanceof HTMLElement &&
      (
        alvo.matches("input, textarea, select") ||
        alvo.isContentEditable
      );

    if (
      ui.modo === "edicao" &&
      (comandoDesfazer || comandoRefazer) &&
      !digitando &&
      !document.querySelector(".system-dialog[open]")
    ) {
      evento.preventDefault();
      evento.stopImmediatePropagation();

      if (comandoDesfazer) {
        if (!desfazerGeometriaSeAplicavel()) {
          await desfazerHistoricoGlobal();
        }
      } else if (!refazerGeometriaSeAplicavel()) {
        await refazerHistoricoGlobal();
      }

      return;
    }

    if (modificadorComando && (buscaObjetosOverlay.hidden || tecla === "f")) {

      /* Ctrl + S salva inclusive durante o preenchimento do formulário.
         Os demais atalhos preservam a edição normal de texto. */
      if (tecla === "s" || !digitando) {
        const acoes = {
          a: "criacao",
          d: "dados",
          q: "camadas",
          e: "edicao",
          l: "legenda"
        };

        if (tecla === "s") {
          evento.preventDefault();
          evento.stopImmediatePropagation();
          try {
            await window.AtlasShell.execute("salvarProjeto");
          } catch (erro) {
            avisar(
              erro.message ||
              "Não foi possível salvar o projeto."
            );
          }
          return;
        }

        if (acoes[tecla]) {
          evento.preventDefault();
          evento.stopImmediatePropagation();
          acionarFerramentaPorAtalho(acoes[tecla]);
          return;
        }
      }
    }

    if (evento.key === "Escape" && !buscaObjetosOverlay.hidden) {
      evento.preventDefault();
      evento.stopImmediatePropagation();
      fecharPesquisaObjetos();
    }
  },
  true
);

estadoMapaVazio?.addEventListener(
  "click",
  abrirSeletorNovoMapa
);

arquivoNovoMapa.addEventListener(
  "change",
  async () => {
    const file =
      arquivoNovoMapa.files[0];

    arquivoNovoMapa.value =
      "";

    if (!file) {
      return;
    }

    const nome =
      await solicitarTextoSistema(
        "Criar mapa",
        "Escolha um nome para o mapa importado.",
        file.name.replace(
          /\.[^.]+$/,
          ""
        ),
        {
          rotuloCampo: "Nome do mapa",
          rotuloConfirmar: "Criar mapa"
        }
      );

    if (!nome) {
      return;
    }

    try {
      await criarNovoMapa(
        nome.trim(),
        file
      );
    } catch (erro) {
      avisar(
        erro.message
      );
    }
  }
);

async function renomearMapaAtual() {
    if (!mapaAtual) {
      return;
    }

    const nome =
      await solicitarTextoSistema(
        "Renomear mapa",
        "Informe o novo nome do mapa.",
        mapaAtual.nome,
        {
          rotuloCampo: "Novo nome",
          rotuloConfirmar: "Renomear"
        }
      );

    if (!nome) {
      return;
    }

    mapaAtual.nome =
      nome.trim();

    await dbSalvar(
      mapaAtual
    );

    await atualizarSeletorMapas();

    avisar(
      "Mapa renomeado."
    );
}

async function excluirMapaAtual() {
    if (!mapaAtual) {
      return;
    }

    if (
      !await confirmarSistema(
        "Excluir mapa",
        'Excluir o mapa "' +
        mapaAtual.nome +
        '" e todo o conteúdo dele?',
        {
          rotuloConfirmar: "Excluir mapa",
          perigo: true
        }
      )
    ) {
      return;
    }

    await dbExcluir(
      mapaAtual.id
    );

    const mapas =
      await dbListarResumosMapas();

    mapaAtual =
      null;

    if (
      mapas.length
    ) {
      await abrirMapa(
        mapas[0].id
      );
    } else {
      mostrarTelaSemMapa();
      await atualizarSeletorMapas();
    }

    avisar(
      "Mapa excluído."
    );
}

arquivoImportar.addEventListener(
  "change",
  async () => {
    const file =
      arquivoImportar.files[0];

    arquivoImportar.value =
      "";

    if (file) {
      await importarBackupArquivo(
        file
      );
    }
  }
);

/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

async function iniciar() {
  montarBibliotecaIcones();
  montarPaletaCores();
  montarLayoutInspector();

  db =
    await abrirBanco();

  await obterBibliotecaProjetos();
  await garantirEstruturaProjetos();
  await recuperarEmergencias();
  await restaurarTelaInicial();

  atualizarCategoriasUI();
  atualizarFontesDadosUI();
  atualizarLegenda();
  atualizarSelecaoVerticeUI();
  atualizarAcoesRail();
  sincronizarShell();
  window.AtlasShell.update({ ready: true });
  document.body.dataset.atlasReady = "true";
}


iniciar()
  .catch(
    erro => {
      window.AtlasShell.update({ error: erro.message });
      console.error(
        erro
      );

      avisar(
        "Erro ao iniciar: " +
        erro.message
      );
    }
  );
