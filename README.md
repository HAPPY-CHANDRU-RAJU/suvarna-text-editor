# ಸುವರ್ಣ · Suvarna

A Microsoft Word–style word processor for Kannada, delivered as a web (SaaS) app.

- **Word-like editing**: a ribbon (File, Home, Insert, Layout, Review, View, plus a contextual Table tab), styles, fonts, colors, highlight, lists, indents, line spacing, Format Painter, tables, images (paste, drop, resize), links, symbols, page breaks, comments, and find & replace.
- **Real pages**: A4, Letter, Legal or A5, portrait or landscape, margin presets, a ruler, headers and footers, page numbers in Kannada numerals (೧ ೨ ೩), zoom, print and web layouts, a navigation pane, and focus mode. Long paragraphs split across pages line by line.
- **Kannada first**:
  - Phonetic (Baraha/Nudi-style) typing with **Alt+K**, so `namaskaara` becomes ನಮಸ್ಕಾರ.
  - An on-screen Kannada keyboard and digit conversion (0–9 ↔ ೦–೯).
  - Six Kannada fonts.
  - Akshara counts.
  - A full Kannada or English UI.
- **Proofing**:
  - Spell and grammar underlines, right-click suggestions, and a Word-style Editor pane (F7) with Change, Change All, Ignore, Ignore All and Add to Dictionary.
  - AutoCorrect as you type, synonyms ("word replace"), and AI auto-fixes.
  - Runs on a pluggable language API (see below).
- **Files**:
  - Open .docx, HTML, text, or Suvarna backup files.
  - Export to Word (.docx, with Kannada fonts set for Word's complex-script slot), PDF (through the browser's print engine, so conjuncts shape correctly), HTML, text, or a Suvarna backup.
- **SaaS**: Supabase accounts (password or magic link), cloud documents with row-level security, a dashboard with templates, autosave, and read-only share links. With nothing configured, it runs fully in **local mode** and stores documents in IndexedDB.

## Quick start

```bash
npm install
npm run dev          # http://localhost:8080
```

That is enough to use everything except accounts, sharing and AI proofing.

## Configuration

Copy `.env.example` to `.env`. Every setting is optional.

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Turns on accounts, cloud documents and share links |
| `VITE_LANGUAGE_API_URL` | The endpoint behind the **Suvarna Cloud AI** provider. If unset, the app uses `$VITE_SUPABASE_URL/functions/v1/language` |
| `ANTHROPIC_API_KEY` | Used only by the server-side language API. It is never sent to the browser |
| `LANGUAGE_MODEL` | Optional model override for the language API. The default is `claude-opus-5-5` |

### Supabase

1. Create a project and apply `supabase/migrations/0001_init.sql` with `supabase db push`, or paste it into the SQL editor.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. In Auth → URL configuration, add your site URL so magic links and email confirmations redirect to `/app`.

## Connecting a language API ("easy connect")

Open **Review → Language Services** (or **Language Services** on the dashboard) and pick a provider:

1. **Built-in (offline)**: a dictionary and AutoCorrect list that run in the browser. To make it stricter, drop a newline-separated word list (for example, an export of a Hunspell `kn_IN` dictionary) at `public/dictionaries/kn.txt`. From 20,000 words up, every unknown word is flagged. Below that, the checker only flags known misspellings and one-letter slips on longer words, to avoid noise.
2. **Suvarna Cloud AI**: Claude-backed proofreading, synonyms and auto-fixes through your own server:
   - **Local or self-hosted**: `ANTHROPIC_API_KEY=… npm run language-api` starts a server on `:8787`. Then set `VITE_LANGUAGE_API_URL=http://localhost:8787`. This server has no authentication of its own.
   - **Hosted**: `supabase secrets set ANTHROPIC_API_KEY=…`, then `supabase functions deploy language`. The function accepts only signed-in users.
3. **Custom API**: any endpoint, with an optional auth header. There are two formats:
   - **Paragraphs**: the Suvarna contract below. It supports grammar, synonyms and auto-fixes.
   - **One word per request**: for simple spell-check services. The default field names match an API like this one:

     ```http
     POST http://localhost:9001/spellcheck   {"word": "wanner"}
     →                                       {"body": ["winner", "more options"]}
     ```

     A word is treated as correct when the list is empty or contains the word itself. You can change the request field and the suggestions field (a dotted path such as `data.suggestions`). Each distinct word is looked up once per session, with up to 6 requests in parallel.

   **Test connection** checks the endpoint before you save.

### Calling an API on another port (CORS)

The browser can only call an API on another origin (for example `localhost:9001` from `localhost:8080`) if that API sends CORS headers. If yours doesn't, route it through Vite's dev proxy in `.env`:

```bash
LANGUAGE_PROXY_TARGET=http://localhost:9001
VITE_SPELLCHECK_URL=/language-proxy/spellcheck   # also makes it the default provider
```

Restart `npm run dev` after editing `.env`. In production, enable CORS on the API or serve it behind the same domain.

### Contract

```http
POST <url>
{ "action": "check", "language": "kn", "paragraphs": ["…", "…"] }
→ { "results": [ { "issues": [ { "original": "ವಿದ್ಯಾರ್ತಿ", "suggestions": ["ವಿದ್ಯಾರ್ಥಿ"],
                                  "type": "spelling", "message": "…", "confidence": 0.95 } ] }, … ] }

POST <url>
{ "action": "synonyms", "language": "kn", "word": "ಸುಂದರ", "context": "…" }
→ { "synonyms": ["ಚೆಂದ", "ಸೊಗಸು"] }
```

- `results` has one entry per paragraph, in order.
- `original` must appear verbatim in the paragraph.
- `offset` (a UTF-16 index) is optional.
- `type` is one of `spelling`, `grammar` or `style`.
- When **Automatically apply high-confidence fixes** is on, spelling issues with `confidence` ≥ 0.9 are fixed without asking. Ctrl+Z undoes a fix, and a fix you undo is not reapplied during the session.

## Scripts

| Command | |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build (`dist/`) |
| `npm test` | Unit tests (Vitest) |
| `npm run typecheck` | App and server type-check |
| `npm run lint` | ESLint |
| `npm run language-api` | Local language API (`server/language-api.ts`) |

## Project layout

```
src/
  editor/extensions/   TipTap/ProseMirror extensions: pagination, transliteration,
                       proofing, autocorrect, search, comments, page breaks, paragraph format
  components/editor/   Word-style UI: title bar, ribbon tabs, page canvas, ruler, status bar,
                       side panes (navigation, find, spelling, comments), dialogs, context menu
  components/app/      Shared app UI (user menu, language services dialog)
  lib/kannada/         Transliteration, fonts, built-in dictionary
  lib/language/        Provider contract, offline provider, remote provider, settings service
  lib/export/          .docx export, print/PDF and HTML, import (.docx through mammoth)
  services/            Supabase client, auth, document repositories (IndexedDB / Supabase)
  i18n/                Kannada and English UI strings
  pages/               Landing, auth, dashboard, editor, shared view
server/                Local language API (Node)
supabase/              SQL migration and the `language` Edge Function (shared core in _shared/)
```

## Known limitations

- Pagination splits text blocks line by line, but tables and images move as whole blocks. A table taller than a page overflows that page.
- DOCX export doesn't include comments yet, and Word shows page numbers in Western digits. Print and PDF output can use Kannada numerals.
- Collaboration is share-by-link (read-only). Real-time co-editing and track changes aren't built yet.
- Nudi and Baraha legacy (ASCII font) to Unicode conversion isn't included.
