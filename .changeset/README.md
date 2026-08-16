# Changesets

This package is never published to npm — the **git tag is the install address**:

```sh
npx shadcn@latest add pmndrs/design-system/md3#v0.3.0
```

So a version bump is a release, and `privatePackages.tag` in `config.json` is what makes
changesets tag it. Add a changeset with `npm run changeset` for anything that moves the
seed, the remap, an item's shape or its `docs`.
