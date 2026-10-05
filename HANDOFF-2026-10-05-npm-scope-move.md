# Handoff 2026-10-05: npm scope move @cloudyindustries/baseh → @sixtyai/baseh

State transfer for the next session. Verified live on 2026-10-05: the new
package does NOT exist yet on npm, the old package is NOT deprecated, PyPI
still serves 2.0.3 and this repo is unchanged since `84d12cd`. Everything
below reflects that.

Migration-wide log: `~/Code/sixty/REPO-MOVES.md`. Migration-wide handoff
(Pages projects, tokematic, operational knowledge):
`~/Code/sixty/HANDOFF-repo-migration.md`.

## Next up: the npm scope move (Matt's steps, then agent verifies)

Matt approved moving the npm library on 2026-09-30. The old package STAYS
LIVE; nothing is unpublished.

Code prep is DONE, committed and pushed as `84d12cd` (2026-09-30, no tag):
package renamed in `js/package.json`, all imports, docs and aliases
updated, both lockfiles regenerated. Verified at the time: js build + 669
tests, web 120 tests, `scripts/check-versions.sh` green. Nothing public
changes until a release tag is pushed.

Remaining steps need Matt's npm login and security key (none are
agent-doable):

1. npmjs.com: create the `sixtyai` org if it does not exist (free public
   scope). The old package is owned by npm user `cloudyindustries`
   (mat@cloudy.industries).
2. `npm login` on the Mac. The CLI is unauthenticated (E401) as of
   2026-09-30.
3. `cd js && npm publish --access public` — one-time bootstrap publish of
   2.0.4 under the new name. npm has no pending-publisher flow for names
   that do not exist yet.
4. On `@sixtyai/baseh` → Settings → Trusted Publisher: owner `SixtyAI`,
   repository `baseh`, workflow `release.yml`, environment BLANK, tick
   `npm publish` only. An environment value fails the OIDC match; see
   `docs/releasing.md`.
5. `npm deprecate @cloudyindustries/baseh "moved to @sixtyai/baseh"` —
   a banner, not a removal. Existing installs keep working.

Agent verification afterwards:

- `npm view @sixtyai/baseh` shows 2.0.4.
- `npm view @cloudyindustries/baseh` shows the deprecation message.
- Trusted publisher visible in the npm UI.
- Update `~/Code/sixty/REPO-MOVES.md` (section "2026-09-30 — npm scope
  move", flip STAGED → DONE) and delete this handoff or mark it complete.

Optional follow-up for Matt: remove the trusted publisher from the OLD
package so nothing new can ship under the old scope.

## Also waiting on Matt (one word each; do not fire unilaterally)

- **PyPI 2.0.4 backfill.** Release run 32561260927 (2026-08-22) failed only
  its publish-pypi job because the publisher was still registered to
  `cloudyventures/baseh`; PyPI serves 2.0.3 while npm, crates.io and
  RubyGems serve 2.0.4. Registration fixed 2026-09-29. Fix:
  `gh run rerun 32561260927 --repo SixtyAI/baseh` (public publish, needs
  his go) or let it ship naturally with the next tag.
- **Delete Cloudflare Pages project `customatic-www`** (Cloudy Industries
  account): obsolete since repo commit `7d07e58` removed `products/`; its
  builds can never succeed. No custom domains, auto-deploy off. Details in
  `~/Code/sixty/REPO-MOVES.md`.
- **The tokematic repo stays in cloudyindustries?** Unanswered. If it ever
  moves, `tokematic-www` src files deliberately link to it and need
  updating then.

## What the next version tag activates (no action until tagged)

- Publishes `@sixtyai/baseh` via the new trusted publisher (step 4 must be
  done first or the npm job fails; other registries still publish, per the
  partial-release design in `docs/releasing.md`).
- Activates the Go module path `github.com/SixtyAI/baseh/go/v2` (go.mod
  renamed in `49a50ef`) via a new `go/vX.Y.Z` tag.
- Live-tests all four re-registered trusted publishers, PyPI especially.

## Rules in force for this work

- Public registry publishes and production deploys: confirm with Matt
  first. A version tag IS a public publish.
- New standing order (Mat, 2026-10-02): deployment is Git-triggered —
  push/merge to the release branch runs checks then deploys; routine
  deployment must not depend on the Mac's CLI login. Local manual deploys
  only when Matt requests or a recovery requires.
- Keys: 1Password profile `cloudy`, vault `Managed Keys` (agent-readable).
- Never recreate a repo at an old `github.com/cloudyindustries` path; the
  301 redirects everything relies on die if the old name is reused.
- Session event log for full history:
  `~/.kimi-code/sessions/wd_sixty_3e5a18793745/session_ad60e4a0-5956-475b-a864-7bf43908b2d8/agents/main/wire.jsonl`.
