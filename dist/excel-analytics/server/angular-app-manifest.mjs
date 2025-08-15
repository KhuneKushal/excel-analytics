
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
    'index.csr.html': {size: 70072, hash: '5ca80285d22a927ec9533af515d780b149dd4cbc8ce5b5ac45d34f1bb88c6a15', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 17170, hash: '95e90afcc92a3b5f717714721c33b664674276d7135053fa50325c11f4b0fad5', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'data-summary/index.html': {size: 171056, hash: '12220cf2ad2e0c758b8dfd3c146cf9e5e6168479c67666231611ed9aea0414b3', text: () => import('./assets-chunks/data-summary_index_html.mjs').then(m => m.default)},
    'styles-Q4YAEP73.css': {size: 104387, hash: '9kn01rNuYoQ', text: () => import('./assets-chunks/styles-Q4YAEP73_css.mjs').then(m => m.default)}
  },
};
