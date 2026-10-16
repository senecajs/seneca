# Create a release

For maintainers.

Seneca is published to npm by GitHub Actions using
[npm trusted publishing](https://docs.npmjs.com/trusted-publishers)
(OpenID Connect). No npm token is stored in this repository, in GitHub
secrets, or on a maintainer's machine: the `release` workflow
(`.github/workflows/release.yml`) exchanges a short-lived GitHub OIDC
token for a publish credential, and npm attaches build provenance to the
published package.

The workflow has two jobs:

* `validate` installs the dependencies, builds, runs the tests, and checks
  the release with `.github/scripts/validate-release.js`: the tag matches
  the `package.json` version, `CHANGES.md` has an entry for the version,
  the committed compiled output matches the sources, the package contents
  are complete and contain nothing else, the version is not already
  published, and the dist-tag is consistent with the published versions.
  The job has no OIDC permission.
* `publish` waits for the approval of the `npm` environment, checks out
  the tag, runs the validation script again, and publishes the committed
  files with `npm publish`. It does not run `npm install`, so no
  third-party code runs in the job that holds the publish credential. It
  then verifies the published version, its dist-tag and its provenance
  attestation, and creates the GitHub release from the `CHANGES.md` entry.


## One-time setup

1. **npm trusted publisher.** On npmjs.com open the `seneca` package,
   then *Settings* → *Trusted publisher* → *GitHub Actions*, and enter:

   | Field                | Value         |
   | -------------------- | ------------- |
   | Organization or user | `senecajs`    |
   | Repository           | `seneca`      |
   | Workflow filename    | `release.yml` |
   | Environment name     | `npm`         |

   Under *Allowed actions* allow `npm publish`: configurations created
   after September 2026 allow only `npm stage publish` by default, and the
   workflow publishes directly. All fields are case sensitive. A new
   trusted publisher must complete its first successful publish within two
   days, or it expires and has to be created again.

2. **GitHub environment.** In this repository open *Settings* →
   *Environments* → *New environment* and name it `npm`. Add the
   maintainers as *Required reviewers*, and under *Deployment branches and
   tags* allow only tags matching `v*`. Every publish then waits for a
   maintainer to approve the run, and only a tagged commit can reach the
   publish job.

3. **Disallow tokens.** Once the first trusted publish has succeeded, set
   the package's *Settings* → *Publishing access* to *Require two-factor
   authentication and disallow tokens*. Trusted publishing keeps working;
   leaked or stale tokens cannot publish.

The `3.x` branch has no release workflow. A 3.x maintenance release is
published by hand (`npm publish --tag 3x` with a one-time password), or
with the workflow after copying `.github/workflows/release.yml`,
`.github/scripts/validate-release.js` and `.github/dependabot.yml` to that
branch.


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
5. Check the release locally:
   `node .github/scripts/validate-release.js --tag vX.Y.Z`.
6. Tag and push:
   `git tag vX.Y.Z && git push origin master && git push origin vX.Y.Z`.
7. The tag push starts the `release` workflow. When the `validate` job has
   passed, approve the deployment to the `npm` environment on the run page
   (*Review deployments*). The `publish` job then publishes with
   provenance and creates the GitHub release.
8. Check the [release](https://github.com/senecajs/seneca/actions/workflows/release.yml)
   run, the [npm package page](https://www.npmjs.com/package/seneca)
   (the version shows a *Provenance* section) and the
   [GitHub release](https://github.com/senecajs/seneca/releases).
9. Notify core maintainers of the release via email.

To rehearse without publishing, run the `release` workflow manually
(*Actions* → *release* → *Run workflow*) with *dry-run* enabled; without
a tag it validates the selected branch. If a tag push run failed (for
example before the trusted publisher was configured), run the workflow
manually with the tag selected under *Use workflow from* and *dry-run*
disabled; the environment rule only admits runs started from a `v*` tag.

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
