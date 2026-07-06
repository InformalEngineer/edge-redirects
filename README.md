# edge-redirects

The permanent 301 map for meshaelr.com, deployed as a Cloudflare Worker.
Source of truth: `redirects.json` (versioned, PR-reviewed like code, per
03-TRD §5). Full context in `04-migration-meshaelr.md` in the `ops` repo.

**Principle 1: no link dies.** meshaelr.com stays registered forever and every
published URL 301s somewhere sensible. `/freelance` is the one deliberate 410.

## Modes

- `MODE = "log"` (current): the worker logs what it *would* do and passes every
  request through to the origin untouched. Deployed this way per 04-migration
  §6.5 so mappings can be validated before the flip.
- `MODE = "enforce"`: returns the actual 301/410 responses. Flipping is a
  one-line PR on `wrangler.toml` (04-migration §6.6, week 4).

## Validating the map (before the flip)

1. Watch verdicts: `npx wrangler tail meshaelr-redirects` (or dashboard Logs).
2. Every `to` URL must resolve 200 at its destination before enforcing.
   The automated check lives in the `ops` repo: curl every old URL, assert
   301→200 or 410 (04-migration §7).

## Deploying

```
npm install
npx wrangler deploy
```

CI deploys on merge to `main` once the `CLOUDFLARE_API_TOKEN` secret is set
(see REMAINING-MANUAL-STEPS.md in the program docs).

## Editing the map

Change `redirects.json` in a PR. Paths are matched case-insensitively with
trailing slashes ignored. Unmapped paths 301 to the `defaultTarget`
(meshrahman.com) and are logged with `unmapped: true`, watch for those in the
weeks after the flip and patch the map (04-migration §6.7).
