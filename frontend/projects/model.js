/* Projeção da Biblioteca: somente projetos e resumos; nenhum mapa completo. */
export function normalizeSearch(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

export function projectCards(projects, summaries, search = '') {
  const term = normalizeSearch(search).trim();
  const byProject = new Map();
  for (const summary of summaries) {
    if (!byProject.has(summary.projectId)) byProject.set(summary.projectId, []);
    byProject.get(summary.projectId).push(summary);
  }
  return [...projects].sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR')).map(project => {
    const maps = byProject.get(project.id) || [];
    return {
      project, maps, objects: maps.reduce((count, map) => count + (map.totalObjetos || 0), 0),
      updated: [project.atualizadoEm, ...maps.map(map => map.atualizadoEm)].filter(Boolean).sort().at(-1),
      visible: !term || normalizeSearch([project.nome, project.descricao, ...maps.map(map => map.nome)].join(' ')).includes(term),
    };
  }).filter(card => card.visible);
}

export function readableDate(value) {
  const date = new Date(value);
  return !value || Number.isNaN(date.getTime()) ? 'Ainda não editado'
    : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(date);
}

// Ao editar, campos desconhecidos são preservados; marcadores antigos de versão são descartados.
export function projectDocument(existing, draft, fields, now = new Date().toISOString()) {
  const { schemaVersion, versaoEditor, ...preserved } = existing || {};
  return {
    ...preserved, id: existing?.id || draft.id, nome: fields.nome.trim(), descricao: fields.descricao.trim(),
    criadoEm: existing?.criadoEm || draft.created, atualizadoEm: now,
  };
}
