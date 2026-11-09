import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import starlightOpenAPI, { openAPISidebarGroups } from 'starlight-openapi';

const catalogSchema = fileURLToPath(
  new URL('../apis/catalog/v1/openapi.yaml', import.meta.url),
);
const querySchema = fileURLToPath(
  new URL('../apis/query/v1/openapi.yaml', import.meta.url),
);
const hasCatalogSchema = existsSync(catalogSchema);
const hasQuerySchema = existsSync(querySchema);
const hasCompleteContracts = hasCatalogSchema && hasQuerySchema;
const base = process.env.GITHUB_ACTIONS === 'true' ? '/Smart-Data-Repository' : '/';

export default defineConfig({
  site: 'https://elexon-data.github.io',
  base,
  integrations: [
    starlight({
      title: 'Smart Data Repository Developer Portal',
      description: 'Guides and API reference for Smart Data Repository developers.',
      customCss: [
        '@fontsource/lato/400.css',
        '@fontsource/lato/700.css',
        '@fontsource/lato/900.css',
        './src/styles/sdr-brand.css',
      ],
      components: {
        ThemeSelect: './src/components/PortalThemeSelect.astro',
      },
      plugins: hasCompleteContracts
        ? [
            starlightOpenAPI([
              {
                base: 'reference/catalog/v1',
                label: 'Catalog API v1',
                schema: catalogSchema,
              },
              {
                base: 'reference/query/v1',
                label: 'Query API v1',
                schema: querySchema,
              },
            ]),
          ]
        : [],
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
