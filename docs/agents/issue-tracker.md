# Issue tracker: GitHub

Specs and tickets are tracked in GitHub Issues. This repository uses
`pmndrs/design-system`; changes to the documentation engine use `pmndrs/docs`.
Cross-repository tickets link to the parent specification in `pmndrs/design-system`.

Use the `gh` CLI or the connected GitHub tools. Publish approved specifications
and implementation tickets with the `ready-for-agent` label. Write published
content in English.

Publish one issue per ticket. Link tickets as sub-issues of their specification
and use native blocking dependencies where supported. Otherwise record explicit
links to blocking issues in each ticket body. Do not close the parent while any
required work remains.

Implementation pull requests close the tickets they implement when merged.
Keep the parent specification open until all its acceptance criteria are met.

Pull requests are not an additional triage request surface.
