#!/usr/bin/env node
// Autodoc Stop hook (every project, every session). Mirrored into repos at scripts/hooks/autodoc-hook.mjs
// so cloud sessions, which cannot see ~/.claude, get it too.
//
// On every stop: 1) run the project's docs generator if it has one (scripts/autodoc), so generated
// wiki/reference pages are never stale; 2) if source files changed but no docs did, block the stop once
// and tell Claude to document the change (feature page, docstrings, tooltips) before finishing.
// Opt a repo out with an empty `.claude/no-autodoc` file.
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const CODE = /\.(py|ts|tsx|js|jsx|mjs|cjs|go|rs|swift|kt|java|c|cc|cpp|h|rb|php|html|css|scss|vue|svelte|sh)$/;
const DOCS = /(^|\/)(docs|wiki)\/|\.(md|mdx|rst)$|tooltips?\.(json|ya?ml)$|(^|\/)mkdocs\.ya?ml$/;
const NOT_DOCWORTHY = /(^|\/)(tests?|__tests__|spec|fixtures|node_modules|dist|build|site|\.venv|\.claude)\//;

const input = (() => { try { return JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { return {}; } })();
const cwd = input.cwd || process.cwd();
const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });

function main() {
  if (input.stop_hook_active) return; // already reminded this turn: never loop
  let root;
  try { root = git('rev-parse', '--show-toplevel').trim(); } catch { return; } // not a repo
  if (existsSync(join(root, '.claude/no-autodoc'))) return;

  const generator = join(root, 'scripts/autodoc');
  if (existsSync(generator)) spawnSync(generator, [], { cwd: root, stdio: 'ignore', timeout: 120_000 });

  const changed = git('status', '--porcelain', '--untracked-files=all').split('\n').filter(Boolean)
    .map((l) => l.slice(3).split(' -> ').pop().replace(/^"|"$/g, ''));
  const code = changed.filter((f) => CODE.test(f) && !NOT_DOCWORTHY.test(f) && !DOCS.test(f));
  const docs = changed.filter((f) => DOCS.test(f));
  if (!code.length || docs.length) return;

  const list = code.slice(0, 12).join(', ') + (code.length > 12 ? ` and ${code.length - 12} more` : '');
  process.stdout.write(JSON.stringify({
    decision: 'block',
    reason: `Autodoc: code changed with no docs change (${list}). Before finishing, document it: update or create `
      + 'the feature/wiki page (status true), docstrings on every public function/class, and a short + verbose '
      + 'tooltip for every new or changed UI control; then run the docs generator. If these changes truly have no '
      + 'user- or developer-visible effect, say why in one line and finish. (Autodoc rule, ~/.claude/sync-kit/rules/autodoc.md)',
  }));
}

main();
