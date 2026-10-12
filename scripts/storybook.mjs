/**
 * Compose published Storybooks recorded alongside the pinned registry catalog.
 * A release change must supply its matching build instead of falling back to main.
 *
 * @param {{ repo: string, ref: string, storybook?: { ref: string, commit: string, url: string } }[]} registries
 */
export function storybookRefs(registries) {
  return Object.fromEntries(registries.flatMap(({ repo, ref, storybook }) => {
    if (!storybook) return []
    if (storybook.ref !== ref) {
      throw new Error(`${repo}#${ref}: update the Storybook build pinned to ${storybook.ref}`)
    }
    if (!/^[a-f0-9]{40}$/.test(storybook.commit)) {
      throw new Error(`${repo}#${ref}: Storybook requires the full release commit SHA`)
    }
    const url = new URL(storybook.url)
    if (url.protocol !== 'https:') throw new Error(`${repo}#${ref}: Storybook must use HTTPS`)
    return [[repo.replaceAll('/', '-'), { title: `${repo} @ ${ref}`, url: url.href, expanded: false }]]
  }))
}
