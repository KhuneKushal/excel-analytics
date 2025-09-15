import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distFolder = join(__dirname, '../dist/excel-analytics/browser');
const indexHtml = join(distFolder, 'index.html');

export default async function handler(req, res) {
  try {
    const { bootstrap } = await import('../dist/excel-analytics/server/main.server.mjs');
    const commonEngine = new CommonEngine();

    const { originalUrl, headers } = req;
    const baseUrl = headers['x-forwarded-proto'] ? `${headers['x-forwarded-proto']}://${headers.host}` : `http://${headers.host}`;

    const html = await commonEngine.render({
      bootstrap,
      documentFilePath: indexHtml,
      url: baseUrl + originalUrl,
      publicPath: distFolder,
      providers: [{ provide: APP_BASE_HREF, useValue: '/' }]
    });

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'public, max-age=0');
    res.end(html);
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
}