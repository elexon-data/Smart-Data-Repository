# Developer portal

The Astro Starlight site in this directory is the public developer portal. From this directory, install the pinned dependencies with `npm ci`, run the contract-state tests with `npm test`, and build the site with `npm run build`.

The API source inputs are `apis/catalog/v1/openapi.yaml` and `apis/query/v1/openapi.yaml` at the repository root. Do not put private source definitions or credentials in this repository. The build accepts both contract files being absent while the portal is being bootstrapped; it rejects a partial set. When both are present, the build lints each file with Redocly, generates integrated Starlight references and standalone HTML, and copies each input YAML byte-for-byte to its public download route.

The portal uses the SDR-branded theme with Starlight's light/dark control.

Write internal Markdown and hero-action links relative to the site root (for example, `/guides/`). `starlight-base-path` adds the configured Astro base path for GitHub Pages; do not include the repository name in these links.

GitHub Pages serves the site at `https://elexon-data.github.io/Smart-Data-Repository/`. Pull requests run tests and a build but do not deploy. A deployment is triggered by changes merged to `main` or manually from the Actions tab.
