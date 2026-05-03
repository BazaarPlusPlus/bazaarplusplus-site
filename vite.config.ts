import type { IncomingMessage, ServerResponse } from 'node:http';

import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vite';

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

export default defineConfig({
  plugins: [react(), tailwindcss(), remoteMetricsPlugin()],
});
