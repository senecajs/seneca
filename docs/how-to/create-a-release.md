# Create a release

For maintainers.

Seneca is published to npm by GitHub Actions using
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers)
(OpenID Connect). No npm token is stored in this repository, in GitHub
secrets, or on a maintainer's machine: the `release` workflow exchanges a
short-lived GitHub OIDC token for a publish credential, and npm attaches
build provenance to the published package.

The shared validation and publishing steps live in the
[senecajs/admin](https://github.com/senecajs/admin) repository
(`.github/workflows/npm-release.yml` and the `release/` scripts). The
workflow in this repository, `.github/workflows/release.yml`, is a thin
caller.


## One-time setup

1. **npm trusted publisher.** On npmjs.com open the `seneca` package,
   then *Settings* → *Trusted publisher* → *GitHub Actions*, and enter:

   | Field                | Value         |
   | -------------------- | ------------- |
   | Organization or user | `senecajs`    |
   | Repository           | `seneca`      |
   | Workflow filename    | `release.yml` |
   | Environment name     | `npm`         |

   The workflow filename is the *calling* workflow in this repository,
   not the reusable workflow in senecajs/admin. Allow the `npm publish`
   action. A new trusted publisher must complete its first successful
   publish within two days of being created.

2. **Disallow tokens.** Once the trusted publisher works, set
   *Settings* → *Publishing access* to
   *Require two-factor authentication and disallow tokens*.
   Trusted publishers keep working; leaked or stale tokens cannot publish.

3. **GitHub environment.** In this repository, *Settings* →
   *Environments* → create `npm`, add the maintainers as required
   reviewers, and restrict deployment branches and tags to tags matching
   `v*`. Every publish then waits for a maintainer to approve the run.

4. **Reusable workflow access.** GitHub only lets public repositories use
   reusable workflows from public repositories, so `senecajs/admin` must
   be public (it holds no secrets). Alternatively copy
   `npm-release.yml` into a public repository and update the `uses:` line
   in `release.yml`.


## Releasing a version

1. Review GitHub issues and pull requests; merge what belongs in the
   release. Make sure the `build` workflow is green on `master`.
2. Add an entry to `CHANGES.md`: `## X.Y.Z YYYY-MM-DD` followed by the
   release notes. The GitHub release notes are taken from this entry.
3. Set `"version": "X.Y.Z"` in `package.json` (prereleases use
   `X.Y.Z-rcN` and are published under the `next` dist-tag).
4. Run `npm install`, `npm run build` and `npm test`. Commit the result,
   including the compiled `lib/*.js` and `seneca.js` output:
   `git commit -a -m vX.Y.Z`.
5. Optionally validate locally with the admin tooling:
   `node ../admin/release/validate-release.js --tag vX.Y.Z`.
6. Tag and push. Either
   `git tag vX.Y.Z && git push origin master && git push origin vX.Y.Z`,
   or let the admin script do steps 3 to 6:
   `node ../admin/release/release.js X.Y.Z`.
7. The tag push starts the `release` workflow, which installs, builds,
   validates (version matches the tag, `CHANGES.md` entry, clean working
   tree after build, package contents), runs the tests, waits for the
   `npm` environment approval, publishes with provenance, verifies the
   published version and its attestation, and creates the GitHub release.
8. Check the [release](https://github.com/senecajs/seneca/actions/workflows/release.yml)
   run and the [npm package page](https://www.npmjs.com/package/seneca).
9. Notify core maintainers of the release via email.

To rehearse without publishing, run the `release` workflow manually
(*Actions* → *release* → *Run workflow*) with *dry-run* enabled.

Dist-tags other than `latest`/`next` (for example `plugin`) are set
manually with `npm dist-tag add seneca@X.Y.Z plugin` using 2FA.
