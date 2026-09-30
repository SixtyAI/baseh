# Releasing

## How it works

1. Push a version tag, for example `git tag v1.0.0 && git push origin v1.0.0`.
2. The `release` workflow runs every test suite of all five implementations
   against the frozen vectors, then the release gates: the full
   100,000-sampled-body checksum sweep under `BASEH_SOAK=1` for Python, Go,
   Rust and Ruby (`cd python && BASEH_SOAK=1 python tests/test_checksum_sweep.py TestChecksumSweepFull`,
   `cd go && BASEH_SOAK=1 go test -run TestChecksumSweepFull -v .`,
   `cd rust && BASEH_SOAK=1 cargo test --release --test checksum_sweep -- --ignored single_substitution_sweep_full --nocapture`,
   `cd ruby && BASEH_SOAK=1 ruby -Ilib -Itest test/test_checksum_sweep.rb -n test_single_substitution_sweep_soak`)
   plus a five-minute Go fuzz run (`cd go && go test -fuzz=FuzzDecode -fuzztime=5m .`).
   Any disagreement stops the release. If the nightly `soak` workflow has
   already passed for the exact tag commit, these gates are skipped and its
   result is reused; any doubt (no run, failed run, API error) runs them.
3. On green, it publishes to npm, PyPI, crates.io and RubyGems and creates
   the `go/vX.Y.Z` tag for the Go module.
4. Once every publish and the Go tag succeed, it creates a GitHub Release
   on the tag with auto-generated release notes.

Publishing uses **OIDC trusted publishing**. There are no registry API
tokens, no GitHub secrets and nothing to rotate. GitHub vouches for the
workflow's identity and each registry checks it against the publisher
registration below.

## One-time setup per registry

Register the trusted publisher once in each dashboard. Every form wants the
same four values, and all four dashboards take owner and repository as
*separate* fields:

- Owner: `SixtyAI`
- Repository: `baseh`
- Workflow: `release.yml` (bare filename, never a path)
- Environment: **blank**

The environment field is the easy one to get wrong. Some dashboards
encourage setting it, but no publish job in release.yml declares an
`environment:`, so any value there fails to match the OIDC claim and the
upload is refused.

- **PyPI**: which page depends on whether the project exists. `baseh` does,
  so use the project's own settings: pypi.org, Your projects, `baseh`,
  Manage, Publishing. The account-level *pending publisher* form is only
  for projects that do not exist yet; a pending entry for a name already on
  PyPI does not bind, and the release fails with `invalid-publisher`.
- **npm**: npmjs.com, Packages, `@cloudyindustries/baseh`, Settings,
  Trusted Publisher. Under "Allowed actions" tick `npm publish` only.
  `npm stage publish` parks the upload for manual approval, which this
  workflow reads as a failed publish. npm has no way to create an empty
  package and no pending-publisher flow, so a brand-new package name has to
  be bootstrapped with one manual `npm publish --access public` before the
  publisher can be attached.
- **crates.io**: crates.io, crate `baseh`, Settings, Trusted Publishing.
- **RubyGems**: rubygems.org, your profile, gem `baseh`, Trusted publishers
  in the sidebar. RubyGems does support pending publishers for gems that do
  not exist yet, on a separate page that also asks for the gem name.

If a registry's first-publish flow still demands a classic token, mint a
scoped publish token for that registry only, record it in 1Password first,
then add it as the GitHub secret that registry's step expects. Treat this as
a fallback, not the default.

The `github-pages` environment needs a deployment policy for tag `v*`, not
just branches: pages.yml deploys on release tags, and without the tag rule
the deploy job is rejected before its first step (repo Settings,
Environments, github-pages, deployment branches and tags).

## The cloudyventures to cloudyindustries rename

The GitHub repo was renamed from `cloudyventures/baseh` to
`cloudyindustries/baseh` after v2.0.3 shipped. Two consequences.

**Every trusted publisher is stale.** GitHub's OIDC token carries the
repository's *current* full name, so PyPI, crates.io, RubyGems and npm all
reject a release from this repo until their registration is edited to
`cloudyindustries/baseh`. Nothing in this repository can fix that; it is
four dashboard edits (see the section above). A tag pushed before those
edits fails all four publish jobs, so the GitHub Release is skipped and the
release is partial.

**npm is a new package.** The scope moved to `@cloudyindustries/baseh`,
which does not exist on the registry yet. Before the first tag: create the
`cloudyindustries` npm org if it is not already there, create the package
placeholder, then connect the trusted publisher. Afterwards, deprecate the
old package so existing installs get pointed across:
`npm deprecate @cloudyventures/baseh "moved to @cloudyindustries/baseh"`.

The Go module path moved to `github.com/cloudyindustries/baseh/go/v2` in
the same change. The old path keeps resolving through GitHub's rename
redirect and the module proxy's cache of the `go/v2.0.3` tag, so existing
consumers are not stranded, but they should move.

## The cloudyindustries to SixtyAI move

The repo moved org again (2026-09-29) and the same two consequences applied.
All four trusted publishers were re-registered for `SixtyAI/baseh` +
`release.yml` on 2026-09-29 (PyPI was still on `cloudyventures/baseh`, so
PyPI publishes had likely been failing since the first rename). The npm
scope stays `@cloudyindustries/baseh` this time, so no new package and no
deprecation dance. The Go module path is now
`github.com/SixtyAI/baseh/go/v2` from the next tag onward; both older paths
keep resolving through GitHub's move redirects and the module proxy cache.

## Rules

- Never commit a registry token to this repository.
- Never add a secret to GitHub that is not already recorded in 1Password.
- If the verify job fails, fix the implementations and re-tag; do not bypass.
- The Go module has no registry step at all; `go/vX.Y.Z` tags are created by
  the workflow and require no setup.
- Before tagging, confirm `scripts/check-versions.sh` is green (ci runs it
  as the release-preflight job on every push). It exists because the v2.0.1
  rubygems publish failed on a stale Gemfile.lock pin. After any version
  bump, re-bundle (`cd ruby && bundle install`) and refresh the JS locks
  (`npm install --package-lock-only` in js/ and web/); `cargo check`
  refreshes rust/Cargo.lock.

## Lessons from the first releases (v2.0.0 to v2.0.2)

The release workflow had never executed until v2.0.0, so its tag-only bugs
surfaced one per release:

- v2.0.0: publish-crates wrote its log inside rust/, so cargo publish
  refused a dirty tree. The go tag push was rejected because the Actions
  token cannot push a ref whose tree touches .github/workflows (fix:
  tolerate that rejection and push the go tag manually with SSH).
- v2.0.1: publish-rubygems failed because Gemfile.lock still pinned the
  previous baseh version and bundler runs frozen in CI (fix:
  scripts/check-versions.sh as a CI gate).

The publish jobs run in parallel and independently, so one registry's
failure never blocks the others. Only the GitHub Release job requires all
of them, which is deliberate: a skipped GitHub Release is the signal that a
release is partial. Recover by fixing the cause, bumping the patch version
everywhere and tagging again; already-published registries treat the repeat
version as success (skip-existing or the equivalent guard in each step).

Offline rehearsal is only partial: `cargo publish --dry-run`,
`npm publish --dry-run` and `gem build` catch packaging errors, but the
failures above were environmental (lockfile freshness, token scope, a dirty
tree inside the crate) and only appear in the CI sandbox. The preflight
check plus the publish jobs' already-published tolerance are the safety
net; a failed release is always recoverable by tagging the next patch.
