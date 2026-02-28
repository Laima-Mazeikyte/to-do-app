# Style reference

Token reference and component → CSS class map. Use this when changing styles or adding new UI.

**File locations:** Tokens live in `src/tokens.css`. List-view styles in `src/style.css`, spatial-view styles in `src/spatial.css`.

---

## Design tokens

All tokens are CSS custom properties in `src/tokens.css`. **Prefer semantic tokens in component CSS** so theme changes stay in one place.

### Colors

| Token | Purpose |
|-------|---------|
| **Primitives** (`--color-*`) | Raw palette (gray, blue, green, red, amber). Use only when defining semantic tokens. |
| **Semantic** | Use these in components. |
| `--background-default` | Page / card background |
| `--background-subtle` | Slightly tinted background (e.g. body) |
| `--background-muted` | Buttons, zones, muted panels |
| `--foreground-default` | Primary text |
| `--foreground-muted` | Secondary text, hints |
| `--border-default` | Borders |
| `--border-muted` | Subtle borders |
| `--accent-default` / `--accent-emphasis` | Links, primary actions, focus |
| `--success-*` / `--danger-*` / `--warning-*` | Status (done, delete, warning) |

### Spacing (4px base)

| Token | Value |
|-------|--------|
| `--space-0` … `--space-12` | 0, 0.25rem, 0.5rem, 0.75rem, 1rem, 1.25rem, 1.5rem, 2rem, 2.5rem, 3rem |

Use for padding, margin, gap. File: `src/tokens.css`.

### Typography

| Token | Use |
|-------|-----|
| `--font-sans` | Body font stack |
| `--font-size-sm` / `--font-size-base` / `--font-size-lg` / `--font-size-xl` | Sizes |
| `--line-height-normal` | 1.5 |

### Layout

| Token | Use |
|-------|-----|
| `--layout-app-max` | Max width of #app (1280px) |
| `--layout-content-max` / `--layout-content-min` | Todo content width (40rem / 24rem) |

### Border radius

| Token | Value |
|-------|--------|
| `--radius-sm` / `--radius-md` / `--radius-lg` | 0.25rem, 0.5rem, 0.75rem |

---

## Theming

Light theme is the default (`:root` in `tokens.css`). Dark theme overrides semantic tokens under `.dark`. Add the class to a root element (e.g. `<html class="dark">`) to switch. Components use semantic tokens, so no component CSS changes are needed for a new theme.

---

## Component → CSS map

### List view (`src/style.css`)

| Component | Main class | Modifiers / children | Notes |
|-----------|------------|----------------------|-------|
| App shell | `.todo-app` | — | Max/min width from tokens |
| Header | `.todo-header` | `.todo-title`, `.todo-nav-link` | |
| Add task form | `.todo-form` | `.todo-label`, `.todo-input`, `.todo-submit` | |
| Filters | `.todo-filters` | `.todo-filter`, `.todo-filter--active` | Tablist |
| Error message | `.todo-error` | — | role="alert" |
| Zones container | `.todo-zones` | — | 3-column grid |
| Zone (priority / pile / done) | `.todo-zone` | `.todo-zone-title`, `.todo-list`, `.todo-zone-empty` | |
| Task card | `.todo-card` | `.todo-card--done`, `.todo-card--pinned`, `.todo-card--spawn` | |
| Card internals | — | `.todo-card-controls`, `.todo-card-checkbox`, `.todo-card-text`, `.todo-card-delete` | |
| Card edit mode | — | `.todo-card-edit-wrap`, `.todo-card-edit`, `.todo-card-save` | |
| Undo bar | `.todo-undo` | `.todo-undo-button` | Shown after delete |

### Spatial view (`src/spatial.css`)

| Component | Main class | Modifiers / children | Notes |
|-----------|------------|----------------------|-------|
| App shell | `.spatial-app` | — | Full width |
| Header | `.spatial-header` | `.spatial-form`, `.spatial-input`, `.spatial-submit`, `.spatial-nav-link` | |
| Drop zones | `.spatial-drop-zone` | `.spatial-drop-zone--done`, `.spatial-drop-zone--delete`, `.spatial-drop-zone-count` | |
| Stage | `.spatial-stage` | — | Physics canvas area |
| Card (physics) | `.spatial-card` | `.spatial-card--done`, `.spatial-card--editing`, `.spatial-card--over-done`, `.spatial-card--over-delete` | |
| Card internals | — | `.spatial-card-inner`, `.spatial-card-handle`, `.spatial-card-controls`, `.spatial-card-text`, edit/save classes | |
| Paste drawer | `.spatial-drawer-backdrop`, `.spatial-drawer` | `.spatial-drawer-title`, `.spatial-drawer-hint`, `.spatial-drawer-textarea`, `.spatial-drawer-actions`, `.spatial-drawer-btn--primary` / `--secondary` | `.is-open` toggles visibility |

### Shared

| Component | Class | File |
|-----------|--------|------|
| Screen reader only | `.sr-only` | style.css |

---

## Adding new styles

1. Prefer semantic tokens (e.g. `var(--background-muted)`) over primitives.
2. Use BEM-like naming: block `todo-card`, modifier `todo-card--done`.
3. Add new component entries to the tables above and keep STYLE.md in sync.
