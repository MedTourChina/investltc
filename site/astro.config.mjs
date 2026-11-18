import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://invest.lifetourchina.com',
  integrations: [sitemap()],
  image: {
    service: { entrypoint: 'astro/assets/services/noop' },
  },
  build: { inlineStylesheets: 'auto' },
  prefetch: { prefetchAll: true },
  devToolbar: { enabled: false },
});
