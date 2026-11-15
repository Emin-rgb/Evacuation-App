---
name: demo-polish
description: Final-hour checklist to make the demo flawless before presenting. Use when asked to polish, prepare the demo, or after code freeze.
---

# Demo polish checklist

Do these in order. Small, safe changes only — no new features, no refactors.

1. **Demo path** — read the demo script in PLAN.md. Walk every step; list anything broken or ugly. Fix only those.
2. **Data** — every screen shows realistic, consistent data. No empty screens, no "undefined", no "NaN", no lorem ipsum.
3. **AI safety** — AI calls have mock fallback; a slow AI call shows a skeleton. Pre-fill the input with a good example so the demo needs no typing.
4. **Errors** — `npm run build` passes; no red errors in the browser console on the demo path.
5. **First impression** — landing screen explains the product in one sentence (title + subtitle) and has one obvious primary button.
6. **Small touches** — page `<title>` and metadata in `app/layout.tsx`, favicon, consistent spacing, aligned cards.
7. **Deploy** — push and confirm the Vercel URL works with the env vars set. Keep `npm run dev` running locally as backup.

Report: a short list of what you fixed and anything you could not fix.
