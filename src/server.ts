import { APP_BASE_HREF } from '@angular/common';
import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { Request, Response, NextFunction } from 'express';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { routes } from './app/app.routes';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// In production (Vercel), the cwd is set to the deployment directory
const cwd = process.cwd();
const browserDistFolder = join(cwd, 'dist/excel-analytics/browser');
const indexHtml = join(browserDistFolder, 'index.html');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Handle preflight requests
app.options('*', (_, res) => {
  res.status(200).end();
});

// Add basic security headers
app.use((_, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Log requests in development
if (process.env['NODE_ENV'] !== 'production') {
  app.use((req, _, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
  });
}

// Error handling middleware
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Server Error:', err);
  
  // Handle specific error types
  if (err.code === 'ENOENT') {
    console.error(`File not found: ${req.path}`);
    if (req.path.endsWith('.html')) {
      return res.sendFile(indexHtml);
    }
    return res.status(404).sendFile(join(browserDistFolder, 'assets/404.html'));
  }
  
  // Default error response
  return res.status(500).json({
    error: 'Internal server error',
    message: process.env['NODE_ENV'] === 'development' ? err.message : 'Something went wrong'
  });
});

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'healthy' });
});

// Security headers middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Serve static files with proper caching
app.use('/assets', express.static(join(browserDistFolder, 'assets'), {
  maxAge: '1y',
  immutable: true,
  fallthrough: false
}));

// Handle other static files
app.use(express.static(browserDistFolder, {
  maxAge: '1d',
  index: false,
  fallthrough: true
}));

// Custom 404 handler for static files
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.statusCode === 404) {
    console.log(`Static file not found: ${req.path}`);
    return next();
  }
  next(err);
});

/**
 * Handle all other requests by rendering the Angular application.
 */
// Send index.html for all routes that don't match files
app.get('*', (req: Request, res: Response, next: NextFunction) => {
  // Exclude API routes and static files
  if (req.url.startsWith('/api/') || req.url.match(/\.(js|css|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
    return next();
  }

  console.log(`Handling route: ${req.url}`);

  angularApp
    .handle(req)
    .then((response) => {
      if (response) {
        writeResponseToNodeResponse(response, res);
      } else {
        // If no response, serve the index.html
        res.sendFile(join(browserDistFolder, 'index.html'), { maxAge: '1h' });
      }
    })
    .catch(error => {
      console.error('Error handling request:', req.url, error);
      // For 404s, serve index.html to let Angular handle routing
      res.sendFile(join(browserDistFolder, 'index.html'), { maxAge: '1h' });
    });
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4001;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);

export default app;
