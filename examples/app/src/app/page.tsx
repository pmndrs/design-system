import { Panel, PanelItem } from '@/components/panel'
import { SchemeToggle } from './scheme-toggle'

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl space-y-6 p-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Example consumer</h1>
        <SchemeToggle />
      </div>

      <Panel title="What this proves">
        <PanelItem>One `add` pulled the block, the colour layer, and its plumbing</PanelItem>
        <PanelItem>The panel sits on `bg-surface-dim`, an MD3 role shadcn has none for</PanelItem>
        <PanelItem>The button is stock shadcn, rendering on the MD3 remap of `--primary`</PanelItem>
        <PanelItem>Nothing is mounted: the palette is baked into the CSS</PanelItem>
      </Panel>
    </main>
  )
}
