# Design guide

Overview for designers and developers: how the UI is built, where to change theme and typography, and how components map to code.

## What this app is

- **List view** (`index.html`): Three zones (Priority, To do, Done). Tasks are cards you can drag between zones; add, edit, delete, undo.
- **Spatial view** (`spatial.html`): Physics-based pile of cards; drag to “Done” or “Delete” zones; paste a list to create many cards at once.

Both views use the same design tokens and semantic naming so themes and spacing stay consistent.

## How styling works

The UI is built with **CSS custom properties** (design tokens) and **semantic names**:

- **Tokens** live in `src/tokens.css`: colors, spacing, typography, radius, layout. Primitives (e.g. `--color-gray-500`) feed into semantic tokens (e.g. `--foreground-muted`).
- **Components** use semantic tokens only, so changing a theme only touches `tokens.css`.

For the full list of tokens and which CSS class belongs to which component, see **[docs/STYLE.md](STYLE.md)**.

## Changing the theme

1. **Colors:** Edit `src/tokens.css`. The top section under `:root` is the light theme (semantic tokens). To change the palette, edit the primitive `--color-*` values, then the semantic ones that reference them.
2. **Dark theme:** Edit the `.dark` block in `src/tokens.css`. Same semantic names, different values. Add the class to a root element (e.g. `<html class="dark">`) to switch.
3. **New theme (e.g. “high contrast”):** Add a new class (e.g. `.theme-high-contrast`) in `tokens.css` and override the same semantic variables. No need to change component CSS.

## Typography and spacing

- **Font:** `--font-sans` in `src/tokens.css` (default: system UI stack). Change it there to affect the whole app.
- **Sizes:** `--font-size-sm`, `--font-size-base`, `--font-size-lg`, `--font-size-xl`. Used in both list and spatial views.
- **Spacing:** `--space-1` … `--space-12` (4px base). Use these in new or updated components instead of hard-coded values.

## Component list

| Component | Purpose | Where to look |
|-----------|---------|----------------|
| Header | Title + nav (e.g. link to Spatial view) | List: `.todo-header`; Spatial: `.spatial-header` |
| Form | Add new task | `.todo-form` / `.spatial-form` |
| Priority / Pile / Done zones | List view: drag targets and task lists | `.todo-zones`, `.todo-zone`, `.todo-zone-title` |
| Task card | Single task (checkbox, text, delete, edit) | List: `.todo-card`; Spatial: `.spatial-card` |
| Undo bar | “Task moved to trash” with Undo | `.todo-undo` |
| Spatial stage | Physics canvas and drop zones | `.spatial-stage`, `.spatial-drop-zone--done` / `--delete` |
| Paste drawer | Paste a list to create multiple tasks | `.spatial-drawer`, `.spatial-drawer-textarea` |

Full **component → CSS map** (classes and modifiers) is in **[docs/STYLE.md](STYLE.md)**.

## Where to look

| What | File(s) |
|------|--------|
| Tokens (colors, spacing, type, radius) | `src/tokens.css` |
| List view styles | `src/style.css` |
| Spatial view styles | `src/spatial.css` |
| Token + component reference | `docs/STYLE.md` |

When adding or changing UI, use tokens from `tokens.css` and the existing BEM-like class names so new styles stay consistent and theming keeps working.
