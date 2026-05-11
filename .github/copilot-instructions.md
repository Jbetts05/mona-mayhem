# Copilot instructions for Mona Mayhem

## Commands

- Install dependencies: `npm install` for local setup, or `npm ci` in the devcontainer/CI-style environments.
- Start the Astro dev server: `npm run dev` (defaults to http://localhost:4321).
- Build the app: `npm run build`.
- Preview a production build: `npm run preview`.
- Run Astro CLI commands through npm: `npm run astro -- <command>`.
- There are currently no test or lint scripts in `package.json`. For API work, run the dev server and manually check routes, for example `curl http://localhost:4321/api/contributions/octocat`.
- Playwright MCP is configured in `.vscode/mcp.json` for browser/UI inspection when working in MCP-aware editors.

## Architecture

- This is an Astro 5 project using ESM and TypeScript strict mode (`tsconfig.json` extends `astro/tsconfigs/strict`).
- `astro.config.mjs` configures server output with the `@astrojs/node` adapter in standalone mode. Treat API routes as server-side code, not static assets.
- The interactive app scaffold lives under `src/pages`. `src/pages/index.astro` is the battle page entry point, and `src/pages/api/contributions/[username].ts` is the dynamic API proxy route for GitHub contribution data.
- The API route is intentionally dynamic: keep `export const prerender = false` on server routes that fetch per-request data.
- `docs/` contains the prebuilt GitHub Pages workshop site, while `workshop/` contains the markdown workshop source in English, Spanish (`es`), and Brazilian Portuguese (`pt_BR`).
- The GitHub Pages workflow does not run `npm run build`; it copies `docs/` and localized `workshop/` files into `_site`. Do not assume changes under `src/` affect the deployed workshop pages.

## Repository conventions

- Keep app implementation changes in `src/pages` unless the task is explicitly about the workshop website or curriculum.
- Use Astro page/API route conventions: `.astro` files for pages, `APIRoute` handlers for API endpoints, and JSON responses with explicit `Content-Type` headers.
- Follow the existing style in source files: tabs for indentation, single quotes in JavaScript/TypeScript, semicolons in TypeScript/config files.
- The workshop docs use track markers such as `<!-- track:vscode:start -->` and `<!-- track:cli:end -->` to separate VS Code and CLI instructions. Preserve these markers when editing workshop content.
- Keep localized workshop content aligned across `workshop/`, `workshop/es/`, and `workshop/pt_BR/` when changing curriculum steps.
- The devcontainer uses Node 22 and runs `npm ci`; avoid adding setup steps that conflict with that environment.
- For visual or interaction changes to the Astro page, use Playwright MCP against the local dev server instead of relying only on static code inspection.
