# MSU Starter Kit — Next.js + MUI Template

A ready-to-use admin dashboard template (Next.js 16 App Router + MUI 7) customized for
Mahasarakham University projects. Brand defaults follow the **MSU-BEPS** reference design:
**Sarabun** body font, **Manrope / IBM Plex Sans Thai** headings, and a **purple** primary color,
with light/dark modes and a live theme Customizer.

> 🤖 **Building on this with an AI agent?** Read **[CLAUDE.md](./CLAUDE.md)** (or
> [AGENTS.md](./AGENTS.md)) first — it maps the project and documents the common edits.

## Getting started

Uses **pnpm**.

```bash
pnpm install        # runs build:icons automatically
pnpm dev            # http://localhost:3000
```

Other scripts: `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm format`, `pnpm build:icons`.

> The first build fetches fonts via `next/font/google`, so it needs network access.

## Customize the basics

| Want to change… | Edit |
| :-- | :-- |
| Sidebar menu | `src/data/navigation/verticalMenuData.tsx` |
| Fonts | `src/@core/theme/fonts.ts` |
| Font sizes / headings | `src/@core/theme/index.ts` |
| Primary (accent) color | `src/configs/primaryColorConfig.ts` (first entry = default) |
| Sidebar look | `src/@core/styles/vertical/menuItemStyles.ts`, `menuSectionStyles.ts` |
| Brand name / subtitle | `src/configs/themeConfig.ts` + `src/components/layout/shared/Logo.tsx` |
| Default layout / mode | `src/configs/themeConfig.ts` |

Add a new page: create `src/app/(private)/<route>/page.tsx`, then add it to the menu data.
Step-by-step recipe in [`.claude/skills/add-page/SKILL.md`](./.claude/skills/add-page/SKILL.md).

## Logging & error alerts

Errors anywhere in the app are captured automatically, written to **one log file per day**
(`logs/app-YYYY-MM-DD.log`, plus an errors-only `logs/error-YYYY-MM-DD.log`) and pushed to a
**Discord webhook**. The only setup is the URL:

```env
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/xxx/yyy
```

Leave it empty and the app just writes files. Writing a log yourself:

| Where | Use |
| :-- | :-- |
| Server (page, server action, lib) | `import { logger } from '@/libs/logger'` |
| API route | wrap the handler in `withLogging` from `@/libs/logger/withLogging` |
| Client component | `import { clientLogger } from '@/libs/logger/client'` |
| Anything else / external | `POST {basePath}/api/log` |

Already built a project from an older copy of this template? See
[`docs/logging-retrofit.md`](./docs/logging-retrofit.md) — it opens with a copy-paste prompt for
Claude Code — or run `bash scripts/add-logging.sh <path-to-that-project>`.

You do **not** need try/catch for an error to be logged — thrown errors are caught by
`src/instrumentation.ts` and the error boundaries. Full guide: [`docs/logging.md`](./docs/logging.md).

For **base path, authentication (NextAuth / ERP-MSU), and environment variables**, see
[`guide.md`](./guide.md).

## Docker deployment

### Docker Compose (recommended)

```bash
docker-compose up -d     # serves on http://localhost:3007
docker-compose down
```

### Docker CLI

```bash
docker build -t msu-starter-kit .
docker run -p 3007:3007 msu-starter-kit
```

Provide a `.env` file with the variables listed in `guide.md` before building.

## Project structure

See [CLAUDE.md → Project map](./CLAUDE.md#project-map) for the annotated tree. In short:

- `src/app/` — App Router routes (`(private)` = dashboard layout for the public home and private pages, access set by middleware; `(blank-layout-pages)` = bare, none shipped by default)
- `src/@core/` — theme, hooks, settings, MUI overrides (template core)
- `src/@layouts/`, `src/@menu/` — layout + menu engine (rarely edited)
- `src/components/`, `src/views/` — app components and page composition
- `backend/` — Express + Prisma API (separate package)
