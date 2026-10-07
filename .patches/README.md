# Workflow patches

GitHub requires the `workflow` OAuth scope to add or change files under
`.github/workflows/`. The session that prepared this branch did not have
it, so the workflow files are provided here as git patches instead.

Apply them from a checkout with normal credentials:

```sh
git am .patches/*.patch
git rm -r .patches
git commit -m "ci: remove applied workflow patches"
git push
```

| Patch | Adds |
| ----- | ---- |
| `0001-ci-add-the-build-workflow.patch` | `.github/workflows/build.yml`: continuous integration on Node.js 24 (default) and 22, on Linux, Windows and macOS, with a Coveralls upload. The README build badge points at this workflow. |
| `0002-ci-add-the-release-workflow-npm-trusted-publishing.patch` | `.github/workflows/release.yml`: publishes `vX.Y.Z` tags to npm with trusted publishing (OIDC) via the reusable workflow in `senecajs/admin`. See `docs/create-a-release.md`. |

The patches are plain additions; `git apply --check .patches/*.patch`
verifies that they apply. The release workflow calls
`senecajs/admin/.github/workflows/npm-release.yml@main`, so the admin
repository's own workflow patches must be applied first.
