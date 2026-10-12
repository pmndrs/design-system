The pmndrs Agent Skill: instructions, the brand book, the plain CSS palette
and the two static SVG logos. It styles interfaces, slides, documents and
other visual artifacts with the Poimandres design system.

This registry item installs the whole bundle in
`.agents/skills/poimandres-design-system/` at the project root. Use an agent
that discovers that directory, or install through the Skills CLI to select
the destination for your agent:

```sh
npx skills add pmndrs/design-system --skill poimandres-design-system
```

The Skills CLI installs from `main` with this command. To pin it, use a GitHub
tree URL at a release tag instead. The shadcn item's ref pins its whole bundle.

The skill's brand book, palette and logos are generated from the same sources
as the guidelines and theme items. No app code, font binaries or framework
dependencies are installed. Installing the skill teaches an agent the system;
install `theme`, `palette` or `logo` separately when your app needs those files.
