import { defineConfig } from 'vite';
import { resolve } from 'path';
import handlebars from 'vite-plugin-handlebars';

export default defineConfig({
  plugins: [
    handlebars({
      partialDirectory: resolve(__dirname, 'src/partials'),
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        portfolio: resolve(__dirname, 'portfolio.html'),
        services: resolve(__dirname, 'services.html'),
        contact: resolve(__dirname, 'contact.html'),
        knowledge: resolve(__dirname, 'knowledge/index.html'),
        'knowledge-article': resolve(__dirname, 'knowledge/build-ai-team-4-months.html'),
        'knowledge-article-2': resolve(__dirname, 'knowledge/what-is-ai-agent.html'),
        'knowledge-article-3': resolve(__dirname, 'knowledge/setup-first-ai-team-one-hour.html'),
        'knowledge-article-4': resolve(__dirname, 'knowledge/what-is-agent-vault.html'),
        'client-portal': resolve(__dirname, 'client-portal.html'),
      },
    },
  },
});