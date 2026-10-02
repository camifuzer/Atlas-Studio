import { useCallback, useEffect, useRef, useState } from 'react';
import { clone, criarEstadoInicial, normalizarEstado } from './model.js';
import { loadAdmin, loadMaps, saveAdmin } from './repository.js';

export function useAdmin(projectId) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState('');
  const [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState(null);
  const working = useRef(false);
  const mounted = useRef(false);

  const initialize = useCallback(async () => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError('');
    try {
      const loaded = await loadAdmin(projectId);
      const document = normalizarEstado(loaded.saved || criarEstadoInicial(loaded.maps), loaded.maps);
      const saved = await saveAdmin(document);
      if (mounted.current) { setData({ maps: loaded.maps, project: loaded.project, document: saved }); setDirty(false); }
    } catch (failure) {
      if (mounted.current) setError(failure.message);
    } finally {
      working.current = false;
      if (mounted.current) setBusy(false);
    }
  }, [projectId]);

  useEffect(() => {
    mounted.current = true;
    void initialize();
    return () => { mounted.current = false; };
  }, [initialize]);

  useEffect(() => {
    if (!dirty) return;
    const prevent = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', prevent);
    return () => window.removeEventListener('beforeunload', prevent);
  }, [dirty]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  function edit(change) {
    if (working.current || !data) return;
    setData(current => {
      const next = clone(current.document);
      change(next, current.maps);
      return { ...current, document: next };
    });
    setDirty(true);
    setError('');
  }

  function select(id) {
    if (working.current) return;
    setData(current => ({ ...current, document: { ...current.document, usuarioAtualId: id } }));
  }

  async function save() {
    if (working.current || !data || !dirty) return;
    working.current = true;
    setBusy(true);
    setError('');
    try {
      const saved = await saveAdmin(data.document);
      setData(current => ({ ...current, document: saved }));
      setDirty(false);
      setNotice('Políticas salvas no banco local. Ainda não são aplicadas ao editor.');
    } catch (failure) { setError(failure.message); }
    finally { working.current = false; setBusy(false); }
  }

  async function refresh() {
    if (working.current || !data) return;
    working.current = true;
    setBusy(true);
    setError('');
    try {
      const maps = await loadMaps();
      let document = normalizarEstado(data.document, maps);
      // Atualizar a árvore não confirma edições que ainda aguardam Salvar.
      if (!dirty) document = await saveAdmin(document);
      setData(current => ({ ...current, maps, document }));
      setNotice('Dados do Atlas Studio atualizados.');
    } catch (failure) { setError(failure.message); }
    finally { working.current = false; setBusy(false); }
  }

  return { data, busy, error, dirty, notice, edit, select, save, refresh, retry: initialize, notify: setNotice };
}
