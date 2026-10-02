export async function testarEstrutura({ avaliar, enviar, sessionId }) {
  await avaliar(sessionId, `(${verificarEstrutura.toString()})()`);
  for (const width of [1366, 768, 390]) {
    await enviar('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width < 700 }, sessionId);
    await avaliar(sessionId, `(async () => {
      await abrirProjeto('shell-test');
      document.getElementById('abrirMenuPrincipal').click();
      await new Promise(r => setTimeout(r, 50));
      const rect = document.getElementById('menuPrincipal').getBoundingClientRect();
      if (rect.width <= 0 || rect.left < -1 || rect.right > innerWidth + 1 || document.documentElement.scrollWidth > innerWidth) throw new Error('Menu fora do viewport');
      definirMenuPrincipalAberto(false);
      await mostrarGerenciadorProjetos();
      document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true, cancelable: true }));
      if (!['buscaProjetosTopo', 'buscaProjetosMobile'].includes(document.activeElement.id)) throw new Error('Busca sem foco no viewport atual');
    })()`);
  }
  for (const width of [1366, 390, 320]) {
    await enviar('Emulation.setDeviceMetricsOverride', { width, height: 844, deviceScaleFactor: 1, mobile: width < 700 }, sessionId);
    for (const mode of ['visualizacao', 'edicao']) {
      await avaliar(sessionId, `(async () => {
        await abrirProjeto('shell-test');
        setModo('${mode}');
        definirPainelAberto(false);
        const stage = document.querySelector('.map-stage').getBoundingClientRect();
        abrirMenuRadial(stage.left + stage.width / 2, stage.top + stage.height / 2);
        await new Promise(r => setTimeout(r, 150));
        const menu = document.getElementById('menuRadialMapa').getBoundingClientRect();
        const buttons = [...document.querySelectorAll('[data-radial-action]:not([hidden])')];
        const close = document.getElementById('fecharMenuRadial').getBoundingClientRect();
        const boxes = [...buttons.map(b => b.getBoundingClientRect()), close];
        if (buttons.length !== ('${mode}' === 'edicao' ? 5 : 2)) throw new Error('Quantidade incorreta de ações radiais');
        for (let i = 0; i < boxes.length; i++) {
          const a = boxes[i];
          if (a.left < menu.left - 1 || a.right > menu.right + 1 || a.top < menu.top - 1 || a.bottom > menu.bottom + 1) throw new Error('Ação fora do radial');
          for (const b of boxes.slice(i + 1)) {
            if (Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)) throw new Error('Ações radiais sobrepostas');
          }
        }
        const center = close.left + close.width / 2;
        const centers = buttons.map(b => { const r = b.querySelector('span').getBoundingClientRect(); return r.left + r.width / 2; });
        if (Math.abs(centers.reduce((a, b) => a + b, 0) / centers.length - center) > 1) throw new Error('Radial sem simetria horizontal');
      })()`);
      if (process.env.ATLAS_RADIAL_SCREENSHOTS) {
        const { writeFileSync } = await import('node:fs');
        const shot = await enviar('Page.captureScreenshot', { format: 'png' }, sessionId);
        writeFileSync(`/tmp/atlas-radial-${width}-${mode}.png`, Buffer.from(shot.data, 'base64'));
      }
    }
  }
  await enviar('Emulation.clearDeviceMetricsOverride', {}, sessionId);
  console.log('Estrutura React aprovada: menu/teclado/foco, tema, navegação, busca de mapas, modos na barra superior, comandos únicos, falha de exportação, confirmação e layouts responsivos.');
}

async function verificarEstrutura() {
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const pause = () => new Promise(resolve => setTimeout(resolve, 50));
  const click = async selector => { document.querySelector(selector).click(); await pause(); };
  const wait = async check => {
    for (let i = 0; i < 120; i++) { if (check()) return; await pause(); }
    throw new Error('Comando da estrutura não concluiu');
  };
  const keyboard = (element, key, extras = {}) => element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extras }));
  await mostrarGerenciadorProjetos();
  assert(document.getElementById('novoMapa').disabled && document.getElementById('excluirMapa').disabled, 'Biblioteca não oferece comandos sem mapa/projeto');
  const light = document.documentElement.classList.contains('tema-claro');
  await click('#alternarTemaBiblioteca');
  assert(document.documentElement.classList.contains('tema-claro') !== light, 'Tema muda uma única vez');
  assert(document.querySelector('#alternarTema .menu-command-label').textContent === document.getElementById('alternarTemaBiblioteca').getAttribute('aria-label'), 'Controles de tema sincronizados');
  await click('#alternarTemaBiblioteca');
  keyboard(document.body, 'f', { ctrlKey: true }); await pause();
  assert(['buscaProjetosTopo', 'buscaProjetosMobile'].includes(document.activeElement.id), 'Ctrl F na Biblioteca foca busca');

  const project = { id: 'shell-test', nome: 'Projeto Shell' };
  await dbSalvarProjeto(project); await abrirProjeto(project.id);
  const image = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"/>');
  for (const [id, name] of [['shell-a', 'Alpha'], ['shell-b', 'Beta']]) {
    await dbSalvar({ id, projectId: project.id, nome: name, largura: 400, altura: 300, imagem: image, categorias: [], objetos: [], fontesDados: [] }, { historico: false });
  }
  await abrirMapa('shell-a');
  const trigger = document.getElementById('abrirMenuPrincipal');
  trigger.focus(); keyboard(trigger, 'ArrowDown'); await pause();
  assert(trigger.getAttribute('aria-expanded') === 'true', 'Seta abre menu');
  const enabled = [...document.querySelectorAll('#menuPrincipal .menu-command')].filter(button => !button.disabled);
  assert(document.activeElement === enabled[0], 'Menu foca primeiro comando disponível: ativo=' + document.activeElement.id + ', esperado=' + enabled[0]?.id);
  keyboard(document.activeElement, 'End'); await pause();
  assert(document.activeElement === enabled.at(-1), 'End alcança último comando');
  keyboard(document.activeElement, 'Escape'); await pause();
  assert(document.getElementById('menuPrincipal').hidden && document.activeElement === trigger, 'Escape fecha menu e devolve foco');
  setModo('visualizacao');
  abrirCriacaoRapidaMapa();
  mapa.fire('dblclick', { originalEvent: new MouseEvent('dblclick') });
  assert(ui.modo === 'visualizacao' && !editor.ativo, 'Duplo clique não ativa Editor');
  abrirMenuRadial(400, 300);
  assert([...menuRadialMapa.querySelectorAll('[data-radial-action]:not([hidden])')].map(b => b.dataset.radialAction).sort().join(',') === 'legenda,modoEdicao', 'Radial de consulta só oferece legenda e entrada no Editor');
  definirMenuPrincipalAberto(true);
  await new Promise(r => setTimeout(r, 150));
  assert(menuRadialMapa.hidden, 'Menu superior fecha radial');
  abrirMenuRadial(400, 300);
  assert(!window.AtlasShell.getSnapshot().menuOpen, 'Radial fecha menu superior');
  fecharMenuRadial();
  for (const key of ['a', 'd', 'q', 'l']) { keyboard(document.body, key, { ctrlKey: true }); await pause(); }
  assert(ui.modo === 'visualizacao', 'Atalhos de ferramentas não mudam modo');
  const fieldGuard = document.getElementById('buscaMapa');
  keyboard(fieldGuard, 'e', { ctrlKey: true }); await pause();
  assert(ui.modo === 'visualizacao', 'Atalho preserva campo de texto');
  assert(!document.getElementById('novoMapa').disabled && !document.getElementById('excluirMapa').disabled, 'Comandos acompanham mapa ativo');
  assert(document.getElementById('modoEdicao').closest('.topbar'), 'Modos ficam fora do Inspector');
  assert(document.querySelectorAll('#modoEdicao').length === 1, 'Modo não é duplicado na barra');
  await click('#modoEdicao');
  assert(ui.modo === 'edicao' && document.getElementById('modoEdicao').getAttribute('aria-pressed') === 'true', 'React aciona modo do editor');
  const originalDraft = preservarRascunhoAtual;
  const activeBefore = editor.ativo;
  try {
    editor.ativo = true;
    preservarRascunhoAtual = async () => { throw new Error('Falha simulada no rascunho'); };
    await window.AtlasShell.execute('modoVisualizacao');
    assert(ui.modo === 'edicao' && editor.ativo && window.AtlasShell.getSnapshot().error.includes('rascunho'), 'Falha ao preservar impede saída do Editor');
  } finally { preservarRascunhoAtual = originalDraft; editor.ativo = activeBefore; }
  assert(!document.getElementById('abrirLegendaVisual'), 'Atalho inferior de legenda removido');
  await click('#modoVisualizacao');
  keyboard(document.body, 'e', { ctrlKey: true }); await pause();
  assert(ui.modo === 'edicao', 'Atalho e botão usam o mesmo comando');

  const input = document.getElementById('buscaMapa');
  const originalFetch = window.fetch;
  let reads = 0;
  window.fetch = (...args) => { reads++; return originalFetch(...args); };
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'Bet');
  input.dispatchEvent(new Event('input', { bubbles: true })); await pause();
  window.fetch = originalFetch;
  assert(reads === 0 && document.querySelectorAll('.map-search-option').length === 1, 'Busca filtra resumos em memória');
  keyboard(input, 'Enter');
  await wait(() => mapaAtual?.id === 'shell-b' && !window.AtlasShell.getSnapshot().pending);
  assert(input.value === 'Beta', 'Troca de mapa atualiza busca');
  await click('#abrirListaMapas');
  assert(document.querySelectorAll('.map-search-option').length === 2, 'Lista completa ignora filtro anterior');
  await click('#pesquisarObjetos');
  assert(document.getElementById('listaMapasBusca').hidden && !buscaObjetosOverlay.hidden, 'Pesquisa de objetos fecha lista de mapas');
  fecharPesquisaObjetos();

  await wait(() => !window.AtlasShell.getSnapshot().pending);
  let executions = 0;
  const originalSave = salvarProjetoAtual;
  salvarProjetoAtual = async () => { executions++; await new Promise(resolve => setTimeout(resolve, 120)); };
  try {
    document.getElementById('salvarProjeto').click();
    document.getElementById('salvarProjeto').click();
    await wait(() => !window.AtlasShell.getSnapshot().pending);
    assert(executions === 1, 'Duplo clique não duplica salvamento');
    keyboard(document.body, 's', { ctrlKey: true });
    await wait(() => !window.AtlasShell.getSnapshot().pending);
    assert(executions === 2, 'Ctrl S executa uma vez');
  } finally { salvarProjetoAtual = originalSave; }

  await click('#renomearMapa');
  assert(document.querySelector('.system-dialog[open]'), 'Renomear abre diálogo existente');
  keyboard(document.body, 'e', { ctrlKey: true });
  keyboard(document.body, 'l', { ctrlKey: true });
  assert(document.querySelector('.system-dialog[open]') && ui.modo === 'edicao', 'Atalhos não atuam por trás do diálogo');
  const field = document.querySelector('.system-dialog[open] input'); field.value = 'Beta Renomeado';
  document.querySelector('.system-dialog[open] form').requestSubmit();
  await wait(() => !window.AtlasShell.getSnapshot().pending);
  assert((await dbPegarMapaGlobal('shell-b')).nome === 'Beta Renomeado' && input.value === 'Beta Renomeado', 'Renomear atualiza banco e busca');

  const originalBackup = exportarBackupAtual;
  exportarBackupAtual = async () => { throw new Error('Falha simulada de exportação'); };
  try {
    await click('#exportarMapa');
    await wait(() => !window.AtlasShell.getSnapshot().pending);
    assert(document.querySelector('#shell-status-root [role="alert"]')?.textContent.includes('Falha simulada'), 'Falha aparece sem travar controles');
  } finally { exportarBackupAtual = originalBackup; }
  await click('#excluirMapa');
  document.querySelector('.system-dialog[open] .system-dialog-cancel').click();
  await wait(() => !window.AtlasShell.getSnapshot().pending);
  assert(await dbPegarMapaGlobal('shell-b'), 'Cancelar exclusão conserva mapa');
  await click('#excluirMapa');
  document.querySelector('.system-dialog[open] .system-dialog-confirm').click();
  await wait(() => !window.AtlasShell.getSnapshot().pending);
  assert(!(await dbPegarMapaGlobal('shell-b')) && mapaAtual?.id === 'shell-a', 'Excluir abre mapa restante');
  await click('#abrirProjetosMarca');
  await wait(() => !window.AtlasShell.getSnapshot().pending);
  assert(!projetoAtual && document.body.classList.contains('projects-visible'), 'Marca volta à Biblioteca');
  assert(document.getElementById('administracaoBibliotecaLink').getAttribute('href').includes('shell-test'), 'Administração mantém contexto preferido');
}
