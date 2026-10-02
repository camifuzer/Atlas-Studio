/* Comandos de domínio usados pela estrutura React. O estado de mapas e edição continua no editor. */
function sincronizarShell() {
  window.AtlasShell.update({
    library: !projetoAtual,
    project: projetoAtual ? { id: projetoAtual.id, nome: projetoAtual.nome } : null,
    map: mapaAtual ? { id: mapaAtual.id, nome: mapaAtual.nome } : null,
    mode: ui.modo,
    backup: projetoAtual?.ultimoBackupExportadoEm || null
  });
}

window.AtlasShellEditor = Object.freeze({
  notice: avisar,
  execute(id, value) {
    switch (id) {
      case "abrirProjetos": return mostrarGerenciadorProjetos();
      case "novoProjetoMenu": return obterBibliotecaProjetos().then(library => library.openDialog());
      case "novoMapa": return abrirSeletorNovoMapa();
      case "renomearMapa": return renomearMapaAtual();
      case "excluirMapa": return excluirMapaAtual();
      case "exportarMapa": return exportarBackupAtual();
      case "salvarProjeto": return salvarProjetoAtual();
      case "importarMapa": return arquivoImportar.click();
      case "verificarVinculos": return mostrarVerificacaoVinculos();
      case "migrarDadosNavegador": return executarMigracaoNavegador();
      case "pesquisarObjetos": return projetoAtual ? abrirPesquisaObjetos() : focarBuscaProjetos();
      case "modoVisualizacao":
      case "modoEdicao":
      case "legenda":
      case "criacao":
      case "camadas":
      case "dados":
      case "coordenadas": return executarAcaoMapa(id);
      case "openMap": return abrirMapa(value);
      case "alternarTema": return aplicarTemaInterface(window.AtlasShell.getSnapshot().light ? "escuro" : "claro");
      default: throw new Error("Comando desconhecido.");
    }
  }
});
