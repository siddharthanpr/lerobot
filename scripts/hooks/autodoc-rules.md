<!-- pack: autodoc | Everything documents itself: wiki pages, docstrings and short + verbose tooltips, generated and enforced automatically. -->
## Autodoc: documentation is automatic, never a manual step (hard rules)

Standing principle from the user (2026-09-29) for every project and every session, local or cloud.

1. **Docs ship with the change, in the same turn.** Any change to behaviour updates its wiki/feature page, its docstrings and its tooltips before the turn ends. Nobody should ever have to ask for docs.
2. **Code documents itself.** Every public module, class and function has a docstring that says what it does and why. Reference pages are generated from those docstrings (MkDocs Material + mkdocstrings for Python, TypeDoc for TypeScript), never written by hand.
3. **A nice wiki, built automatically.** Each project has a docs site (MkDocs Material by default) with a home page, one page per feature (status: built, partial, planned), architecture, how to run it, and generated reference pages. `scripts/autodoc` regenerates everything; CI runs `mkdocs build --strict` and fails on stale or broken docs. Where the app has a UI, it serves the built wiki at `/docs`.
4. **Every UI control has a tooltip, short and verbose.** Short: one line, what it does. Verbose: how it works, what it affects, and where its data comes from. Keep them in one registry per project (e.g. `tooltips.json`) that the UI reads and the wiki renders as a UI reference page, with a global "verbose tooltips" toggle. A test fails when a control has no registry entry. If fr (Claude Design) owns the UI, brief fr to add the tooltips; never edit its files.
5. **It is enforced, not remembered.** The autodoc Stop hook (`~/.claude/sync-kit/autodoc-hook.mjs`, mirrored at `scripts/hooks/autodoc-hook.mjs` for cloud) runs `scripts/autodoc` at the end of every turn and blocks finishing once when code changed without docs. A new project gets the generator, CI check and hook mirror at setup.
6. Opting out is explicit: an empty `.claude/no-autodoc` file, with the reason in the project's CLAUDE.md.
