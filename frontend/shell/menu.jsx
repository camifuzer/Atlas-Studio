import { useEffect, useRef } from 'react';
import { MENU_GROUPS } from './commands.jsx';
import { commandEnabled } from './state.js';

export default function MainMenu({ store, state, execute }) {
  const trigger = useRef(null), menu = useRef(null);
  const items = () => [...menu.current.querySelectorAll('.menu-command')].filter(item => !item.disabled);
  useEffect(() => {
    const outside = event => { if (!menu.current?.contains(event.target) && !trigger.current?.contains(event.target)) store.menu(false); };
    const escape = event => {
      if (event.key !== 'Escape' || !store.getSnapshot().menuOpen) return;
      event.preventDefault(); event.stopImmediatePropagation(); store.menu(false); trigger.current.focus();
    };
    const resize = () => store.menu(false);
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape, true);
    window.addEventListener('resize', resize);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape, true); window.removeEventListener('resize', resize); };
  }, [store]);
  function keyboard(event) {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const enabled = items(); if (!enabled.length) return;
    event.preventDefault();
    const index = enabled.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? enabled.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + enabled.length) % enabled.length;
    enabled[next].focus();
  }
  const themeLabel = state.light ? 'Ativar modo escuro' : 'Ativar modo claro';
  return <div className="top-actions">
    <button id="abrirMenuPrincipal" ref={trigger} type="button" className={`top-button icon-only main-menu-trigger${state.menuOpen ? ' ativo' : ''}`}
      title={state.menuOpen ? 'Fechar menu principal' : 'Abrir menu principal'} aria-label={state.menuOpen ? 'Fechar menu principal' : 'Abrir menu principal'} aria-haspopup="menu" aria-expanded={state.menuOpen} aria-controls="menuPrincipal"
      onClick={() => store.menu(!state.menuOpen)} onKeyDown={event => { if (event.key === 'ArrowDown') { event.preventDefault(); store.menu(true, true); } }}>
      <svg className="top-action-svg" aria-hidden="true" viewBox="0 0 24 24"><path d="M5 7h14M5 12h14M5 17h14" /></svg>
    </button>
    <div id="menuPrincipal" ref={menu} className="main-command-menu" role="menu" aria-label="Menu principal" hidden={!state.menuOpen} onKeyDown={keyboard}>
      {MENU_GROUPS.map(group => <div className="main-command-group" key={group.title}>
        <span className="main-command-group-title">{group.title}</span>
        {group.commands.map(command => command.id === 'administracao'
          ? <a key={command.id} href="admin.html" className={command.className} role="menuitem" onClick={() => store.menu(false)}><span className="menu-command-icon" aria-hidden="true">{command.icon}</span><span className="menu-command-label">{command.label}</span></a>
          : <button key={command.id} id={command.id} type="button" className={command.className} role="menuitem" disabled={!commandEnabled(command.id, state)}
              title={command.id === 'alternarTema' ? themeLabel : undefined} aria-label={command.id === 'alternarTema' ? themeLabel : undefined}
              onClick={() => { store.menu(false); void execute(command.id); }}>
              <span className={`menu-command-icon${command.id === 'alternarTema' ? ' tema-icone' : ''}`} aria-hidden="true">{command.id === 'alternarTema' ? (state.light ? '☾' : '☼') : command.icon}</span>
              <span className="menu-command-label">{command.id === 'alternarTema' ? themeLabel : command.label}</span>{command.shortcut && <kbd className="menu-command-shortcut">{command.shortcut}</kbd>}
            </button>)}
        {group.title === 'Backup e dados' && <small id="ultimoBackup" className="backup-indicator">{state.backup ? `Última exportação: ${new Date(state.backup).toLocaleString('pt-BR')}` : 'Nenhum backup exportado registrado'}</small>}
      </div>)}
    </div>
  </div>;
}
