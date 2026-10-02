import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarEstado, normalizarUsuario, reconciliarVisibilidadeUsuario } from './model.js';

const map = (id, objects = ['o1', 'o2']) => ({ id, nome: id, categorias: [{ id: 'c' }], objetos: objects.map(id => ({ id, categoriaId: 'c' })) });

test('reconciliação preserva revogações e concede apenas mapas novos ao proprietário', () => {
  const old = { usuarios: [{ id: 'owner', proprietario: true, perfil: 'editor', mapas: ['old'] }], mapasConhecidos: ['old', 'revoked'] };
  const result = normalizarEstado(old, [map('old'), map('revoked'), map('new')]);
  assert.deepEqual(result.usuarios[0].mapas, ['old', 'new']);
  assert.deepEqual(old.usuarios[0].mapas, ['old']);
});

test('filtro visual de projeto não remove políticas de outros projetos', () => {
  const old = { usuarios: [{ id: 'u', perfil: 'restrito', mapas: ['a', 'b'], visibilidade: { b: { c: { o1: true, o2: false } } } }] };
  const result = normalizarEstado(old, [map('a'), map('b')]);
  assert.deepEqual(result.usuarios[0].mapas, ['a', 'b']);
  assert.deepEqual(result.usuarios[0].visibilidade.b.c, { o1: true, o2: false });
});

test('objetos novos seguem perfil; exclusões removem somente referências obsoletas', () => {
  const user = normalizarUsuario({ perfil: 'restrito', mapas: ['a', 'deleted'], visibilidade: { a: { c: { o1: true, old: true } } } });
  reconciliarVisibilidadeUsuario(user, [map('a')]);
  assert.deepEqual(user.mapas, ['a']);
  assert.deepEqual(user.visibilidade.a.c, { o1: true, o2: false });
});

test('cadastro legado conserva permissões explícitas e corrige seleção ausente', () => {
  const result = normalizarEstado({ usuarioAtualId: 'missing', usuarios: [{ id: 'u', name: 'Pessoa', perfil: 'visualizador', permissoes: { modoEdicao: true } }] }, []);
  assert.equal(result.usuarioAtualId, 'u');
  assert.equal(result.usuarios[0].nome, 'Pessoa');
  assert.equal(result.usuarios[0].permissoes.modoEdicao, true);
  assert.equal(result.usuarios[0].permissoes.criarMapa, false);
});
