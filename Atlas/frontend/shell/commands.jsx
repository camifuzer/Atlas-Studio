/* Registro dos comandos visíveis; executores ficam na ponte com o editor. */
export const MENU_GROUPS = [
  { title: "Navegação", commands: [
    { id: "pesquisarObjetos", label: "Pesquisar objetos", className: "menu-command", shortcut: "Ctrl F", icon: <> <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"></circle><path d="m16 16 4 4"></path></svg> </> },
  ] },
  { title: "Projeto", commands: [
    { id: "abrirProjetos", label: "Meus projetos", className: "menu-command", shortcut: null, icon: <> <svg viewBox="0 0 24 24"><rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="4" width="6" height="6" rx="1"></rect><rect x="4" y="14" width="6" height="6" rx="1"></rect><rect x="14" y="14" width="6" height="6" rx="1"></rect></svg> </> },
    { id: "migrarDadosNavegador", label: "Migrar dados deste navegador", className: "menu-command", shortcut: null, icon: <> ⇧ </> },
    { id: "novoProjetoMenu", label: "Novo projeto", className: "menu-command menu-primary", shortcut: null, icon: <> <svg viewBox="0 0 24 24"><path d="M4 7h6l2 2h8v10H4Z"></path><path d="M12 12v5M9.5 14.5h5"></path></svg> </> },
  ] },
  { title: "Mapa", commands: [
    { id: "novoMapa", label: "Criar mapa", className: "menu-command menu-primary", shortcut: null, icon: <> ⊕ </> },
    { id: "renomearMapa", label: "Renomear mapa", className: "menu-command", shortcut: null, icon: <> ✎ </> },
    { id: "excluirMapa", label: "Excluir mapa", className: "menu-command menu-danger", shortcut: null, icon: <> × </> },
  ] },
  { title: "Backup e dados", commands: [
    { id: "verificarVinculos", label: "Verificar vínculos do projeto", className: "menu-command", shortcut: null, icon: <>  </> },
    { id: "salvarProjeto", label: "Salvar projeto", className: "menu-command menu-primary", shortcut: "Ctrl S", icon: <> <svg viewBox="0 0 24 24"><path d="M5 4h12l2 2v14H5Z"></path><path d="M8 4v6h8V4M8 20v-6h8v6"></path></svg> </> },
    { id: "exportarMapa", label: "Exportar projeto", className: "menu-command", shortcut: null, icon: <> <svg viewBox="0 0 24 24"><path d="M12 3v12"></path><path d="m7 10 5 5 5-5"></path><path d="M5 20h14"></path></svg> </> },
    { id: "importarMapa", label: "Importar projeto", className: "menu-command", shortcut: null, icon: <> <svg viewBox="0 0 24 24"><path d="M12 21V9"></path><path d="m7 14 5-5 5 5"></path><path d="M5 4h14"></path></svg> </> },
  ] },
  { title: "Aplicativo", commands: [
    { id: "administracao", label: "Administração", className: "menu-command admin-entry", shortcut: null, icon: <> <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"></circle><path d="M3.5 19c.5-3.2 2.3-5 5.5-5s5 1.8 5.5 5"></path><path d="M17 10v6M14 13h6"></path></svg> </> },
    { id: "alternarTema", label: "Ativar modo claro", className: "menu-command", shortcut: null, icon: <>  </> },
  ] },
];
