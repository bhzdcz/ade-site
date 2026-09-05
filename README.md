# ADE public website

A static product introduction, public docs, interactive artifact example and setup inquiry builder for [ADE](https://ade.ir). Product development is in the currently private [bhzdcz/ade](https://github.com/bhzdcz/ade) repository. This site does not import or expose private product source or history.

## Preview and verify

Python 3.10+ and Node 22+ are used for development. The shipped website has no runtime dependencies.

```bash
npm ci
npm run build
npm run check
npx playwright install chromium
npm test
npm run preview
```

Open http://127.0.0.1:4173. Serve `dist/`, not the source directory. The build creates config.js and the downloadable example archive. The explicit asset allowlist excludes tests, scripts, Git files and internal documentation.

## Configure contact and funding

Edit `site.config.json`, then rebuild. Contact is currently **behzad@airoweb.com**, supplied by the owner. Prices are proposed and inquiries do not charge the visitor.

| Field | Meaning |
| --- | --- |
| `contactEmail` | Public contact; updates generated mailto links and inquiry drafts |
| `sponsorUrl` | Exact HTTPS GitHub Sponsors profile, after owner onboarding |
| `bitcoinAddress` | Owner-controlled mainnet native SegWit address (`bc1…`), or empty |
| `bitcoinAddressVerified` | Set true only after the owner verifies the address in their wallet |
| `checkoutUrl` | HTTPS hosted checkout for an agreed offer, or empty |
| `commerceEnabled` | Enable only after host suitability, seller details and offer terms are confirmed |

No financial destinations are configured. Hidden controls become available only when valid destinations are present. The build checks Bech32/Bech32m address checksums and witness programs using BIP173/BIP350 rules; only native SegWit mainnet addresses are supported. A syntactically valid address does not prove ownership. Never put private keys, recovery phrases or payment API secrets in this repository.

The Bitcoin link opens a wallet; it does not confirm payments or issue receipts. Donations do not purchase services. Sponsor/checkout links navigate to external providers. Configuration is public by design.

## Hosting and release

**Do not deploy this commercial redesign to GitHub Pages as a storefront.** GitHub's [Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits) restrict sites primarily facilitating commercial transactions. The existing production site remains untouched. This branch changes the workflow to build/test and upload a review artifact only; deploying the redesign requires a suitable host and an owner-approved release.

The `dist/` directory works with static hosts. Configure build command `python3 scripts/build.py`, output `dist`, and the custom domain after choosing a provider whose terms cover the intended use. Domain remains `ade.ir`; no DNS changes are included. Update the privacy page to identify the actual host when moving.

## Product boundaries

The core is private and an MIT release is proposed. Public copy says this explicitly. Never replace source-access requests with private GitHub clone links presented as public downloads. The example is independently authored public illustrative content; it does not implement authentication.

The form creates an email draft locally and makes no submission request. Fields stay disabled without JavaScript and a direct email fallback is shown. No analytics, cookies, browser storage or third-party font calls are added. See `/privacy/` for user-facing details.

## Design and assets

Graphite background and green accent retain ADE's identity. Native CSS, square geometry, a restrained pixel wordmark and readable sans-serif copy. No fabricated testimonials, metrics or product dashboard. The artifact explorer is functional and explicitly labeled as an example.

Press Start 2P is self-hosted under assets/fonts with its SIL Open Font License. Website and public example: MIT, see LICENSE. BIP173/BIP350 references: https://bips.dev/173/ and https://bips.dev/350/.
