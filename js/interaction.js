/* Ações da interface, seleção de objetos, foco e atalhos de teclado. */
function atualizarDestaquesInteracao() {
  for (const [id, registro] of layersObjetos) {
    for (const layer of registro.layers) {
      const el = layer.getElement?.();
      if (!el) continue;
      const ativo = ui.modo === "edicao" && id === ui.objetoSelecionadoId && !editor.ativo;
      el.classList.toggle("atlas-object-selected", ativo);
      el.setAttribute("aria-pressed", String(ativo));
    }
  }
}

function prepararAcessibilidadeObjeto(layer, obj) {
  const configurar = () => {
    const el = layer.getElement?.();
    if (!el || el.dataset.objetoAcessivel) return;
    el.dataset.objetoAcessivel = obj.id;
    el.setAttribute("tabindex", "0");
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", tituloObjeto(obj) + " · " + (categoriaPorId(obj.categoriaId)?.nome || "Objeto"));
    el.addEventListener("keydown", e => {
      if (e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      layer.fire("click", { originalEvent: e });
    }, true);
  };
  layer.on("add", configurar);
  configurar();
}

function prepararTecladoHandle(marker, indice, ancorado, pontual) {
  marker.on("add", () => {
    const el = marker.getElement();
    el.tabIndex = 0;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", (pontual ? categoriaPorId(editor.categoriaId)?.nome : "Ponto " + (indice + 1)) +
      (ancorado ? " · ligado ao destino" : " · Use as setas para mover; Shift move 10 pixels"));
    el.addEventListener("keydown", e => {
      if (e.target !== el) return;
      const deslocamentos = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const d = deslocamentos[e.key];
      if (!d) return;
      e.preventDefault();
      e.stopPropagation();
      if (ancorado) return;
      invalidarHistoricoRefazerGeometria();
      const passo = e.shiftKey ? 10 : 1;
      editor.pontos[indice].x = clamp(editor.pontos[indice].x + d[0] * passo, 0, mapaAtual.largura);
      editor.pontos[indice].y = clamp(editor.pontos[indice].y + d[1] * passo, 0, mapaAtual.altura);
      editor.verticeSelecionado = indice;
      atualizarPreview();
      atualizarAcoesRail();
      editor.handles[indice]?.getElement()?.focus({ preventScroll: true });
    });
  });
}

function navegarBotoesInteracao(e, seletor) {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(e.key)) return;
  const botoes = [...e.currentTarget.querySelectorAll(seletor)].filter(b => !b.disabled && !b.hidden);
  const indice = botoes.indexOf(document.activeElement);
  if (indice < 0) return;
  e.preventDefault();
  const proximo = e.key === "Home" ? 0 : e.key === "End" ? botoes.length - 1
    : (indice + (["ArrowLeft", "ArrowUp"].includes(e.key) ? -1 : 1) + botoes.length) % botoes.length;
  botoes[proximo]?.focus({ preventScroll: true });
}

document.getElementById("menuRadialMapa").addEventListener("keydown", e => navegarBotoesInteracao(e, ".radial-action, .radial-close"));
document.getElementById("mapa").setAttribute("aria-label", "Mapa interativo. Use a barra inferior ou o menu de ferramentas.");
