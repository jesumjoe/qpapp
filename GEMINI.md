# Gemini Context & Project Standards

This file provides architectural guidance, engineering standards, and workflow instructions for the `qpapp` project. It is intended to be read by Gemini CLI and other AI agents to maintain consistency and context across sessions.

## Project Goals
- **Local-First & Serverless:** The application runs entirely on the user's local device. No backend server is required.
- **Privacy Centric:** All data (grades, subjects, questions) is stored in the browser's IndexedDB using Dexie.js.
- **AI Integration:** Direct integration with the Gemini API (Google Generative AI) for question generation and analysis.
- **Portability:** Users provide their own Gemini API key, which is stored in browser local storage.

## Tech Stack
- **Frontend:** React 19, Vite, Tailwind CSS, Radix UI, Framer Motion.
- **Database:** Dexie.js (IndexedDB wrapper).
- **AI:** Google Generative AI (Gemini 1.5 Flash/Pro).
- **Routing:** Wouter.

## Engineering Standards

### TypeScript & Coding Style
- Use TypeScript for all code.
- Prefer functional components and hooks.
- Data access should use Dexie `useLiveQuery` for reactivity.
- Folder structure:
  - `src/components/`: Reusable UI components.
  - `src/lib/`: Core logic (db.ts, gemini.ts).
  - `src/pages/`: Application views.

### AI Development
- Gemini logic resides in `src/lib/gemini.ts`.
- Wrap AI-dependent features with `ApiKeyGuard`.

### Database
- Schema is defined in `src/lib/db.ts`.

## Workflow Instructions
- **Commits:** Follow conventional commit messages. Do not stage or commit unless explicitly asked.
- **Context:** Update `MEMORY.md` (private) for local notes and this file (`GEMINI.md`) for shared standards.

---
*Last Updated: May 3, 2026*
