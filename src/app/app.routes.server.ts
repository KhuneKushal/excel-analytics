import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: 'upload',
    renderMode: RenderMode.Client
  },
  {
    path: 'auto-analytics',
    renderMode: RenderMode.Client
  },
  {
    path: 'dashboard-builder',
    renderMode: RenderMode.Client
  },
  {
    path: 'my-dashboard',
    renderMode: RenderMode.Client
  },
  {
    path: 'data-summary',
    renderMode: RenderMode.Prerender
  },
  {
    path: 'filter-builder',
    renderMode: RenderMode.Client
  },
  {
    path: 'calculated-columns',
    renderMode: RenderMode.Client
  },
  {
    path: '',
    renderMode: RenderMode.Prerender
  },
  {
    path: '**',
    renderMode: RenderMode.Client
  }
];
