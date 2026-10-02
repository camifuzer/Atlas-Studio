# Atlas Studio — Guia de uso

O Atlas Studio transforma imagens em mapas navegáveis com objetos e dados associados. Para iniciar o aplicativo, veja o [README](../README.md); para manutenção do código, consulte o [guia técnico](development.md).

## Começar um projeto

1. Em **Meus projetos**, crie ou abra um projeto.
2. No **Menu principal**, escolha **Criar mapa**, selecione uma imagem PNG, JPEG ou WebP e informe um nome.
3. Use **Criar** e escolha um Tipo de marcação, ou cadastre um pelo botão `+` da barra inferior.
4. Preencha os dados desejados, posicione ou desenhe o objeto e clique em **Salvar**.
5. Consulte o resultado e [exporte um backup](#backup-e-recuperação).

A Biblioteca permite buscar pelo nome/descrição do projeto ou pelo nome de um de seus mapas, sem diferenciar acentos. As buscas no topo e no celular ficam sincronizadas. Ao voltar do editor, o filtro é limpo para que projetos não fiquem escondidos. Falhas de carregamento mostram **Tentar novamente**. Em **Editar**, uma falha de salvamento conserva o formulário preenchido; tente salvar novamente após restabelecer a conexão.

Todo **Projeto** criado fica salvo na Biblioteca do banco local, inclusive quando ainda não possui mapas. Um Projeto reúne mapas independentes dos demais projetos. Um **Tipo** define a aparência e o comportamento; um **Objeto** é uma ocorrência desse Tipo no mapa. Tipos e Fontes de dados são compartilhados entre os mapas do mesmo projeto. As **Camadas** agrupam objetos por Tipo.

## Navegar e consultar

Arraste o mapa para mover a câmera. Use os controles `+` e `−`, a roda do mouse ou a pinça no celular para ajustar o zoom. O botão de enquadramento abaixo do zoom centraliza novamente toda a imagem quando ela sair da área visível. Cada mapa lembra sua posição de câmera.

A busca superior seleciona mapas pelo nome; em **Meus projetos**, procura projetos pelo nome, descrição ou nome de seus mapas. O Menu principal reúne gerenciamento de projetos e mapas, pesquisa, backup, tema e Administração.

**Pesquisar objetos** encontra nome, descrição, Tipo, mapa e dados vinculados em todo o projeto. Escolher um resultado abre o mapa correspondente e destaca o objeto. Salve ou cancele formulários em andamento antes de navegar pela pesquisa.

### Informações e regiões

No modo Visualização, clique ou toque em um ponto ou região para consultar suas informações. Linhas mostram informações ao passar o ponteiro. Os pop-ups têm rolagem interna e se ajustam à área disponível.

Use **Consultar detalhes** para manter a consulta enquanto move ou amplia o mapa. O painel fica à direita no desktop e embaixo no celular; preserva filtros e itens expandidos. Fecha pelo `×`, por `Escape` com foco nele ou ao trocar de mapa. Abrir outra consulta no painel substitui a anterior.

Dentro de uma região:

- busque por nome, descrição ou dados vinculados, sem distinguir acentos e maiúsculas;
- filtre por Tipo e confira as contagens de resultados, total e itens exibidos;
- expanda um item para ler seus detalhes;
- use **Mostrar mais 30** para carregar outro bloco ou **Limpar filtros** para voltar à lista completa;
- use **Localizar** para revelar e destacar o objeto sem perder a consulta.

A lista inclui objetos pontuais dentro do contorno. Para excluir um Tipo desse resumo, desative **Exibir objetos deste tipo no resumo de Áreas**.

### Camadas e Legenda

A árvore mostra Tipos, contagens e objetos. Os controles permitem ocultar a Camada inteira ou itens individuais sem apagá-los. O estado intermediário indica uma Camada parcialmente visível.

A ação de localizar revela objetos ocultos, ajusta a câmera e aplica um destaque temporário. Na árvore do Editor, também seleciona o objeto.

### Painéis e tema

No Editor, **Ferramentas** abre Criação, Camadas, Dados e Coordenadas. A Legenda permanece no modo Visualização. O Inspector é o painel de formulários e configurações; a Consulta é o painel de leitura.

Arraste o cabeçalho do Inspector ou da Consulta para mudar sua posição. As quatro bordas e quatro quinas redimensionam os painéis; com uma alça em foco, use as setas. Dois cliques no cabeçalho restauram a geometria padrão. Posição e tamanho são lembrados separadamente para desktop, tablet e celular, sempre limitados à área visível. Conteúdo extenso recebe rolagem interna.

O Menu principal alterna o tema claro/escuro. Tema e dimensões do Inspector são lembrados pelo navegador.

## Criar e editar

Na barra inferior, clique no ícone do Tipo desejado. Ícones agrupados exibem um contador e abrem uma lista de Tipos. O `+` cadastra um Tipo; os três pontos abrem o gerenciador. A barra reaparece ao entrar no Editor e, no celular, fica acoplada ao rodapé do Inspector para não sair do viewport.

No Editor, selecione um objeto e escolha **Editar objeto** para alterar dados e geometria, ou **Editar tipo** para alterar as propriedades compartilhadas. No modo Visualização, o clique abre somente a consulta e nunca inicia uma edição.

Nome, descrição e vínculos de dados são opcionais. Um objeto pode ter registro principal, vínculos adicionais e link com texto próprio. Links aceitam `http://`, `https://`, `/`, `./`, `../` ou `#` e abrem em outra aba.

**Salvar** confirma a edição; **Cancelar** abandona as alterações e restaura o objeto original. Salve ou cancele antes de iniciar outra edição.

### Tipos de marcação

| Marcação | Configuração e uso |
| --- | --- |
| Único | Uma posição com ícone e cor. Clique para posicionar e arraste para mover. |
| Linha | Um desenho livre com no mínimo dois pontos; define espessura, opacidade, tracejado e extremidades. |
| Área | Um contorno com no mínimo três vértices; define preenchimento e título no mapa. |
| Conexão | Relaciona locais no mesmo mapa ou entre mapas, como caminho visível ou passagem com ícone. |

O nome do Tipo é livre: “Marcador”, por exemplo, pode ser o nome de um Tipo Único. Alterar um Tipo afeta os objetos que o utilizam; a prévia visual pode ser confirmada ou cancelada. O tipo de marcação não pode ser trocado enquanto houver objetos desse Tipo.

Nas Linhas e Áreas, cada clique acrescenta um ponto. Arraste vértices para ajustar a geometria; o `+` sobre um segmento insere outro ponto. A exclusão de um vértice depende de manter a geometria válida e suas ligações.

O título de uma Área pode ter posição automática ou manual, cor própria e tamanho pelo **Padrão do tipo** ou **Tamanho próprio**. No modo manual, o título pode ser arrastado.

### Conexões e ramificações

Ao criar um Tipo **Conexão**, escolha sua representação:

- **Caminho visível:** desenha o trajeto entre dois locais. Pontos intermediários e ramificações continuam editáveis.
- **Somente passagem:** usa um ícone em uma posição e leva ao local escolhido.

Na criação do objeto, escolha o mapa e o Local de origem e destino. A busca aceita nome e categoria; no mapa aberto, **Selecionar no mapa aberto** permite clicar diretamente em um objeto, região, Linha livre ou posição. Ao escolher uma Linha, informe o ponto de encontro ao longo do trajeto.

Únicos usam sua posição; Áreas usam uma posição interna; Linhas usam o ponto de encontro definido. Uma extremidade do caminho deve pertencer ao mapa aberto. Se o outro local estiver em outro mapa, o caminho termina em uma passagem `↗`.

Em **Navegação**, escolha apenas conectar, somente ida ou ida e volta. Ida e volta cria uma passagem de retorno; somente ida cria uma chegada sem retorno. Clicar em uma Conexão abre suas informações: use **Ir para o destino** para navegar e destacar a chegada. Consultar ou localizar nunca atravessa automaticamente.

Para ramificar um caminho, selecione um ponto, use **Criar ramificação deste ponto**, desenhe o ramo e escolha **Finalizar ramificação**. Pontos com ramos dependentes não podem ser removidos antes de ajustar esses ramos.

### Coordenadas e escala

Em **Coordenadas e escala**, clique no mapa para consultar X e Y. Configure uma equivalência, como `100 px = 25 m`, digitando a distância em pixels ou capturando dois pontos. A medida convertida aparece nas consultas; a equivalência fica no mapa e no backup.

## Planilhas e vínculos

Em **Dados**, use **Importar planilha** para arquivos `.xlsx`, `.xls`, `.xlsm` ou `.csv`. Escolha a aba, nomeie a Fonte e configure a coluna de ID, a coluna de título e os campos/rótulos a exibir.

Prefira IDs únicos e permanentes. IDs vazios são ignorados; duplicados impedem a importação. Usar o número da linha é possível, mas reordenar ou inserir linhas pode associar vínculos ao registro errado na atualização.

Um objeto pode usar um registro principal e vários vínculos adicionais, cada um com rótulo e seleção de campos. Valores vazios não aparecem na consulta.

Ao atualizar uma Fonte, os registros são associados pelo ID configurado. Registros ausentes no novo arquivo são preservados e sinalizados, evitando romper vínculos imediatamente.

## Backup e recuperação

Os dados ficam no arquivo **storage/atlas.sqlite3**, no computador que executa o servidor Python. Navegadores que acessam essa mesma instalação usam o mesmo banco. Não há sincronização em nuvem, autenticação ou colaboração em tempo real. Limpar os dados do navegador não apaga o SQLite, mas remove preferências e eventuais cópias de emergência ainda não enviadas.

O indicador distingue **Alterações pendentes**, **Salvando**, **Salvo no banco local** e **Falha ao salvar**. Uma falha mantém a edição aberta para nova tentativa. Conexões pareadas são gravadas juntas.

### Exportar e importar

**Exportar projeto** salva e baixa um `.atlasproject` binário com mapas, imagens, Tipos, objetos, Fontes e vínculos, evitando que navegadores móveis o abram como uma página de texto. Complete edições inválidas antes de exportar. Confira o arquivo nos downloads: a data exibida no menu indica uma exportação iniciada, não a confirmação do arquivo em disco.

**Importar projeto** valida o pacote e cria um novo projeto, sem sobrescrever o existente. Referências entre mapas são remapeadas. Arquivos `.nwmap` também são aceitos como novos mapas do projeto aberto; ligações entre arquivos importados separadamente podem exigir nova seleção de destino.

Arquivos inválidos são rejeitados antes da gravação. Para revisar destinos removidos, use **Verificar vínculos do projeto**; referências quebradas são informadas, não apagadas automaticamente.

### Migrar dados antigos

Use **Menu principal → Migrar dados deste navegador** no mesmo navegador, perfil e endereço (incluindo a porta) da instalação anterior. A cópia para o SQLite preserva o IndexedDB original. IDs com conteúdo diferente fazem o lote inteiro ser recusado; nesse caso, use **Importar projeto** com um backup para criar uma cópia. Consulte o [README](../README.md) para detalhes de endereço e execução.

### Rascunhos e histórico

Formulários de objetos e Tipos são guardados como rascunhos, sem publicar objetos incompletos. Ao reabrir o mapa, escolha **Recuperar** ou **Descartar**. Trocar de mapa/projeto preserva o rascunho; **Cancelar** o descarta. Arquivos de planilha ainda em importação não fazem parte dessa recuperação.

Desfazer prioriza pontos da geometria em edição e depois o histórico do projeto. O histórico retém até **100 ações ou 32 MiB estimados**, removendo primeiro as mais antigas. Uma operação maior que o orçamento é salva, mas não pode ser desfeita; o aplicativo avisa. Trocar de projeto ou recarregar encerra o histórico. Rascunhos e histórico não substituem backups.

### Exclusões e cuidados

Confirme o alcance antes de excluir:

- **Projeto ou mapa:** remove seu conteúdo; outros mapas podem ficar com destinos quebrados.
- **Tipo:** remove os objetos que o utilizam.
- **Objeto:** remove o item; se fizer parte de uma Conexão pareada, remove também o retorno ou a chegada.
- **Fonte:** mantém os objetos, mas desconecta referências no mapa ativo e deixa de disponibilizar a Fonte nos demais mapas do projeto.

O tamanho prático dos projetos depende da memória do navegador e do espaço em disco do servidor. Cada lote enviado à API aceita até 128 MiB em JSON ou 10000 operações; imagens incorporadas também contam nesse limite. Imagens grandes, muitas geometrias ou planilhas extensas podem causar lentidão. Antes de importar cargas grandes, exporte um backup e teste gradualmente.

## Administração

O Menu principal abre a Administração, que permite cadastrar usuários locais e configurar perfis, mapas acessíveis e visibilidade por Camada/objeto.

**Essas políticas são provisórias e não controlam acesso nem restringem o editor.** São salvas separadamente dos mapas e dependem de integração de identidade e autorização para serem aplicadas. Não use esses cadastros como proteção de conteúdo.

## Atalhos

Os gestos complementam as ações da interface. Em campos de texto, edição e seleção de texto mantêm seus atalhos normais.

| Atalho ou gesto | Ação |
| --- | --- |
| Botão direito / segurar o toque por 2 segundos | Abrir menu radial: na Visualização, Legenda ou Entrar no Editor; no Editor, ferramentas ou Visualização |
| Dois cliques/toques no mapa livre | Abrir Criação somente no Editor; manter Visualização |
| Dois cliques/toques em um objeto | No Editor, abrir sua edição; na Visualização, manter somente a consulta |
| `Shift + F10` ou tecla de menu | Abrir o menu de ferramentas pelo teclado |
| `Ctrl + F` | Pesquisar objetos do projeto |
| `Ctrl + A` / `Ctrl + E` | Abrir Criação (somente no Editor) / entrar no Editor |
| `Ctrl + D` / `Ctrl + Q` / `Ctrl + L` | Dados / Camadas somente no Editor; Legenda somente na Visualização |
| `Ctrl + S` | Salvar o projeto e a edição válida |
| `Ctrl + Z` / `Ctrl + Y` | Desfazer / refazer |
| `Delete` / `Backspace` com vértice selecionado | Remover o vértice, quando permitido |
| Setas e `Enter` na pesquisa | Percorrer e abrir resultados |
| `Escape` | Fechar o menu/consulta com foco, finalizar ramo ou cancelar edição, conforme o contexto |

### Modos e menus

A barra superior indica o modo ativo e permite escolher Visualização ou Editor, mesmo com o painel fechado. Os controles de modo foram retirados do Inspector. Abrir o menu radial fecha o superior direito e vice-versa. Fechar um menu ou painel não troca o modo.

Duplo clique/toque no mapa abre Criação somente no Editor. Na Visualização, não inicia edição. A legenda fica disponível apenas na Visualização. Atalhos de ferramentas não entram implicitamente no Editor. A pesquisa de objetos mantém o modo atual. Ao sair do Editor com trabalho em andamento, o aplicativo preserva o rascunho antes de mudar de modo.

Os atalhos globais ficam suspensos em diálogos e cadastros abertos. Campos de texto preservam seus comandos de digitação, incluindo Ctrl+A e Ctrl+F; Ctrl+S salva pelo comando comum do aplicativo. Desfazer/refazer do mapa só atua no Editor. Enter e espaço ativam objetos com foco; setas movem vértices somente durante edição. Escape fecha o menu ativo antes de alcançar ações do editor.
