export async function testarOtimizacoes({ avaliar, sessionId }) {
  await avaliar(sessionId, '(' + verificarOtimizacoes.toString() + ')()');
  console.log('Otimizações aprovadas: migração IndexedDB→SQLite, resumos atômicos, dependências de camadas, histórico limitado e undo/redo.');
}

async function verificarOtimizacoes() {
  const assert = (ok, texto) => { if (!ok) throw new Error(texto); };
  const transacao = tx => new Promise((resolve, reject) => { tx.oncomplete = resolve; tx.onerror = tx.onabort = () => reject(tx.error || new Error('abortada')); });
  const projeto = {id:'optimization',nome:'Otimizações'};
  await dbSalvarProjeto(projeto);
  await abrirProjeto(projeto.id);
  const categorias = [
    {id:'p',nome:'Ponto',geometria:'unico',icone:'pin',cor:'#99AAFF'},
    {id:'a',nome:'Área',geometria:'area',cor:'#99AAFF'},
    {id:'l',nome:'Ligação',geometria:'linha',comportamentoLinha:'relacao',cor:'#99AAFF',largura:4}
  ];
  const original = {id:'optimization-map',nome:'Teste',projectId:projeto.id,largura:1000,altura:800,
    imagem:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="800"/>'),categorias,fontesDados:[],
    objetos:[{id:'p1',nome:'Um',categoriaId:'p',x:100,y:100},{id:'p2',nome:'Dois',categoriaId:'p',x:200,y:100},
      {id:'a1',nome:'Área',categoriaId:'a',area:[{x:10,y:10},{x:400,y:10},{x:400,y:400},{x:10,y:400}]},
      {id:'l1',nome:'Ligação',categoriaId:'l',relacaoOrigemId:'p1',relacaoDestinoId:'p2',pontos:[{x:100,y:100},{x:200,y:100}]}]};
  await dbSalvar(original);
  await abrirMapa(original.id);
  setModo('visualizacao');
  const camada = id => layersObjetos.get(id).layers[0];
  const ponto2 = camada('p2'), linha = camada('l1'), area = camada('a1'), fundo = imageOverlay;
  objetoPorId('p1').x = 150;
  renderMapaCompleto();
  assert(camada('p2') === ponto2 && imageOverlay === fundo, 'Objeto e imagem não afetados mantêm identidade');
  assert(camada('l1') !== linha && camada('a1') !== area, 'Dependências: linha e consulta de área são atualizadas');
  assert(pontosLinha(objetoPorId('l1'), categoriaPorId('l'))[0].x === 150, 'Linha acompanha a âncora movida');
  for(let i=0;i<12;i++){ objetoPorId('l1').nome='Ligação '+i; renderMapaCompleto(); }
  assert(linhasEscalaveis.length === 1 && labelsEscalaveis.length === 1, 'Redesenhar não acumula registros de camadas');
  const corAnterior = camada('p2');
  mapaAtual.categorias[0].cor='#FFAAAA';renderMapaCompleto();
  assert(camada('p2') !== corAnterior, 'Mudar Tipo atualiza seus objetos');
  const removido = camada('p2');
  mapaAtual.objetos = mapaAtual.objetos.filter(o=>o.id!=='p2');renderMapaCompleto();
  assert(!layersObjetos.has('p2') && !mapa.hasLayer(removido), 'Excluir remove apenas as camadas correspondentes');
  await dbSalvar(mapaAtual);
  const resumo=(await dbListarResumosMapas())[0];
  assert(resumo.totalObjetos===3 && !('imagem' in resumo) && !('objetos' in resumo), 'Resumo atualizado sem payload de imagem/objetos');
  const abortada=transacaoMapas();
  gravarMapaNaTransacao(abortada,{...mapaAtual,nome:'Não gravar'});
  const terminou=transacao(abortada).catch(()=>{});abortada.abort();await terminou;
  assert((await dbListarResumosMapas())[0].nome===resumo.nome, 'Abortar não publica metadados parciais');
  assert((await dbPegar(mapaAtual.id)).nome===resumo.nome, 'Abortar preserva o mapa completo');
  const id=mapaAtual.id;
  iniciarHistoricoGlobal();
  mapaAtual.nome='Nome alterado';await dbSalvar(mapaAtual);finalizarHistoricoGlobalPendente();
  assert(await desfazerHistoricoGlobal(), 'Desfazer permanece funcional');
  assert((await dbListarResumosMapas())[0].nome===resumo.nome, 'Desfazer sincroniza resumo');
  assert(await refazerHistoricoGlobal(), 'Refazer permanece funcional');
  assert((await dbListarResumosMapas())[0].nome==='Nome alterado', 'Refazer sincroniza resumo');
  const maxEntradas=historicoGlobal.limiteEntradas,maxBytes=historicoGlobal.limiteBytes;
  historicoGlobal.limiteEntradas=3;iniciarHistoricoGlobal();
  for(let i=0;i<6;i++){registrarAlteracaoHistoricoGlobal(id,null,{...mapaAtual,nome:'Teste '+i});finalizarHistoricoGlobalPendente();}
  assert(estatisticasHistorico().entradas===3 && estatisticasHistorico().descartadas===3,'Histórico elimina primeiro as ações mais antigas');
  historicoGlobal.limiteBytes=1024;
  registrarAlteracaoHistoricoGlobal(id,mapaAtual,{...mapaAtual,descricao:'x'.repeat(3000)});
  registrarAlteracaoHistoricoGlobal('retorno',null,{...mapaAtual,id:'retorno'});
  assert(historicoGlobal.pendente.depois.size===2,'Orçamento não divide uma operação entre mapas');
  finalizarHistoricoGlobalPendente();
  assert(estatisticasHistorico().bytesEstimados<=1024,'Operação grande não rompe o orçamento do histórico');
  historicoGlobal.limiteEntradas=maxEntradas;historicoGlobal.limiteBytes=maxBytes;iniciarHistoricoGlobal();
  await dbExcluir(id);
  assert(!(await dbListarResumosMapas()).some(m=>m.id===id),'Excluir sincroniza resumos');

  // Exercita a migração real sem tocar no banco ativo nem depender de mocks de IDB.
  const temporario='atlas-migration-test-'+Date.now();
  const legado=await new Promise((resolve,reject)=>{
    const req=indexedDB.open(temporario,3);
    req.onupgradeneeded=()=>{req.result.createObjectStore('mapas',{keyPath:'id'});req.result.createObjectStore('projetos',{keyPath:'id'});req.result.createObjectStore('rascunhos',{keyPath:'id'});};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
  const tx=legado.transaction('mapas','readwrite');tx.objectStore('mapas').put(original);await transacao(tx);legado.close();
  try {
    const operations = await lerBancoLegado(temporario, ['mapas']);
    await AtlasAPI.post('/api/migrate', operations);
    await AtlasAPI.post('/api/migrate', operations);
    assert(JSON.stringify(await dbPegarMapaGlobal(original.id))===JSON.stringify(original),'Migração preserva integralmente o mapa legado');
    assert((await dbListarResumosMapas()).find(m => m.id === original.id).totalObjetos===4,'Migração cria o índice leve para mapas existentes');
    assert((await lerBancoLegado(temporario, ['mapas'])).length===1,'Migração conserva a cópia no navegador');
  } finally {
    indexedDB.deleteDatabase(temporario);
  }

  const fetchOriginal = window.fetch;
  try {
    window.fetch = (path, options) => path === '/api/transactions'
      ? Promise.reject(new TypeError('Falha de rede simulada')) : fetchOriginal(path, options);
    let falhou = false;
    try { await dbSalvar({...original,nome:'Não confirmar'}, {historico:false}); } catch { falhou = true; }
    assert(falhou && estadoPersistencia === 'erro', 'Falha de rede não é apresentada como salvamento');
  } finally { window.fetch = fetchOriginal; }
  assert((await dbPegarMapaGlobal(original.id)).nome === original.nome, 'Falha de rede preserva o mapa confirmado');
  await dbSalvar({...original,nome:'Nova tentativa'}, {historico:false});
  assert((await dbPegarMapaGlobal(original.id)).nome === 'Nova tentativa', 'Fila volta a salvar após falha de rede');
}
