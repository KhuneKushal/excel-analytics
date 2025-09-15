import { APP_BASE_HREF } from '@angular/common';
import { renderApplication } from '@angular/platform-server';
import express, { Request, Response, NextFunction } from 'express';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';
import { readFileSync } from 'fs';

const server = express();
const serverDistFolder = dirname(fileURLToPath(import.meta.url));
const browserDistFolder = resolve(serverDistFolder, '../browser');
const indexHtml = join(browserDistFolder, 'index.html');

server.set('view engine', 'html');
server.set('views', browserDistFolder);

// Serve static files from /browser
server.get('*.*', express.static(browserDistFolder, {
  maxAge: '1y'
}));

// All regular routes use Server-Side Rendering
server.get('*', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { protocol, originalUrl, baseUrl, headers } = req;
    const documentContent = readFileSync(indexHtml, 'utf-8');
    const url = `${protocol}://${headers.host}${originalUrl}`;

    const html = await renderApplication(bootstrap, {
      document: documentContent,
      url,
      platformProviders: [{ provide: APP_BASE_HREF, useValue: baseUrl }]
    });

    res.send(html);
  } catch (err: any) {
    console.error(err);
    next(err);
  }
});

export default server;