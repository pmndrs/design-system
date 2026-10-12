# Changesets

This package is never published to npm — the **git tag is the install address**:

```sh
pnpm dlx shadcn@latest add pmndrs/design-system/theme#v0.9.0
```

So a version bump is a release, and `privatePackages.tag` in `config.json` is what makes
changesets tag it. Add a changeset with `pnpm run changeset` for anything that moves the
seed, the remap, an item's shape or its `docs`.
