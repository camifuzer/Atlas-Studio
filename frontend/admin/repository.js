import { request, post } from '../http-client.js';
import { ADMIN_STATE_ID } from './model.js';

export async function loadMaps() {
  const maps = await request('/api/mapas');
  return maps.map(map => ({
    id: map.id, nome: map.nome || 'Mapa sem nome', projectId: map.projectId || '',
    categorias: map.categorias || [], objetos: map.objetos || [],
  })).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

export async function loadAdmin(projectId) {
  const [maps, saved, project] = await Promise.all([
    loadMaps(), request('/api/configuracoes/' + ADMIN_STATE_ID),
    projectId ? request('/api/projetos/' + encodeURIComponent(projectId)) : null,
  ]);
  return { maps, saved, project };
}

export async function saveAdmin(document) {
  const snapshot = { ...document, atualizadoEm: new Date().toISOString() };
  await post('/api/transactions', [{ store: 'configuracoes', action: 'put', value: snapshot }]);
  return snapshot;
}
