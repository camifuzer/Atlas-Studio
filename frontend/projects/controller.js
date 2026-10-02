import { loadLibrary, getProject, saveProject, deleteProject } from './repository.js';
import { projectDocument } from './model.js';

export function createLibraryController(editor, notifyBatch = callback => callback()) {
  let snapshot = { projects: [], summaries: [], search: '', loading: false, busy: false, error: '', dialog: null, deletion: null };
  const listeners = new Set();
  let generation = 0;
  function set(patch) {
    snapshot = { ...snapshot, ...patch };
    notifyBatch(() => listeners.forEach(listener => listener()));
  }
  async function refresh(resetSearch = false) {
    const current = ++generation;
    set({ loading: true, error: '', ...(resetSearch ? { search: '' } : {}) });
    try {
      const data = await loadLibrary();
      if (current === generation) { set({ ...data, loading: false }); editor.libraryLoaded?.(data.projects); }
    } catch (error) {
      if (current === generation) set({ loading: false, error: error.message });
    }
  }
  function openDialog(project = null) {
    if (snapshot.busy) return;
    set({ dialog: { project, id: project?.id || editor.createId(), created: new Date().toISOString(), error: '' } });
  }
  async function submit(fields) {
    if (snapshot.busy || !snapshot.dialog || !fields.nome.trim()) return;
    const draft = snapshot.dialog;
    set({ busy: true, dialog: { ...draft, error: '' } });
    let saved;
    try {
      const existing = draft.project ? await getProject(draft.id) : null;
      if (draft.project && !existing) throw new Error('Este projeto foi excluído. Feche o formulário e atualize a Biblioteca.');
      saved = projectDocument(existing, draft, fields);
      await saveProject(saved);
    } catch (error) {
      set({ busy: false, dialog: { ...draft, error: error.message } });
      return;
    }
    set({ busy: false, dialog: null });
    await refresh();
    if (!draft.project) await open(saved.id);
    else editor.projectUpdated(saved);
    editor.notice(draft.project ? 'Projeto atualizado.' : 'Projeto criado.');
  }
  async function open(id) {
    if (snapshot.busy) return;
    set({ busy: true, error: '' });
    try { await editor.open(id); }
    catch (error) {
      await editor.showLibrary();
      set({ error: error.message });
    } finally { set({ busy: false }); }
  }
  async function confirmDelete() {
    if (snapshot.busy || !snapshot.deletion) return;
    const project = snapshot.deletion;
    set({ busy: true, error: '' });
    try {
      await deleteProject(project.id);
      editor.projectDeleted(project.id, snapshot.summaries.filter(map => map.projectId === project.id));
      set({ deletion: null });
      await refresh();
      editor.notice('Projeto excluído.');
    } catch (error) { set({ error: error.message }); }
    finally { set({ busy: false }); }
  }
  return {
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    getSnapshot: () => snapshot,
    refresh, openDialog, submit, open, confirmDelete,
    search: value => set({ search: value }),
    closeDialog() { if (!snapshot.busy) set({ dialog: null }); },
    askDelete: project => { if (!snapshot.busy) set({ deletion: project, error: '' }); },
    cancelDelete: () => { if (!snapshot.busy) set({ deletion: null, error: '' }); },
    manage: id => { if (!snapshot.busy) editor.manage(id); },
    focusSearch() {
      const input = ['buscaProjetosTopo', 'buscaProjetosMobile']
        .map(id => document.getElementById(id))
        .find(element => element && element.getClientRects().length > 0);
      input?.focus(); input?.select();
    },
  };
}
