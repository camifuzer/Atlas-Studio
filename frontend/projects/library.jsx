import { useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { projectCards, readableDate } from './model.js';
import { ProjectDialog, DeleteProjectDialog } from './dialogs.jsx';

function Search({ mobile = false, value, change }) {
  const input = <input id={mobile ? 'buscaProjetosMobile' : 'buscaProjetosTopo'} type="search" autoComplete="off" placeholder="Buscar projeto ou mapa" value={value} onChange={event => change(event.target.value)} />;
  return mobile ? <label className="project-mobile-search" htmlFor="buscaProjetosMobile"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></svg>{input}</label> : input;
}

function ProjectCard({ card, controller, busy }) {
  const { project, maps, objects, updated } = card;
  return <article className="project-card" data-project-id={project.id}>
    <button className="project-card-open" type="button" data-project-action="open" disabled={busy} onClick={() => controller.open(project.id)}>
      <span className="project-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 7h6l2 2h8v10H4Z" /><path d="M8 13h8M8 16h5" /></svg></span>
      <span className="project-card-copy"><strong>{project.nome}</strong><small>{project.descricao || 'Projeto de mapas do Atlas Studio'}</small></span>
    </button>
    <div className="project-card-stats"><span><b>{maps.length}</b> mapa(s)</span><span><b>{objects}</b> objeto(s)</span><span>Atualizado {readableDate(updated)}</span></div>
    <div className="project-card-actions">
      <button type="button" data-project-action="edit" disabled={busy} onClick={() => controller.openDialog(project)}>Editar</button>
      <button className="danger" type="button" data-project-action="delete" disabled={busy} onClick={() => controller.askDelete(project)}>Excluir</button>
      <button className="project-manage-action" type="button" data-project-action="manage" disabled={busy} onClick={() => controller.manage(project.id)}>Administrar <span aria-hidden="true">→</span></button>
    </div>
  </article>;
}

export default function Library({ controller }) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  const cards = projectCards(state.projects, state.summaries, state.search);
  return <>
    {createPortal(<Search value={state.search} change={controller.search} />, document.getElementById('project-search-root'))}
    <section className="projects-shell" aria-labelledby="tituloMapas" aria-busy={state.loading}>
      <header className="projects-heading"><div><p className="projects-eyebrow">Seus mundos e campanhas</p><h1 id="tituloMapas">Biblioteca de Mapas</h1><p>Cada projeto reúne os mapas de um mesmo mundo ou campanha.</p></div></header>
      <Search mobile value={state.search} change={controller.search} />
      {state.loading && <p role="status">Carregando projetos…</p>}
      {state.error && !state.deletion && <div className="project-error" role="alert">{state.error} <button type="button" disabled={state.loading || state.busy} onClick={() => controller.refresh()}>Tentar novamente</button></div>}
      <div id="listaProjetos" className="projects-grid" aria-live="polite">
        {cards.map(card => <ProjectCard key={card.project.id} card={card} controller={controller} busy={state.busy} />)}
        <button className="project-create-card" type="button" data-project-action="create" disabled={state.busy} onClick={() => controller.openDialog()}>
          <span className="project-create-icon" aria-hidden="true">＋</span><strong>Criar novo projeto</strong><small>Comece um novo mundo ou campanha</small>
        </button>
      </div>
      <section id="projetosVazio" className="projects-empty" hidden={state.loading || Boolean(state.error) || state.projects.length > 0}>
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 8 7-4 7 4-7 4Z" /><path d="m5 12 7 4 7-4M5 16l7 4 7-4" /></svg><h2>Nenhum projeto ainda</h2><p>Comece criando um projeto e adicione quantos mapas quiser dentro dele.</p>
      </section>
      <p id="projetosSemResultado" className="projects-no-results" hidden={state.loading || !state.projects.length || cards.length > 0}>Nenhum projeto ou mapa corresponde à busca.</p>
    </section>
    {createPortal(<><ProjectDialog draft={state.dialog} busy={state.busy} submit={controller.submit} close={controller.closeDialog} />
      {state.deletion && <DeleteProjectDialog project={state.deletion} maps={state.summaries.filter(map => map.projectId === state.deletion?.id)} busy={state.busy} error={state.error} confirm={controller.confirmDelete} close={controller.cancelDelete} />}</>, document.getElementById('project-dialog-root'))}
  </>;
}
