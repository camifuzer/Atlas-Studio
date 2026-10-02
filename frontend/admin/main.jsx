import { createRoot } from 'react-dom/client';
import AdminApp from './app.jsx';
import './react-shell.css';

createRoot(document.getElementById('admin-root')).render(<AdminApp />);
