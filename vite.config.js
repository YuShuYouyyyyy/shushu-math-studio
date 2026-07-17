import { defineConfig } from 'vite';

export default defineConfig({
  base: process.env.GITHUB_PAGES === 'true' ? '/shushu-math-studio/' : '/',
  server: {
    fs: {
      strict: false
    }
  }
});
