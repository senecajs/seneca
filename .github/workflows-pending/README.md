# Pending workflows

These GitHub Actions workflows belong in `.github/workflows/`. They were
prepared in a session whose GitHub credentials lacked the `workflow`
scope, which GitHub requires to add or change workflow files, so they
are staged here. Workflows in this directory do not run.

To activate them, from a checkout with normal credentials:

```sh
git mv .github/workflows-pending/build.yml .github/workflows/build.yml
git mv .github/workflows-pending/release.yml .github/workflows/release.yml
git rm .github/workflows-pending/README.md
git commit -m "ci: activate build and release workflows"
```

- `build.yml`: continuous integration (Node.js 18 to 24 on Linux, Windows
  and macOS). The README build badge points at this workflow.
- `release.yml`: publishes `vX.Y.Z` tags to npm with trusted publishing
  (OIDC) via the reusable workflow in `senecajs/admin`. See
  `docs/create-a-release.md`.
