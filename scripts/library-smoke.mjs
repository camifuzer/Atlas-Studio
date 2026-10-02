export async function testarBiblioteca({ avaliar, enviar, sessionId }) {
  await avaliar(sessionId, `(${verificarBiblioteca.toString()})()`);
  await avaliar(sessionId, 'delete document.body.dataset.atlasReady');
  await enviar('Page.reload', {}, sessionId);
  for (let i = 0; i < 150; i++) {
    const ready = await avaliar(sessionId, `document.body.dataset.atlasReady === 'true' && document.body.dataset.libraryReady === 'true'`);
    if (ready) break;
    if (i === 149) throw new Error('Biblioteca não voltou após recarga');
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  await avaliar(sessionId, `(async () => {
    if (!document.body.classList.contains('projects-visible')) throw new Error('Recarga perdeu a Biblioteca');
    if (!document.querySelector('[data-project-id="library-legacy"]')) throw new Error('Recarga perdeu projeto antigo');
    await abrirProjeto('library-legacy');
    if (mapaAtual?.id !== 'library-old-map') throw new Error('Mapa antigo não abriu no editor');
    await mostrarGerenciadorProjetos();
  })()`);
  console.log('Biblioteca React aprovada: dados legados, busca local, edição, falha/nova tentativa, criação sem duplicação, exclusão atômica, recarga e abertura no editor.');
}

async function verificarBiblioteca() {
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const pause = () => new Promise(resolve => setTimeout(resolve, 40));
  const wait = async check => {
    for (let i = 0; i < 150; i++) { if (check()) return; await pause(); }
    throw new Error('Operação da Biblioteca não concluiu');
  };
  const click = async selector => {
    let element;
    await wait(() => {
      element = document.querySelector(selector);
      return Boolean(element && !element.disabled);
    });
    element.click();
    await pause();
  };
  const get = async path => (await fetch('/api/' + path)).json();
  const post = async operations => {
    const response = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operations }) });
    assert(response.ok, 'Preparação dos projetos');
  };
  const legacy = { id: 'library-legacy', nome: 'Árvore antiga', descricao: 'Projeto legado', criadoEm: '2000-01-01T00:00:00Z', dadosAntigos: { manter: true } };
  const oldMap = { id: 'library-old-map', projectId: legacy.id, nome: 'Coração da Cidade', largura: 400, altura: 300,
    imagem: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"/>'), categorias: [], objetos: [], fontesDados: [], campoLegado: { manter: 42 } };
  await post([{ store: 'projetos', action: 'put', value: legacy }, { store: 'mapas', action: 'put', value: oldMap }]);
  await mostrarGerenciadorProjetos();
  assert(document.querySelector('[data-project-id="library-legacy"]'), 'Biblioteca exibe projeto antigo');
  const originalFetch = window.fetch;
  let reads = 0;
  window.fetch = (...args) => { reads++; return originalFetch(...args); };
  const input = document.getElementById('buscaProjetosTopo');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, 'coracao');
  input.dispatchEvent(new Event('input', { bubbles: true }));
  await pause();
  window.fetch = originalFetch;
  assert(reads === 0, 'Digitar busca não relê banco ou imagens');
  assert(document.querySelectorAll('.project-card').length === 1, 'Busca encontra mapa sem acento');
  assert(document.getElementById('buscaProjetosMobile').value === 'coracao', 'Buscas desktop/mobile compartilham valor');
  await click('[data-project-id="library-legacy"] [data-project-action="edit"]');
  assert(document.activeElement.id === 'nomeProjeto', 'Formulário posiciona foco');
  document.getElementById('nomeProjeto').value = 'Projeto preservado';
  document.getElementById('descricaoProjeto').value = 'Descrição atualizada';
  window.fetch = (path, options) => path === '/api/transactions' ? Promise.reject(new Error('Rede indisponível')) : originalFetch(path, options);
  document.getElementById('projetoForm').requestSubmit();
  await wait(() => Boolean(document.querySelector('#projetoDialog [role="alert"]')));
  assert(document.getElementById('projetoDialog').open && document.getElementById('nomeProjeto').value === 'Projeto preservado', 'Falha mantém formulário e texto');
  window.fetch = originalFetch;
  document.getElementById('projetoForm').requestSubmit();
  await wait(() => !document.getElementById('projetoDialog').open);
  const saved = await get('projetos/library-legacy');
  assert(saved.nome === 'Projeto preservado' && saved.criadoEm === legacy.criadoEm && saved.dadosAntigos.manter, 'Editar preserva metadados antigos');
  assert(JSON.stringify(await get('mapas/library-old-map')) === JSON.stringify(oldMap), 'Editar projeto não altera mapa, imagem ou campos legados');
  await mostrarGerenciadorProjetos();
  assert(document.getElementById('buscaProjetosTopo').value === '', 'Voltar à Biblioteca limpa filtro anterior');

  await click('[data-project-action="create"]');
  document.getElementById('nomeProjeto').value = 'Projeto de tentativa';
  document.getElementById('descricaoProjeto').value = 'Sem duplicação';
  let loseResponse = true;
  window.fetch = async (path, options) => {
    const response = await originalFetch(path, options);
    if (path === '/api/transactions' && loseResponse) { loseResponse = false; throw new Error('Resposta perdida após commit'); }
    return response;
  };
  document.getElementById('projetoForm').requestSubmit();
  await wait(() => Boolean(document.querySelector('#projetoDialog [role="alert"]')));
  window.fetch = originalFetch;
  document.getElementById('projetoForm').requestSubmit();
  await wait(() => !document.getElementById('projetoDialog').open && projetoAtual?.nome === 'Projeto de tentativa');
  const created = (await get('projetos')).filter(project => project.nome === 'Projeto de tentativa');
  assert(created.length === 1, 'Nova tentativa reutiliza o ID após resposta perdida');
  const id = created[0].id;
  await post([{ store: 'mapas', action: 'put', value: { ...oldMap, id: 'library-delete-map', projectId: id } },
    { store: 'rascunhos', action: 'put', value: { id: 'library-delete-draft', projectId: id, mapaId: 'library-delete-map' } }]);
  await mostrarGerenciadorProjetos();
  await click('[data-project-id="' + id + '"] [data-project-action="delete"]');
  await click('[aria-labelledby="projectDeleteTitle"] .system-dialog-cancel');
  assert(await get('projetos/' + id), 'Cancelar exclusão preserva projeto');
  await click('[data-project-id="' + id + '"] [data-project-action="delete"]');
  await click('[aria-labelledby="projectDeleteTitle"] .system-dialog-confirm');
  await wait(() => !document.querySelector('[aria-labelledby="projectDeleteTitle"]'));
  assert(await get('projetos/' + id) === null && await get('mapas/library-delete-map') === null && await get('rascunhos/library-delete-draft') === null, 'Exclusão remove projeto, mapas e rascunhos');
  assert((await get('projetos/library-legacy')).dadosAntigos.manter, 'Exclusão conserva outro projeto');

  window.fetch = (path, options) => path === '/api/projetos' ? Promise.reject(new Error('Sem conexão')) : originalFetch(path, options);
  await renderizarProjetos();
  assert(document.querySelector('#project-library-root [role="alert"]'), 'Falha de carga fica visível');
  window.fetch = originalFetch;
  await click('#project-library-root [role="alert"] button');
  await wait(() => !document.querySelector('#project-library-root [role="alert"]'));
  await mostrarGerenciadorProjetos();
}
