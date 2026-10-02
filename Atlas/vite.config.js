import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Ilhas React da Administração e Biblioteca; o canvas mantém seus scripts clássicos.
export default defineConfig({
  plugins: [react()],
  publicDir: false,
  base: '/dist/',
  build: {
    outDir: 'dist',
    manifest: true,
    rolldownOptions: { input: ['frontend/admin/main.jsx', 'frontend/shell/main.jsx'] },
  },
});
