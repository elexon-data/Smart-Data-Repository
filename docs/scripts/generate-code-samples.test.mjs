import assert from 'node:assert/strict';
import test from 'node:test';
import { addOperationCodeSamples } from './generate-code-samples.mjs';

test('generates Python, TypeScript, and .NET samples without replacing existing samples', () => {
  const document = {
    openapi: '3.0.0',
    servers: [{ url: 'https://api.example.test' }],
    paths: {
      '/api/v1/items/{itemId}': {
        parameters: [{ name: 'itemId', in: 'path', required: true, schema: { type: 'string' } }],
        get: {
          operationId: 'getItem',
          security: [{ OAuth2: [] }],
          parameters: [
            { name: 'include', in: 'query', required: true, schema: { type: 'string', example: 'details' } },
          ],
          responses: {
            '200': {
              description: 'OK',
              content: { 'application/json': { schema: { type: 'object' } } },
            },
          },
          'x-codeSamples': [{ label: 'Custom sample', lang: 'text', source: 'Existing sample' }],
        },
      },
      '/api/v1/jobs': {
        post: {
          operationId: 'submitJob',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['items'],
                  properties: {
                    items: { allOf: [{ $ref: '#/components/schemas/ItemList' }] },
                  },
                },
              },
            },
          },
          responses: { '202': { description: 'Accepted' } },
        },
      },
    },
    components: { schemas: { ItemList: { type: 'string' } } },
  };

  addOperationCodeSamples(document);

  const samples = document.paths['/api/v1/items/{itemId}'].get['x-codeSamples'];
  assert.equal(samples[0].source, 'Existing sample');
  assert.deepEqual(
    samples.slice(1).map(({ label }) => label),
    ['cURL', 'JavaScript (Fetch)', 'Python (Requests)', 'TypeScript (Fetch)', '.NET (HttpClient)'],
  );
  assert.match(samples.find(({ lang }) => lang === 'python').source, /import requests/);
  assert.match(samples.find(({ lang }) => lang === 'typescript').source, /const options: RequestInit/);
  assert.match(samples.find(({ lang }) => lang === 'typescript').source, /fetch\(/);
  assert.match(samples.find(({ lang }) => lang === 'csharp').source, /HttpRequestMessage/);
  for (const { source } of samples.slice(1)) {
    assert.match(source, /api\.example\.test\/api\/v1\/items\/example/);
    assert.match(source, /include/);
    assert.match(source, /Bearer <access-token>/);
  }

  const bodySamples = document.paths['/api/v1/jobs'].post['x-codeSamples'];
  assert.match(bodySamples.find(({ label }) => label === 'Python (Requests)').source, /json=payload/);
  assert.match(bodySamples.find(({ label }) => label === 'Python (Requests)').source, /"example"/);
});

test('does not invent a server for generated snippets', () => {
  assert.throws(
    () =>
      addOperationCodeSamples({
        openapi: '3.0.0',
        paths: { '/items': { get: { responses: { '200': { description: 'OK' } } } } },
      }),
    /does not define a server URL/,
  );
});
