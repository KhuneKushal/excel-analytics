
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "redirectTo": "/upload",
    "route": "/"
  },
  {
    "renderMode": 1,
    "route": "/upload"
  },
  {
    "renderMode": 1,
    "route": "/auto-analytics"
  },
  {
    "renderMode": 1,
    "route": "/dashboard-builder"
  },
  {
    "renderMode": 1,
    "route": "/my-dashboard"
  },
  {
    "renderMode": 2,
    "route": "/data-summary"
  },
  {
    "renderMode": 1,
    "route": "/filter-builder"
  },
  {
    "renderMode": 1,
    "route": "/calculated-columns"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 70072, hash: '23af6b91172e0ea6d572a097f450d512803c6fe0a7a8fd2029c95be8dd0fdfa3', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 17170, hash: 'c51fe0e0a879c071187838943c016885d47c9e20bce51f8b1b436eb5b8b9b44c', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'data-summary/index.html': {size: 171056, hash: 'b05142e0582a99838f08e790ec4e656ee3aeaee63968b698ebcf522ae5b947f1', text: () => import('./assets-chunks/data-summary_index_html.mjs').then(m => m.default)},
    'styles-Q4YAEP73.css': {size: 104387, hash: '9kn01rNuYoQ', text: () => import('./assets-chunks/styles-Q4YAEP73_css.mjs').then(m => m.default)}
  },
};
