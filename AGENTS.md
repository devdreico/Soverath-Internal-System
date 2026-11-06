<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## SIS Repository Guidance

Read `PLAN_MAESTRO.md` for product decisions and `INVENTARIO_DOMINIOS_PUBLICOS.md` for dated public observations before changing business data or agent behavior. Treat Founder-confirmed facts, public observations, inferences, demo content, and unconfirmed relationships as distinct provenance. Do not turn public prices, sample orders, product catalogs, or site claims into SIS operating facts without Founder confirmation.

### Data and Seed Workflow

- `lib/seed.ts` is the canonical import catalog for initial entities, relationships, and knowledge documents. Give new documents stable, unique `seed_key` values and accurate `provenance`, `source_url`, and `source_observed_at` values.
- The import action in `components/sis-app.tsx` inserts missing entities, relationships, and document seed keys only; it deliberately preserves existing records and Founder edits. New seed content reaches Supabase only after an authorized Founder uses **Completar catálogo** or **Importar base**.
- Put verified organizational context in `entity_documents` attached to the relevant entity so the assistant can retrieve it. Do not invent legal structure, ownership, activity, dates, metrics, or financial facts. An origin date reported by Founder is not automatically a legal incorporation date.

### Assistant and Access Invariants

- The chat API is `app/api/ai/chat/route.ts`; its UI is `components/ai-assistant.tsx`. Keep Founder identity and MFA AAL2 checks, the caller's Supabase JWT/RLS, table and field allowlists, and server-issued one-use write proposals. Never give the model SQL or a service-role key.
- AI credentials are server-only. Supported server configuration: `AI_PROVIDER`, `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `GOOGLE_AI_STUDIO_API_KEY`, and `GOOGLE_AI_MODEL`. If `AI_PROVIDER` is unset, an OpenRouter key selects OpenRouter; otherwise Google is used. Do not print, pull, commit, or send secret values through chat. Enter secrets directly in provider settings or a secure terminal prompt.
- The current OpenRouter default is `openai/gpt-oss-120b`; free models can rate-limit and paid models need account balance. Never describe a model quota as unlimited. The selected model must support SIS tool calls.
- An unauthenticated `POST /api/ai/chat` returning `401` is expected and does not prove generation works. Validate generation from a real Founder session with AAL2. The production domain is `https://ss.presentto.online`.

### Validation and Deployment

- Before code changes, consult the matching guide under `node_modules/next/dist/docs/`; this repository uses a Next.js version with breaking changes.
- Run `npm run build` after code changes. Check `git diff --check` and preserve unrelated user changes.
- Vercel deployments use the linked `devdreico/soverath-internal-system` project. Verify deployment readiness and the canonical domain after publishing. Prefer ordinary `curl` for public health checks; `vercel curl` may create a persistent automation-bypass secret. If one is created, revoke it and confirm SSO protection remains enabled.
- Supabase migrations are manual and ordered: `0001_sis_base.sql`, `0002_file_workspaces.sql`, then `0003_ai_action_proposals.sql`. Do not claim database seeding or writes are live until an authorized Founder session imports them and verifies the result.
