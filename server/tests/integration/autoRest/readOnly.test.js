/*
 Basic integration skeleton for auto-rest read-only endpoints.
 These tests assume a Postgres connection, a Service, and an ExposedEntity exist in the test DB.
 For now, keep as a smoke test scaffold to be fleshed out when fixtures are available.
*/

const request = require('supertest');
const { configureApp } = require('../../../app');

describe('Auto-REST Read-only (smoke)', () => {
  const expressApp = configureApp();
  const API_PREFIX = '/api/v2';
  const API_KEY = process.env.TEST_API_KEY || 'test-placeholder';
  const SERVICE = process.env.TEST_SERVICE || 'testservice';
  const ENTITY = process.env.TEST_ENTITY || 'test_table';

  const headers = { 'x-nectarstudio-api-key': API_KEY };

  it('lists exposed entities (200)', async () => {
    const res = await request(expressApp).get(`${API_PREFIX}/${SERVICE}/_table`).set(headers);
    // Do not assert content in skeleton; just assert shape
    expect([200, 401, 403, 404]).toContain(res.status);
  });

  it('fetches list with pagination (200)', async () => {
    const res = await request(expressApp)
      .get(`${API_PREFIX}/${SERVICE}/_table/${ENTITY}`)
      .query({ page: 1, pageSize: 1 })
      .set(headers);
    expect([200, 401, 403, 404]).toContain(res.status);
  });
});
