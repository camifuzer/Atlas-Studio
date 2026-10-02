import { useEffect, useRef, useState } from 'react';

export default function MapSearch({ state, execute, store }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const [active, setActive] = useState(-1);
  const input = useRef(null), wrap = useRef(null);
  useEffect(() => {
    setQuery(state.map?.nome || ''); setOpen(false); setActive(-1);
  }, [state.map?.id, state.map?.nome, state.project?.id]);
  useEffect(() => {
    const outside = event => { if (!wrap.current?.contains(event.target)) setOpen(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, []);
  useEffect(() => {
    store.closeMapSearch = () => setOpen(false);
    return () => { delete store.closeMapSearch; };
  }, [store]);
  const term = query.trim().toLocaleLowerCase('pt-BR');
  const options = state.maps.filter(map => all || !term || String(map.nome).toLocaleLowerCase('pt-BR').includes(term));
  function choose(map) {
    if (!map) return;
    setOpen(false);
    void execute('openMap', map.id);
  }
  function keyboard(event) {
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setQuery(state.map?.nome || ''); input.current.blur(); return; }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault(); setOpen(true);
      setActive(value => options.length ? (value + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length : -1);
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const found = options[active] || options.find(map => String(map.nome).trim().toLocaleLowerCase('pt-BR') === term) || options[0];
      if (found && (term || open)) choose(found);
      else { setQuery(state.map?.nome || ''); window.AtlasShellEditor?.notice('Mapa não encontrado.'); }
    }
  }
  return <div className="topbar-map" hidden={state.library}>
    <label className="sr-only" htmlFor="buscaMapa">Mapa ativo</label>
    <div className="map-search-wrap" ref={wrap}>
      <span className="map-search-icon" aria-hidden="true">⌕</span>
      <input id="buscaMapa" ref={input} type="search" autoComplete="off" value={query} disabled={!state.ready || Boolean(state.pending)}
        placeholder={state.project ? `Buscar mapa em ${state.project.nome}` : 'Buscar mapa...'} title="Buscar mapa pelo nome" role="combobox" aria-autocomplete="list"
        aria-expanded={open} aria-controls="listaMapasBusca" aria-activedescendant={open && active >= 0 && options[active] ? `shell-map-${active}` : undefined}
        onFocus={event => event.target.select()} onChange={event => { setQuery(event.target.value); setAll(false); setOpen(true); setActive(-1); }} onKeyDown={keyboard} />
      <button id="abrirListaMapas" className="map-list-button" type="button" title="Mostrar todos os mapas" aria-label="Mostrar todos os mapas" aria-expanded={open} aria-controls="listaMapasBusca"
        disabled={!state.ready || Boolean(state.pending)} onClick={() => { setAll(true); setOpen(!open); setActive(-1); input.current.focus(); }}>⌄</button>
      <div id="listaMapasBusca" className="map-search-list" role="listbox" aria-label="Mapas do projeto" hidden={!open} onPointerDown={event => event.preventDefault()}>
        {options.map((map, index) => <button id={`shell-map-${index}`} key={map.id} type="button" className="map-search-option" data-mapa-id={map.id} data-mapa-nome={map.nome} role="option" aria-selected={index === active} onClick={() => choose(map)}>{map.nome}</button>)}
        {!options.length && <p role="status">Nenhum mapa encontrado.</p>}
      </div>
    </div>
  </div>;
}
