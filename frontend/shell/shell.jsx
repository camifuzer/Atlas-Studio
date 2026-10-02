import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import MainMenu from './menu.jsx';
import MapSearch from './map-search.jsx';

export default function Shell({ store, execute }) {
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot);
  return <>
    <a id="abrirProjetosMarca" onClick={event => { event.preventDefault(); void execute("abrirProjetos"); }} className="brand" href="#projetos" aria-label="Abrir meus projetos">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3Z"></path>
          <path d="M8 3v15M16 6v15"></path>
        </svg>
      </span>
      <span className="brand-title">Atlas Studio</span>
    </a>

    <nav className="projects-sidebar-nav" aria-label="Navegação principal">
      <span className="projects-sidebar-label">Navegação</span>
      <a className="projects-sidebar-link active" href="#projetos" onClick={event => { event.preventDefault(); void execute("abrirProjetos"); }} aria-current="page" aria-label="Biblioteca">
        <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="4" width="6" height="6" rx="1"></rect><rect x="4" y="14" width="6" height="6" rx="1"></rect><rect x="14" y="14" width="6" height="6" rx="1"></rect></svg>
        <span>Biblioteca</span>
      </a>
      <a id="administracaoBibliotecaLink" className="projects-sidebar-link" href={state.adminHref} aria-label="Administração">
        <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"></circle><path d="M3.5 19c.5-3.2 2.3-5 5.5-5s5 1.8 5.5 5M17 10v6M14 13h6"></path></svg>
        <span>Administração</span>
      </a>
    </nav>

    <div className="projects-sidebar-user">
      <span className="projects-sidebar-avatar">AL</span>
      <span><strong>Administrador local</strong><small>Editor</small></span>
    </div>

    <MapSearch state={state} execute={execute} store={store} />
    <label id="buscaProjetosTopoWrap" className="project-top-search" htmlFor="buscaProjetosTopo" hidden={!state.library}>
      <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>
      <span id="project-search-root" />
    </label>
    <div className="current-mode" hidden={state.library} aria-label="Modo do mapa">
      <button id="modoVisualizacao" type="button" aria-pressed={state.mode === 'visualizacao'} disabled={!state.map || Boolean(state.pending)} onClick={() => execute('modoVisualizacao')}>Visualização</button>
      <button id="modoEdicao" type="button" aria-pressed={state.mode === 'edicao'} disabled={!state.map || Boolean(state.pending)} onClick={() => execute('modoEdicao')}>Editor</button>
    </div>
    <MainMenu store={store} state={state} execute={execute} />
    <div className="top-spacer" />
    {/* O modo é controlado na barra superior e no radial, fora dos painéis. */}
    {createPortal(<button id="alternarTemaBiblioteca" className="projects-theme-toggle" type="button" title={state.light ? 'Ativar modo escuro' : 'Ativar modo claro'} aria-label={state.light ? 'Ativar modo escuro' : 'Ativar modo claro'}
      onClick={() => execute('alternarTema')} disabled={!state.ready}><span className="projects-theme-icon" aria-hidden="true">{state.light ? '☾' : '☼'}</span></button>, document.getElementById('library-theme-root'))}
    {createPortal(state.error ? <div className="shell-error" role="alert">{state.error} <button type="button" onClick={() => location.reload()}>Recarregar aplicativo</button></div> : null, document.getElementById('shell-status-root'))}
  </>;
}
