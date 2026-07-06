import redirects from "../redirects.json";

// meshaelr.com permanent redirect worker (04-migration §2, 03-TRD §3).
//
// MODE (wrangler.toml [vars]):
//   "log"     - compute the verdict, log it, pass the request through to the
//               origin untouched. Deployed this way first (04-migration §6.5)
//               so every mapping can be validated before the flip.
//   "enforce" - actually return the 301/410.
//
// Flipping to enforce is a one-line PR on wrangler.toml. That is the point.

const rulesByPath = new Map(
  redirects.rules.map((rule) => [normalize(rule.from), rule])
);

function normalize(pathname) {
  let p = pathname.toLowerCase();
  if (p.length > 1 && p.endsWith("/")) p = p.slice(0, -1);
  return p;
}

function verdictFor(url) {
  const rule = rulesByPath.get(normalize(url.pathname));
  if (rule && rule.status === 410) {
    return { action: "gone", status: 410, rule };
  }
  if (rule) {
    return { action: "redirect", status: rule.status, to: rule.to, rule };
  }
  // Unmapped paths still land somewhere sensible (Principle 1: no link dies).
  return {
    action: "redirect",
    status: 301,
    to: redirects.defaultTarget,
    rule: null,
    unmapped: true,
  };
}

const GONE_BODY = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>410 Gone</title></head>
<body><h1>410 Gone</h1><p>This page was retired on purpose. The rest of the site moved to <a href="https://meshrahman.com">meshrahman.com</a>.</p></body></html>`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const verdict = verdictFor(url);

    console.log(
      JSON.stringify({
        mode: env.MODE,
        path: url.pathname,
        action: verdict.action,
        status: verdict.status,
        to: verdict.to ?? null,
        unmapped: verdict.unmapped ?? false,
      })
    );

    if (env.MODE !== "enforce") {
      // Log-only: hand the request to the origin exactly as it arrived.
      return fetch(request);
    }

    if (verdict.action === "gone") {
      return new Response(GONE_BODY, {
        status: 410,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }

    // Preserve query strings across the redirect (except where the target
    // already carries its own, like /essays?tag=systems).
    const target = new URL(verdict.to);
    if (url.search && !target.search) target.search = url.search;

    return Response.redirect(target.toString(), verdict.status);
  },
};
