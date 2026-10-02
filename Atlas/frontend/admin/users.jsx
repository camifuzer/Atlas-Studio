import { useEffect, useRef } from 'react';
import { iniciais, nomePerfil } from './model.js';

export function UserList({ document, search, select }) {
  const term = search.trim().toLocaleLowerCase('pt-BR');
  const users = document.usuarios.filter(user => `${user.nome} ${user.email}`.toLocaleLowerCase('pt-BR').includes(term));
  return <>{!users.length && <p className="admin-empty-users">Nenhum usuário corresponde à busca.</p>}
    {users.map(user => <button key={user.id} type="button" className={`admin-user-item${user.id === document.usuarioAtualId ? ' active' : ''}`} data-user-id={user.id} onClick={() => select(user.id)}>
      <span className="admin-avatar">{iniciais(user.nome)}</span>
      <span className={`profile-badge ${user.perfil}`}>{nomePerfil(user.perfil)}</span>
    </button>)}
  </>;
}

function useDialog(open) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
    return () => { if (dialog.open) dialog.close(); };
  }, [open]);
  return ref;
}

export function UserDialog({ open, close, users, add }) {
  const dialog = useDialog(open);
  const form = useRef(null);
  useEffect(() => {
    if (open) {
      form.current.reset();
      form.current.elements.email.setCustomValidity('');
      form.current.elements.name.focus();
    }
  }, [open]);
  function submit(event) {
    event.preventDefault();
    const fields = form.current.elements;
    const nome = fields.name.value.trim(), email = fields.email.value.trim();
    if (!nome || !email) return;
    if (users.some(user => user.email.toLocaleLowerCase('pt-BR') === email.toLocaleLowerCase('pt-BR'))) {
      fields.email.setCustomValidity('Já existe um usuário local com este e-mail.');
      fields.email.reportValidity();
      return;
    }
    add({ nome, email, perfil: fields.profile.value });
    close();
  }
  return <dialog ref={dialog} id="adminUserDialog" className="admin-dialog" aria-labelledby="adminUserDialogTitle" onCancel={close}>
    <form ref={form} id="adminUserForm" method="dialog" onSubmit={submit}>
      <header><div><span className="admin-eyebrow">Cadastro provisório</span><h2 id="adminUserDialogTitle">Adicionar usuário local</h2></div>
        <button id="adminCloseUserDialog" className="dialog-close" type="button" aria-label="Fechar" onClick={close}>×</button></header>
      <p className="dialog-help">Este cadastro poderá ser substituído pelo usuário correspondente quando a integração de identidade estiver disponível.</p>
      <label className="admin-field"><span>Nome</span><input id="adminUserName" name="name" type="text" required maxLength="100" autoComplete="off" placeholder="Nome do usuário" autoFocus /></label>
      <label className="admin-field"><span>E-mail</span><input id="adminUserEmail" name="email" type="email" required maxLength="160" autoComplete="off" placeholder="usuario@exemplo.com" onInput={event => event.target.setCustomValidity('')} /></label>
      <label className="admin-field"><span>Perfil inicial</span><select id="adminUserProfile" name="profile" defaultValue="restrito">
        <option value="restrito">Restrito</option><option value="visualizador">Visualizador</option><option value="editor">Editor</option>
      </select></label>
      <footer><button id="adminCancelUser" className="dialog-secondary" type="button" onClick={close}>Cancelar</button><button className="dialog-primary" type="submit">Adicionar usuário</button></footer>
    </form>
  </dialog>;
}

export function DeleteDialog({ user, close, confirm }) {
  const dialog = useDialog(Boolean(user));
  return <dialog ref={dialog} className="system-dialog" aria-labelledby="systemDialogTitle" onCancel={close}>
    <form className="system-dialog-form" method="dialog" onSubmit={event => { event.preventDefault(); confirm(user.id); close(); }}>
      <header className="system-dialog-header"><div><p className="system-dialog-eyebrow">Atlas Studio</p><h2 id="systemDialogTitle">Excluir usuário local</h2></div></header>
      <p className="system-dialog-message">Excluir o usuário “{user?.nome}” e todas as suas políticas?</p>
      <footer className="system-dialog-actions"><button type="button" className="system-dialog-cancel" onClick={close}>Cancelar</button><button type="submit" className="system-dialog-confirm danger">Excluir usuário</button></footer>
    </form>
  </dialog>;
}
