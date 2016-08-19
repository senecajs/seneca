# Creating a release

1.  Ensure all deps in node_modules installable from npm.
2.  Update CHANGES.md, with date release, notes, and version.
3.  Review github issues, close and triage issues related to the release.
4.  Make sure you have a clean branch: git checkout -b release upstream/master
5.  Run `npm version v0.0.0 -m "version 0.0.0"` with the version number replacing 0.0.0
6.  Run `git push upstream master`
7.  Run `git push upstream --tags`
8.  Run `npm publish`
9.  Run `npm tag seneca@VERSION next`
10. Run `npm tag seneca@VERSION plugin`
11. Update and publish plugins
