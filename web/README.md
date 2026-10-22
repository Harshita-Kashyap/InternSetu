# InternSetu Web

## Run locally
1. Install Node.js (LTS).
2. From this directory, run `npm install`.
3. Set `NEXT_PUBLIC_API_URL` in `.env.local` to your backend base URL (for example, `http://localhost:8000`).
4. Run `npm run dev` and open `http://localhost:3000`.

## Structure
- `app/[locale]/` contains the active localized routes (`en`, `hi`).
- `app/components/` contains shared UI components.
- `app/lib/` re-exports the shared API, profile store, and taxonomy helpers.
- `api.ts`, `store.ts`, and `taxo.ts` contain the API client and integration logic.
- `i18n/` and `messages/` configure English/Hindi localization.

The frontend expects the backend API at `${NEXT_PUBLIC_API_URL}/api/v1`.
