# ade-site

Public **marketing landing** for [ADE](https://github.com/bhzdcz/ade) — AI-native SDLC.

- **Canonical:** [https://ade.ir](https://ade.ir)
- **Product (private SoT):** [https://github.com/bhzdcz/ade](https://github.com/bhzdcz/ade)
- **This repo:** static GitHub Pages only. It **links** to the product; it does **not** host the platform runtime, runner, or dashboard.

Intent-id: `2026-09-05-ade-site` (artifacts live on `bhzdcz/ade`).

## Stack

Plain `index.html` + `styles.css` + `main.js` + `assets/`. No React, no backend.

Deploy: GitHub Actions → Pages (`actions/upload-pages-artifact` + `actions/deploy-pages`).

## DNS (Behzad)

Verified against [GitHub Pages custom domain docs](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site) at implement time (2026-09-05).

| Record | Host / name | Type | Value | Notes |
| --- | --- | --- | --- | --- |
| Apex `ade.ir` | `@` | **A** | `185.199.108.153` | GitHub Pages |
| Apex `ade.ir` | `@` | **A** | `185.199.109.153` | GitHub Pages |
| Apex `ade.ir` | `@` | **A** | `185.199.110.153` | GitHub Pages |
| Apex `ade.ir` | `@` | **A** | `185.199.111.153` | GitHub Pages |
| `www.ade.ir` | `www` | **CNAME** | `bhzdcz.github.io` | Optional; canonical is apex |

Root `CNAME` file in this repo contains `ade.ir`.

### Behzad steps

1. Repo **Settings → Pages**: Source = **GitHub Actions**.
2. After first green deploy, set **Custom domain** to `ade.ir` (CNAME file already present).
3. At the registrar, add the A records (and www CNAME) above.
4. Wait for DNS, then enable **Enforce HTTPS** in Pages settings.

Agents do not change DNS. Re-check GitHub’s published IPs if docs change.

## Fonts

**Press Start 2P** (pixel display) is self-hosted under `assets/fonts/` under the [SIL Open Font License](assets/fonts/OFL.txt). Body text uses system UI fonts for readability.

## License

MIT — see [LICENSE](LICENSE).
