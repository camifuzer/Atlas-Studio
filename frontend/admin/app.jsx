import { useEffect, useState } from 'react';
import { useAdmin } from './use-admin.js';
import { ALL_PERMISSION_KEYS, PROFILE_PRESETS, clone, gerarId, iniciais, nomePerfil, normalizarUsuario, reconciliarVisibilidadeUsuario } from './model.js';
import { PermissionsPanel, MapsPanel, VisibilityPanel, visibilityCount } from './panels.jsx';
import { UserList, UserDialog, DeleteDialog } from './users.jsx';

export default function AdminApp() {
  const [projectId] = useState(() => new URLSearchParams(location.search).get('project'));
  const admin = useAdmin(projectId);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('permissions');
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [light, setLight] = useState(() => window.document.documentElement.classList.contains('tema-claro'));
  useEffect(() => {
    window.document.documentElement.classList.toggle('tema-claro', light);
    window.document.documentElement.style.colorScheme = light ? 'light' : 'dark';
    try { localStorage.setItem('temaInterface', light ? 'claro' : 'escuro'); } catch { /* Preferência opcional. */ }
  }, [light]);
  const adminReady = Boolean(admin.data);
  useEffect(() => {
    if (adminReady) window.document.body.dataset.adminReady = 'true';
    return () => { delete window.document.body.dataset.adminReady; };
  }, [adminReady]);
  const document = admin.data?.document;
  const user = document?.usuarios.find(user => user.id === document.usuarioAtualId);
  const maps = (admin.data?.maps || []).filter(map => !projectId || map.projectId === projectId);
  const permissionCount = user ? Object.values(user.permissoes).filter(Boolean).length : 0;
  const accessibleCount = user ? maps.filter(map => user.mapas.includes(map.id)).length : 0;
  const visible = user ? visibilityCount(maps, user) : { visible: 0, total: 0 };
  function updateUser(change) {
    admin.edit((next, allMaps) => {
      const selected = next.usuarios.find(item => item.id === next.usuarioAtualId);
      change(selected);
      reconciliarVisibilidadeUsuario(selected, allMaps);
    });
  }
  function applyProfile(profile) {
    updateUser(next => { next.perfil = profile; next.permissoes = clone(PROFILE_PRESETS[profile]); next.visibilidade = {}; });
  }
  function addUser(fields) {
    const newUser = normalizarUsuario({ ...fields, id: gerarId('usuario'), status: 'nunca acessou' });
    admin.edit((next, allMaps) => {
      reconciliarVisibilidadeUsuario(newUser, allMaps);
      next.usuarios.push(newUser); next.usuarioAtualId = newUser.id;
    });
    setSearch('');
    admin.notify('Usuário local adicionado. Salve as políticas para confirmar.');
  }
  function deleteUser(id) {
    admin.edit(next => {
      const target = next.usuarios.find(item => item.id === id);
      if (!target || target.proprietario || next.usuarios.length <= 1) return;
      next.usuarios = next.usuarios.filter(item => item.id !== id);
      next.usuarioAtualId = next.usuarios[0].id;
    });
    admin.notify('Usuário local removido. Salve as políticas para confirmar.');
  }
  return <>
  <aside className="admin-app-sidebar">
    <a className="admin-brand" href="index.html#projetos" aria-label="Abrir meus projetos no Atlas Studio">
      <span className="admin-brand-mark" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="m3 6 5-3 8 3 5-3v15l-5 3-8-3-5 3Z"></path>
          <path d="M8 3v15M16 6v15"></path>
        </svg>
      </span>
      <span>Atlas Studio</span>
    </a>

    <nav className="admin-app-nav" aria-label="Navegação principal">
      <span>Navegação</span>
      <a href="index.html#projetos" aria-label="Biblioteca">
        <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="4" width="6" height="6" rx="1"></rect><rect x="4" y="14" width="6" height="6" rx="1"></rect><rect x="14" y="14" width="6" height="6" rx="1"></rect></svg>
        Biblioteca
      </a>
      <a className="active" href="admin.html" aria-current="page" aria-label="Administração">
        <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"></circle><path d="M3.5 19c.5-3.2 2.3-5 5.5-5s5 1.8 5.5 5M17 10v6M14 13h6"></path></svg>
        Administração
      </a>
    </nav>

    <div className="admin-app-user">
      <span className="admin-avatar">AL</span>
      <span><strong>Administrador local</strong><small>Editor</small></span>
    </div>
  </aside>

  <div className="admin-workspace">
  <header className="admin-topbar">
    <label className="admin-global-search">
      <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"></circle><path d="m16 16 4 4"></path></svg>
      <input id="adminGlobalSearch" value={search} onChange={event => setSearch(event.target.value)} type="search" placeholder="Buscar usuário" aria-label="Buscar usuário" />
    </label>

    <div className="admin-top-actions">
      <span id="adminSyncState" className={`admin-sync-state${admin.dirty ? " pending" : ""}`} role="status">{admin.busy ? "Sincronizando…" : admin.error ? "Falha na operação" : admin.dirty ? "Alterações administrativas não salvas" : `${maps.length} mapa(s) sincronizado(s) · políticas locais salvas, não aplicadas`}</span>
      <button id="adminTheme" onClick={() => setLight(value => !value)} className="admin-icon-button" type="button" title={light ? "Ativar modo escuro" : "Ativar modo claro"} aria-label={light ? "Ativar modo escuro" : "Ativar modo claro"}>
        <span className="admin-theme-icon" aria-hidden="true">{light ? "☾" : "☼"}</span>
      </button>
       <a className="admin-back" href="index.html">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"></path></svg>
        <span>Voltar ao mapa</span>
      </a>
    </div>
  </header>

  <section className="admin-page-heading">
    <div>
      <p>Gerenciamento do projeto</p>
      <h1>Usuários e permissões</h1>
      <span>Configure perfis de acesso e políticas por mapa.</span>
    </div>
    <div id="adminProjectContext" className="admin-project-context" hidden={!projectId}><span>Filtrando por projeto:</span><strong>{admin.data?.project?.nome || "Projeto selecionado"}</strong><a href="admin.html" aria-label="Remover filtro do projeto">×</a></div>
  </section>

  <section className="integration-notice" aria-label="Estado da integração">
    <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v6M12 7h.01"></path></svg>
    <p>
      <strong>Políticas não aplicadas ao editor.</strong>
      Estes cadastros são provisórios e salvos no banco local. Não controlam acesso nem restringem alterações nos mapas; a aplicação depende da futura integração de identidade e autorização.
    </p>
  </section>

  {admin.error && <div className="admin-error-state" role="alert">{admin.error}{!admin.data && <button type="button" disabled={admin.busy} onClick={admin.retry}>Tentar novamente</button>}</div>}
  {!admin.data && !admin.error && <p role="status">Carregando Administração…</p>}
  {admin.data && <fieldset className="admin-controls" disabled={admin.busy}><div className="admin-layout">
    <aside className="admin-sidebar" aria-label="Usuários">
      <div className="admin-sidebar-head">
        <div className="admin-sidebar-title-row">
          <p id="adminUserCount" className="admin-eyebrow">Usuários locais · {document.usuarios.length}</p>
          <span className="source-chip">Provisório</span>
        </div>

        <label className="admin-search" htmlFor="adminUserSearch">
          <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
          <input id="adminUserSearch" value={search} onChange={event => setSearch(event.target.value)} type="search" autoComplete="off" placeholder="Buscar usuário…" />
        </label>
      </div>

      <div id="adminUserList" className="admin-user-list"><UserList document={document} search={search} select={admin.select} /></div>

      <div className="admin-sidebar-foot">
        <button id="adminAddUser" onClick={() => setAdding(true)} className="admin-add-button" type="button">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>
          Adicionar usuário local
        </button>
      </div>
    </aside>

    <main className="admin-main">
      <header className="admin-main-head">
        <div className="admin-person">
          <div id="adminWhoAvatar" className="admin-avatar large">{iniciais(user.nome)}</div>
          <div className="admin-person-copy">
            <div className="admin-person-title-row">
              <h1 id="adminWhoName">{user.nome}</h1>
              <span id="adminWhoSource" className="source-chip">{user.origem === "externo" ? "Migrado" : "Local"}</span>
            </div>
            <p><span id="adminWhoEmail">{user.email}</span><span aria-hidden="true">·</span><span id="adminWhoStatus">{user.status}</span></p>
          </div>
        </div>

        <div className="admin-head-actions">
          <div className="profile-group" aria-label="Perfil base">
            <span>Perfil base:</span>
            <button className={`profile-button editor${user.perfil === "editor" ? " selected" : ""}`} aria-pressed={user.perfil === "editor"} onClick={() => applyProfile("editor")} data-profile="editor" type="button">Editor</button>
            <button className={`profile-button visualizador${user.perfil === "visualizador" ? " selected" : ""}`} aria-pressed={user.perfil === "visualizador"} onClick={() => applyProfile("visualizador")} data-profile="visualizador" type="button">Visualizador</button>
            <button className={`profile-button restrito${user.perfil === "restrito" ? " selected" : ""}`} aria-pressed={user.perfil === "restrito"} onClick={() => applyProfile("restrito")} data-profile="restrito" type="button">Restrito</button>
          </div>

          <button id="adminDeleteUser" disabled={user.proprietario || document.usuarios.length <= 1} onClick={() => setDeleting(user)} className="admin-delete-button" type="button" title={user.proprietario ? "O administrador local principal não pode ser excluído" : "Excluir usuário local"}>
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13"></path></svg>
            <span>Excluir</span>
          </button>

          <button id="adminSave" onClick={admin.save} className="admin-save-button" type="button" disabled={!admin.dirty || admin.busy}>
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z"></path><path d="M9 21v-6h6v6M9 3v5h6"></path></svg>
            Salvar políticas
          </button>
        </div>
      </header>

      <nav className="admin-tabs" aria-label="Configurações administrativas">
        <button className={`admin-tab${tab === "permissions" ? " active" : ""}`} data-tab="permissions" onClick={() => setTab("permissions")} type="button">Permissões <span id="adminPermissionCount">{`(${permissionCount}/${ALL_PERMISSION_KEYS.length})`}</span></button>
        <button className={`admin-tab${tab === "maps" ? " active" : ""}`} data-tab="maps" onClick={() => setTab("maps")} type="button">Mapas acessíveis <span id="adminMapCount">{`(${accessibleCount}/${maps.length})`}</span></button>
        <button className={`admin-tab${tab === "visibility" ? " active" : ""}`} data-tab="visibility" onClick={() => setTab("visibility")} type="button">Visibilidade <span id="adminVisibilityCount">{`(${visible.visible}/${visible.total})`}</span></button>
      </nav>

      <section id="adminPermissionsPanel" className="admin-content" data-panel="permissions" hidden={tab !== "permissions"}><PermissionsPanel user={user} update={updateUser} /></section>
      <section id="adminMapsPanel" className="admin-content" data-panel="maps" hidden={tab !== "maps"}><MapsPanel maps={maps} user={user} update={updateUser} /></section>
      <section id="adminVisibilityPanel" className="admin-content" data-panel="visibility" hidden={tab !== "visibility"}><VisibilityPanel maps={maps} user={user} update={updateUser} /></section>

      <footer className="admin-statusbar">
        <span><b id="adminStatPermissions">{permissionCount}</b> permissões ativas</span>
        <span className="status-separator" aria-hidden="true"></span>
        <span><b id="adminStatMaps">{accessibleCount}</b> mapas acessíveis</span>
        <span className="status-separator" aria-hidden="true"></span>
        <span id="adminStatProfile" className={`profile-status ${user.perfil}`}>{nomePerfil(user.perfil)}</span>
        <span className="status-spacer"></span>
        <button id="adminRefreshMaps" onClick={admin.refresh} className="admin-refresh-button" type="button">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M20 11a8 8 0 1 0-2.3 5.7"></path><path d="M20 5v6h-6"></path></svg>
          Atualizar dados do Atlas
        </button>
      </footer>
    </main>
  </div></fieldset>}
  </div>
    <UserDialog open={adding} close={() => setAdding(false)} users={document?.usuarios || []} add={addUser} />
    <DeleteDialog user={deleting} close={() => setDeleting(null)} confirm={deleteUser} />
    <div id="adminToast" className={`admin-toast${admin.notice ? ' show' : ''}`} role="status" aria-live="polite">{admin.notice}</div>
  </>;
}
