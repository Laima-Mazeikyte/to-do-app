# To-Do App

A spatial, habit-builder to-do list with list and spatial (physics) views. Built with Vite and vanilla JS.

## Setup

```bash
pnpm install
pnpm dev
```

### Supabase (optional, for persistence)

1. Copy `.env.example` to `.env`.
2. Add your project URL and anon key from [Supabase Dashboard](https://supabase.com/dashboard/project/_/settings/api).
3. Run migrations (in timestamp order): see [supabase/README.md](supabase/README.md). Example: `supabase db push`.
4. Restart the dev server after changing `.env`.

Tasks are stored in the `todos` table; without Supabase, the app runs with in-memory state only.

## Design & theming

- **[docs/DESIGN.md](docs/DESIGN.md)** – Overview for designers: tokens, components, how to change theme and typography.
- **[docs/STYLE.md](docs/STYLE.md)** – Token reference and component → CSS class map.

Styles use design tokens in `src/tokens.css`; components use semantic tokens so themes stay in one place.
