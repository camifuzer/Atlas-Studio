import test from 'node:test';
import assert from 'node:assert/strict';
import { projectCards, projectDocument } from './model.js';

test('busca por mapa sem acentos conserva projeto vazio e contagens', () => {
  const projects = [{ id: 'empty', nome: 'Vazio' }, { id: 'legacy', nome: 'Árvore', descricao: 'Antigo' }];
  const summaries = [{ id: 'm', projectId: 'legacy', nome: 'Coração', totalObjetos: 3 }];
  assert.equal(projectCards(projects, summaries).length, 2);
  const cards = projectCards(projects, summaries, 'coracao');
  assert.equal(cards[0].project.id, 'legacy');
  assert.equal(cards[0].objects, 3);
  assert.equal(projectCards(projects, summaries, 'ausente').length, 0);
  assert.equal(projects[0].id, 'empty', 'a projeção não altera a ordem dos dados originais');
});

test('editar metadados preserva campos úteis e remove marcadores antigos de versão', () => {
  const old = { id: 'old', criadoEm: '2000-01-01', schemaVersion: 4, versaoEditor: 7, configuracaoAntiga: { unidade: 'km' }, nome: 'Antes' };
  const next = projectDocument(old, { id: 'unused' }, { nome: ' Depois ', descricao: ' Texto ' }, '2026-09-14');
  assert.equal(next.id, 'old');
  assert.equal(next.criadoEm, old.criadoEm);
  assert.equal('schemaVersion' in next, false);
  assert.equal('versaoEditor' in next, false);
  assert.deepEqual(next.configuracaoAntiga, old.configuracaoAntiga);
  assert.equal(next.nome, 'Depois');
  assert.equal(old.nome, 'Antes');
});
