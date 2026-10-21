# Create a release

For maintainers.

Seneca is published to npm by GitHub Actions using
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers)
(OpenID Connect). No npm token is stored in this repository, in GitHub
secrets, or on a maintainer's machine: the `release` workflow
(`.github/workflows/release.yml`) exchanges a short-lived GitHub OIDC
token for a publish credential, and npm attaches build provenance to the
published package.

A release is started by hand: run the `release` workflow on `master`
(*Actions* → *release* → *Run workflow*, or `gh workflow run`). It
releases the `package.json` version of that commit. With *dry-run* on,
the default, it only validates.

The workflow has two jobs:

* `validate` installs the dependencies, builds, runs the tests, and checks
  the release with `.github/scripts/validate-release.js`: `CHANGES.md` has
  an entry for the version, the committed compiled output matches the
  sources, the package contents are complete and contain nothing else,
  the version is not already published, and the dist-tag is consistent
  with the published versions. It also checks that the tag `vX.Y.Z` does
  not exist yet, or points to the commit being released. The job has no
  OIDC permission.
* `publish` runs when *dry-run* is off, and only from `master` or a
  maintenance branch (`N.x`). It checks out the commit that `validate`
  tested, checks the tag again, runs the validation script again and
  publishes the committed files with `npm publish`. It installs nothing,
  so no third-party code runs in the job that holds the publish
  credential; it needs the npm bundled with Node.js 24 (11.5.1 or later).
  It then verifies the published version, its dist-tag and its provenance
  attestation, and creates the tag `vX.Y.Z` on the published commit and
  the GitHub release from the `CHANGES.md` entry.

Only one release runs at a time in the repository, so two runs cannot
publish at once and move the `latest` dist-tag backward. Later runs, dry
runs included, wait in a queue; none replaces or cancels another.


## One-time setup

1. **npm trusted publisher.** As an owner of the `seneca` package, with
   two-factor authentication on your npm account and npm 11.15.0 or
   later:

   ```sh
   npm login
   npm trust github seneca --repository senecajs/seneca --file release.yml --allow-publish
   npm trust list seneca
   ```

   Or on npmjs.com, open the `seneca` package, then *Settings* →
   *Trusted publisher* → *GitHub Actions*, and enter organization
   `senecajs`, repository `seneca` and workflow filename `release.yml`,
   with no environment. Under *Allowed actions* allow `npm publish`:
   configurations created after September 2026 allow only
   `npm stage publish` by default, and the workflow publishes directly.

   A new trusted publisher must complete its first successful publish
   within two days, or it expires and has to be created again.

2. **Disallow tokens.** Once the first trusted publish has succeeded, set
   the package's *Settings* → *Publishing access* to *Require two-factor
   authentication and disallow tokens*. Trusted publishing keeps working;
   leaked or stale tokens cannot publish.

The `3.x` branch has no release workflow. A 3.x maintenance release is
published by hand (`npm publish --tag 3x` with a one-time password), or
with the workflow after copying `.github/workflows/release.yml`,
`.github/scripts/validate-release.js`,
`.github/scripts/check-release-tag.sh` and `.github/dependabot.yml` to
that branch and running it there with the *dist-tag* input `3x`.


## Releasing a version

1. Review GitHub issues and pull requests; merge what belongs in the
   release. Make sure the `build` workflow is green on `master`.
2. In a pull request, add an entry to `CHANGES.md` (`## X.Y.Z YYYY-MM-DD`
   followed by the release notes; the GitHub release notes are taken from
   this entry) and set `"version": "X.Y.Z"` in `package.json`
   (prereleases use `X.Y.Z-rcN` and are published under the `next`
   dist-tag). Commit the result of `npm install`, `npm run build` and
   `npm test`, including the compiled `lib/*.js` and `seneca.js` output,
   and merge the pull request. To check it locally first, run
   `node .github/scripts/validate-release.js --tag vX.Y.Z`.
3. Rehearse with a dry run:
   `gh workflow run release.yml --repo senecajs/seneca --ref master`.
4. Release:
   `gh workflow run release.yml --repo senecajs/seneca --ref master -f dry-run=false`.
5. Check the [release](https://github.com/senecajs/seneca/actions/workflows/release.yml)
   run, the [npm package page](https://www.npmjs.com/package/seneca)
   (the version shows a *Provenance* section) and the
   [GitHub release](https://github.com/senecajs/seneca/releases).
6. Notify core maintainers of the release via email.

If a run fails after the version was published, running the workflow
again stops at validation, because the version is already on npm. Create
what is missing by hand, for example the GitHub release and its tag with
`gh release create vX.Y.Z --target <commit> --notes-file <notes>`.

Dist-tags: a stable version newer than the current `latest` is published
as `latest`, a prerelease as `next`. A maintenance release of an older
line needs an explicit dist-tag (the *dist-tag* input, for example `3x`).
Other dist-tags (for example `plugin`) are set by hand with
`npm dist-tag add seneca@X.Y.Z plugin` using a one-time password.


## Dependencies of the workflows

The actions used by the workflows (`actions/checkout`,
`actions/setup-node` and `coverallsapp/github-action`) are pinned to
commits. Dependabot (`.github/dependabot.yml`) opens a monthly pull
request when a newer version is available.
