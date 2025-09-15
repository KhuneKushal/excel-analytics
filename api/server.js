import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import bootstrap from '../dist/excel-analytics/server/main.server.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const serverDistFolder = resolve(__dirname, '../dist/excel-analytics/server');
const browserDistFolder = resolve(__dirname, '../dist/excel-analytics/browser');
const indexHtml = join(serverDistFolder, 'index.server.html');

export default async function handler(req, res) {
  const app = express();
  const commonEngine = new CommonEngine();

  // Serve static files
  app.use(express.static(browserDistFolder, {
    maxAge: '1y',
    index: false
  }));

  // All regular routes use the Universal engine
  app.get('*', (req, res) => {
    const { protocol, originalUrl, baseUrl, headers } = req;

    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: `${protocol}://${headers.host}${originalUrl}`,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: baseUrl }],
      })
      .then((html) => {
        res.send(html);
      })
      .catch((err) => {
        console.error(err);
        res.status(500).send('Server Error');
      });
  });

  return app(req, res);
}