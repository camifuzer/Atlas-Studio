/* Transporte HTTP compartilhado pelo editor clássico e pela interface React. */
(() => {
async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(path, { cache: "no-store", ...options });
  } catch {
    throw new Error("Não foi possível conectar à API. Inicie python3 -m app.server e tente novamente.");
  }
  let body;
  try { body = await response.json(); }
  catch { throw new Error("API indisponível. Abra o aplicativo pelo servidor Python: python3 -m app.server."); }
  if (!response.ok) throw new Error(body.error || "Falha na comunicação com a API.");
  return body;
}

function post(path, operations) {
  return request(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operations }) });
}

globalThis.AtlasHTTP = Object.freeze({ request, post });
})();
