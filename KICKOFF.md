# KICKOFF.md — Prompts to paste into Claude Code

Put `CLAUDE.md`, `PLAN.md` and this file in the root of an **empty folder**, open it in Claude Code, then use the prompts below in order.

---

## 1. First session — kickoff (paste once)

```
You are the lead engineer on a rebuild of https://smmgen.com — the owner's own marketing
site — as a Next.js app with an embedded Payload CMS admin.

Before writing any code:
1. Read CLAUDE.md fully. It defines the stack, folder structure, routing map, content
   model, rendering rules, known content issues, and how you must work in this repo.
2. Read PLAN.md fully. It is the phase-by-phase plan with checkboxes and acceptance criteria.
3. Confirm you have access to the Supabase MCP and Playwright MCP servers. If either is
   missing, tell me and stop.

Then enter plan mode and give me, for Phase 0 only:
- The exact steps you will take, in order.
- The commands you will run and the files you will create.
- Anything in CLAUDE.md or PLAN.md that is ambiguous, conflicting, or that you would change,
  with your recommendation.
- The values you need from me (env vars, Supabase project, bucket name, etc.).

Do not start implementing until I approve the Phase 0 plan.
```

---

## 2. Start any phase (reuse for Phase 1 → 8)

```
Start Phase <N> from PLAN.md.

1. Re-read the Phase <N> section of PLAN.md and the parts of CLAUDE.md it depends on.
2. Enter plan mode: list the tasks in the order you will do them, the files you will create
   or change, and any schema decisions. Flag risks and open questions.
3. After I approve, implement task by task:
   - Inspect the original site with Playwright MCP whenever you need to know how something
     looks or behaves. Do not guess.
   - After each task: pnpm typecheck && pnpm lint && pnpm build must pass, then tick the
     checkbox in PLAN.md and commit with a Conventional Commit message.
4. When every task is done, verify the Phase <N> acceptance criteria one by one and show me
   the evidence (command output, screenshots, URLs to check).
5. Stop and give me a short summary: what was built, what I should review, open questions.
   Do not start the next phase.
```

---

## 3. Resume after a break / new session

```
We are resuming the SMMGen rebuild. Read CLAUDE.md, then read PLAN.md and find the current
phase (the first phase with unchecked tasks). Run git log --oneline -20 to see recent work.
Tell me: current phase, what is done, what is next, and any failing check
(typecheck / lint / build). Then wait for my go-ahead.
```

---

## 4. Visual-fix loop (when a page doesn't match the original)

```
The page <URL> does not match the original closely enough.
1. Use Playwright MCP to screenshot the original https://smmgen.com<path> and our local
   http://localhost:3000<path> at 1440px and 390px.
2. List every visible difference (spacing, font size/weight, colors, radii, alignment,
   image sizes, missing elements, hover states) as a numbered list.
3. Fix them in the shared section components or design tokens — not with page-specific
   overrides — unless the difference only exists on this page.
4. Re-screenshot and show before/after. Run the Playwright visual test for this page.
```

---

## 5. End-of-phase review (ask Claude Code to self-review)

```
Review everything built in Phase <N> as a strict senior reviewer, using a fresh look at the
code (not your memory of writing it). Check against CLAUDE.md rules:
- Any hardcoded copy, numbers, URLs or menu items in components?
- Any public URL that differs from the original sitemap?
- Missing revalidation hooks, drafts/versions, Live Preview, or alt text?
- Type safety gaps (any, @ts-ignore, unchecked Payload results)?
- Client components that could be server components?
- Seed scripts that are not idempotent?
Report findings by severity, then fix the high and medium ones.
```

---

## Questions to settle with the owner before / during the build

1. **Correct business address and phone** (pages currently show Bangladesh, Southampton UK, and a US number).
2. **Blog source** — move the blog into the new admin (default), or keep the existing `api.smmgen.com` backend?
3. **Hosting** — Vercel + Supabase OK? Who owns the accounts?
4. **Live stats** — should orders/users/services counts update automatically from the ordering app, or be edited manually in Site Settings?
5. **Admin users** — who needs access, and with which role (admin / editor / writer)?
