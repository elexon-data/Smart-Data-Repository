import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { getContractState } from './prepare-api-reference.mjs';

test('allows bootstrap when neither contract is present', () => {
  const root = mkdtempSync(join(tmpdir(), 'sdr-contracts-'));
  try {
    assert.equal(getContractState([join(root, 'catalog.yaml'), join(root, 'query.yaml')]), 'absent');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('rejects a partial contract set', () => {
  const root = mkdtempSync(join(tmpdir(), 'sdr-contracts-'));
  try {
    const catalog = join(root, 'catalog.yaml');
    writeFileSync(catalog, 'openapi: 3.1.0\n');
    assert.equal(getContractState([catalog, join(root, 'query.yaml')]), 'partial');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('accepts a complete contract set', () => {
  const root = mkdtempSync(join(tmpdir(), 'sdr-contracts-'));
  try {
    const catalog = join(root, 'catalog.yaml');
    const query = join(root, 'query.yaml');
    writeFileSync(catalog, 'openapi: 3.1.0\n');
    writeFileSync(query, 'openapi: 3.1.0\n');
    assert.equal(getContractState([catalog, query]), 'complete');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
