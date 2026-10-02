/* Estado visual da estrutura. Projeto/mapa/modo são projeções do editor, não cópias editáveis. */
export function createShellStore(batch = callback => callback()) {
  let state = {
    ready: false, library: true, project: null, map: null, mode: 'visualizacao', maps: [],
    menuOpen: false, pending: null, error: '', adminHref: 'admin.html', backup: null,
    light: document.documentElement.classList.contains('tema-claro'),
  };
  const listeners = new Set();
  const update = patch => {
    state = { ...state, ...patch };
    batch(() => listeners.forEach(listener => listener()));
  };
  function theme(value, save = true) {
    const light = value === 'claro';
    document.documentElement.classList.toggle('tema-claro', light);
    document.documentElement.style.colorScheme = light ? 'light' : 'dark';
    if (save) { try { localStorage.setItem('temaInterface', value); } catch { /* Preferência opcional. */ } }
    update({ light });
  }
  return {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot: () => state, update, theme,
    menu(open, focusFirst = false) {
      if (open) globalThis.fecharMenuRadial?.();
      update({ menuOpen: open });
      if (open && focusFirst) requestAnimationFrame(() => document.querySelector('#menuPrincipal .menu-command:not(:disabled)')?.focus());
    },
  };
}

export function commandEnabled(id, state) {
  if (!state.ready || state.pending) return false;
  if (['criacao', 'camadas', 'dados', 'coordenadas'].includes(id)) return Boolean(state.map) && !state.library && state.mode === 'edicao';
  if (id === 'legenda') return Boolean(state.map) && !state.library && state.mode === 'visualizacao';
  if (['novoMapa', 'pesquisarObjetos', 'salvarProjeto', 'exportarMapa', 'importarMapa', 'verificarVinculos'].includes(id)) return Boolean(state.project) && !state.library;
  if (['renomearMapa', 'excluirMapa', 'modoEdicao', 'modoVisualizacao'].includes(id)) return Boolean(state.map) && !state.library;
  return true;
}
