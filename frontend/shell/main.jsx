import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import L from 'leaflet';
import Shell from './shell.jsx';
import { createShellStore, commandEnabled } from './state.js';
import { EDITOR_SCRIPTS } from './editor-scripts.js';
import { mountLibrary } from '../projects/main.jsx';
import 'leaflet/dist/leaflet.css';
import './shell.css';

// Compatibilidade temporária: os scripts clássicos consomem essas bibliotecas como globais.
window.L = L;
let sheetJSImport;
window.carregarSheetJS = async () => {
  if (window.XLSX) return window.XLSX;
  sheetJSImport ||= import('xlsx').then((module) => {
    window.XLSX = module;
    return module;
  });
  return sheetJSImport;
};

const store = createShellStore(flushSync);
window.AtlasShell = store;
async function execute(id, value) {
  if (!commandEnabled(id, store.getSnapshot())) return;
  store.update({ pending: id, error: '' });
  try {
    await window.AtlasShellEditor.execute(id, value);
  } catch (error) {
    store.update({ error: error.message });
  } finally {
    store.update({ pending: null });
  }
}
store.execute = execute;
flushSync(() => createRoot(document.getElementById('shell-root')).render(<Shell store={store} execute={execute} />));

try {
  // Os scripts clássicos ainda capturam elementos do editor. A estrutura React precisa existir primeiro.
  for (const path of EDITOR_SCRIPTS) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/' + path;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Não foi possível carregar ${path}. Recarregue o aplicativo.`));
      document.body.appendChild(script);
    });
  }
  mountLibrary();
} catch (error) {
  store.update({ error: error.message });
}
