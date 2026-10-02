import { request, post } from '../http-client.js';

export async function loadLibrary() {
  const [projects, summaries] = await Promise.all([request('/api/projetos'), request('/api/resumosMapas')]);
  return { projects, summaries };
}
export const getProject = id => request('/api/projetos/' + encodeURIComponent(id));
export const saveProject = value => post('/api/transactions', [{ store: 'projetos', action: 'put', value }]);
export const deleteProject = id => post('/api/transactions', [{ store: 'projetos', action: 'delete', id }]);
