# Atlas Studio

Editor de mapas interativos a partir de imagens, organizado em projetos. Permite adicionar pontos, linhas e regiões, vincular registros de planilhas e criar conexões entre mapas.

O editor usa HTML, CSS e JavaScript, com Leaflet e SheetJS. A Administração e a Biblioteca de Projetos usam React, compilado pelo Vite. Uma API Python salva projetos, mapas, imagens incorporadas, rascunhos e cadastros administrativos em SQLite no computador. Não exige instalação de pacotes Python. A distribuição pronta já inclui a interface compilada.

## Executar

Requer Python 3.10 ou superior, com o módulo `sqlite3`.

**Pacote pronto:** extraia `atlas-studio.zip` e abra a pasta `atlas-studio`. Node.js não é necessário para usar esse pacote.

**Código baixado/clonado do GitHub:** instale Node.js 22.12+ (ou 20.19+) e prepare a interface uma vez:

```bash
npm ci
npm run build
```

Depois, na pasta do projeto:

```bash
python3 -m app.server
```

Abra [Atlas Studio](http://127.0.0.1:4173/index.html). Mantenha o terminal aberto durante o uso; `Ctrl+C` encerra o servidor. No Windows, use `py -m app.server` se esse for o comando da sua instalação Python. Leaflet e SheetJS fazem parte do build local; as fontes tipográficas externas ainda requerem internet e usam as alternativas locais quando indisponíveis.

Após atualizar arquivos Python, encerre o servidor com `Ctrl+C` e execute o comando novamente. Recarregue o navegador para carregar o build novo.

O comando `python3 -m http.server` não atende à API e não deve ser usado para executar a aplicação. Abrir o HTML diretamente ou pelo GitHub Pages também não fornece o banco.

Opções:

```bash
python3 -m app.server --port 4174 --database storage/outro.sqlite3
```

O banco padrão é `storage/atlas.sqlite3`, criado automaticamente e ignorado pelo Git. Os dados continuam disponíveis após reiniciar o servidor e ao trocar de navegador no mesmo computador. Não há autenticação, sincronização em nuvem nem edição simultânea com resolução de conflitos. O servidor aceita somente acesso local; esta é a base para desenvolvimento e instalações pessoais, não uma hospedagem pública.

## Trazer projetos do armazenamento anterior

No mesmo navegador, perfil e endereço utilizados antes (incluindo a porta), abra **Menu principal → Migrar dados deste navegador**. A operação copia projetos, mapas, rascunhos e cadastros administrativos do IndexedDB para o SQLite e preserva os originais. Se houver um ID com conteúdo diferente no destino, o lote inteiro é recusado, sem sobrescrever nada.

Se você usava `localhost`, continue usando [localhost](http://localhost:4173/index.html); seus dados antigos não aparecem automaticamente em `127.0.0.1`. Para outro endereço/instalação, use um backup `.atlasproject` em **Importar projeto**. A importação cria uma cópia com novos IDs. Para exportar dados que só existem em outra instalação, abra-a no endereço original e exporte por ela.

## Backups

Use **Exportar projeto** para baixar um `.atlasproject`. Para copiar o banco inteiro, encerre o servidor e copie `storage/atlas.sqlite3` para um local seguro. Não publique o arquivo do banco nem backups pessoais no GitHub.

Preferências visuais e a seleção atual continuam no navegador. Uma cópia de emergência de formulários pode ser mantida no `localStorage` durante o fechamento da página e recuperada na próxima abertura; o armazenamento principal é o SQLite.

A Administração permite cadastrar usuários e políticas locais, mas ainda não controla acesso ao editor.

## Desenvolvimento e testes

As telas React ficam em `frontend/admin/`, `frontend/projects/` e `frontend/shell/` (menus e navegação). O canvas e os painéis do editor continuam com scripts clássicos. API e banco usam os mesmos contratos.

Para recompilar automaticamente as telas React durante alterações:

```bash
npm run dev
```

Esse comando usa o modo watch do build do Vite. Mantenha `python3 -m app.server` em outro terminal e recarregue a página após a recompilação. Não abre um segundo servidor nem exige configuração de CORS. Para gerar os arquivos finais, use `npm run build`.


```bash
npm run build
npm run lint
npm test
python3 -m unittest discover -s tests -v
node scripts/validate.mjs
node scripts/audit-unused.mjs
python3 scripts/run-browser-tests.py
```

Os testes de navegador exigem Node.js compatível com o Vite e Google Chrome (`CHROME_BIN` permite outro caminho). O executor cria servidor, banco e perfil temporários. Não execute `browser-smoke.mjs` diretamente contra uma instalação com dados pessoais.

Para gerar um ZIP que outras pessoas possam executar somente com Python:

```bash
npm run package:local
```

O arquivo `releases/atlas-studio.zip` inclui o build e o código necessário; exclui banco, backups, credenciais e `node_modules`. O pacote é gerado localmente, sem publicação automática.

- [Guia de uso](docs/user-guide.md)
- [Guia técnico e API](docs/development.md)
