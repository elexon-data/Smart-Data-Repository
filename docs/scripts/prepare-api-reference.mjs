import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'yaml';
import { addOperationCodeSamples } from './generate-code-samples.mjs';

const docsRoot = fileURLToPath(new URL('../', import.meta.url));
const repositoryRoot = resolve(docsRoot, '..');
const contracts = [
  {
    name: 'Catalog API v1',
    input: resolve(repositoryRoot, 'apis', 'catalog', 'v1', 'openapi.yaml'),
    generatedSchema: resolve(docsRoot, '.generated', 'openapi', 'catalog-v1.json'),
    outputDirectory: resolve(docsRoot, 'public', 'reference', 'catalog', 'v1'),
  },
  {
    name: 'Query API v1',
    input: resolve(repositoryRoot, 'apis', 'query', 'v1', 'openapi.yaml'),
    generatedSchema: resolve(docsRoot, '.generated', 'openapi', 'query-v1.json'),
    outputDirectory: resolve(docsRoot, 'public', 'reference', 'query', 'v1'),
  },
];

export function getContractState(inputs) {
  const present = inputs.map(existsSync);
  if (present.every(Boolean)) return 'complete';
  if (present.every((value) => !value)) return 'absent';
  return 'partial';
}

function runRedocly(args) {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) {
    throw new Error('Run this script through an npm script so the pinned Redocly CLI is used.');
  }

  execFileSync(
    process.execPath,
    [npmCli, 'exec', '--', 'redocly', ...args],
    { cwd: docsRoot, stdio: 'inherit' },
  );
}

function clearGeneratedFiles(contract) {
  for (const filename of ['openapi.yaml', 'standalone.html']) {
    rmSync(resolve(contract.outputDirectory, filename), { force: true });
  }
  rmSync(contract.generatedSchema, { force: true });
}

export function prepareApiReference() {
  const state = getContractState(contracts.map(({ input }) => input));

  if (state === 'partial') {
    const missing = contracts
      .filter(({ input }) => !existsSync(input))
      .map(({ name }) => name);
    throw new Error(
      `API contract inputs are incomplete. Missing: ${missing.join(', ')}. Supply both versioned OpenAPI YAML files.`,
    );
  }

  if (state === 'absent') {
    contracts.forEach(clearGeneratedFiles);
    console.log('API contract inputs are absent; building the portal without generated references.');
    return;
  }

  for (const contract of contracts) {
    runRedocly(['lint', contract.input]);
  }

  for (const contract of contracts) {
    mkdirSync(contract.outputDirectory, { recursive: true });
    mkdirSync(resolve(docsRoot, '.generated', 'openapi'), { recursive: true });
    copyFileSync(contract.input, resolve(contract.outputDirectory, 'openapi.yaml'));
    const document = addOperationCodeSamples(parse(readFileSync(contract.input, 'utf8')));
    writeFileSync(contract.generatedSchema, `${JSON.stringify(document, null, 2)}\n`);
    runRedocly([
      'build-docs',
      contract.generatedSchema,
      '--output',
      resolve(contract.outputDirectory, 'standalone.html'),
    ]);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    prepareApiReference();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
