import type { IncomingMessage, ServerResponse } from 'node:http';

import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

import type { CardDictionary } from './src/lib/metrics';

function normalizeBaseUrl(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

function remoteMetricsPlugin(): Plugin {
  const remoteMetricsBaseUrl = normalizeBaseUrl(
    process.env.BPP_REMOTE_METRICS_BASE ??
      process.env.PUBLIC_METRICS_BASE ??
      'https://bpp-metrics.bazaarplusplus.com'
  );

  async function serveRemoteMetrics(
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void
  ) {
    if (!request.url) {
      next();
      return;
    }

    const parsedUrl = new URL(request.url, 'http://localhost');
    if (!parsedUrl.pathname.startsWith('/metrics/')) {
      next();
      return;
    }

    const relativePath = parsedUrl.pathname.replace(/^\/metrics\//, '');
    try {
      const upstream = await fetch(`${remoteMetricsBaseUrl}${relativePath}${parsedUrl.search}`);
      response.statusCode = upstream.status;
      response.statusMessage = upstream.statusText;
      const contentType = upstream.headers.get('content-type');
      const cacheControl = upstream.headers.get('cache-control');

      if (contentType) {
        response.setHeader('content-type', contentType);
      }

      if (cacheControl) {
        response.setHeader('cache-control', cacheControl);
      }

      response.end(Buffer.from(await upstream.arrayBuffer()));
    } catch {
      next();
    }
  }

  return {
    name: 'bpp-remote-metrics',
    configureServer(server) {
      server.middlewares.use(serveRemoteMetrics);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveRemoteMetrics);
    },
  };
}

function cardDictionaryPlugin(): Plugin {
  const remoteCardDictionaryUrl =
    process.env.BPP_REMOTE_CARD_DICTIONARY_URL ??
    'https://bpp-static.bazaarplusplus.com/card_dict_with_url.json';

  async function fetchRemoteCardDictionary(): Promise<CardDictionary> {
    const response = await fetch(remoteCardDictionaryUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch card dictionary: ${response.status}`);
    }

    return (await response.json()) as CardDictionary;
  }

  async function serveCardDictionary(
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void
  ) {
    if (!request.url) {
      next();
      return;
    }

    const parsedUrl = new URL(request.url, 'http://localhost');
    if (parsedUrl.pathname !== '/card_dict_with_url.json') {
      next();
      return;
    }

    try {
      const dictionary = await fetchRemoteCardDictionary();
      response.setHeader('content-type', 'application/json; charset=utf-8');
      response.end(JSON.stringify(dictionary));
    } catch {
      next();
    }
  }

  return {
    name: 'bpp-card-dictionary',
    configureServer(server) {
      server.middlewares.use(serveCardDictionary);
    },
    configurePreviewServer(server) {
      server.middlewares.use(serveCardDictionary);
    },
    async generateBundle() {
      try {
        const source = JSON.stringify(await fetchRemoteCardDictionary());
        this.emitFile({
          type: 'asset',
          fileName: 'card_dict_with_url.json',
          source,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.warn(`Remote card dictionary unavailable from ${remoteCardDictionaryUrl}: ${message}`);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), remoteMetricsPlugin(), cardDictionaryPlugin()],
});
