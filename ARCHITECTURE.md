# Live Lab Log architecture

`GET /api/lab-log?theme=light|dark` returns an SVG generated from Victarry's public GitHub activity.

The optional fixed `v=20260714` parameter exists only to invalidate GitHub Camo after a visual/data-selection change. Other values and unknown query parameters return `400`, preventing arbitrary cache-busting from exhausting GitHub's public API limit.

## Data sources

- GitHub Search API: recently merged pull requests authored by `Victarry`.
- GitHub Events API: recent public reviews, releases, and pushes.
- Pull Request and Commit APIs: titles for the two latest reviews and the latest push.

The function selects at most two merged PRs, two reviews, and one release (or one commit when there is no recent release), then sorts the five results by date. Private activity is never queried or rendered.

## Runtime and cache

- Node.js Vercel Function in [`api/lab-log.js`](api/lab-log.js).
- One-hour Vercel CDN cache: `s-maxage=3600`.
- Stale content may be served for 24 hours while the edge revalidates: `stale-while-revalidate=86400`.
- An `ETag` supports conditional requests.
- If every GitHub source fails, the endpoint renders the checked-in, dated last-known-good public snapshot and reports `X-Data-Source: fallback-snapshot`.

The production deployment intentionally uses GitHub's public APIs without a personal token. A token is optional for local development, but no broad GitHub credential is stored in Vercel.

## Verification

```sh
npm test
npm run snapshot
curl -I 'https://victarry-readme.vercel.app/api/lab-log?theme=dark'
```

Expected production headers include:

```text
content-type: image/svg+xml; charset=utf-8
x-data-source: github-live
x-vercel-cache: HIT
```
