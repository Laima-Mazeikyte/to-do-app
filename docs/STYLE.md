# Style reference

Token reference and component → CSS class map. Use this when changing styles or adding new UI.

**File locations:** Tokens and base styles in `src/tokens.css` and `src/base.css`. Spatial view styles in `src/spatial.css`. UI copy (empty states, filter hints) in `src/copy.js`.

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

### Spatial view (`src/spatial.css`)

| Component | Main class | Modifiers / children | Notes |
|-----------|------------|----------------------|-------|
| App shell | `.spatial-app` | — | Full width |
| Header | `.spatial-floating-top` | `.spatial-top-center`, `.spatial-top-right`, `.spatial-form`, `.spatial-input-wrap`, `.spatial-input--add`, `.spatial-btn-inline--add`, `.spatial-filters`, `.spatial-btn-clear-done`, `.spatial-btn--tertiary`, `.spatial-search-input` | Add task (input + button inside) + filters centered; search + more menu top-right |
| Drop zones | `.spatial-drop-zone` | `.spatial-drop-zone--done`, `.spatial-drop-zone--delete`, `.spatial-drop-zone-count` | |
| Stage | `.spatial-stage` | `.spatial-empty-state`, `.spatial-empty-state-text` | Physics canvas area; empty state shown when no visible cards |
| Card (physics) | `.spatial-card` | `.spatial-card--done`, `.spatial-card--editing`, `.spatial-card--over-done`, `.spatial-card--over-delete`, `.spatial-card--search-hidden` | |
| Card internals | — | `.spatial-card-inner`, `.spatial-card-handle`, `.spatial-card-controls`, `.spatial-card-text`, edit/save classes | |
| Undo bar | `.spatial-undo` | `.spatial-undo-msg`, `.spatial-undo-btn` | Shown after delete |

### Paste drawer

| Component | Main class | Modifiers / children | Notes |
|-----------|------------|----------------------|-------|
| Backdrop | `.spatial-drawer-backdrop` | `.is-open` | |
| Drawer | `.spatial-drawer` | `.spatial-drawer-title`, `.spatial-drawer-hint`, `.spatial-drawer-textarea`, `.spatial-drawer-actions`, `.spatial-drawer-btn--primary` / `--secondary` | `.is-open` toggles visibility |

### Shared (`src/base.css`)

| Component | Class | File |
|-----------|--------|------|
| Screen reader only | `.sr-only` | base.css |
| Auth header | `.spatial-auth-header`, `.auth-header-btn`, `.auth-header-email`, `.auth-header-signout` | base.css |
| Auth modal | `.auth-modal-backdrop`, `.auth-modal`, etc. | base.css |

---

## Adding new styles

1. Prefer semantic tokens (e.g. `var(--background-muted)`) over primitives.
2. Use BEM-like naming: block `spatial-card`, modifier `spatial-card--editing`.
3. Add new component entries to the tables above and keep STYLE.md in sync.
