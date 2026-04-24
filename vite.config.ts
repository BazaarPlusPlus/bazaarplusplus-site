import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { extname, resolve, sep } from 'node:path';

import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

import { selectPreferredCardDictionary } from './src/lib/card-dictionary-source';
import type { CardDictionary } from './src/lib/metrics';

function getContentType(path: string): string {
  if (extname(path) === '.json') {
    return 'application/json; charset=utf-8';
  }

  return 'application/octet-stream';
}

function createMetricsMiddleware(root: string) {
  const metricsRoot = resolve(root);

  return async function serveMetrics(
    request: IncomingMessage,
    response: ServerResponse,
    next: () => void
  ) {
    if (!request.url) {
      next();
      return;
    }

    const parsedUrl = new URL(request.url, 'http://localhost');
    const relativePath = decodeURIComponent(parsedUrl.pathname).replace(/^\/+/, '');
    const filePath = resolve(metricsRoot, relativePath);
    const isInsideMetricsRoot =
      filePath === metricsRoot || filePath.startsWith(`${metricsRoot}${sep}`);

    if (!isInsideMetricsRoot) {
      response.statusCode = 403;
      response.end('Forbidden');
      return;
    }

    try {
      const fileStat = await stat(filePath);
      if (!fileStat.isFile()) {
        next();
        return;
      }

      response.setHeader('content-type', getContentType(filePath));
      createReadStream(filePath).pipe(response);
    } catch {
      next();
    }
  };
}

function localMetricsPlugin(): Plugin {
  const metricsDir = process.env.BPP_LOCAL_METRICS_DIR
    ? resolve(process.env.BPP_LOCAL_METRICS_DIR)
    : resolve(process.cwd(), '../analyzers/data/metrics');

  return {
    name: 'bpp-local-metrics',
    configureServer(server) {
      server.middlewares.use('/metrics', createMetricsMiddleware(metricsDir));
    },
    configurePreviewServer(server) {
      server.middlewares.use('/metrics', createMetricsMiddleware(metricsDir));
    },
  };
}

function cardDictionaryPlugin(): Plugin {
  const cardDictionaryPath = process.env.BPP_LOCAL_CARD_DICTIONARY_PATH
    ? resolve(process.env.BPP_LOCAL_CARD_DICTIONARY_PATH)
    : resolve(process.cwd(), '../analyzers/data/card_dict_with_url.json');
  const remoteCardDictionaryUrl =
    process.env.BPP_REMOTE_CARD_DICTIONARY_URL ??
    'https://bpp-static.bazaarplusplus.com/card_dict_with_url.json';

  async function readLocalCardDictionary(): Promise<CardDictionary | undefined> {
    try {
      return JSON.parse(await readFile(cardDictionaryPath, 'utf-8')) as CardDictionary;
    } catch {
      return undefined;
    }
  }

  async function fetchRemoteCardDictionary(): Promise<CardDictionary | undefined> {
    try {
      const response = await fetch(remoteCardDictionaryUrl);
      if (!response.ok) {
        return undefined;
      }

      return (await response.json()) as CardDictionary;
    } catch {
      return undefined;
    }
  }

  async function loadPreferredCardDictionary(): Promise<CardDictionary> {
    const [local, remote] = await Promise.all([
      readLocalCardDictionary(),
      fetchRemoteCardDictionary(),
    ]);

    return selectPreferredCardDictionary({ local, remote });
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
      const dictionary = await loadPreferredCardDictionary();
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
        const source = JSON.stringify(await loadPreferredCardDictionary());
        this.emitFile({
          type: 'asset',
          fileName: 'card_dict_with_url.json',
          source,
        });
      } catch {
        this.warn(`Card dictionary not found at ${cardDictionaryPath}`);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), localMetricsPlugin(), cardDictionaryPlugin()],
});
