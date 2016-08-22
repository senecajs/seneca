# Creating a release

1.  Review github issues, triage, close and merge issues related to the release.
2.  Navigate to the [Org Test Rig][TestRig] and ensure all test are passing.
3.  Update CHANGES.md, with date release, notes, and version.
4.  Pull down the repository locally on the master branch.
5.  Ensure there are no outstanding commits and the branch is clean.
6.  Run `npm install` and ensure all dependencies correctly install.
7.  Run `npm run test` and ensure testing and linting passes.
8.  Run `npm version vx.x.x -m "version x.x.x"` where `x.x.x` is the version.
9.  Run `git push upstream master --tags`
10. Run `npm publish`
11. Run `npm tag seneca@VERSION next`
12. Run `npm tag seneca@VERSION plugin`
13. Go to the [Github release page][Releases] and hit 'Draft a new release'.
14. Paste the Changelog content for this release and add additional release notes.
15. Choose the tag version and a title matching the release and publish.
16. Notify core maintainers of the release via email.


[TestRig]: https://travis-ci.org/senecajs/seneca-test-rig
[Releases]: https://github.com/senecajs/seneca/releases
