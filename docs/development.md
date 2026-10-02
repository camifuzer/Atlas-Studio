# Atlas Studio — Guia técnico

Para executar o aplicativo, siga o [README](../README.md). As instruções de operação ficam no [guia de uso](user-guide.md).

## Estrutura

A entrada `frontend/shell/main.jsx` monta a estrutura React e carrega os scripts clássicos do canvas e dos painéis, na sequência declarada em `frontend/shell/editor-scripts.js`. Em seguida, monta a Biblioteca. Os módulos clássicos compartilham o escopo global e dependem dessa ordem; `scripts/validate.mjs` verifica a sequência e impede a duplicação de scripts no HTML.

| Arquivos em `js/` | Responsabilidade |
| --- | --- |
| `core.js`, `geometry.js` | Estado, DOM, regras centrais, coordenadas, medidas e polígonos |
| `api.js`, `persistence.js`, `history.js` | Cliente HTTP, transações no SQLite, snapshots e undo/redo |
| `legacy-migration.js` | Leitura do IndexedDB antigo e cópia sem sobrescrever pela API |
| `projects.js`, `navigation.js` | Ponte Biblioteca/editor, recuperação de projetos, câmera, seletores e abertura de mapas |
| `maps.js`, `rendering.js` | Camadas Leaflet, Inspector e invalidação incremental |
| `editor.js`, `interaction.js` | Formulários, geometria em edição, ações visíveis e teclado |
| `data.js`, `connections.js`, `connection-editor.js` | Planilhas, backups, referências entre mapas, seleção de locais e integridade |
| `recovery.js`, `reading.js` | Rascunhos, estado de salvamento, consulta e filtros |
| `bootstrap.js`, `system-dialog.js` | Inicialização, eventos e diálogos |
| `http-client.js` | Transporte HTTP compartilhado entre editor clássico e React |

| Arquivos em `css/` | Responsabilidade |
| --- | --- |
| `base.css`, `shell.css` | Fundamentos, estrutura da página e integração com Leaflet |
| `workflow.css`, `creation.css` | Ferramentas contextuais, seleção de Tipos e criação de objetos |
| `inspector.css`, `editor.css` | Painel de edição, busca, conexões, pop-ups e menu do mapa |
| `admin.css` | Estrutura e controles da Administração |
| `atlas-theme.css`, `shared-components.css` | Base visual, biblioteca, navegação e componentes compartilhados |
| `controls.css` | Tipografia, espaçamento, foco e estados dos controles |
| `studio-interface.css` | Paleta, apresentação dos componentes e layouts responsivos |
| `components/reading.css` | Consultas, filtros e formulários de conexão |
| `responsive.css` | Contrato final do sistema visual, viewport, toque, caixas e Inspector |

`studio-interface.css` encerra os estilos compartilhados, `components/reading.css` acrescenta os fluxos de consulta e `responsive.css` fecha a cascata do editor com os tokens e contratos visuais/responsivos. Há regras de componentes distribuídas entre folhas; a ordem e a especificidade determinam o resultado. Ao consolidá-las, confira o editor e a Administração nos temas claro e escuro.

Os arquivos usam nomes em inglês e `kebab-case`. Comentários e documentação são escritos em português e descrevem responsabilidades, comportamento e restrições técnicas. Nomes de arquivos devem indicar sua função, sem rótulos de entrega ou numeração de etapas.

## Administração React

`admin.html` contém o ponto de montagem e os estilos compartilhados. `app/frontend.py` lê `dist/.vite/manifest.json` e injeta os assets com hash gerados pelo Vite; a mesma rota `/admin.html?project=...` continua funcionando. O servidor publica apenas `dist/assets/`, nunca o manifesto, fontes JSX, banco ou dependências. Na ausência do build, a rota informa como gerá-lo, e o build deve ser gerado antes de abrir a aplicação.

| Arquivo | Responsabilidade |
| --- | --- |
| `frontend/admin/main.jsx`, `app.jsx` | Montagem React, estrutura da tela, tema e seleção de aba |
| `frontend/admin/users.jsx` | Lista, cadastro e confirmação de exclusão |
| `frontend/admin/panels.jsx` | Permissões, acesso a mapas e árvore de visibilidade |
| `frontend/admin/use-admin.js` | Documento em edição, carga, atualização, salvamento e falhas |
| `frontend/admin/model.js` | Normalização de cadastros e reconciliação das políticas existentes |
| `frontend/admin/repository.js` | Operações administrativas na API existente |
| `frontend/http-client.js` | Adaptador de módulo para o transporte de `js/http-client.js` |

React é o único responsável pelo DOM da Administração. O script antigo `js/admin.js` foi substituído. O canvas e os painéis do editor usam `js/api.js` como ponte de transações sobre o mesmo transporte HTTP; geometria, Leaflet e estado global do editor não participam do piloto.

O documento administrativo tem uma única fonte de estado no hook. Edições são feitas sobre cópias e só perdem o indicador de pendência após o commit. Controles ficam indisponíveis durante gravação/atualização para não perder edições concorrentes na mesma tela. Atualizar mapas preserva alterações ainda não salvas; falhas permitem nova tentativa. O filtro de projeto afeta a exibição, nunca limita os mapas usados na reconciliação global. Os cadastros continuam sem autenticação/autorização efetiva.

`npm run dev` recompila em modo watch; use o servidor Python e recarregue a página para ver mudanças. `npm run build` gera os arquivos finais. Não se usa o servidor de desenvolvimento do Vite neste piloto, evitando alterar origens ou contratos da API. `dist/` é gerado e ignorado pelo Git; `npm run package:local` o inclui na distribuição pronta para usuários sem Node.js.

Leaflet e SheetJS são dependências locais do build. A entrada `frontend/shell/main.jsx` publica temporariamente `window.L` para os scripts clássicos e expõe `carregarSheetJS()`; o módulo de planilhas é baixado do próprio servidor somente ao iniciar uma importação. Não reintroduza tags de CDN no HTML. O SheetJS usa o pacote oficial distribuído pelo projeto, pois o pacote antigo do registro npm não recebe as correções atuais.

## Biblioteca React e compatibilidade

`frontend/projects/` é a única implementação dos cartões, busca e formulários da Biblioteca. `index.html` mantém os contêineres externos do editor; `app/frontend.py` injeta a entrada `frontend/shell/main.jsx`, que chama `mountLibrary()` de `frontend/projects/main.jsx`, através do mesmo manifesto Vite usado pela Administração. A busca no topo e os diálogos usam portais React, para conservar suas posições sem duas implementações da tela.

| Arquivo | Responsabilidade |
| --- | --- |
| `main.jsx`, `library.jsx`, `dialogs.jsx` | Montagem, cartões, buscas sincronizadas, criação/edição e confirmação de exclusão |
| `controller.js` | Uma fonte de estado; carga, atualização, operações e erros |
| `repository.js` | Consultas de projetos/resumos e gravações pela API |
| `model.js` | Busca, contagens, datas e composição de metadados preservando campos antigos |
| `js/projects.js` | Recuperação dos contêineres legados e transição entre Biblioteca e editor |

A ponte `window.AtlasProjectEditor` é deliberada: React pede abertura, navegação ou limpeza das câmeras; somente o editor clássico controla `projetoAtual`, Leaflet, rascunhos e histórico. `renderizarProjetos()` permite atualizar a Biblioteca após migrações. A inicialização espera o registro da interface React antes de restaurar a tela.

`gerarIdProjeto()` continua sendo usado pelos importadores e pela recuperação de mapas antigos. `garantirEstruturaProjetos()` conserva IDs ao reconstruir projetos ausentes. Essas rotinas têm consumidores ativos e testes de compatibilidade. Não remover por terem origem na implementação anterior.

Não há renderização antiga de cartões, listeners antigos de formulários, estado duplicado de busca ou rotina de exclusão paralela em `js/projects.js`. `scripts/validate.mjs` verifica essa fronteira para evitar reintroduzir essas responsabilidades. IDs nos componentes continuam como contratos de testes, estilos e acessibilidade.

A listagem consulta apenas projetos e resumos, sem imagens. Digitar na busca filtra os dados carregados em memória. Respostas de cargas ultrapassadas são descartadas. Ao editar, o registro atual é relido e seus campos desconhecidos, ID e data de criação são conservados; marcadores antigos de versão são descartados e um projeto removido não é recriado silenciosamente. A criação mantém o mesmo ID durante uma nova tentativa após falha de resposta. Exclusão continua atômica no servidor, incluindo mapas e rascunhos.

Execute `python3 scripts/run-browser-tests.py --library-only` para conferir a Biblioteca isoladamente, com banco e perfil temporários. A suíte completa inclui esses cenários, além de importação, recuperação, Administração, conexões e histórico. Após alterar código do servidor, reinicie o Python antes de abrir a interface atualizada; os testes já iniciam um servidor atualizado.

## Persistência e integridade

O arquivo `storage/atlas.sqlite3` é o armazenamento principal. `app/server.py` serve a interface e a API na mesma origem, exclusivamente em loopback. `app/database.py` implementa consultas parametrizadas e lotes SQLite. A estrutura é garantida de forma idempotente ao abrir o banco, sem gravar números de versão nos documentos.

As tabelas `projetos`, `mapas`, `rascunhos` e `configuracoes` têm ID, project_id indexado e documento JSON. Objetos, Tipos, Fontes e imagens incorporadas permanecem no documento do mapa para preservar os formatos atuais. Esta etapa não normaliza todas as entidades: futuras consultas específicas podem justificar tabelas próprias. `resumosMapas` contém apenas metadados e é atualizada pelo servidor na mesma transação do mapa.

- Use `dbListarResumosMapas()` em seletores. `dbTodos()` lê mapas completos do projeto; `dbTodosGlobais()` permanece para fluxos globais e testes.
- `AtlasAPI` mantém uma ponte pequena para a interface de transações já usada pelo editor. As operações são copiadas ao enfileirar e enviadas em um POST por lote. Acrescente operações sincronamente antes do envio; não misture leituras e escritas no lote. Callbacks de sucesso só executam após o commit. A fila continua utilizável depois de falhas. Cancelamento só é possível antes do envio.
- Use `transacaoMapas`, `gravarMapaNaTransacao` e `excluirMapaNaTransacao` em alterações pareadas, histórico e importação. O cliente não grava resumos diretamente.
- Exclusão de projeto remove seus mapas, resumos e rascunhos em uma transação. Exclusão de mapa remove também seu resumo e rascunhos.
- Rascunhos ficam separados dos objetos publicados. `localStorage` conserva preferências e a recuperação emergencial no fechamento; não funciona como banco principal.
- A migração lê os bancos legados `atlas-studio-map-editor` e `atlas-studio-administracao` apenas mediante a ação no menu. Nenhum dado original é apagado. Um conflito de conteúdo reverte todo o lote. Pacotes `.atlasproject` continuam usando os validadores e remapeamento de IDs existentes.
- Banco e backups não são arquivos públicos. O servidor permite somente os HTMLs e assets necessários e rejeita origens externas. Não oferece login/autorização e não deve ser exposto à internet. Para hospedagem futura, substituir o servidor de desenvolvimento e implementar identidade, autorização central, limites operacionais e backups.

A Administração usa a coleção `configuracoes` na mesma API. Suas políticas continuam provisórias; não conecte essas políticas aos comandos do editor sem identidade autenticada, autorização central e tratamento de sessão ausente.

### API local

| Método e rota | Resultado |
| --- | --- |
| `GET /api/health` | Estado e tipo do armazenamento |
| `GET /api/{colecao}` | Lista; aceita `?projectId=...` |
| `GET /api/{colecao}/{id}` | Documento, ou `null` se ausente |
| `POST /api/transactions` | Executa lote atômico de `put`/`delete` |
| `POST /api/migrate` | Insere lote legado; aceita registros idênticos e recusa conflitos |

Coleções: `projetos`, `mapas`, `rascunhos`, `configuracoes` e `resumosMapas` (somente leitura). Exemplo de corpo JSON para criar um projeto:

```json
{"operations":[{"store":"projetos","action":"put","value":{"id":"meu-projeto","nome":"Meu projeto"}}]}
```

Para excluir, use `{"store":"projetos","action":"delete","id":"meu-projeto"}`. Sucesso retorna `{"results":[...]}`; erros retornam `{"error":"..."}` com status 400 (validação), 403 (origem), 409 (conflito de migração), 413 (tamanho), 415 (tipo de conteúdo) ou 503 (banco indisponível). Limites: 128 MiB por corpo JSON e 10000 operações. Requisições JSON exigem `Content-Type: application/json`.

A validação do servidor cobre envelope, IDs, nomes e coleções. As regras detalhadas de geometria e vínculos ainda estão no editor. Não há resolução de edições concorrentes: evite editar o mesmo mapa em várias abas ao mesmo tempo.

Referências: [sqlite3](https://docs.python.org/3/library/sqlite3.html) e [http.server](https://docs.python.org/3/library/http.server.html), da documentação oficial Python.

## Renderização, consulta e memória

`renderMapaCompleto()` tenta atualizar apenas objetos alterados e dependências locais. Ligações dependem de suas extremidades; regiões são invalidadas conservadoramente quando o conteúdo pontual muda. Mudanças amplas de contexto, formulário ativo ou `forcarCompleto: true` usam o caminho completo. A remoção deve limpar também registros de linhas e rótulos escaláveis. Use `metricasRenderizacao` para inspecionar os caminhos.

Pop-ups mantêm nós DOM: `Popup.update()` do Leaflet recria conteúdo fornecido como string e perderia filtros e detalhes abertos. Os estados das listas ficam em `WeakMap`, sem alterar os dados persistidos.

Os limites do histórico são definidos em `historicoGlobal`; o comportamento para o usuário está em [Rascunhos e histórico](user-guide.md#rascunhos-e-histórico). A memória é estimada pelo JSON estrutural em UTF-16 e por imagens distintas, não pelo heap real. Imagens iguais são compartilhadas e tamanhos de snapshots ficam em `WeakMap`. A poda ocorre ao finalizar o gesto/lote, sem dividir operações entre mapas; clones e operações pendentes podem exceder temporariamente o orçamento de retenção.

## Testes e revisão

Os scripts usam os módulos nativos do Node.js, sem instalação de pacotes. Os testes de navegador usam Google Chrome em modo headless; para outro caminho do executável, defina `CHROME_BIN`.

Na raiz do projeto (o executor de navegador cria seu próprio servidor e banco temporários):

```bash
npm run build
npm run lint
npm test
python3 -m unittest discover -s tests -v
node scripts/validate.mjs
node scripts/audit-unused.mjs
python3 scripts/run-browser-tests.py
```

A validação estática verifica arquivos, sintaxe, IDs, referências de DOM, ordem de carregamento e presença do build React. JSX é validado pelo build. A auditoria aponta candidatos a código sem uso: revise-os antes de remover migrações, callbacks ou APIs de compatibilidade. Ela não substitui testes no navegador.

A suíte usa Chrome e banco SQLite/perfil temporários. Nunca aponte os scripts de smoke diretamente para o banco pessoal; use o executor Python. Cobre edição, navegação, Administração, conexões, backups, recuperação, migração, atomicidade, dependências das camadas, histórico e consulta responsiva. A Administração também cobre cadastro/duplicidade, perfis, busca, visibilidade parcial, falhas de rede, nova tentativa, filtro de projeto e exclusão confirmada no SQLite. Inclui destinos Único, Área, Linha e posição livre, ida e volta, somente ida e exclusão pelos dois lados do par. Para investigar um grupo, acrescente `--reliability-only`, `--optimization-only`, `--reading-only` ou `--connection-only`. Com `--reading-screenshots` ou `--connection-screenshots`, as capturas correspondentes ficam em `/tmp`, identificadas por largura, tema e, nas conexões, cenário. A visibilidade do primeiro resultado da consulta é verificada também sem capturas.

Para medir uma alteração, use `--performance-only --performance-output=/tmp/atlas-performance.json`. Compare a mesma carga e ambiente; esse teste sintético não representa todos os dispositivos nem o pico real de memória.

Antes de entregar uma mudança:

- confira criação, edição, cancelamento, salvamento e recarga sem exceções;
- teste origem e destino de ligações, importação e recuperação sem perda de dados;
- revise desktop, tablet e celular, teclado, foco e temas claro/escuro;
- verifique rolagem, limites dos pop-ups e ausência de overflow horizontal;
- atualize o tópico correspondente neste guia ou no manual, sem acrescentar um histórico paralelo de entregas.

## Navegação e menus React

`frontend/shell/` controla a barra superior, menu principal, tema, busca de mapas e botões de modo. Os botões de modo ficam na barra superior; o Inspector não contém controles de modo. `js/shell-bridge.js` encaminha comandos para as funções existentes do editor e publica projeções de projeto, mapa e modo. O estado de edição, Leaflet e histórico continuam sob responsabilidade do editor clássico.

Os listeners antigos desses controles e o seletor oculto de mapas foram removidos. Botões e atalhos de salvar e editar passam pelo mesmo executor, que bloqueia comandos simultâneos e apresenta falhas na interface. A busca filtra resumos de mapas em memória.

`python3 scripts/run-browser-tests.py --shell-only` verifica teclado, foco, tema, busca, modos, comandos, confirmação de exclusão e tamanhos de tela usando banco temporário. A suíte completa também executa essas verificações. Para concluir a migração geral, ainda faltam os painéis, formulários e canvas, com cobertura dos fluxos de edição antes de substituir cada implementação.

### Política de interação dos modos

`commandEnabled()` limita ferramentas ao Editor e legenda à Visualização. Radial e atalhos encaminham ações pelo executor `AtlasShell.execute`, que usa `executarAcaoMapa()` na ponte clássica. Abrir menus é mutuamente exclusivo; duplo clique/toque nunca ativa o Editor a partir da Visualização. IDs e valores internos `edicao` são preservados por compatibilidade, mas a interface usa “Editor”.

A revisão cobre os listeners de teclado em bootstrap/editor/interaction/reading/connection-editor: atalhos globais respeitam campos e diálogos, Delete respeita seleção e modo, Enter/espaço consultam ou selecionam objetos, e setas nos handles atuam apenas na geometria em edição. O duplo clique no cabeçalho continua sendo uma ação de layout, sem transição de modo.
