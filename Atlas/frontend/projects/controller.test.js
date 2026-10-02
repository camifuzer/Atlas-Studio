import test from 'node:test';
import assert from 'node:assert/strict';
import { createLibraryController } from './controller.js';

const response = value => ({ ok: true, json: async () => value });
const editor = { createId: () => 'stable', open: async () => {}, notice() {}, projectUpdated() {} };

test('perda da resposta após commit permite nova tentativa sem duplicar projeto', async () => {
  const original = globalThis.fetch;
  const rows = new Map();
  let loseResponse = true;
  globalThis.fetch = async (path, options) => {
    if (path === '/api/transactions') {
      const value = JSON.parse(options.body).operations[0].value;
      rows.set(value.id, value);
      if (loseResponse) { loseResponse = false; throw new Error('Resposta perdida'); }
      return response({ results: [value.id] });
    }
    return response(path === '/api/projetos' ? [...rows.values()] : []);
  };
  try {
    const controller = createLibraryController(editor);
    controller.openDialog();
    await controller.submit({ nome: 'Novo', descricao: 'Texto' });
    assert.ok(controller.getSnapshot().dialog.error);
    assert.equal(controller.getSnapshot().dialog.id, 'stable');
    await controller.submit({ nome: 'Novo', descricao: 'Texto' });
    assert.equal(rows.size, 1);
    assert.equal(controller.getSnapshot().dialog, null);
  } finally { globalThis.fetch = original; }
});

test('resposta atrasada não substitui uma atualização mais recente', async () => {
  const original = globalThis.fetch;
  let calls = 0, release;
  globalThis.fetch = async path => {
    if (path !== '/api/projetos') return response([]);
    if (++calls === 1) return new Promise(resolve => { release = () => resolve(response([{ id: 'old' }])); });
    return response([{ id: 'new' }]);
  };
  try {
    const controller = createLibraryController(editor);
    const first = controller.refresh();
    await controller.refresh();
    release();
    await first;
    assert.equal(controller.getSnapshot().projects[0].id, 'new');
  } finally { globalThis.fetch = original; }
});

test('editar projeto removido mostra erro e não recria registro', async () => {
  const original = globalThis.fetch;
  let writes = 0;
  globalThis.fetch = async (path, options) => { if (options?.method === 'POST') writes++; return response(null); };
  try {
    const controller = createLibraryController(editor);
    controller.openDialog({ id: 'removed', nome: 'Antigo' });
    await controller.submit({ nome: 'Alterado', descricao: '' });
    assert.match(controller.getSnapshot().dialog.error, /excluído/);
    assert.equal(writes, 0);
  } finally { globalThis.fetch = original; }
});
