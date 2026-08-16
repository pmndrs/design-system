---
'@pmndrs/design-system': patch
---

Release tooling. The package is never published to npm — the git tag is the install address (`md3#v0.3.0`) — so changesets is set up purely to version, changelog and tag, with `privatePackages.tag` doing the last part. `npm run version` also refreshes the lockfile, since bumping the version by hand twice is what left it recording `0.1.0` against a `0.3.0` package and broke CI on its first run.

`react` and `react-dom` are now explicit devDependencies. `material-theme-builder` declares them as required peers, and npm resolved that differently locally than on the runner, so `npm ci` was reproducible in one place and not the other.
