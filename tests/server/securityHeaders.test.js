import request from 'supertest';
import app from '../../server/src/app.js';

// Header protection must also apply to errors and routes that never use MongoDB.
describe('security headers without database setup', () => {
  test.each(['/api/health', '/missing'])('protects GET %s', async path => {
    const response = await request(app).get(path);
    const policy = response.headers['content-security-policy'];
    const directives = Object.fromEntries(policy.split(';').map(directive => {
      const [name, ...values] = directive.trim().split(/\s+/);
      return [name, values];
    }));
    expect(directives['script-src']).toEqual(["'self'"]);
    expect(directives['script-src-attr']).toEqual(["'none'"]);
    expect(directives['object-src']).toEqual(["'none'"]);
    expect(directives['base-uri']).toEqual(["'none'"]);
    expect(directives['frame-ancestors']).toEqual(["'none'"]);
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  test('protects requests rejected by authentication', async () => {
    const response = await request(app).post('/api/reviews').send({ body: '<b>test</b>' });
    expect(response.status).toBe(401);
    expect(response.headers['content-security-policy']).toContain("script-src 'self'");
  });
});
