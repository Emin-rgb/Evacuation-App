---
name: ui-style
description: Design rules for building or changing any screen or component in this project. Use whenever creating UI.
---

# UI style rules

Goal: the app should look like a real, polished product within seconds of the demo starting.

## Components
- Use shadcn/ui from `components/ui`. If a component is missing, add it: `npx shadcn@latest add <name>`.
  Useful set: button card badge input textarea select dialog sheet tabs table skeleton sonner tooltip progress separator avatar.
- Icons: `lucide-react` (comes with shadcn).
- Never write custom CSS files; Tailwind classes only.

## Layout
- Page container: `mx-auto max-w-6xl px-4 py-8`. Generous whitespace, `gap-6` between sections.
- Clear hierarchy per screen: one title (`text-2xl font-semibold tracking-tight`), one short subtitle (`text-muted-foreground`), then content.
- Dashboards: stat cards row at top (`grid gap-4 sm:grid-cols-2 lg:grid-cols-4`), main content below.
- Must look right on a laptop projector (1280-1440px) and not break on mobile.

## Visual
- Neutral base + ONE accent color for primary actions and highlights. Use shadcn theme tokens (`bg-primary`, `text-muted-foreground`, `border`), not random hex colors.
- Rounded cards (`rounded-xl`), subtle borders, no heavy shadows.
- Status colors only for meaning: green = good, amber = warning, red = critical.
- Numbers that matter are big (`text-3xl font-semibold`) with a small label.

## States (required on every data view)
- Loading: Skeleton shaped like the final content (not a spinner alone).
- Empty: short message + the action that fixes it.
- Error: friendly message + retry. Toasts (sonner) for action results.

## Content
- Realistic demo data (local names, places, numbers), never "Lorem ipsum" or "Test 1".
- Short, clear labels. The UI language follows the case (English or Azerbaijani) — be consistent.
