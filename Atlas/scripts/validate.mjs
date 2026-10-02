import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { EDITOR_SCRIPTS } from "../frontend/shell/editor-scripts.js";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = resolve(raiz, "index.html");
const adminHtmlPath = resolve(raiz, "admin.html");

const scripts = [
  "js/system-dialog.js",
  "js/http-client.js",
  "js/api.js",
  "js/core.js",
  "js/geometry.js",
  "js/persistence.js",
  "js/history.js",
  "js/projects.js",
  "js/navigation.js",
  "js/maps.js",
  "js/rendering.js",
  "js/editor.js",
  "js/data.js",
  "js/connections.js",
  "js/connection-editor.js",
  "js/recovery.js",
  "js/reading.js",
  "js/interaction.js",
  "js/legacy-migration.js",
  "js/shell-bridge.js",
  "js/bootstrap.js"
];

const estilos = [
  "css/base.css",
  "css/shell.css",
  "css/workflow.css",
  "css/inspector.css",
  "css/creation.css",
  "css/editor.css",
  "css/atlas-theme.css",
  "css/shared-components.css",
  "css/controls.css",
  "css/studio-interface.css",
  "css/components/reading.css",
  "css/responsive.css"
];

const adminScripts = [];
const adminEstilos = [
  "css/admin.css",
  "css/atlas-theme.css",
  "css/shared-components.css",
  "css/controls.css",
  "css/studio-interface.css"
];

const erros = [];
const html = readFileSync(htmlPath, "utf8");
const adminHtml = existsSync(adminHtmlPath)
  ? readFileSync(adminHtmlPath, "utf8")
  : "";

function validarOrdemArquivos(documento, esperados, expressao, contexto) {
  const encontrados = [...documento.matchAll(expressao)].map(([, arquivo]) => arquivo);

  if (JSON.stringify(encontrados) !== JSON.stringify(esperados)) {
    erros.push(
      `Ordem de ${contexto} incorreta. Esperado: ${esperados.join(" → ")}; ` +
      `encontrado: ${encontrados.join(" → ") || "nenhum"}.`
    );
  }
}

validarOrdemArquivos(
  html,
  estilos,
  /<link\b[^>]*\bhref="(css\/[^"]+\.css)"[^>]*>/g,
  "estilos do editor"
);

if (JSON.stringify(EDITOR_SCRIPTS) !== JSON.stringify(scripts)) erros.push("Ordem das dependências clássicas incorreta no carregador React.");
if (/<script[^>]+src="js\//.test(html)) erros.push("Scripts clássicos não devem ser carregados duas vezes: a entrada React já os carrega.");
if (/unpkg\.com\/leaflet|cdn\.jsdelivr\.net\/npm\/xlsx/.test(html)) erros.push("Leaflet e SheetJS devem ser fornecidos pelo build local, não por CDN.");
if (!html.includes('id="shell-root"')) erros.push("Ponto de montagem da estrutura React ausente.");

if (!adminHtml) {
  erros.push("Arquivo ausente: admin.html");
}

for (const arquivo of [...scripts, ...estilos]) {
  if (!existsSync(resolve(raiz, arquivo))) {
    erros.push(`Arquivo ausente: ${arquivo}`);
  }

  if (arquivo.startsWith("css/") && !html.includes(`"${arquivo}"`)) {
    erros.push(`Arquivo não carregado pelo HTML: ${arquivo}`);
  }
}

const librarySources = ["frontend/projects/library.jsx", "frontend/projects/dialogs.jsx"];
const shellSources = ["frontend/shell/shell.jsx", "frontend/shell/map-search.jsx", "frontend/shell/menu.jsx", "frontend/shell/commands.jsx"];
const shellJSX = shellSources.map(file => readFileSync(resolve(raiz, file), "utf8")).join("\n");
const commandIds = [...shellJSX.matchAll(/id: "([^"]+)"/g)].map(([, id]) => id);
const libraryJSX = librarySources.map(file => readFileSync(resolve(raiz, file), "utf8")).join("\n");
if (!html.includes('id="project-library-root"') || !html.includes('<!-- library-assets -->')) erros.push("Entrada React da Biblioteca ausente.");
const projectBridge = readFileSync(resolve(raiz, "js/projects.js"), "utf8");
for (const obsolete of ["innerHTML", "projetoForm", "projetoEditandoId", "termoBuscaProjetos", "listaProjetos"]) {
  if (projectBridge.includes(obsolete)) erros.push(`Responsabilidade antiga da Biblioteca reapareceu na ponte: ${obsolete}`);
}
const ids = [...(html + libraryJSX + shellJSX).matchAll(/\bid="([^"]+)"/g)].map(([, id]) => id);
const idsUnicos = new Set([...ids, ...commandIds]);

for (const id of idsUnicos) {
  if (ids.filter(item => item === id).length > 1) {
    erros.push(`ID duplicado no HTML: ${id}`);
  }
}

const codigo = scripts
  .filter(arquivo => existsSync(resolve(raiz, arquivo)))
  .map(arquivo => readFileSync(resolve(raiz, arquivo), "utf8"))
  .join("\n");

const referenciasDom = [
  ...codigo.matchAll(/\$\("([^"]+)"\)/g)
].map(([, id]) => id);

for (const id of new Set(referenciasDom)) {
  if (!idsUnicos.has(id)) {
    erros.push(`Elemento referenciado pelo JavaScript não existe: #${id}`);
  }
}

for (const arquivo of [...adminScripts, ...adminEstilos]) {
  if (!existsSync(resolve(raiz, arquivo))) {
    erros.push(`Arquivo administrativo ausente: ${arquivo}`);
  }

  if (adminHtml && !adminHtml.includes(`"${arquivo}"`)) {
    erros.push(`Arquivo não carregado pelo admin.html: ${arquivo}`);
  }
}

validarOrdemArquivos(
  adminHtml,
  adminEstilos,
  /<link\b[^>]*\bhref="(css\/[^"]+\.css)"[^>]*>/g,
  "estilos da Administração"
);

validarOrdemArquivos(
  adminHtml,
  adminScripts,
  /<script\b[^>]*\bsrc="(js\/[^"]+\.js)"[^>]*><\/script>/g,
  "scripts da Administração"
);

const adminSources = ["frontend/admin/app.jsx", "frontend/admin/users.jsx", "frontend/admin/panels.jsx"];
const adminJSX = adminSources.map(file => readFileSync(resolve(raiz, file), "utf8")).join("\n");
if (!adminHtml.includes('id="admin-root"') || !adminHtml.includes('<!-- admin-assets -->')) erros.push("Entrada React da Administração ausente.");
const manifestPath = resolve(raiz, "dist/.vite/manifest.json");
if (!existsSync(manifestPath)) erros.push("Execute npm run build antes da validação.");
else {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  for (const name of ["frontend/admin/main.jsx", "frontend/shell/main.jsx"]) {
    const entry = manifest[name];
    if (!entry?.isEntry || !existsSync(resolve(raiz, "dist", entry.file))) erros.push(`Build inválido: ${name}`);
  }
}
const adminIds = [...(adminHtml + adminJSX).matchAll(/\bid="([^"]+)"/g)].map(([, id]) => id);
const adminIdsUnicos = new Set(adminIds);

for (const id of adminIdsUnicos) {
  if (adminIds.filter(item => item === id).length > 1) {
    erros.push(`ID duplicado no admin.html: ${id}`);
  }
}

const adminCodigo = adminScripts
  .filter(arquivo => existsSync(resolve(raiz, arquivo)))
  .map(arquivo => readFileSync(resolve(raiz, arquivo), "utf8"))
  .join("\n");

const adminReferenciasDom = [
  ...adminCodigo.matchAll(/porId\("([^"]+)"\)/g)
].map(([, id]) => id);

for (const id of new Set(adminReferenciasDom)) {
  if (!adminIdsUnicos.has(id)) {
    erros.push(`Elemento administrativo referenciado pelo JavaScript não existe: #${id}`);
  }
}

for (const arquivo of scripts) {
  if (!existsSync(resolve(raiz, arquivo))) continue;

  const resultado = spawnSync(
    process.execPath,
    ["--check", resolve(raiz, arquivo)],
    { encoding: "utf8" }
  );

  if (resultado.status !== 0) {
    erros.push(`JavaScript inválido em ${arquivo}:\n${resultado.stderr.trim()}`);
  }
}

for (const arquivo of adminScripts) {
  if (!existsSync(resolve(raiz, arquivo))) continue;

  const resultado = spawnSync(
    process.execPath,
    ["--check", resolve(raiz, arquivo)],
    { encoding: "utf8" }
  );

  if (resultado.status !== 0) {
    erros.push(`JavaScript administrativo inválido em ${arquivo}:\n${resultado.stderr.trim()}`);
  }
}

if (erros.length) {
  console.error(erros.map(erro => `- ${erro}`).join("\n"));
  process.exit(1);
}

console.log(
  `Validação concluída: ${idsUnicos.size} IDs, ` +
  `${scripts.length} scripts e ${estilos.length} folhas de estilo no editor; ` +
  `${adminIdsUnicos.size} IDs, ${adminScripts.length} script e ` +
  `${adminEstilos.length} folha de estilo na Administração.`
);
