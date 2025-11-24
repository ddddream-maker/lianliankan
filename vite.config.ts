
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // 保持相对路径，这样在 COS 的任何子目录下都能运行
  build: {
    outDir: 'dist',
  }
});
