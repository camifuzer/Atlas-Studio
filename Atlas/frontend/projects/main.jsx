import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { createLibraryController } from './controller.js';
import Library from './library.jsx';
import './library.css';

export function mountLibrary() {
  const controller = createLibraryController(window.AtlasProjectEditor, flushSync);
  flushSync(() => createRoot(document.getElementById('project-library-root')).render(<Library controller={controller} />));
  window.AtlasProjectEditor.connect(controller);
  document.body.dataset.libraryReady = 'true';
}
