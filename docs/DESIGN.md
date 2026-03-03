# Design guide

Overview for designers and developers: how the UI is built, where to change theme and typography, and how components map to code.

## What this app is

- **Spatial view** (`index.html`): Physics-based pile of cards. Drag cards to "Done" or "Delete" zones. Add tasks via form or paste a list. Search filters cards in the pile. Undo bar appears after delete (5 seconds).

The UI uses design tokens and semantic naming so themes and spacing stay consistent.

## How styling works

The UI is built with **CSS custom properties** (design tokens) and **semantic names**:

- **Tokens** live in `src/tokens.css`: colors, spacing, typography, radius, layout. Primitives (e.g. `--color-gray-500`) feed into semantic tokens (e.g. `--foreground-muted`).
- **Components** use semantic tokens only, so changing a theme only touches `tokens.css`.

For the full list of tokens and which CSS class belongs to which component, see **[docs/STYLE.md](STYLE.md)**.

## Changing the theme

1. **Colors:** Edit `src/tokens.css`. The top section under `:root` is the light theme (semantic tokens). The palette uses warm grays and a default terracotta accent. Edit primitive `--color-*` values, then the semantic ones that reference them.
2. **Dark theme:** Edit the `.dark` block in `src/tokens.css`. Same semantic names, different values. Add the class to a root element (e.g. `<html class="dark">`) to switch.
3. **Background colorways:** The app has 4 background themes (Warm, Sand, Lavender, Sage) in the More menu. Each sets `data-bg` on `#app` and overrides `--background-subtle` and `--accent-default` / `--accent-emphasis` in `src/spatial.css`. The CTA color adapts to the chosen background.
4. **New theme (e.g. "high contrast"):** Add a new class (e.g. `.theme-high-contrast`) in `tokens.css` and override the same semantic variables. No need to change component CSS.

## Typography and spacing

- **Font:** `--font-sans` in `src/tokens.css` (default: system UI stack). Change it there to affect the whole app.
- **Sizes:** `--font-size-sm`, `--font-size-base`, `--font-size-lg`, `--font-size-xl`.
- **Spacing:** `--space-1` … `--space-12` (4px base). Use these in new or updated components instead of hard-coded values.

## Component list

| Component | Purpose | Where to look |
|-----------|---------|---------------|
| Header | Auth + add form + paste + search | `.spatial-header` |
| Form | Add new task | `.spatial-form`, `.spatial-input`, `.spatial-submit` |
| Search | Filter cards in pile | `.spatial-search-input` |
| Drop zones | Done / Delete targets | `.spatial-drop-zone--done`, `.spatial-drop-zone--delete` |
| Task card | Single task (drag handle, text, edit) | `.spatial-card` |
| Undo bar | "Task moved to trash" with Undo | `.spatial-undo` |
| Stage | Physics canvas area | `.spatial-stage` |
| Paste drawer | Paste a list to create multiple tasks | `.spatial-drawer`, `.spatial-drawer-textarea` |

Full **component → CSS map** (classes and modifiers) is in **[docs/STYLE.md](STYLE.md)**.

## Where to look

| What | File(s) |
|------|---------|
| Tokens (colors, spacing, type, radius) | `src/tokens.css` |
| Base styles (body, auth, .sr-only) | `src/base.css` |
| Spatial view styles | `src/spatial.css` |
| Token + component reference | `docs/STYLE.md` |

When adding or changing UI, use tokens from `tokens.css` and the existing BEM-like class names so new styles stay consistent and theming keeps working.
