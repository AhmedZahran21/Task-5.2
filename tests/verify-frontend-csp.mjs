// Run after `npm run build --workspace client` from the repository root.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer, preview } from 'vite';

const dev = await createServer({
  configFile: 'client/vite.config.js',
  root: 'client',
  server: { host: 'localhost' }
});
try {
  await dev.listen();
  const response = await fetch('http://localhost:5175');
  const csp = response.headers.get('content-security-policy');
  const html = await response.text();
  assert.equal(response.status, 200);
  assert.ok(csp.includes("script-src-attr 'none'"));
  assert.ok(!/script-src[^;]*'unsafe-inline'/.test(csp));
  assert.ok(!csp.includes("'unsafe-eval'"));
  let checked = 0;
  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    if (/\bsrc=/.test(match[1]) || !match[2].trim()) continue;
    const hash = createHash('sha256').update(match[2]).digest('base64');
    assert.ok(csp.includes(`'sha256-${hash}'`), 'React Refresh must match its CSP hash');
    checked++;
  }
  assert.equal(checked, 1);
  console.log('Development HTML CSP and React Refresh hash verified.');
} finally {
  await dev.close();
}

const built = await preview({
  configFile: 'client/vite.config.js',
  root: 'client',
  preview: { host: 'localhost', port: 4173, strictPort: true }
});
try {
  const response = await fetch('http://localhost:4173');
  const csp = response.headers.get('content-security-policy');
  assert.equal(response.status, 200);
  assert.ok(csp.includes("script-src 'self';"));
  assert.ok(csp.includes("script-src-attr 'none'"));
  assert.ok(!csp.includes('sha256-'));
  assert.ok(!csp.includes('unsafe-inline'));
  console.log('Preview HTML CSP verified without development exceptions.');
} finally {
  await new Promise((resolve, reject) => {
    built.httpServer.close(error => error ? reject(error) : resolve());
  });
}
