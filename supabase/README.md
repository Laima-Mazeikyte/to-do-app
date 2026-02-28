# Supabase

Migrations run in timestamp order. Apply them with:

```bash
supabase db push
```

or, if using the Supabase CLI locally:

```bash
supabase migration up
```

Ensure `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (see project root `.env.example`), then restart the dev server after changing env.
