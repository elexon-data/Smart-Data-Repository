import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { starlightBasePath } from 'starlight-base-path';
import starlightOpenAPI, { openAPISidebarGroups } from 'starlight-openapi';

const catalogSchema = fileURLToPath(
  new URL('../apis/catalog/v1/openapi.yaml', import.meta.url),
);
const querySchema = fileURLToPath(
  new URL('../apis/query/v1/openapi.yaml', import.meta.url),
);
const generatedCatalogSchema = fileURLToPath(
  new URL('./.generated/openapi/catalog-v1.json', import.meta.url),
);
const generatedQuerySchema = fileURLToPath(
  new URL('./.generated/openapi/query-v1.json', import.meta.url),
);
const hasCatalogSchema = existsSync(catalogSchema);
const hasQuerySchema = existsSync(querySchema);
const hasCompleteContracts = hasCatalogSchema && hasQuerySchema;
const pluginCatalogSchema = existsSync(generatedCatalogSchema) ? generatedCatalogSchema : catalogSchema;
const pluginQuerySchema = existsSync(generatedQuerySchema) ? generatedQuerySchema : querySchema;
const base = process.env.GITHUB_ACTIONS === 'true' ? '/Smart-Data-Repository' : '/';
const canvasCss = readFileSync(new URL('./src/styles/sdr-canvas.css', import.meta.url), 'utf8');

export default defineConfig({
  site: 'https://elexon-data.github.io',
  base,
  integrations: [
    starlight({
      title: 'Smart Data Repository Developer Portal',
      description: 'Guides and API reference for Smart Data Repository developers.',
      // Paint the themed canvas while the external stylesheets are loading.
      head: [{ tag: 'style', content: canvasCss }],
      customCss: [
        '@fontsource/lato/400.css',
        '@fontsource/lato/700.css',
        '@fontsource/lato/900.css',
        './src/styles/sdr-brand.css',
      ],
      plugins: [
        starlightBasePath(),
        ...(hasCompleteContracts
          ? [
              starlightOpenAPI([
                {
                  base: 'reference/catalog/v1',
                  label: 'Catalog API v1',
                  schema: pluginCatalogSchema,
                },
                {
                  base: 'reference/query/v1',
                  label: 'Query API v1',
                  schema: pluginQuerySchema,
                },
              ]),
            ]
          : []),
      ],
      sidebar: [
        {
          label: 'Guides',
          items: [{ autogenerate: { directory: 'guides' } }],
        },
        {
          label: 'API reference',
          items: [{ label: 'Overview', link: '/reference/' }],
        },
        ...openAPISidebarGroups,
      ],
    }),
  ],
});
