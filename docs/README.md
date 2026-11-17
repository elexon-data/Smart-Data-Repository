# Developer portal

The Astro Starlight site in this directory is the public developer portal. From this directory, install the pinned dependencies with `npm ci`, run the contract-state tests with `npm test`, and build the site with `npm run build`.

The API source inputs are `apis/catalog/v1/openapi.yaml` and `apis/query/v1/openapi.yaml` at the repository root. Do not put private source definitions or credentials in this repository. The build accepts both contract files being absent while the portal is being bootstrapped; it rejects a partial set. When both are present, the build lints each file with Redocly, generates integrated Starlight references and standalone HTML, and copies each input YAML byte-for-byte to its public download route.

The portal uses the SDR-branded theme with Starlight's light/dark control.

GitHub Pages serves the site at `https://docs.sdr.elexon.co.uk/`. Pull requests run tests and a build but do not deploy. A deployment is triggered by changes merged to `main` or manually from the Actions tab.

To configure the domain, first verify it for the GitHub organization, then add `docs.sdr.elexon.co.uk` as the custom domain in the repository's Pages settings. After adding it to GitHub, create a DNS CNAME for `docs.sdr.elexon.co.uk` pointing to `elexon-data.github.io`. Once DNS and the certificate are ready, enable HTTPS enforcement in the Pages settings. See [GitHub's custom domain guidance](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site).
