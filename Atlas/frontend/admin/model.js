/* Regras dos cadastros locais, independentes de React e do DOM. */
const ADMIN_STATE_ID = "estado-principal";

const PERMISSION_GROUPS = [
  {
    title: "Modos de trabalho",
    items: ["modoEdicao", "modoVisualizacao"]
  },
  {
    title: "Ações no mapa",
    items: [
      "criarMapa",
      "renomearMapa",
      "excluirMapa",
      "exportarBackup",
      "importarBackup",
      "alternarTema"
    ]
  },
  {
    title: "Painéis e ferramentas",
    items: [
      "painelCamadas",
      "painelCriacao",
      "painelDados",
      "ferramentaCoordenadas",
      "painelLegenda",
      "editarTipos"
    ]
  },
  {
    title: "Fontes e Portais",
    items: ["gerenciarFontes", "portaisEntreMapas"]
  }
];

const PERMISSION_LABELS = {
  modoEdicao: "Editor",
  modoVisualizacao: "Visualização",
  criarMapa: "Criar mapa",
  renomearMapa: "Renomear mapa",
  excluirMapa: "Excluir mapa",
  exportarBackup: "Exportar backup",
  importarBackup: "Importar backup",
  alternarTema: "Alternar tema",
  painelCamadas: "Painel de Camadas",
  painelCriacao: "Painel de Criação",
  painelDados: "Painel de Dados",
  ferramentaCoordenadas: "Ferramenta de coordenadas",
  painelLegenda: "Painel de Legenda",
  editarTipos: "Editar Tipos de marcação",
  gerenciarFontes: "Gerenciar Fontes de dados",
  portaisEntreMapas: "Portais entre mapas"
};

const ALL_PERMISSION_KEYS = Object.keys(PERMISSION_LABELS);

const PROFILE_PRESETS = {
  editor: criarPermissoes([
    "modoEdicao",
    "modoVisualizacao",
    "criarMapa",
    "renomearMapa",
    "exportarBackup",
    "alternarTema",
    "painelCamadas",
    "painelCriacao",
    "painelDados",
    "ferramentaCoordenadas",
    "painelLegenda",
    "editarTipos",
    "gerenciarFontes",
    "portaisEntreMapas"
  ]),
  visualizador: criarPermissoes([
    "modoVisualizacao",
    "painelCamadas",
    "ferramentaCoordenadas",
    "painelLegenda"
  ]),
  restrito: criarPermissoes(["modoVisualizacao"])
};

function criarPermissoes(ativas) {
  const conjunto = new Set(ativas);
  return ALL_PERMISSION_KEYS.reduce((resultado, chave) => {
    resultado[chave] = conjunto.has(chave);
    return resultado;
  }, {});
}

function clone(valor) {
  return JSON.parse(JSON.stringify(valor));
}

function gerarId(prefixo = "local") {
  if (globalThis.crypto?.randomUUID) {
    return `${prefixo}-${crypto.randomUUID()}`;
  }

  return `${prefixo}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function iniciais(nome) {
  return String(nome || "Usuário")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(parte => parte[0])
    .join("")
    .toUpperCase();
}

function nomePerfil(perfil) {
  if (perfil === "editor") return "Editor";
  if (perfil === "visualizador") return "Visualizador";
  return "Restrito";
}

function geometriaNome(geometria) {
  if (geometria === "conexao") return "Conexão";
  if (geometria === "linha") return "Linha";
  if (geometria === "area") return "Área";
  return "Ponto";
}

function chaveObjeto(objeto, indice) {
  return String(objeto?.id || `objeto-${indice + 1}`);
}

function tituloObjeto(objeto, indice) {
  const nome = String(objeto?.nome || "").trim();
  return nome || `Objeto ${indice + 1}`;
}

function valorVisibilidadePadrao(perfil) {
  return perfil !== "restrito";
}

function criarUsuarioAdministradorLocal(mapasGlobais) {
  return {
    id: gerarId("administrador"),
    nome: "Administrador local",
    perfil: "editor",
    origem: "local",
    proprietario: true,
    status: "configuração provisória",
    permissoes: clone(PROFILE_PRESETS.editor),
    mapas: mapasGlobais.map(mapa => mapa.id),
    visibilidade: {}
  };
}

function criarEstadoInicial(mapasGlobais) {
  const administrador = criarUsuarioAdministradorLocal(mapasGlobais);
  return {
    id: ADMIN_STATE_ID,
    usuarioAtualId: administrador.id,
    usuarios: [administrador],
    atualizadoEm: null
  };
}

function normalizarUsuario(usuario) {
  const perfil = ["editor", "visualizador", "restrito"].includes(usuario?.perfil)
    ? usuario.perfil
    : "restrito";
  const permissoes = {};

  for (const chave of ALL_PERMISSION_KEYS) {
    permissoes[chave] = typeof usuario?.permissoes?.[chave] === "boolean"
      ? usuario.permissoes[chave]
      : PROFILE_PRESETS[perfil][chave];
  }

  return {
    id: String(usuario?.id || gerarId("usuario")),
    nome: String(usuario?.nome || usuario?.name || "Usuário local").trim() || "Usuário local",
    email: String(usuario?.email || "usuario.local@atlas").trim(),
    perfil,
    origem: String(usuario?.origem || "local"),
    proprietario: usuario?.proprietario === true,
    status: String(usuario?.status || "configuração provisória"),
    permissoes,
    mapas: Array.isArray(usuario?.mapas) ? usuario.mapas.map(String) : [],
    visibilidade: usuario?.visibilidade && typeof usuario.visibilidade === "object"
      ? usuario.visibilidade
      : {}
  };
}

function reconciliarVisibilidadeUsuario(usuario, mapasGlobais) {
  const mapasValidos = new Set(mapasGlobais.map(mapa => mapa.id));
  usuario.mapas = [...new Set(usuario.mapas)].filter(id => mapasValidos.has(id));

  const visibilidadeNova = {};

  for (const mapa of mapasGlobais) {
    const anteriorMapa = usuario.visibilidade?.[mapa.id] || {};
    const categorias = {};

    for (const categoria of mapa.categorias) {
      const categoriaId = String(categoria.id || categoria.nome || "tipo");
      const anteriorCategoria = anteriorMapa[categoriaId] || {};
      const objetos = {};
      const objetosCategoria = mapa.objetos.filter(objeto => String(objeto.categoriaId) === categoriaId);

      objetosCategoria.forEach((objeto, indice) => {
        const objetoId = chaveObjeto(objeto, indice);
        objetos[objetoId] = typeof anteriorCategoria[objetoId] === "boolean"
          ? anteriorCategoria[objetoId]
          : valorVisibilidadePadrao(usuario.perfil);
      });

      categorias[categoriaId] = objetos;
    }

    visibilidadeNova[mapa.id] = categorias;
  }

  usuario.visibilidade = visibilidadeNova;
}

function normalizarEstado(estadoBruto, mapasGlobais) {
  const usuariosBrutos = Array.isArray(estadoBruto?.usuarios) && estadoBruto.usuarios.length
    ? estadoBruto.usuarios
    : [criarUsuarioAdministradorLocal(mapasGlobais)];
  const usuarios = usuariosBrutos.map(normalizarUsuario);

  const mapasConhecidos = new Set(
    Array.isArray(estadoBruto?.mapasConhecidos)
      ? estadoBruto.mapasConhecidos.map(String)
      : usuarios.flatMap(usuario => usuario.mapas)
  );

  const mapasNovos = mapasGlobais
    .map(mapa => mapa.id)
    .filter(id => !mapasConhecidos.has(id));

  /* O administrador principal recebe mapas novos sem reativar os revogados. */
  for (const usuario of usuarios) {
    if (usuario.proprietario && mapasNovos.length) {
      usuario.mapas = [...new Set([...usuario.mapas, ...mapasNovos])];
    }
  }

  for (const usuario of usuarios) {
    reconciliarVisibilidadeUsuario(usuario, mapasGlobais);
  }

  let usuarioAtualId = String(estadoBruto?.usuarioAtualId || "");
  if (!usuarios.some(usuario => usuario.id === usuarioAtualId)) {
    usuarioAtualId = usuarios[0].id;
  }

  return {
    id: ADMIN_STATE_ID,
    usuarioAtualId,
    usuarios,
    mapasConhecidos: mapasGlobais.map(mapa => mapa.id),
    atualizadoEm: estadoBruto?.atualizadoEm || null
  };
}
export { ADMIN_STATE_ID, PERMISSION_GROUPS, PERMISSION_LABELS, ALL_PERMISSION_KEYS, PROFILE_PRESETS, criarPermissoes, clone, gerarId, iniciais, nomePerfil, geometriaNome, chaveObjeto, tituloObjeto, valorVisibilidadePadrao, criarUsuarioAdministradorLocal, criarEstadoInicial, normalizarUsuario, reconciliarVisibilidadeUsuario, normalizarEstado };
