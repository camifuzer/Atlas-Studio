import { useEffect, useRef } from 'react';

export function ProjectDialog({ draft, busy, submit, close }) {
  const dialog = useRef(null), form = useRef(null);
  const draftId = draft?.id;
  useEffect(() => {
    if (!draftId) return;
    const dialogElement = dialog.current;
    const formElement = form.current;
    dialogElement.showModal();
    formElement.elements.nome.focus();
    return () => dialogElement.close();
  }, [draftId]);
  return <dialog id="projetoDialog" ref={dialog} className="project-dialog" aria-labelledby="projetoDialogTitulo"
    onCancel={event => { event.preventDefault(); close(); }} onClick={event => { if (event.target === dialog.current) close(); }}>
    <form id="projetoForm" ref={form} key={draft?.id || 'closed'} method="dialog" onSubmit={event => {
      event.preventDefault();
      const fields = form.current.elements;
      if (!fields.nome.value.trim()) { fields.nome.setCustomValidity('Informe o nome do projeto.'); fields.nome.reportValidity(); return; }
      void submit({ nome: fields.nome.value, descricao: fields.descricao.value });
    }}>
      <header><div><span className="projects-eyebrow">Projeto</span><h2 id="projetoDialogTitulo">{draft?.project ? 'Editar projeto' : 'Novo projeto'}</h2></div>
        <button id="fecharProjetoDialog" className="project-dialog-close" type="button" aria-label="Fechar" disabled={busy} onClick={close}>×</button></header>
      <label><span>Nome do projeto</span><input id="nomeProjeto" name="nome" type="text" maxLength="100" autoComplete="off" placeholder="Mundo, campanha ou coleção de mapas" required disabled={busy}
        defaultValue={draft?.project?.nome || ''} onInput={event => event.target.setCustomValidity('')} /></label>
      <label><span>Descrição <small>opcional</small></span><textarea id="descricaoProjeto" name="descricao" maxLength="240" rows="3" placeholder="Mundo, campanha ou coleção de mapas" disabled={busy} defaultValue={draft?.project?.descricao || ''} /></label>
      {draft?.error && <p className="project-error" role="alert">{draft.error}</p>}
      <footer><button id="cancelarProjeto" type="button" disabled={busy} onClick={close}>Cancelar</button><button className="atlas-primary-button" type="submit" disabled={busy}>{busy ? 'Salvando…' : 'Salvar projeto'}</button></footer>
    </form>
  </dialog>;
}

export function DeleteProjectDialog({ project, maps, busy, error, confirm, close }) {
  const dialog = useRef(null);
  const projectId = project?.id;
  useEffect(() => {
    if (!projectId) return;
    const dialogElement = dialog.current;
    dialogElement.showModal();
    return () => dialogElement.close();
  }, [projectId]);
  return <dialog ref={dialog} className="system-dialog" aria-labelledby="projectDeleteTitle" onCancel={event => { event.preventDefault(); close(); }}>
    <form className="system-dialog-form" method="dialog" onSubmit={event => { event.preventDefault(); void confirm(); }}>
      <header className="system-dialog-header"><h2 id="projectDeleteTitle">Excluir projeto</h2></header>
      <p className="system-dialog-message">Excluir o projeto “{project?.nome}”? Serão removidos {maps.length} mapa(s) e {maps.reduce((sum, map) => sum + (map.totalObjetos || 0), 0)} objeto(s).</p>
      {error && <p className="project-error" role="alert">{error}</p>}
      <footer className="system-dialog-actions"><button className="system-dialog-cancel" type="button" disabled={busy} onClick={close}>Cancelar</button><button className="system-dialog-confirm danger" type="submit" disabled={busy}>Excluir projeto</button></footer>
    </form>
  </dialog>;
}
