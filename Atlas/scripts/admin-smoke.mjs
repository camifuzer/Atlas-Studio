// Exercita a interface React pelo DOM e confirma os resultados na API real.
export async function testarAdministracao({ avaliar, enviar, sessionId, url }) {
  await avaliar(sessionId, `(${verificarAdministracao.toString()})()`);
  const filtered = new URL('admin.html?project=admin-smoke-p1', url).href;
  await enviar('Page.enable', {}, sessionId);
  await enviar('Page.navigate', { url: filtered }, sessionId);
  async function waitFor(expression) {
    for (let i = 0; i < 100; i++) {
      if (await avaliar(sessionId, expression)) return;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('Administração: condição não atendida: ' + expression);
  }
  await waitFor('document.body.dataset.adminReady === "true"');
  await avaliar(sessionId, `(async () => {
    const assert = (value, message) => { if (!value) throw new Error(message); };
    assert(document.getElementById('adminProjectContext').textContent.includes('Projeto Admin 1'), 'Filtro identifica o projeto');
    const cards = [...document.querySelectorAll('.map-card')];
    assert(cards.length === 1 && cards[0].textContent.includes('Mapa Admin 1'), 'Filtro mostra apenas mapas do projeto');
    assert(document.getElementById('adminWhoName').textContent === 'Pessoa React', 'Recarga conserva usuário selecionado');
    const saved = await (await fetch('/api/configuracoes/estado-principal')).json();
    const user = saved.usuarios.find(u => u.nome === 'Pessoa React');
    assert(user.mapas.includes('admin-smoke-m2'), 'Abrir contexto não apaga acesso de outro projeto');
    document.getElementById('adminDeleteUser').click();
    await new Promise(r => setTimeout(r, 40));
    assert(document.querySelector('.system-dialog').open, 'Excluir abre confirmação');
    document.querySelector('.system-dialog-cancel').click();
    await new Promise(r => setTimeout(r, 40));
    assert(document.getElementById('adminWhoName').textContent === 'Pessoa React', 'Cancelar conserva usuário');
    document.getElementById('adminDeleteUser').click();
    await new Promise(r => setTimeout(r, 40));
    document.querySelector('.system-dialog-confirm').click();
    await new Promise(r => setTimeout(r, 40));
    document.getElementById('adminSave').click();
  })()`);
  await waitFor('!document.querySelector(".admin-controls").disabled && document.getElementById("adminSave").disabled');
  await avaliar(sessionId, `(async () => {
    const saved = await (await fetch('/api/configuracoes/estado-principal')).json();
    if (saved.usuarios.some(u => u.nome === 'Pessoa React')) throw new Error('Exclusão não persistiu');
    if (!document.getElementById('adminDeleteUser').disabled) throw new Error('Proprietário precisa continuar protegido');
  })()`);

  // Falha na carga inicial seguida de recuperação na mesma página.
  const { identifier } = await enviar('Page.addScriptToEvaluateOnNewDocument', { source: `
    window.originalAdminFetch = window.fetch;
    window.fetch = (path, options) => String(path).includes('/api/configuracoes/')
      ? Promise.reject(new TypeError('Falha de carga simulada')) : window.originalAdminFetch(path, options);
  ` }, sessionId);
  await enviar('Page.reload', {}, sessionId);
  await waitFor('Boolean(document.querySelector(".admin-error-state button"))');
  await enviar('Page.removeScriptToEvaluateOnNewDocument', { identifier }, sessionId);
  await avaliar(sessionId, 'window.fetch = window.originalAdminFetch; document.querySelector(".admin-error-state button").click()');
  await waitFor('document.body.dataset.adminReady === "true"');

  for (const width of [1366, 768, 390]) {
    await enviar('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 700 }, sessionId);
    for (let theme = 0; theme < 2; theme++) {
      await avaliar(sessionId, `(async () => {
        document.getElementById('adminTheme').click();
        await new Promise(r => setTimeout(r, 40));
        if (document.documentElement.scrollWidth > innerWidth) throw new Error('Overflow na Administração React');
      })()`);
    }
  }
  console.log('Administração React aprovada: cadastro, duplicidade, perfis, busca, acesso, visibilidade, foco, falha/nova tentativa, recarga, filtro de projeto, exclusão e temas responsivos.');
}

async function verificarAdministracao() {
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const pause = () => new Promise(resolve => setTimeout(resolve, 40));
  const click = async selector => { document.querySelector(selector).click(); await pause(); };
  const wait = async predicate => {
    for (let i = 0; i < 100; i++) { if (predicate()) return; await pause(); }
    throw new Error('Administração: operação não concluiu');
  };
  const config = async () => (await fetch('/api/configuracoes/estado-principal')).json();
  const post = async operations => {
    const response = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operations }) });
    assert(response.ok, 'Preparação dos dados administrativos');
  };
  const operations = [];
  for (const n of [1, 2]) {
    operations.push({ store: 'projetos', action: 'put', value: { id: 'admin-smoke-p' + n, nome: 'Projeto Admin ' + n } });
    operations.push({ store: 'mapas', action: 'put', value: {
      id: 'admin-smoke-m' + n, projectId: 'admin-smoke-p' + n, nome: 'Mapa Admin ' + n,
      categorias: [{ id: 'c', nome: 'Pontos Admin', geometria: 'unico' }], objetos: [{ id: 'o1', categoriaId: 'c', nome: 'Objeto Admin 1' }, { id: 'o2', categoriaId: 'c', nome: 'Objeto Admin 2' }],
    } });
  }
  await post(operations);
  await click('#adminRefreshMaps');
  await wait(() => !document.querySelector('.admin-controls').disabled);
  await click('#adminAddUser');
  assert(document.getElementById('adminUserDialog').open, 'Cadastro abre diálogo');
  assert(document.activeElement.id === 'adminUserName', 'Cadastro recebe foco no nome');
  document.getElementById('adminUserName').value = 'Pessoa React';
  document.getElementById('adminUserEmail').value = 'pessoa@react.test';
  document.getElementById('adminUserForm').requestSubmit();
  await pause();
  assert(document.getElementById('adminWhoName').textContent === 'Pessoa React', 'Cadastro seleciona usuário');
  assert(!document.getElementById('adminSave').disabled, 'Cadastro permanece pendente');
  const before = await config();
  assert(!before.usuarios.some(u => u.nome === 'Pessoa React'), 'Cadastro não salva sem comando explícito');
  await click('#adminAddUser');
  document.getElementById('adminUserName').value = 'Duplicado';
  document.getElementById('adminUserEmail').value = 'PESSOA@react.test';
  document.getElementById('adminUserForm').requestSubmit();
  await pause();
  assert(document.getElementById('adminUserEmail').validity.customError, 'E-mail duplicado é rejeitado');
  await click('#adminCancelUser');
  await click('[data-profile="visualizador"]');
  assert(document.getElementById('adminPermissionCount').textContent === '(4/16)', 'Perfil aplica permissões');
  const permission = document.querySelector('[aria-label="Criar mapa"]');
  permission.focus();
  permission.click();
  await pause();
  assert(permission === document.activeElement && permission.getAttribute('aria-checked') === 'true', 'Alternar preserva foco e atualiza permissão');

  const search = document.getElementById('adminGlobalSearch');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(search, 'Pessoa React');
  search.dispatchEvent(new Event('input', { bubbles: true }));
  await pause();
  assert(document.querySelectorAll('.admin-user-item').length === 1 && document.getElementById('adminUserSearch').value === 'Pessoa React', 'Buscas compartilham estado');
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(search, '');
  search.dispatchEvent(new Event('input', { bubbles: true }));
  await pause();

  await click('[data-tab="maps"]');
  for (const n of [1, 2]) {
    [...document.querySelectorAll('.map-card')].find(card => card.textContent.includes('Mapa Admin ' + n)).click();
    await pause();
  }
  await click('[data-tab="visibility"]');
  await click('.visibility-chevron');
  await click('.visibility-objects .admin-switch');
  assert(document.querySelector('.visibility-category-row .admin-switch').getAttribute('aria-checked') === 'mixed', 'Visibilidade parcial aparece na camada');
  assert(document.getElementById('adminVisibilityCount').textContent === '(3/4)', 'Contagem reflete objetos visíveis');
  await click('#adminRefreshMaps');
  await wait(() => !document.querySelector('.admin-controls').disabled);
  assert(!(await config()).usuarios.some(u => u.nome === 'Pessoa React'), 'Atualizar dados não salva alterações pendentes');

  const originalFetch = window.fetch;
  window.fetch = (path, options) => path === '/api/transactions' ? Promise.reject(new TypeError('Falha simulada')) : originalFetch(path, options);
  await click('#adminSave');
  await wait(() => !document.querySelector('.admin-controls').disabled);
  assert(document.querySelector('[role="alert"]') && !document.getElementById('adminSave').disabled, 'Falha mantém edição disponível para nova tentativa');
  window.fetch = originalFetch;
  await click('#adminSave');
  await wait(() => !document.querySelector('.admin-controls').disabled);
  const saved = await config();
  const user = saved.usuarios.find(u => u.nome === 'Pessoa React');
  assert(user && user.permissoes.criarMapa && user.mapas.length === 2, 'API confirma cadastro, permissão e mapas');
  assert(user.visibilidade['admin-smoke-m1'].c.o1 === false, 'Visibilidade persiste no SQLite');
  assert(document.getElementById('adminSave').disabled, 'Commit limpa indicador de alterações');
}
