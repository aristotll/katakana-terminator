# AGENTS.md

Guidance for Codex and other coding agents working in this repository.

## Project Overview

Katakana Terminator is a browser userscript that annotates Japanese katakana loan words with English translations using Google Translate endpoints. The project is intentionally small and currently centers on one script:

- `katakana-terminator.user.js`: userscript metadata, DOM scanning, ruby insertion, translation requests, caching, mutation observation, and compatibility polyfills.
- `README.md`: installation, limitations, acknowledgements, and feedback links in English and Chinese.

There is no package manager setup, build step, or automated test suite in this repository at the moment.

## Development Workflow

- Edit the userscript directly unless a task explicitly introduces build tooling.
- Keep compatibility with userscript managers such as Tampermonkey, Violentmonkey, and Greasemonkey.
- Preserve the metadata block format at the top of `katakana-terminator.user.js`; userscript managers depend on these fields.
- Update `@version` when preparing a user-facing release.
- Avoid adding dependencies or bundlers for small changes; this repository is distributed as a single userscript file.

## Code Style

- Match the existing ES5-oriented JavaScript style: `var`, function declarations, semicolons, and broad browser compatibility.
- Avoid modern syntax that may not run in older browser/userscript environments unless the project intentionally raises its compatibility target.
- Keep comments concise and focused on behavior or compatibility concerns.
- Prefer structured browser APIs over string-based DOM manipulation.
- Be careful around global names; this script runs on arbitrary webpages.

## Behavioral Notes

- `scanTextNodes` recursively walks DOM nodes and skips editable or script-like content.
- `addRuby` splits text nodes and inserts `<ruby>` and `<rt>` elements for katakana matches.
- `translateTextNodes` batches pending phrases and avoids duplicate requests through `cachedTranslations`.
- `apiList` is ordered by fallback preference. If an endpoint fails or returns invalid JSON, the next endpoint is tried.
- `MutationObserver` buffers newly added nodes and rescans at a fixed interval to limit request frequency.

## Verification

There are no automated tests. For behavior changes, manually verify in a browser userscript manager:

1. Install or reload `katakana-terminator.user.js`.
2. Open a Japanese page containing katakana loan words.
3. Confirm ruby annotations appear above katakana words.
4. Confirm dynamic content is annotated after it is inserted into the page.
5. Check the browser console for `Katakana Terminator:` debug/error messages.

For syntax-only checks, run a JavaScript parser or linter if one is available locally, but do not add new tooling solely for routine edits unless requested.

## Repository Hygiene

- Do not commit IDE metadata such as `.idea/` unless the user explicitly asks.
- Do not reformat the whole userscript for unrelated changes.
- Keep changes tightly scoped; this project is easiest to review when diffs stay small.
