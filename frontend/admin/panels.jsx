import { Fragment, useState } from 'react';
import { PERMISSION_GROUPS, PERMISSION_LABELS, chaveObjeto, tituloObjeto, geometriaNome } from './model.js';

export function Switch({ active, label, small = false, mixed = false, onChange }) {
  return <button type="button" role={mixed ? 'checkbox' : 'switch'} aria-checked={mixed ? 'mixed' : active}
    aria-label={label} className={`admin-switch${active ? ' on' : ''}${small ? ' small' : ''}${mixed ? ' mixed' : ''}`}
    onClick={onChange} />;
}

export function PermissionsPanel({ user, update }) {
  return <>
    <div className="admin-panel-intro"><div><h2>Permissões funcionais</h2>
      <p>Estas políticas já podem ser configuradas e persistidas, mas só serão aplicadas ao editor após a integração com o sistema de usuários autenticados.</p></div></div>
    {PERMISSION_GROUPS.map(group => <Fragment key={group.title}>
      <p className="admin-section-title">{group.title}</p>
      <div className="permission-card">{group.items.map(key => <div key={key} className={`permission-row${user.permissoes[key] ? ' on' : ''}`}>
        <div className="permission-copy"><span className="permission-dot" /><span className="permission-name">{PERMISSION_LABELS[key]}</span></div>
        <Switch active={user.permissoes[key]} label={PERMISSION_LABELS[key]} onChange={() => update(next => { next.permissoes[key] = !next.permissoes[key]; })} />
      </div>)}</div>
    </Fragment>)}
  </>;
}

export function MapsPanel({ maps, user, update }) {
  return <>
    <div className="admin-panel-intro"><div><h2>Mapas do banco local</h2><p>O acesso usa o identificador interno do mapa. Renomear um mapa no Atlas Studio não perde esta configuração.</p></div></div>
    {!maps.length && <div className="admin-empty-state"><strong>Nenhum mapa encontrado</strong>Crie ou importe um mapa no Atlas Studio e use “Atualizar dados do Atlas”.</div>}
    <div className="map-grid">{maps.map(map => {
      const allowed = user.mapas.includes(map.id);
      return <button key={map.id} type="button" className={`map-card${allowed ? ' on' : ''}`} aria-pressed={allowed}
        onClick={() => update(next => { next.mapas = allowed ? next.mapas.filter(id => id !== map.id) : [...next.mapas, map.id]; })}>
        <span className="map-card-icon"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m3 6 6-2 6 2 6-2v14l-6 2-6-2-6 2V6Z" /><path d="M9 4v14M15 6v14" /></svg></span>
        <span className="map-card-copy"><span className="map-card-name">{map.nome}</span><span className="map-card-meta">{map.categorias.length} Tipo(s) · {map.objetos.length} objeto(s)</span></span>
        <span className="map-access-state">{allowed ? 'Acessível' : 'Sem acesso'}</span>
      </button>;
    })}</div>
  </>;
}

export function visibilityGroups(map) {
  return map.categorias.map(category => {
    const id = String(category.id || category.nome || 'tipo');
    return { category, id, objects: map.objetos.filter(object => String(object.categoriaId) === id) };
  }).filter(group => group.objects.length);
}

export function visibilityCount(maps, user) {
  let visible = 0, total = 0;
  for (const map of maps.filter(map => user.mapas.includes(map.id))) {
    for (const group of visibilityGroups(map)) {
      group.objects.forEach((object, index) => {
        total++;
        if (user.visibilidade[map.id]?.[group.id]?.[chaveObjeto(object, index)] !== false) visible++;
      });
    }
  }
  return { visible, total };
}

export function VisibilityPanel({ maps, user, update }) {
  const [expanded, setExpanded] = useState(new Set());
  const accessible = maps.filter(map => user.mapas.includes(map.id));
  return <>
    <div className="admin-panel-intro"><div><h2>Visibilidade por Tipo e objeto</h2><p>A árvore abaixo reflete as Camadas e os objetos existentes agora nos mapas liberados para este usuário.</p></div></div>
    {!accessible.length && <div className="admin-empty-state"><strong>Nenhum mapa acessível</strong>Libere pelo menos um mapa na aba “Mapas acessíveis” para configurar Tipos e objetos.</div>}
    {accessible.map(map => <section className="visibility-map" key={map.id}>
      <header className="visibility-map-head"><strong>{map.nome}</strong><span>{visibilityGroups(map).length} Camada(s) · {map.objetos.length} objeto(s)</span></header>
      {!visibilityGroups(map).length && <div className="visibility-object-row"><span className="visibility-object-copy"><strong>Nenhum objeto colocado neste mapa.</strong></span></div>}
      {visibilityGroups(map).map(group => {
        const values = user.visibilidade[map.id]?.[group.id] || {};
        const count = group.objects.filter((object, index) => values[chaveObjeto(object, index)] !== false).length;
        const all = count === group.objects.length, mixed = count > 0 && !all;
        const key = `${map.id}::${group.id}`, open = expanded.has(key);
        return <Fragment key={group.id}>
          <div className="visibility-category-row">
            <button type="button" className={`visibility-chevron${open ? ' expanded' : ''}`} aria-expanded={open}
              aria-label={`${open ? 'Recolher' : 'Expandir'} ${group.category.nome}`} onClick={() => setExpanded(previous => {
                const next = new Set(previous); if (next.has(key)) next.delete(key); else next.add(key); return next;
              })}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m9 6 6 6-6 6" /></svg></button>
            <span className="visibility-category-name">{group.category.nome || 'Tipo sem nome'}</span>
            <span className="visibility-category-count">{count}/{group.objects.length} visíveis</span>
            <Switch active={all} mixed={mixed} label={`Visibilidade de ${group.category.nome}`} onChange={() => update(next => {
              group.objects.forEach((object, index) => { next.visibilidade[map.id][group.id][chaveObjeto(object, index)] = !all; });
            })} />
          </div>
          <div className="visibility-objects" hidden={!open}>{group.objects.map((object, index) => {
            const id = chaveObjeto(object, index), active = values[id] !== false;
            return <div className="visibility-object-row" key={id}>
              <span className="visibility-object-copy"><strong>{tituloObjeto(object, index)}</strong><small>{geometriaNome(group.category.geometria)} · ID {id}</small></span>
              <Switch small active={active} label={`Visibilidade de ${tituloObjeto(object, index)}`} onChange={() => update(next => { next.visibilidade[map.id][group.id][id] = !active; })} />
            </div>;
          })}</div>
        </Fragment>;
      })}
    </section>)}
    {accessible.length > 0 && accessible.every(map => !visibilityGroups(map).length) && <div className="admin-empty-state"><strong>Os mapas acessíveis ainda estão vazios</strong>As Camadas aparecerão automaticamente quando objetos forem criados no Atlas Studio e os dados forem atualizados.</div>}
  </>;
}
